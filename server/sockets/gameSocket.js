import { Server } from "socket.io";
import { Chess } from "chess.js";
import { env } from "../config/env.js";
import { createMatch, finishMatch } from "../models/Match.js";
import { createMove } from "../models/Move.js";
import { findUserById, findUserByInviteCode, updateRatings } from "../models/User.js";
import { calculateElo } from "../utils/elo.js";
import { verifyToken } from "../utils/tokens.js";

const GAME_TIME_MS = 10 * 60 * 1000;

const onlineUsers = new Map();
const waitingQueue = [];
const games = new Map();
const pendingInvites = new Map(); // inviteToken -> { user, socketId, socket }
const pendingGameInvites = new Map(); // inviteId -> { inviter, targetUserId, targetSocketId, inviterSocketId }

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    elo_rating: user.elo_rating,
    avatar: user.avatar,
    invite_code: user.invite_code
  };
}

function onlinePlayersPayload() {
  return [...onlineUsers.values()]
    .map(({ user }) => user)
    .filter((user) => user.role !== "admin")
    .map(publicUser);
}

function gamePayload(game) {
  return {
    roomId: game.roomId,
    matchId: game.matchId,
    fen: game.chess.fen(),
    turn: game.chess.turn(),
    pgn: game.chess.pgn(),
    players: game.players,
    timers: game.timers,
    status: game.status,
    result: game.result || null,
    reason: game.reason || null,
    inCheck: game.chess.inCheck(),
    isCheckmate: game.chess.isCheckmate(),
    isStalemate: game.chess.isStalemate(),
    lastMove: game.lastMove
  };
}

function emitOnlinePlayers(io) {
  // Get all players without admins
  const regularPlayersList = [...onlineUsers.values()]
    .map(({ user }) => user)
    .filter((user) => user.role !== "admin")
    .map(publicUser);

  // Get all players including admins
  const allPlayersList = [...onlineUsers.values()]
    .map(({ user }) => user)
    .map(publicUser);

  // Emit to regular players (no admins in list)
  io.emit("onlinePlayers", regularPlayersList);

  // Emit to admins separately (all players including other admins)
  [...onlineUsers.values()].forEach(({ user, socketId }) => {
    if (user.role === "admin") {
      io.to(socketId).emit("onlinePlayers", allPlayersList);
    }
  });
}

function removeFromQueue(userId) {
  const index = waitingQueue.findIndex((entry) => entry.user.id === userId);
  if (index >= 0) waitingQueue.splice(index, 1);
}

function startClock(io, game) {
  game.lastTick = Date.now();
  game.interval = setInterval(() => {
    if (game.status !== "active") return;
    const now = Date.now();
    const color = game.chess.turn() === "w" ? "white" : "black";
    game.timers[color] = Math.max(0, game.timers[color] - (now - game.lastTick));
    game.lastTick = now;

    if (game.timers[color] <= 0) {
      endGame(io, game, color === "white" ? "black_win" : "white_win", "timeout");
    } else {
      io.to(game.roomId).emit("gameUpdate", gamePayload(game));
    }
  }, 1000);
}

async function createGame(io, first, second) {
  const firstIsWhite = Math.random() >= 0.5;
  const white = firstIsWhite ? first.user : second.user;
  const black = firstIsWhite ? second.user : first.user;
  const matchId = await createMatch({ whitePlayer: white.id, blackPlayer: black.id });
  const roomId = `match:${matchId}`;

  const game = {
    roomId,
    matchId,
    chess: new Chess(),
    players: { white: publicUser(white), black: publicUser(black) },
    sockets: new Map([
      [white.id, firstIsWhite ? first.socketId : second.socketId],
      [black.id, firstIsWhite ? second.socketId : first.socketId]
    ]),
    timers: { white: GAME_TIME_MS, black: GAME_TIME_MS },
    status: "active",
    lastMove: null,
    lastTick: Date.now(),
    interval: null
  };

  games.set(roomId, game);
  first.socket.join(roomId);
  second.socket.join(roomId);
  first.socket.emit("matchFound", { roomId, color: firstIsWhite ? "white" : "black", game: gamePayload(game) });
  second.socket.emit("matchFound", { roomId, color: firstIsWhite ? "black" : "white", game: gamePayload(game) });
  io.to(roomId).emit("gameUpdate", gamePayload(game));
  startClock(io, game);
}

async function endGame(io, game, result, reason = "finished") {
  if (game.status === "ended") return;
  game.status = "ended";
  game.result = result;
  game.reason = reason;
  clearInterval(game.interval);

  const winner =
    result === "white_win" ? game.players.white.id : result === "black_win" ? game.players.black.id : null;

  await finishMatch({ matchId: game.matchId, winner, result });

  if (result !== "abandoned") {
    const ratings = calculateElo(game.players.white.elo_rating, game.players.black.elo_rating, result);
    await updateRatings([
      { userId: game.players.white.id, rating: ratings.white },
      { userId: game.players.black.id, rating: ratings.black }
    ]);
  }

  io.to(game.roomId).emit("gameEnd", { ...gamePayload(game), result, reason, winner });
}

function resolveResult(chess) {
  if (chess.isCheckmate()) return chess.turn() === "w" ? "black_win" : "white_win";
  if (chess.isDraw() || chess.isStalemate()) return "draw";
  return null;
}

export function configureSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const payload = verifyToken(token);
      const user = await findUserById(payload.sub);
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    onlineUsers.set(socket.user.id, { user: socket.user, socketId: socket.id });
    socket.emit("userOnline", publicUser(socket.user));
    emitOnlinePlayers(io);

    socket.on("findMatch", async () => {
      removeFromQueue(socket.user.id);
      const opponent = waitingQueue.shift();
      if (!opponent || opponent.user.id === socket.user.id) {
        waitingQueue.push({ user: socket.user, socketId: socket.id, socket });
        socket.emit("matchmakingStatus", { status: "queued" });
        return;
      }

      await createGame(io, opponent, { user: socket.user, socketId: socket.id, socket });
    });

    socket.on("joinRoom", ({ roomId }) => {
      const game = games.get(roomId);
      if (!game) return socket.emit("socketError", { message: "Game room not found" });
      const isPlayer = [game.players.white.id, game.players.black.id].includes(socket.user.id);
      if (!isPlayer) return socket.emit("socketError", { message: "Only players can join this room" });

      socket.join(roomId);
      game.sockets.set(socket.user.id, socket.id);
      socket.emit("gameUpdate", gamePayload(game));
    });

    socket.on("movePiece", async ({ roomId, from, to, promotion = "q" }) => {
      const game = games.get(roomId);
      if (!game || game.status !== "active") return;

      const color = socket.user.id === game.players.white.id ? "w" : socket.user.id === game.players.black.id ? "b" : null;
      if (!color) return socket.emit("socketError", { message: "You are not a player in this game" });
      if (game.chess.turn() !== color) return socket.emit("socketError", { message: "It is not your turn" });

      const now = Date.now();
      const timerColor = color === "w" ? "white" : "black";
      game.timers[timerColor] = Math.max(0, game.timers[timerColor] - (now - game.lastTick));
      game.lastTick = now;

      try {
        const move = game.chess.move({ from, to, promotion });
        if (!move) return socket.emit("socketError", { message: "Illegal move" });

        game.lastMove = move.san;
        await createMove({ matchId: game.matchId, notation: move.san });

        const result = resolveResult(game.chess);
        if (result) {
          await endGame(io, game, result, result);
        } else {
          io.to(roomId).emit("gameUpdate", gamePayload(game));
        }
      } catch {
        socket.emit("socketError", { message: "Illegal move" });
      }
    });

    socket.on("resignGame", async ({ roomId }) => {
      const game = games.get(roomId);
      if (!game || game.status !== "active") return;

      const isWhite = game.players.white.id === socket.user.id;
      const isBlack = game.players.black.id === socket.user.id;
      if (!isWhite && !isBlack) {
        return socket.emit("socketError", { message: "You are not a player in this game" });
      }

      await endGame(io, game, isWhite ? "black_win" : "white_win", "resign");
    });

    socket.on("sendGameInvite", async ({ targetCode }) => {
      if (typeof targetCode !== "string" || !/^\d{6}$/.test(targetCode)) {
        return socket.emit("socketError", { message: "Please enter a valid 6-digit player ID / الرجاء إدخال معرف لاعب صالح من 6 أرقام" });
      }

      const targetUser = await findUserByInviteCode(targetCode);
      if (!targetUser) {
        return socket.emit("socketError", { message: "Player ID not found / معرف اللاعب غير موجود" });
      }

      if (targetUser.id === socket.user.id) {
        return socket.emit("socketError", { message: "You cannot invite yourself / لا يمكنك دعوة نفسك" });
      }

      const targetOnline = onlineUsers.get(targetUser.id);
      if (!targetOnline) {
        return socket.emit("socketError", { message: "That player is not online / هذا اللاعب غير متصل الآن" });
      }

      const inviteId = `${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
      pendingGameInvites.set(inviteId, {
        inviter: socket.user,
        targetUserId: targetUser.id,
        targetSocketId: targetOnline.socketId,
        inviterSocketId: socket.id
      });

      io.to(targetOnline.socketId).emit("gameInvite", { inviteId, from: publicUser(socket.user) });
      socket.emit("inviteSent", { inviteId, target: publicUser(targetUser) });
    });

    socket.on("acceptGameInvite", async ({ inviteId }) => {
      const invite = pendingGameInvites.get(inviteId);
      if (!invite) {
        return socket.emit("socketError", { message: "Invite not found or expired / الدعوة غير موجودة أو انتهت" });
      }
      if (invite.targetUserId !== socket.user.id) {
        return socket.emit("socketError", { message: "This invite is not for you / هذه الدعوة ليست لك" });
      }

      pendingGameInvites.delete(inviteId);

      const inviterSocket = io.sockets.sockets.get(invite.inviterSocketId);
      if (!inviterSocket) {
        return socket.emit("socketError", { message: "The inviting player disconnected / اللاعب الداعي تم قطع الاتصال به" });
      }

      await createGame(io, { user: invite.inviter, socketId: invite.inviterSocketId, socket: inviterSocket }, { user: socket.user, socketId: socket.id, socket });
    });

    socket.on("rejectGameInvite", ({ inviteId }) => {
      const invite = pendingGameInvites.get(inviteId);
      if (!invite) {
        return socket.emit("socketError", { message: "Invite not found or expired / الدعوة غير موجودة أو انتهت" });
      }
      if (invite.targetUserId !== socket.user.id) {
        return socket.emit("socketError", { message: "This invite is not for you / هذه الدعوة ليست لك" });
      }

      pendingGameInvites.delete(inviteId);
      const inviterSocket = io.sockets.sockets.get(invite.inviterSocketId);
      if (inviterSocket) {
        inviterSocket.emit("inviteRejected", { inviteId, target: publicUser(socket.user) });
      }
      socket.emit("inviteRejectedAck", { inviteId });
    });

    socket.on("createInvite", () => {
      // Clean up any existing invites by this user
      for (const [token, creator] of pendingInvites.entries()) {
        if (creator.user.id === socket.user.id) {
          pendingInvites.delete(token);
        }
      }

      const inviteToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      pendingInvites.set(inviteToken, {
        user: socket.user,
        socketId: socket.id,
        socket: socket
      });

      socket.emit("inviteCreated", { inviteToken });
    });

    socket.on("joinInvite", async ({ inviteToken }) => {
      const creator = pendingInvites.get(inviteToken);
      if (!creator) {
        return socket.emit("socketError", { message: "Invite link invalid or expired / رابط الدعوة غير صالح أو انتهت صلاحيته" });
      }

      if (creator.user.id === socket.user.id) {
        return socket.emit("socketError", { message: "You cannot play against yourself / لا يمكنك اللعب ضد نفسك" });
      }

      // Remove from pending invites
      pendingInvites.delete(inviteToken);

      // Create game with creator as player 1 and current user as player 2
      await createGame(io, creator, { user: socket.user, socketId: socket.id, socket });
    });

    socket.on("disconnect", async () => {
      onlineUsers.delete(socket.user.id);
      removeFromQueue(socket.user.id);
      emitOnlinePlayers(io);

      // Clean up pending link invites
      for (const [token, creator] of pendingInvites.entries()) {
        if (creator.user.id === socket.user.id) {
          pendingInvites.delete(token);
        }
      }

      // Clean up ID-based game invites
      for (const [inviteId, invite] of pendingGameInvites.entries()) {
        if (invite.inviter.id === socket.user.id || invite.targetUserId === socket.user.id) {
          pendingGameInvites.delete(inviteId);
          const otherSocketId = invite.inviter.id === socket.user.id ? invite.targetSocketId : invite.inviterSocketId;
          const otherSocket = io.sockets.sockets.get(otherSocketId);
          if (otherSocket) {
            otherSocket.emit("inviteCanceled", { inviteId, target: publicUser(socket.user) });
          }
        }
      }

      for (const game of games.values()) {
        if (game.status !== "active") continue;
        const isWhite = game.players.white.id === socket.user.id;
        const isBlack = game.players.black.id === socket.user.id;
        if (isWhite || isBlack) {
          io.to(game.roomId).emit("playerDisconnected", { userId: socket.user.id });
          await endGame(io, game, isWhite ? "black_win" : "white_win", "disconnect");
        }
      }
    });
  });

  return io;
}

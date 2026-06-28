import { Server } from "socket.io";
import { Chess } from "chess.js";
import { env } from "../config/env.js";
import { createMatch, finishMatch } from "../models/Match.js";
import { createMove } from "../models/Move.js";
import { findUserById, findUserByInviteCode, updateRatings, awardTournamentWinner } from "../models/User.js";
import { calculateElo } from "../utils/elo.js";
import { verifyToken } from "../utils/tokens.js";
import { setSocketServer } from "./socketServer.js";

const GAME_TIME_MS = 10 * 60 * 1000;

const onlineUsers = new Map();
const waitingQueue = [];
const games = new Map();
const pendingInvites = new Map(); // inviteToken -> { user, socketId, socket }
const pendingGameInvites = new Map(); // inviteId -> { inviter, targetUserId, targetSocketId, inviterSocketId }
const tournamentMatches = new Map(); // matchId -> { matchId, white_player, black_player, whiteReady, blackReady, timer }

export function getTournamentMatchReadyState(matchId) {
  return tournamentMatches.get(matchId);
}

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
    players: {
      white: game.players?.white || null,
      black: game.players?.black || null
    },
    timers: {
      white: game.timers?.white ?? 0,
      black: game.timers?.black ?? 0
    },
    status: game.status,
    result: game.result || null,
    reason: game.reason || null,
    inCheck: game.chess.inCheck(),
    isCheckmate: game.chess.isCheckmate(),
    isStalemate: game.chess.isStalemate(),
    lastMove: game.lastMove,
    chat: game.messages || []
  };
}

function emitOnlinePlayers(io) {
  // Get count of online users (excluding admins)
  const regularCount = [...onlineUsers.values()]
    .filter(({ user }) => user.role !== "admin").length;

  // Create an anonymized list for regular users to only count players without leaking names or IDs
  const anonymousPlayersList = Array.from({ length: regularCount }).map((_, idx) => ({
    id: idx,
    username: "Player",
    elo_rating: 0,
    avatar: null,
    invite_code: ""
  }));

  // Get all players including admins (for admin dashboard use)
  const allPlayersList = [...onlineUsers.values()]
    .map(({ user }) => user)
    .map(publicUser);

  // Emit custom list per socket based on user role
  [...onlineUsers.values()].forEach(({ user, socketId }) => {
    if (user.role === "admin") {
      io.to(socketId).emit("onlinePlayers", allPlayersList);
    } else {
      io.to(socketId).emit("onlinePlayers", anonymousPlayersList);
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
    interval: null,
    messages: []
  };

  games.set(roomId, game);
  first.socket.join(roomId);
  second.socket.join(roomId);
  first.socket.emit("matchFound", { roomId, color: firstIsWhite ? "white" : "black", game: gamePayload(game) });
  second.socket.emit("matchFound", { roomId, color: firstIsWhite ? "black" : "white", game: gamePayload(game) });
  io.to(roomId).emit("gameUpdate", gamePayload(game));
  startClock(io, game);
}

async function createTournamentGame(io, match, whiteSocketId, blackSocketId) {
  const roomId = `match:${match.id}`;
  const whiteUser = await findUserById(match.white_player);
  const blackUser = await findUserById(match.black_player);

  const game = {
    roomId,
    matchId: match.id,
    tournamentId: match.tournament_id,
    chess: new Chess(),
    players: { white: publicUser(whiteUser), black: publicUser(blackUser) },
    sockets: new Map([
      [whiteUser.id, whiteSocketId],
      [blackUser.id, blackSocketId]
    ]),
    timers: { white: GAME_TIME_MS, black: GAME_TIME_MS },
    status: "active",
    lastMove: null,
    lastTick: Date.now(),
    interval: null,
    messages: []
  };

  games.set(roomId, game);

  const whiteSocket = io.sockets.sockets.get(whiteSocketId);
  const blackSocket = io.sockets.sockets.get(blackSocketId);

  if (whiteSocket) whiteSocket.join(roomId);
  if (blackSocket) blackSocket.join(roomId);

  if (whiteSocket) whiteSocket.emit("matchFound", { roomId, color: "white", game: gamePayload(game) });
  if (blackSocket) blackSocket.emit("matchFound", { roomId, color: "black", game: gamePayload(game) });

  io.to(roomId).emit("gameUpdate", gamePayload(game));
  startClock(io, game);
}

async function endGame(io, game, result, reason = "finished") {
  if (game.status === "ended") return;
  if (!game.players?.white || !game.players?.black) return;

  game.status = "ended";
  game.result = result;
  let finalReason = reason || "finished";
  if (finalReason === result || !finalReason) {
    if (result === "draw") finalReason = "draw";
    else if (game.chess.isCheckmate()) finalReason = "checkmate";
    else finalReason = "finished";
  }
  game.reason = finalReason;
  clearInterval(game.interval);

  const winner =
    result === "white_win" ? game.players.white.id : result === "black_win" ? game.players.black.id : null;

  await finishMatch({ matchId: game.matchId, winner, result, reason: finalReason });

  if (result !== "abandoned") {
    const ratings = calculateElo(game.players.white.elo_rating, game.players.black.elo_rating, result);
    await updateRatings([
      { userId: game.players.white.id, rating: ratings.white },
      { userId: game.players.black.id, rating: ratings.black }
    ]);
  }

  // Award level and EXP to the tournament match winner
  if (game.tournamentId && winner) {
    try {
      console.log(`[Tournament Victory] Awarding level up and EXP to user ID ${winner}`);
      await awardTournamentWinner(winner, 500);
    } catch (err) {
      console.error("[Tournament Victory] Error awarding rewards:", err);
    }
  }

  io.to(game.roomId).emit("gameEnd", { ...gamePayload(game), result, reason: game.reason, winner });
}

function resolveResult(chess) {
  if (chess.isCheckmate()) return chess.turn() === "w" ? "black_win" : "white_win";
  if (chess.isDraw() || chess.isStalemate()) return "draw";
  return null;
}

export function configureSockets(httpServer) {
  const allowedSocketOrigins = new Set([env.clientUrl]);
  if (env.nodeEnv === "development") {
    allowedSocketOrigins.add("http://localhost:5173");
    allowedSocketOrigins.add("http://127.0.0.1:5173");
    allowedSocketOrigins.add("http://[::1]:5173");
  }

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedSocketOrigins.has(origin)) {
          return callback(null, true);
        }
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true
    }
  });
  setSocketServer(io);

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
    onlineUsers.set(socket.user.id, { user: socket.user, socketId: socket.id, socket });
    socket.join(`user:${socket.user.id}`);
    socket.emit("userOnline", publicUser(socket.user));
    emitOnlinePlayers(io);

    socket.on("findMatch", async () => {
      try {
        removeFromQueue(socket.user.id);
        const opponent = waitingQueue.shift();
        if (!opponent || opponent.user.id === socket.user.id) {
          waitingQueue.push({ user: socket.user, socketId: socket.id, socket });
          socket.emit("matchmakingStatus", { status: "queued" });
          return;
        }

        await createGame(io, opponent, { user: socket.user, socketId: socket.id, socket });
      } catch (error) {
        console.error("Socket findMatch error:", error);
        socket.emit("socketError", { message: "Matchmaking error occurred" });
      }
    });

    socket.on("leaveQueue", () => {
      removeFromQueue(socket.user.id);
      socket.emit("matchmakingStatus", { status: "idle" });
    });

    socket.on("startTournamentMatch", async ({ matchId }) => {
      try {
        const { getMatchById } = await import("../models/Match.js");
        const match = await getMatchById(matchId);
        if (!match) return socket.emit("socketError", { message: "Match not found / المباراة غير موجودة" });
        if (match.winner || match.result) {
          return socket.emit("socketError", { message: "Match already finished / انتهت المباراة بالفعل" });
        }

        if (match.scheduled_time) {
          const scheduled = new Date(match.scheduled_time).getTime();
          if (Date.now() < scheduled) {
            return socket.emit("socketError", { message: "Match has not started yet / لم يحن وقت المباراة بعد" });
          }
        }

        const isWhite = match.white_player === socket.user.id;
        const isBlack = match.black_player === socket.user.id;
        if (!isWhite && !isBlack) {
          return socket.emit("socketError", { message: "You are not a participant in this match / أنت لست طرفاً في هذه المباراة" });
        }

        let state = tournamentMatches.get(matchId);
        if (!state) {
          state = {
            matchId,
            white_player: match.white_player,
            black_player: match.black_player,
            whiteReady: false,
            blackReady: false,
            timer: null
          };
          tournamentMatches.set(matchId, state);
        }

        if (isWhite) {
          state.whiteReady = true;
        } else {
          state.blackReady = true;
        }

        // Notify both players of readiness update
        io.to(`user:${match.white_player}`).emit("tournamentReadyUpdate", {
          matchId,
          whiteReady: state.whiteReady,
          blackReady: state.blackReady,
          timerStarted: state.timer ? true : false
        });
        io.to(`user:${match.black_player}`).emit("tournamentReadyUpdate", {
          matchId,
          whiteReady: state.whiteReady,
          blackReady: state.blackReady,
          timerStarted: state.timer ? true : false
        });

        if (state.whiteReady && state.blackReady) {
          if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
          }
          const whiteOnline = onlineUsers.get(match.white_player);
          const blackOnline = onlineUsers.get(match.black_player);
          if (!whiteOnline || !blackOnline) {
            return socket.emit("socketError", { message: "Opponent is offline / الخصم غير متصل" });
          }

          await createTournamentGame(io, match, whiteOnline.socketId, blackOnline.socketId);
          tournamentMatches.delete(matchId);
        } else {
          if (!state.timer) {
            state.timer = setTimeout(async () => {
              try {
                const winnerId = state.whiteReady ? state.white_player : state.black_player;
                const winnerResult = state.whiteReady ? "white_win" : "black_win";

                await finishMatch({
                  matchId: state.matchId,
                  winner: winnerId,
                  result: winnerResult,
                  reason: "timeout"
                });

                io.to(`user:${state.white_player}`).emit("tournamentMatchForfeit", { matchId: state.matchId, winnerId });
                io.to(`user:${state.black_player}`).emit("tournamentMatchForfeit", { matchId: state.matchId, winnerId });
                io.emit("tournamentMatchUpdated", { matchId: state.matchId });

                tournamentMatches.delete(matchId);
              } catch (err) {
                console.error("Forfeit timer error:", err);
              }
            }, 5 * 60 * 1000);

            io.to(`user:${match.white_player}`).emit("tournamentReadyUpdate", {
              matchId,
              whiteReady: state.whiteReady,
              blackReady: state.blackReady,
              timerStarted: true
            });
            io.to(`user:${match.black_player}`).emit("tournamentReadyUpdate", {
              matchId,
              whiteReady: state.whiteReady,
              blackReady: state.blackReady,
              timerStarted: true
            });
          }
        }
      } catch (error) {
        console.error("startTournamentMatch error:", error);
        socket.emit("socketError", { message: "Failed to start match" });
      }
    });

    socket.on("joinRoom", ({ roomId }) => {
      const game = games.get(roomId);
      if (!game) return socket.emit("socketError", { message: "Game room not found" });
      if (!game.players?.white || !game.players?.black) return socket.emit("socketError", { message: "Game players not initialized" });

      const isPlayer = [game.players.white.id, game.players.black.id].includes(socket.user.id);
      if (!isPlayer) return socket.emit("socketError", { message: "Only players can join this room" });

      socket.join(roomId);
      game.sockets.set(socket.user.id, socket.id);
      socket.emit("gameUpdate", gamePayload(game));
    });

    socket.on("movePiece", async ({ roomId, from, to, promotion = "q" }) => {
      const game = games.get(roomId);
      if (!game || game.status !== "active") return;
      if (!game.players?.white || !game.players?.black) return socket.emit("socketError", { message: "Game players not initialized" });

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
      try {
        const game = games.get(roomId);
        if (!game || game.status !== "active") return;
        if (!game.players?.white || !game.players?.black) {
          return socket.emit("socketError", { message: "Game player data is invalid" });
        }

        const isWhite = game.players.white.id === socket.user.id;
        const isBlack = game.players.black.id === socket.user.id;
        if (!isWhite && !isBlack) {
          return socket.emit("socketError", { message: "You are not a player in this game" });
        }

        await endGame(io, game, isWhite ? "black_win" : "white_win", "resign");
      } catch (error) {
        console.error("Socket resignGame error:", error);
        socket.emit("socketError", { message: "Resignation failed" });
      }
    });

    socket.on("sendGameInvite", async ({ targetCode }) => {
      try {
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
      } catch (error) {
        console.error("Socket sendGameInvite error:", error);
        socket.emit("socketError", { message: "Failed to send game invite" });
      }
    });

    socket.on("acceptGameInvite", async ({ inviteId }) => {
      try {
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
      } catch (error) {
        console.error("Socket acceptGameInvite error:", error);
        socket.emit("socketError", { message: "Failed to accept invite" });
      }
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

    socket.on("sendGameChat", ({ roomId, message }) => {
      const game = games.get(roomId);
      if (!game || game.status !== "active") return;
      if (!game.players?.white || !game.players?.black) return socket.emit("socketError", { message: "Game players not initialized" });

      const isWhite = socket.user.id === game.players.white.id;
      const isBlack = socket.user.id === game.players.black.id;
      if (!isWhite && !isBlack) return socket.emit("socketError", { message: "Only players in this game can chat" });

      const chatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        roomId,
        userId: socket.user.id,
        username: socket.user.username,
        color: isWhite ? "white" : "black",
        message: String(message).trim().slice(0, 300),
        createdAt: new Date().toISOString()
      };
      game.messages.push(chatMessage);
      if (game.messages.length > 100) game.messages.shift();
      io.to(roomId).emit("gameChat", { roomId, message: chatMessage });
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
      try {
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
      } catch (error) {
        console.error("Socket joinInvite error:", error);
        socket.emit("socketError", { message: "Failed to join match by invite link" });
      }
    });

    socket.on("disconnect", async () => {
      try {
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
      } catch (error) {
        console.error("Socket disconnect error:", error);
      }
    });
  });

  return io;
}

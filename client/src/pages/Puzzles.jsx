import { useState, useEffect, useMemo } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { api } from "../services/api.js";
import toast from "react-hot-toast";
import { Trophy, HelpCircle, RefreshCw, ChevronRight, Crown } from "lucide-react";

export default function Puzzles() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [puzzles, setPuzzles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [game, setGame] = useState(null);
  const [status, setStatus] = useState("playing"); // 'playing', 'solved', 'failed'
  const [dailyLimitExceeded, setDailyLimitExceeded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [optionSquares, setOptionSquares] = useState({});
  const [selectedSquare, setSelectedSquare] = useState("");

  const isPremium = user?.role === "admin" || user?.is_premium === 1;

  const customPieces = useMemo(() => {
    const activeTheme = localStorage.getItem("gca_piece_theme") || "neo";
    const themeSlug = activeTheme === "gold" ? "metal" : activeTheme;
    const pieces = ["wp", "wn", "wb", "wr", "wq", "wk", "bp", "bn", "bb", "br", "bq", "bk"];
    const map = {};
    pieces.forEach((p) => {
      const key = p.charAt(0) + p.charAt(1).toUpperCase();
      const isWhite = p.startsWith("w");
      let filterStyle = "none";
      if (activeTheme === "gold") {
        filterStyle = "sepia(1) saturate(6) hue-rotate(10deg) brightness(1.0) contrast(1.1) drop-shadow(0 0 3px rgba(251, 191, 36, 0.7))";
      } else if (activeTheme === "neon") {
        filterStyle = isWhite
          ? "drop-shadow(0 0 5px #06b6d4) brightness(1.2) saturate(1.5)"
          : "drop-shadow(0 0 5px #ec4899) brightness(1.2) saturate(1.5)";
      }
      map[key] = ({ squareWidth }) => (
        <img
          src={`https://images.chesscomfiles.com/chess-themes/pieces/${themeSlug}/150/${p}.png`}
          alt={p}
          style={{ 
            width: squareWidth, 
            height: squareWidth, 
            objectFit: "contain",
            filter: filterStyle
          }}
        />
      );
    });
    return map;
  }, [user]);

  useEffect(() => {
    loadPuzzles();
  }, []);

  async function loadPuzzles() {
    setLoading(true);
    try {
      const res = await api("/premium/puzzles");
      setPuzzles(res.puzzles || []);
      if (res.limitExceeded && !isPremium) {
        setDailyLimitExceeded(true);
      }
      if (res.puzzles && res.puzzles.length > 0) {
        initPuzzle(res.puzzles[0]);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function initPuzzle(puzzle) {
    const newGame = new Chess(puzzle.fen);
    setGame(newGame);
    setStatus("playing");
    setOptionSquares({});
    setSelectedSquare("");
  }

  const getMoveOptions = (square) => {
    if (status !== "playing") return false;
    const piece = game.get(square);
    if (!piece) return false;
    if (piece.color !== game.turn()) return false;

    const moves = game.moves({
      square,
      verbose: true
    });
    if (moves.length === 0) return false;

    const newSquares = {};
    moves.forEach((move) => {
      const isCapture = game.get(move.to);
      newSquares[move.to] = {
        background: isCapture
          ? "radial-gradient(circle, transparent 55%, rgba(243, 156, 18, 0.4) 55%)"
          : "radial-gradient(circle, rgba(243, 156, 18, 0.4) 25%, transparent 25%)",
        borderRadius: "50%"
      };
    });
    newSquares[square] = {
      backgroundColor: "rgba(243, 156, 18, 0.2)"
    };
    return newSquares;
  };

  const onSquareClick = async (square) => {
    if (status !== "playing") return;

    if (optionSquares[square] && square !== selectedSquare) {
      const moveSuccessful = await onDrop(selectedSquare, square);
      if (moveSuccessful) {
        setOptionSquares({});
        setSelectedSquare("");
        return;
      }
    }

    const options = getMoveOptions(square);
    if (options) {
      setOptionSquares(options);
      setSelectedSquare(square);
    } else {
      setOptionSquares({});
      setSelectedSquare("");
    }
  };

  const onPieceDragBegin = (piece, square) => {
    const options = getMoveOptions(square);
    if (options) {
      setOptionSquares(options);
      setSelectedSquare(square);
    }
  };

  const onPieceDragEnd = () => {
    setOptionSquares({});
    setSelectedSquare("");
  };

  async function onDrop(sourceSquare, targetSquare) {
    if (status === "solved") return false;
    setOptionSquares({});
    setSelectedSquare("");

    try {
      const puzzle = puzzles[currentIndex];
      const newGame = new Chess(game.fen());

      const move = newGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q"
      });

      if (!move) return false;

      // Play chess move sound
      let audioUrl = "/sounds/move.mp3";
      if (move.san.includes("+") || move.san.includes("#")) {
        audioUrl = "/sounds/check.mp3";
      } else if (move.captured) {
        audioUrl = "/sounds/capture.mp3";
      }
      const audio = new Audio(audioUrl);
      audio.play().catch(err => console.log("Audio play failed:", err));

      // Check if move notation matches the solution
      // E.g., solution: 'f7f5', notation: 'f7f5' or 'f5' or standard san.
      // Let's check matching via algebraic notation (e.g. sourceSquare + targetSquare)
      const moveAlgebraic = sourceSquare + targetSquare;
      const isCorrect = moveAlgebraic === puzzle.solution || move.san === puzzle.solution;

      if (isCorrect) {
        setGame(newGame);
        setStatus("solved");
        toast.success(lang === "ar" ? "حل صحيح! عمل رائع 🎉" : "Correct solution! Great job! 🎉");

        // Log puzzle solve on server (which increments/checks the limit)
        try {
          await api("/premium/puzzles/solve", {
            method: "POST",
            body: JSON.stringify({ puzzleId: puzzle.id })
          });
        } catch (err) {
          if (err.message.includes("limitExceeded") || err.message.includes("الحساب المجاني")) {
            setDailyLimitExceeded(true);
          } else {
            toast.error(err.message);
          }
        }
        return true;
      } else {
        toast.error(lang === "ar" ? "حركة غير صحيحة، حاول مجدداً!" : "Wrong move, try again!");
        setStatus("failed");
        return false;
      }
    } catch (err) {
      return false;
    }
  }

  function handleReset() {
    if (puzzles.length > 0) {
      initPuzzle(puzzles[currentIndex]);
    }
  }

  function handleNext() {
    if (currentIndex + 1 < puzzles.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      initPuzzle(puzzles[nextIdx]);
    } else {
      toast.success(lang === "ar" ? "أنهيت جميع الألغاز المتاحة اليوم!" : "You finished all available puzzles for today!");
    }
  }

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const res = await api("/premium/checkout", { method: "POST" });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpgrading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px", color: "var(--muted)" }}>
        {lang === "ar" ? "جاري تحميل الألغاز..." : "Loading tactical puzzles..."}
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "75vh",
        padding: "24px"
      }}>
        <div className="glass" style={{
          width: "100%",
          maxWidth: "550px",
          borderRadius: "24px",
          padding: "40px",
          textAlign: "center",
          border: "1px solid var(--accent-glow)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            backgroundColor: "var(--accent-glow)",
            border: "2px solid var(--accent)",
            color: "var(--accent)",
            marginBottom: "24px"
          }}>
            <Crown size={36} />
          </div>

          <h2 style={{ fontSize: "1.75rem", fontWeight: "800", marginBottom: "12px", color: "var(--text)" }}>
            {lang === "ar" ? "افتح حزمة الألغاز التكتيكية" : "Unlock Tactical Puzzles"}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "1rem", lineHeight: "1.6", marginBottom: "32px" }}>
            {lang === "ar"
              ? "حل ألغاز تكتيكية لا نهائية تم اختيارها بعناية لزيادة قوتك الذهنية وتصنيفك في الشطرنج!"
              : "Solve unlimited tactical puzzles handpicked to boost your chess rating and tactical vision!"}
          </p>

          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "32px",
            textAlign: lang === "ar" ? "right" : "left",
            backgroundColor: "rgba(255,255,255,0.03)",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid var(--line)"
          }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <Crown size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span style={{ fontSize: "0.95rem" }}>{lang === "ar" ? "ألغاز تكتيكية غير محدودة يومياً" : "Unlimited tactical puzzles daily"}</span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <Crown size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span style={{ fontSize: "0.95rem" }}>{lang === "ar" ? "صعوبة تتكيف تلقائياً مع مستواك" : "Difficulty dynamically tailored to your rating"}</span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <Crown size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span style={{ fontSize: "0.95rem" }}>{lang === "ar" ? "تتبع دقيق لتقدمك ومهاراتك" : "Track your tactical progress and rating stats"}</span>
            </div>
          </div>

          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="hero-btn hero-btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              minHeight: "54px",
              fontSize: "1.1rem"
            }}
          >
            <Crown size={20} />
            <span>{upgrading ? (lang === "ar" ? "جاري التحضير..." : "Preparing...") : (lang === "ar" ? "اشترك الآن بـ $9.99 فقط" : "Upgrade to Premium $9.99/mo")}</span>
          </button>
        </div>
      </div>
    );
  }

  const puzzle = puzzles[currentIndex];

  return (
    <div className="puzzles-layout">
      {/* Board Panel */}
      <div className="panel puzzle-board-panel" style={{
        backgroundColor: "var(--panel-solid)"
      }}>
        <div className="puzzle-board-wrap">
          {game && (
            <Chessboard
              position={game.fen()}
              onPieceDrop={onDrop}
              onPieceDragBegin={onPieceDragBegin}
              onPieceDragEnd={onPieceDragEnd}
              onSquareClick={onSquareClick}
              boardOrientation={puzzle?.fen?.includes(" b ") ? "black" : "white"}
              customPieces={customPieces}
              customDarkSquareStyle={{ backgroundColor: "var(--board-dark)" }}
              customLightSquareStyle={{ backgroundColor: "var(--board-light)" }}
              customBoardStyle={{ borderRadius: "10px", boxShadow: "0 34px 110px rgba(0,0,0,.48)" }}
              customSquareStyles={optionSquares}
            />
          )}
        </div>
      </div>

      {/* Info & Action Sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="panel" style={{ padding: "24px", backgroundColor: "var(--panel-solid)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <Trophy style={{ color: "var(--accent)" }} size={20} />
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800" }}>
              {lang === "ar" ? `لغز رقم #${puzzle?.id}` : `Puzzle #${puzzle?.id}`}
            </h3>
          </div>

          <div style={{
            fontSize: "0.95rem",
            lineHeight: "1.6",
            color: "var(--text)",
            backgroundColor: "rgba(255,255,255,0.03)",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid var(--line)",
            marginBottom: "20px"
          }}>
            <strong style={{ display: "block", color: "var(--accent)", marginBottom: "4px" }}>
              {lang === "ar" ? "المطلوب:" : "Task:"}
            </strong>
            {puzzle?.description}
            <div style={{ marginTop: "12px", fontSize: "0.8rem", color: "var(--muted)" }}>
              Rating: {puzzle?.rating} Elo
            </div>
          </div>

          {status === "solved" && (
            <div style={{
              backgroundColor: "rgba(34,197,94,0.1)",
              border: "1px solid #22c55e",
              color: "#22c55e",
              padding: "12px",
              borderRadius: "8px",
              textAlign: "center",
              fontWeight: "700",
              fontSize: "0.95rem",
              marginBottom: "20px"
            }}>
              {lang === "ar" ? "أحسنت! اللغز مكتمل" : "Well Done! Puzzle Solved"}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleReset}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: "transparent",
                color: "var(--text)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontWeight: "600"
              }}
            >
              <RefreshCw size={16} />
              <span>{lang === "ar" ? "إعادة محاولة" : "Try Again"}</span>
            </button>

            <button
              onClick={handleNext}
              disabled={status !== "solved"}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                background: status === "solved" ? "var(--accent)" : "var(--line)",
                color: status === "solved" ? "black" : "var(--muted)",
                cursor: status === "solved" ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontWeight: "700"
              }}
            >
              <span>{lang === "ar" ? "التالي" : "Next Puzzle"}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Free users Banner */}
        {!isPremium && (
          <div className="glass" style={{
            padding: "20px",
            borderRadius: "16px",
            border: "1px solid var(--accent-glow)",
            textAlign: "center"
          }}>
            <HelpCircle size={24} style={{ color: "var(--accent)", marginBottom: "8px" }} />
            <h4 style={{ margin: "0 0 6px 0", fontSize: "0.95rem", fontWeight: "700" }}>
              {lang === "ar" ? "ترقية لحساب بريميوم" : "Upgrade to Premium"}
            </h4>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "0 0 16px 0", lineHeight: "1.4" }}>
              {lang === "ar"
                ? "احصل على ألغاز غير محدودة وتحليلات بالذكاء الاصطناعي مع مدرب الشطرنج الخاص بك."
                : "Get unlimited tactical puzzles, Stockfish analysis, and your personal AI Coach."}
            </p>
            <button
              onClick={handleUpgrade}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "var(--accent)",
                color: "black",
                fontWeight: "700",
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              {lang === "ar" ? "اشترك الآن بـ $9.99" : "Upgrade $9.99/mo"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

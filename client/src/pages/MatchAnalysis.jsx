import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Loader from "../components/Loader.jsx";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { Chess } from "chess.js";
import { loadComputerMatches } from "../utils/computerMatches.js";

const modalStyles = `
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius:8px; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius:8px; }

  .analysis-match-row { border-radius:12px; padding:14px 16px; cursor:pointer; transition:all 0.2s; background:var(--item-bg); border:1px solid var(--line); margin-bottom:8px; animation:slideUp 0.25s ease both; }
  .analysis-match-row:hover { background:var(--accent-glow); border-color:var(--accent); transform:translateX(3px); }
  .analysis-match-row.is-selected { background:var(--accent-glow); border-color:var(--accent); box-shadow:0 0 0 2px var(--accent-glow-ring); }

  .match-players-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px; }
  .pc-white { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:20px; font-weight:700; font-size:0.8rem; background:var(--item-bg); border:1px solid var(--line); color:var(--text); }
  .pc-black { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:20px; font-weight:700; font-size:0.8rem; background:#1e1e28; border:1px solid rgba(100,100,130,0.4); color:#d0d0e0; }
  .pc-vs { font-size:0.72rem; color:var(--muted); font-weight:600; }
  .match-result-badge { font-size:0.72rem; font-weight:700; padding:3px 9px; border-radius:20px; white-space:nowrap; margin-left:auto; }
  .badge-white { background:var(--bg-soft); border:1px solid var(--line); color:var(--text); }
  .badge-black { background:#1e1e28; border:1px solid rgba(100,100,130,0.4); color:#c8c8d8; }
  .badge-draw { background:rgba(99,102,241,0.2); color:#a5b4fc; }
  .badge-ongoing { background:rgba(16,185,129,0.15); color:#6ee7b7; }
  .match-row-time { font-size:0.75rem; opacity:0.6; margin-top:2px; color:var(--muted); }
  .computer-badge { font-size:0.72rem; opacity:0.75; }

  .players-duel-banner { display:flex; align-items:stretch; gap:12px; margin:16px 0; }
  .player-banner { flex:1; display:flex; flex-direction:column; align-items:center; padding:18px 12px; border-radius:14px; gap:6px; text-align:center; }
  .player-banner.white-banner { background:var(--item-bg); color:var(--text); border:1px solid var(--line); }
  .player-banner.black-banner { background:var(--item-bg) !important; color:var(--text) !important; border:1px solid var(--line) !important; }
  .banner-piece { font-size:2.4rem; line-height:1; }
  .banner-color-label { font-size:0.68rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; opacity:0.5; }
  .banner-username { font-size:1rem; font-weight:800; word-break:break-all; }
  .banner-winner { font-size:0.78rem; color:#fbbf24; font-weight:700; margin-top:2px; }
  .vs-circle { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--accent-glow); border:1px solid var(--accent); color:var(--accent-strong); font-size:0.8rem; font-weight:700; flex-shrink:0; align-self:center; }

  .analysis-summary-box { background:var(--item-bg); border:1px solid var(--line); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:10px; }
  .summary-line { display:flex; justify-content:space-between; font-size:0.87rem; align-items:center; }
  .value-highlight { font-weight:700; color:var(--accent); }

  .analysis-stats-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .player-stats-card { border-radius:14px; padding:16px; }
  .player-stats-card.white-player { background:var(--item-bg) !important; color:var(--text) !important; border:1px solid var(--line) !important; }
  .player-stats-card.white-player .player-title { color:var(--text) !important; border-bottom:1px solid var(--line) !important; }
  .player-stats-card.white-player .stats-list li { border-bottom: 1px solid var(--line) !important; color:var(--text) !important; }
  .player-stats-card.white-player .stats-list li span { color:var(--muted) !important; }

  .player-stats-card.black-player { background:var(--item-bg) !important; color:var(--text) !important; border:1px solid var(--line) !important; }
  .player-stats-card.black-player .player-title { color:var(--text) !important; border-bottom:1px solid var(--line) !important; }
  .player-stats-card.black-player .stats-list li { border-bottom:1px solid var(--line) !important; color:var(--text) !important; }
  .player-stats-card.black-player .stats-list li span:not(.stat-value) { color:var(--muted) !important; }

  .player-title { display:flex; align-items:center; gap:6px; font-size:0.88rem; font-weight:700; margin-bottom:12px; }
  .stats-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; }
  .stats-list li { display:flex; justify-content:space-between; align-items:center; font-size:0.83rem; }
  .stat-value { font-weight:700; font-size:1rem; }
  .stat-value.excellent { color:#34d399; }
  .stat-value.good { color:#60a5fa; }
  .stat-value.bad { color:#f87171; }
  .stat-value.captures { color:#fbbf24; }
  .stat-value.points { color:#a78bfa; }

  .section-title { font-size:0.78rem; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; opacity:0.5; margin:0 0 10px; }
  .moves-history-box { background:var(--item-bg); border:1px solid var(--line); border-radius:12px; padding:16px; }
  .moves-history-list { display:flex; flex-direction:column; gap:5px; max-height:220px; overflow-y:auto; padding-right:4px; }
  .move-history-item { display:flex; align-items:center; gap:10px; padding:6px 10px; background:rgba(255,255,255,0.03); border-radius:8px; font-size:0.82rem; }
  .move-label { opacity:0.45; min-width:64px; }
  .move-notation { font-family:monospace; font-weight:700; color:var(--text); }
  .move-time { opacity:0.35; margin-left:auto; font-size:0.74rem; }

  .stockfish-analysis-box { background:rgba(16,185,129,0.04); border:1px solid rgba(16,185,129,0.15); border-radius:12px; padding:16px; }
  .engine-meta { font-size:0.8rem; opacity:0.55; margin-bottom:12px; }
  .stockfish-positions-list { display:flex; flex-direction:column; gap:10px; max-height:260px; overflow-y:auto; }
  .stockfish-position-item { background:var(--item-bg); border:1px solid var(--line); border-radius:10px; padding:10px 12px; font-size:0.82rem; }
  .position-item-header { display:flex; justify-content:space-between; margin-bottom:8px; font-weight:600; }
  .position-details { display:flex; flex-direction:column; gap:4px; opacity:0.72; }
  .pv-code { font-family:monospace; font-size:0.77rem; }
  .no-stockfish-box, .analysis-empty-placeholder { display:flex; align-items:center; justify-content:center; min-height:200px; opacity:0.38; text-align:center; }

  .analysis-content-header { display:flex; justify-content:flex-end; gap:8px; padding:0 0 12px; }
  .analysis-sections-stack { display:flex; flex-direction:column; gap:16px; }

  @media (max-width: 768px) {
    .analysis-stats-grid { grid-template-columns:1fr; }
    .players-duel-banner { flex-direction:column; }
  }
`;

function evaluateBoard(chess, playerColor) {
  let score = 0;
  const board = chess.board();
  const pieceValues = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 9000 };
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        const val = pieceValues[piece.type] || 0;
        if (piece.color === playerColor) score += val; else score -= val;
      }
    }
  }
  return score;
}

function reasonLabelEnglish(reason) {
  switch (reason) {
    case "resign": return "Resignation";
    case "timeout": return "Timeout";
    case "disconnect": return "Disconnected";
    case "stalemate": return "Stalemate";
    case "draw": return "Draw";
    case "checkmate": return "Checkmate";
    case "white_win":
    case "black_win":
      return "Checkmate";
    case "abandoned": return "Abandoned";
    case "finished": return "Finished";
    
    default: return reason || "Unknown";
  }
}

function reasonLabelArabic(reason) {
  switch (reason) {
    case "resign": return "انسحاب";
    case "timeout": return "انتهى الوقت";
    case "disconnect": return "انقطع الاتصال";
    case "stalemate": return "تعادل";
    case "draw": return "تعادل";
    case "checkmate": return "كش ملك";
    case "white_win":
    case "black_win":
      return "كش ملك";
    case "abandoned": return "مباريات متروكة";
    case "finished": return "انتهت";
    default: return reason || "غير معروف";
  }
}

function formatMatchResult(result, userColor, lang, reason) {
  if (!result && reason === "resign") return lang === "ar" ? "المباراة لم تكتمل" : "Match not completed";
  if (reason === "resign") return lang === "ar" ? "انسحب لاعب" : "A player resigned";
  if (!result) return lang === "ar" ? "قيد اللعب" : "In progress";
  if (result === "draw") return lang === "ar" ? "تعادل" : "Draw";
  const didWin = (result === "white_win" && userColor === "white") || (result === "black_win" && userColor === "black");
  if (didWin) return lang === "ar" ? "فزت" : "You won";
  return lang === "ar" ? "خسرت" : "You lost";
}

export default function MatchAnalysis() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const selectedQueryId = useMemo(() => new URLSearchParams(location.search).get("id"), [location.search]);

  useEffect(() => {
    let serverMatches = [];
    api("/matches/mine")
      .then(({ matches }) => {
        serverMatches = matches || [];
      })
      .catch((err) => toast.error(err.message))
      .finally(() => {
        const computerMatches = loadComputerMatches();
        setMatches([...computerMatches, ...serverMatches]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    setPanelOpen(Boolean(selected && analysis));
  }, [selected, analysis]);

  async function viewMatch(matchId) {
    setAnalysis(null);
    setSelected(matchId);
    const localMatch = loadComputerMatches().find((item) => item.id === matchId);

    if (localMatch) {
      const chess = new Chess();
      const stats = {
        white: { excellent: 0, good: 0, bad: 0, knights: 0, captures: 0, points: 0 },
        black: { excellent: 0, good: 0, bad: 0, knights: 0, captures: 0, points: 0 }
      };
      const moveHistory = [];
      const userColor = localMatch.userColor || (localMatch.white_username === user.username ? "white" : "black");

      for (const [index, mv] of (localMatch.moves || []).entries()) {
        const player = mv.color;
        if (mv.piece === "n") stats[player].knights += 1;
        if (mv.captured) stats[player].captures += 1;
        moveHistory.push({
          ...mv,
          moveNumber: Math.ceil((index + 1) / 2),
          color: mv.color,
          notation: mv.move_notation
        });
      }

      setAnalysis({ match: localMatch, moves: localMatch.moves || [], stockfish: null, moveHistory, userColor, stats });
      return;
    }

    try {
      const { match, moves, stockfish } = await api(`/matches/${matchId}/analysis`);
      const chess = new Chess();
      const stats = {
        white: { excellent: 0, good: 0, bad: 0, knights: 0, captures: 0, points: 0 },
        black: { excellent: 0, good: 0, bad: 0, knights: 0, captures: 0, points: 0 }
      };
      const moveHistory = [];
      const userColor = match.white_player === user.id ? "white" : "black";

      for (const [index, mv] of moves.entries()) {
        try {
          const move = chess.move(mv.move_notation, { sloppy: true });
          if (!move) continue;
          const player = move.color === "w" ? "white" : "black";
          moveHistory.push({
            ...mv,
            moveNumber: Math.ceil((index + 1) / 2),
            color: player,
            notation: mv.move_notation
          });

          if (move.piece === "n") stats[player].knights += 1;
          if (move.captured) stats[player].captures += 1;
          const after = evaluateBoard(chess, move.color);
          if (after > 30) stats[player].excellent += 1;
          else if (after > 5) stats[player].good += 1;
          else if (after < -5) stats[player].bad += 1;
          stats[player].points += Math.round(after);
        } catch (e) {
          continue;
        }
      }

      setAnalysis({ match, moves, stockfish, moveHistory, userColor, stats });
    } catch (e) {
      if (e.message && (e.message.includes("limitExceeded") || e.message.includes("Premium") || e.message.includes("بريميوم") || e.message.includes("الحساب المجاني"))) {
        toast((t) => (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "4px" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: "500" }}>{e.message}</span>
            <button 
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  const res = await api("/premium/checkout", { method: "POST" });
                  if (res.checkoutUrl) {
                    window.location.href = res.checkoutUrl;
                  }
                } catch (err) {
                  toast.error(err.message);
                }
              }}
              style={{
                backgroundColor: "#22c55e",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "0.85rem",
                alignSelf: "flex-start"
              }}
            >
              {lang === "ar" ? "اشترك الآن بـ $9.99" : "Upgrade to Premium $9.99"}
            </button>
          </div>
        ), { duration: 7000 });
      } else {
        toast.error(e.message);
      }
    }
  }

  function closePanel() {
    setSelected(null);
    setAnalysis(null);
    setPanelOpen(false);
  }

  async function deleteSelectedMatch(matchId) {
    if (!matchId) return;
    const confirmText = lang === "ar" ? "هل تريد حذف هذا التحليل نهائياً؟" : "Do you want to delete this analysis permanently?";
    if (!window.confirm(confirmText)) return;

    try {
      setDeleting(true);
      if (analysis?.match?.source === "computer") {
        const remaining = loadComputerMatches().filter((item) => item.id !== matchId);
        localStorage.setItem("gca_computer_matches", JSON.stringify(remaining));
      } else {
        await api(`/matches/${matchId}`, { method: "DELETE" });
      }
      setMatches((current) => current.filter((item) => item.id !== matchId));
      closePanel();
      toast.success(lang === "ar" ? "تم حذف التحليل" : "Analysis deleted");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (!selected && selectedQueryId && matches.length) {
      const matchFromQuery = matches.find((item) => String(item.id) === selectedQueryId);
      if (matchFromQuery) {
        viewMatch(matchFromQuery.id);
      }
    }
  }, [selectedQueryId, matches, selected]);

  if (loading) return <Loader label={lang === "ar" ? "جاري تحميل المباريات..." : "Loading matches..."} />;

  function getResultBadge(m) {
    if (!m.result) {
      if (m.reason === "resign") return <span className="match-result-badge badge-ongoing">{lang === "ar" ? "انسحاب" : "Resignation"}</span>;
      return <span className="match-result-badge badge-ongoing">{lang === "ar" ? "قيد اللعب" : "Ongoing"}</span>;
    }
    if (m.result === "draw") return <span className="match-result-badge badge-draw">{lang === "ar" ? "تعادل" : "Draw"}</span>;
    if (m.result === "white_win") return <span className="match-result-badge badge-white">♔ {lang === "ar" ? "فوز الأبيض" : "White Won"}</span>;
    if (m.result === "black_win") return <span className="match-result-badge badge-black">♚ {lang === "ar" ? "فوز الأسود" : "Black Won"}</span>;
    return <span className="match-result-badge badge-ongoing">{m.result}</span>;
  }

  const isWhiteWinner = analysis?.match?.result === "white_win";
  const isBlackWinner = analysis?.match?.result === "black_win";

  return (
    <section className={`panel analysis-panel-wrapper ${selected && panelOpen ? "has-selection" : ""}`}>
      <style>{modalStyles}</style>
      <div className="panel-title">
        <h2>{lang === "ar" ? "تحليل مبارياتي" : "My Match Analysis"}</h2>
      </div>

      <div className="analysis-layout-container">
        {/* ── Left: Matches list ── */}
        <div className="analysis-sidebar-list">
          {matches.map((m) => (
            <div
              key={m.id}
              className={`analysis-match-row ${selected === m.id ? "is-selected" : ""}`}
              onClick={() => viewMatch(m.id)}
            >
              <div className="match-players-row">
                <span className="pc-white">♙ {m.white_username}</span>
                <span className="pc-vs">vs</span>
                <span className="pc-black">♟ {m.black_username}</span>
                {m.source === "computer" && <span className="computer-badge">🖥</span>}
                {getResultBadge(m)}
              </div>
              <div className="match-row-time">{new Date(m.end_time || m.start_time).toLocaleString()}</div>
            </div>
          ))}
          {matches.length === 0 && (
            <p className="muted" style={{ textAlign: "center", padding: "2rem" }}>
              {lang === "ar" ? "لا توجد مباريات بعد" : "No matches yet"}
            </p>
          )}
        </div>

        {/* ── Right: Analysis Detail ── */}
        <div className="analysis-detail-column">
          {!selected && (
            <div className="analysis-empty-placeholder">
              <p className="muted">{lang === "ar" ? "اختر مباراة من القائمة" : "Select a match to view analysis"}</p>
            </div>
          )}

          {analysis && panelOpen && (
            <div className="analysis-content-card">
              {/* Header actions */}
              <div className="analysis-content-header">
                <button type="button" className="secondary close-btn" onClick={closePanel}>
                  {lang === "ar" ? "✕ إغلاق" : "✕ Close"}
                </button>
                {(analysis.match.source === "computer" || user.role === "admin" || analysis.match.white_player === user.id || analysis.match.black_player === user.id) && (
                  <button type="button" className="danger delete-btn" disabled={deleting} onClick={() => deleteSelectedMatch(analysis.match.id)}>
                    {deleting ? (lang === "ar" ? "جاري..." : "Deleting...") : (lang === "ar" ? "حذف" : "Delete")}
                  </button>
                )}
              </div>

              <div className="analysis-sections-stack">
                {/* ── Players duel banner ── */}
                <div className="players-duel-banner">
                  <div className="player-banner white-banner">
                    <span className="banner-piece">♔</span>
                    <span className="banner-color-label">{lang === "ar" ? "الأبيض" : "White"}</span>
                    <span className="banner-username">{analysis.match.white_username}</span>
                    {isWhiteWinner && <span className="banner-winner">🏆 {lang === "ar" ? "الفائز" : "Winner"}</span>}
                  </div>
                  <div className="vs-circle">VS</div>
                  <div className="player-banner black-banner">
                    <span className="banner-piece">♚</span>
                    <span className="banner-color-label">{lang === "ar" ? "الأسود" : "Black"}</span>
                    <span className="banner-username">{analysis.match.black_username}</span>
                    {isBlackWinner && <span className="banner-winner">🏆 {lang === "ar" ? "الفائز" : "Winner"}</span>}
                  </div>
                </div>

                {/* ── Match outcome ── */}
                <div className="analysis-summary-box">
                  <div className="summary-line">
                    <strong>{lang === "ar" ? "نتيجة المباراة" : "Result"}:</strong>
                    <span className="value-highlight">{formatMatchResult(analysis.match.result, analysis.userColor, lang, analysis.match.reason)}</span>
                  </div>
                  <div className="summary-line">
                    <strong>{lang === "ar" ? "سبب النهاية" : "End reason"}:</strong>
                    <span className="value-highlight">{analysis.match.reason ? (lang === "ar" ? reasonLabelArabic(analysis.match.reason) : reasonLabelEnglish(analysis.match.reason)) : (lang === "ar" ? "غير معروف" : "Unknown")}</span>
                  </div>
                  <div className="summary-line">
                    <strong>{lang === "ar" ? "لونك" : "Your color"}:</strong>
                    <span className="value-highlight">{analysis.userColor === "white" ? `♔ ${lang === "ar" ? "الأبيض" : "White"}` : `♚ ${lang === "ar" ? "الأسود" : "Black"}`}</span>
                  </div>
                </div>

                {/* ── Stats ── */}
                <div className="analysis-stats-grid">
                  <div className="player-stats-card white-player">
                    <strong className="player-title">♔ {analysis.match.white_username}</strong>
                    <ul className="stats-list">
                      <li><span>{lang === "ar" ? "ممتاز" : "Excellent"}</span><strong className="stat-value excellent">{analysis.stats.white.excellent}</strong></li>
                      <li><span>{lang === "ar" ? "جيد" : "Good"}</span><strong className="stat-value good">{analysis.stats.white.good}</strong></li>
                      <li><span>{lang === "ar" ? "سيء" : "Bad"}</span><strong className="stat-value bad">{analysis.stats.white.bad}</strong></li>
                      <li><span>{lang === "ar" ? "التقاطات" : "Captures"}</span><strong className="stat-value captures">{analysis.stats.white.captures}</strong></li>
                      <li><span>{lang === "ar" ? "نقاط" : "Points"}</span><strong className="stat-value points">{analysis.stats.white.points}</strong></li>
                    </ul>
                  </div>
                  <div className="player-stats-card black-player">
                    <strong className="player-title">♚ {analysis.match.black_username}</strong>
                    <ul className="stats-list">
                      <li><span>{lang === "ar" ? "ممتاز" : "Excellent"}</span><strong className="stat-value excellent">{analysis.stats.black.excellent}</strong></li>
                      <li><span>{lang === "ar" ? "جيد" : "Good"}</span><strong className="stat-value good">{analysis.stats.black.good}</strong></li>
                      <li><span>{lang === "ar" ? "سيء" : "Bad"}</span><strong className="stat-value bad">{analysis.stats.black.bad}</strong></li>
                      <li><span>{lang === "ar" ? "التقاطات" : "Captures"}</span><strong className="stat-value captures">{analysis.stats.black.captures}</strong></li>
                      <li><span>{lang === "ar" ? "نقاط" : "Points"}</span><strong className="stat-value points">{analysis.stats.black.points}</strong></li>
                    </ul>
                  </div>
                </div>

                {/* ── Move history ── */}
                <div className="moves-history-box">
                  <h4 className="section-title">{lang === "ar" ? "تحركاتك" : "Your moves"}</h4>
                  {analysis.moveHistory.filter((mv) => mv.color === analysis.userColor).length ? (
                    <div className="moves-history-list">
                      {analysis.moveHistory.filter((mv) => mv.color === analysis.userColor).map((mv, idx) => (
                        <div key={mv.id || idx} className="move-history-item">
                          <span className="move-label"># {mv.moveNumber}</span>
                          <strong className="move-notation">{mv.notation}</strong>
                          <span className="move-time">{mv.move_time ? new Date(mv.move_time).toLocaleTimeString() : ""}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">{lang === "ar" ? "لا توجد تحركات" : "No moves"}</p>
                  )}
                </div>

                {/* ── Stockfish ── */}
                {analysis.stockfish?.positions?.length > 0 ? (
                  <div className="stockfish-analysis-box">
                    <h4 className="section-title">Stockfish {lang === "ar" ? "تحليل" : "Analysis"}</h4>
                    <p className="engine-meta">
                      <strong>{analysis.stockfish.engine?.name || "Stockfish"}</strong> · {lang === "ar" ? "عمق" : "Depth"}: <strong>{analysis.stockfish.engine?.depth || 0}</strong>
                    </p>
                    <div className="stockfish-positions-list">
                      {analysis.stockfish.positions.map((pos, idx) => (
                        <div key={idx} className="stockfish-position-item">
                          <div className="position-item-header">
                            <strong>#{pos.moveNumber} {pos.color === "white" ? "♔" : "♚"} {pos.color === "white" ? analysis.match.white_username : analysis.match.black_username}</strong>
                            <span>{pos.move}</span>
                          </div>
                          <div className="position-details">
                            <div>{lang === "ar" ? "أفضل حركة" : "Best"}: <strong>{pos.bestMove || "-"}</strong></div>
                            <div>{lang === "ar" ? "التقييم" : "Score"}: <strong>{pos.score ? (pos.score.type === "cp" ? `${(pos.score.value / 100).toFixed(1)} cp` : `${pos.score.value} mate`) : "-"}</strong></div>
                            <div className="pv-code">PV: {pos.pv?.join(" ") || "-"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="no-stockfish-box">
                    <p className="muted">{lang === "ar" ? "لا يوجد تحليل Stockfish" : "No Stockfish analysis available"}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}




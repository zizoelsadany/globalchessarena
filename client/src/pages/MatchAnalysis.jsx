import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import Loader from "../components/Loader.jsx";
import { api } from "../services/api.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { Chess } from "chess.js";

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

export default function MatchAnalysis() {
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    api("/matches/mine")
      .then(({ matches }) => setMatches(matches))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function viewMatch(matchId) {
    setAnalysis(null);
    setSelected(matchId);
    try {
      const { match, moves } = await api(`/matches/${matchId}`);
      // build chess and analyze
      const chess = new Chess();
      const stats = {
        white: { excellent: 0, good: 0, bad: 0, knights: 0, captures: 0, points: 0 },
        black: { excellent: 0, good: 0, bad: 0, knights: 0, captures: 0, points: 0 }
      };

      for (const mv of moves) {
        // mv.move_notation might be SAN; try to apply by generating possible moves sequence
        try {
          // attempt to move by SAN using chess.js
          const move = chess.move(mv.move_notation, { sloppy: true });
          if (!move) continue;
          const player = move.color === "w" ? "white" : "black";
          if (move.piece === "n") stats[player].knights += 1;
          if (move.captured) stats[player].captures += 1;
          // simple delta evaluation
          const before = 0; // not available here
          const after = evaluateBoard(chess, move.color);
          // use after as heuristic
          if (after > 30) stats[player].excellent += 1;
          else if (after > 5) stats[player].good += 1;
          else if (after < -5) stats[player].bad += 1;
          stats[player].points += Math.round(after);
        } catch (e) {
          continue;
        }
      }

      setAnalysis({ match, moves, stats });
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (loading) return <Loader label={lang === "ar" ? "جاري تحميل المباريات..." : "Loading matches..."} />;

  return (
    <section className="panel">
      <div className="panel-title">
        <h2>{lang === "ar" ? "تحليل مبارياتي" : "My Match Analysis"}</h2>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 320 }}>
          {matches.map((m) => (
            <div key={m.id} className="match-row" style={{ padding: 12, borderBottom: "1px solid var(--line)", cursor: "pointer" }} onClick={() => viewMatch(m.id)}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{m.white_username} vs {m.black_username}</strong>
                <span style={{ color: "var(--text-muted)" }}>{m.result || (m.end_time ? "Finished" : "In progress")}</span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 6 }}>{new Date(m.end_time || m.start_time).toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          {!selected && <p className="muted">{lang === "ar" ? "اختر مباراة لعرض التحليل" : "Select a match to view analysis"}</p>}
          {analysis && (
            <div>
              <h3 style={{ marginTop: 0 }}>{analysis.match.white_username} vs {analysis.match.black_username}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <strong>{analysis.match.white_username}</strong>
                  <ul>
                    <li>Excellent: {analysis.stats.white.excellent}</li>
                    <li>Good: {analysis.stats.white.good}</li>
                    <li>Bad: {analysis.stats.white.bad}</li>
                    <li>Knight moves: {analysis.stats.white.knights}</li>
                    <li>Captures: {analysis.stats.white.captures}</li>
                    <li>Points: {analysis.stats.white.points}</li>
                  </ul>
                </div>
                <div>
                  <strong>{analysis.match.black_username}</strong>
                  <ul>
                    <li>Excellent: {analysis.stats.black.excellent}</li>
                    <li>Good: {analysis.stats.black.good}</li>
                    <li>Bad: {analysis.stats.black.bad}</li>
                    <li>Knight moves: {analysis.stats.black.knights}</li>
                    <li>Captures: {analysis.stats.black.captures}</li>
                    <li>Points: {analysis.stats.black.points}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

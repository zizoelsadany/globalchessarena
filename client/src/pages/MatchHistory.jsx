import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import Loader from "../components/Loader.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function MatchHistory() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLanguage();

  useEffect(() => {
    api("/matches/mine")
      .then(({ matches }) => setMatches(matches))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label={lang === "ar" ? "جاري تحميل سجل المباريات..." : "Loading matches..."} />;

  function formatResult(res) {
    if (!res) return lang === "ar" ? "نشطة" : "Active";
    if (res === "white_win") return lang === "ar" ? "فوز الأبيض" : "White Won";
    if (res === "black_win") return lang === "ar" ? "فوز الأسود" : "Black Won";
    if (res === "draw") return lang === "ar" ? "تعادل" : "Draw";
    return res;
  }

  return (
    <section className="panel">
      <div className="panel-title"><h2>{t("history")}</h2></div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "-10px 0 16px" }}>{t("reviewPastMatches")}</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("white")}</th>
              <th>{t("black")}</th>
              <th>{t("result")}</th>
              <th>{lang === "ar" ? "الفائز" : "Winner"}</th>
              <th>{lang === "ar" ? "تاريخ الانتهاء" : "Ended"}</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match.id}>
                <td>{match.white_username}</td>
                <td>{match.black_username}</td>
                <td>{formatResult(match.result)}</td>
                <td>{match.winner_username || "-"}</td>
                <td>{match.end_time ? new Date(match.end_time).toLocaleString(lang === "ar" ? "ar-EG" : "en-US") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!matches.length && <p className="muted" style={{ padding: "16px", textAlign: "center" }}>{lang === "ar" ? "لا توجد مباريات مكتملة بعد." : "No completed matches yet."}</p>}
      </div>
    </section>
  );
}

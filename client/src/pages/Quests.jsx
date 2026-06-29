import { useState, useEffect } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import toast from "react-hot-toast";
import { Target, Coins, Trophy, Sparkles, CheckCircle2, Play, Flame } from "lucide-react";

export default function Quests() {
  const { user, refreshUser } = useAuth();
  const { lang } = useLanguage();
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);

  const fetchQuests = async () => {
    try {
      const data = await api("/gamification/quests");
      setQuests(data.quests || []);
    } catch (err) {
      console.error(err);
      toast.error(lang === "ar" ? "فشل تحميل المهام" : "Failed to load quests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, []);

  const handleDevComplete = async (questKey) => {
    setClaiming(questKey);
    try {
      const res = await api("/gamification/quests/dev-complete", {
        method: "POST",
        body: JSON.stringify({ questKey })
      });

      if (res.success) {
        if (res.completedSet) {
          toast.success(
            lang === "ar" 
              ? "تهانينا! لقد أكملت 4 مهام وحصلت على 20 كوين ونصف مستوى! تم بدء مهام جديدة." 
              : "Congratulations! Completed 4 quests and earned 20 coins + 0.5 level! New quests generated."
          );
        } else {
          toast.success(lang === "ar" ? "تم زيادة تقدم المهمة!" : "Quest progress updated!");
        }
        setQuests(res.quests || []);
        refreshUser();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to complete quest");
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", color: "var(--muted)" }}>
        {lang === "ar" ? "جاري تحميل المهام..." : "Loading quests..."}
      </div>
    );
  }

  const completedCount = quests.filter(q => q.is_completed).length;

  return (
    <div style={{
      maxWidth: "900px",
      margin: "0 auto",
      padding: "24px 16px",
      color: "var(--text)",
      direction: lang === "ar" ? "rtl" : "ltr",
      textAlign: lang === "ar" ? "right" : "left"
    }}>
      {/* Header Panel */}
      <div className="panel" style={{
        borderRadius: "16px",
        padding: "24px",
        marginBottom: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px", margin: 0, color: "var(--text)" }}>
              <Flame style={{ color: "var(--accent)" }} size={32} />
              {lang === "ar" ? "المهام اليومية" : "Daily Quests"}
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: "6px 0 0 0" }}>
              {lang === "ar" 
                ? "أكمل التحديات لكسب الكوينز ورفع مستوى حسابك!" 
                : "Complete challenges to earn coins and level up your account!"}
            </p>
          </div>

          {/* Stats Badges */}
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{
              background: "var(--accent-glow)",
              border: "1px solid var(--accent)",
              padding: "8px 16px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--accent)",
              fontWeight: "bold"
            }}>
              <Coins size={16} />
              <span>{user?.coins ?? 0} {lang === "ar" ? "كوين" : "Coins"}</span>
            </div>
            <div style={{
              background: "var(--accent-glow)",
              border: "1px solid var(--accent)",
              padding: "8px 16px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--accent)",
              fontWeight: "bold"
            }}>
              <Trophy size={16} />
              <span>{lang === "ar" ? `مستوى ${user?.level ?? 1.0}` : `Lv. ${user?.level ?? 1.0}`}</span>
            </div>
          </div>
        </div>

        {/* Quest Set Reward Card */}
        <div style={{
          backgroundColor: "var(--accent-glow)",
          border: "1px dashed var(--accent)",
          borderRadius: "12px",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "14px"
        }}>
          <Sparkles style={{ color: "var(--accent)", flexShrink: 0 }} size={24} />
          <div style={{ flex: 1 }}>
            <strong style={{ display: "block", color: "var(--accent)", fontSize: "0.95rem", marginBottom: "4px" }}>
              {lang === "ar" ? "مكافأة المجموعة الممتدة:" : "Recursive Challenge Reward:"}
            </strong>
            <span style={{ fontSize: "0.85rem", color: "var(--text)", opacity: 0.85 }}>
              {lang === "ar" 
                ? "أكمل كافة المهام الـ 4 النشطة لتحصل فوراً على 20 عملة ذهبية و +0.5 في مستوى حسابك! ثم سيتم تجديد المهام مباشرة." 
                : "Complete all 4 active quests to instantly get 20 Coins and +0.5 Level! A new set will generate immediately."}
            </span>
          </div>
        </div>

        {/* Set progress bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px", color: "var(--muted)" }}>
            <span>{lang === "ar" ? "تقدم المجموعة الحالية:" : "Current Set Progress:"}</span>
            <span style={{ fontWeight: "bold" }}>{completedCount} / 4</span>
          </div>
          <div style={{ width: "100%", height: "8px", backgroundColor: "var(--input-bg)", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{
              width: `${(completedCount / 4) * 100}%`,
              height: "100%",
              background: "var(--accent)",
              borderRadius: "4px",
              transition: "width 0.4s ease"
            }} />
          </div>
        </div>
      </div>

      {/* Quests Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "16px"
      }}>
        {quests.map((quest) => {
          const progressPercent = Math.min(100, (quest.current_value / quest.target_value) * 100);

          return (
            <div
              key={quest.id}
              className="panel"
              style={{
                borderRadius: "14px",
                padding: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                flexWrap: "wrap",
                transition: "transform 0.2s, border-color 0.2s",
                border: quest.is_completed ? "1px solid var(--accent)" : "1px solid var(--line)",
                opacity: quest.is_completed ? 0.8 : 1
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, minWidth: "250px" }}>
                <div style={{
                  backgroundColor: quest.is_completed ? "var(--accent-glow)" : "var(--item-bg)",
                  borderRadius: "50%",
                  width: "48px",
                  height: "48px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: quest.is_completed ? "var(--accent)" : "var(--muted)"
                }}>
                  {quest.is_completed ? <CheckCircle2 size={24} /> : <Target size={24} />}
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: "1.05rem",
                    fontWeight: "700",
                    color: quest.is_completed ? "var(--accent)" : "var(--text)",
                    textDecoration: quest.is_completed ? "line-through" : "none"
                  }}>
                    {lang === "ar" ? quest.title_ar : quest.title_en}
                  </h3>
                  
                  {/* Progress bar inside card */}
                  {!quest.is_completed && (
                    <div style={{ marginTop: "10px", width: "100%", maxWidth: "300px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--muted)", marginBottom: "4px" }}>
                        <span>{lang === "ar" ? "التقدم:" : "Progress:"}</span>
                        <span>{quest.current_value} / {quest.target_value}</span>
                      </div>
                      <div style={{ width: "100%", height: "6px", backgroundColor: "var(--input-bg)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{
                          width: `${progressPercent}%`,
                          height: "100%",
                          backgroundColor: "var(--accent)",
                          borderRadius: "3px"
                        }} />
                      </div>
                    </div>
                  )}
                  {quest.is_completed && (
                    <span style={{ fontSize: "0.8rem", color: "var(--accent)", display: "block", marginTop: "4px", fontWeight: "bold" }}>
                      {lang === "ar" ? "مكتملة" : "Completed"}
                    </span>
                  )}
                </div>
              </div>

              {/* Dev Shortcut button to make it easy to test (only for admins) */}
              {user?.role === "admin" && (
                <div>
                  <button
                    type="button"
                    disabled={quest.is_completed || claiming === quest.quest_key}
                    onClick={() => handleDevComplete(quest.quest_key)}
                    style={{
                      backgroundColor: quest.is_completed ? "transparent" : "var(--input-bg)",
                      border: quest.is_completed ? "1px solid var(--accent)" : "1px solid var(--line)",
                      color: quest.is_completed ? "var(--accent)" : "var(--text)",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      cursor: quest.is_completed ? "default" : "pointer",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      opacity: claiming === quest.quest_key ? 0.6 : 1
                    }}
                  >
                    {quest.is_completed ? (
                      lang === "ar" ? "مكتملة" : "Done"
                    ) : (
                      <>
                        <Play size={12} fill="currentColor" />
                        {lang === "ar" ? "إكمال تجريبي (Dev)" : "Dev Complete"}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

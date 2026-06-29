import { useState, useEffect } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import toast from "react-hot-toast";
import { ShoppingBag, Coins } from "lucide-react";

export default function Shop() {
  const { user, refreshUser } = useAuth();
  const { lang } = useLanguage();
  const { setColorTheme } = useTheme();
  const [shopItems, setShopItems] = useState([]);
  const [purchasedItems, setPurchasedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);

  const fetchShopData = async () => {
    try {
      const data = await api("/gamification/shop");
      setShopItems(data.shopItems || []);
      setPurchasedItems(data.purchasedItems || []);
    } catch (err) {
      console.error(err);
      toast.error(lang === "ar" ? "فشل تحميل المتجر" : "Failed to load shop items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopData();
  }, []);

  const handleBuy = async (itemId) => {
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return;

    if ((user?.coins ?? 0) < item.cost) {
      toast.error(
        lang === "ar" 
          ? `رصيد عملاتك غير كافٍ. تحتاج ${item.cost} كوين.` 
          : `Insufficient coins. You need ${item.cost} coins.`
      );
      return;
    }

    setBuyingId(itemId);
    try {
      const res = await api("/gamification/shop/buy", {
        method: "POST",
        body: JSON.stringify({ itemId })
      });

      if (res.success) {
        toast.success(res.message);
        // Refresh local items & user balance
        await fetchShopData();
        refreshUser();

        if (item.type === "board_theme") {
          setColorTheme(item.value);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to make purchase");
    } finally {
      setBuyingId(null);
    }
  };

  const isOwned = (item) => {
    if (item.type === "boost") return false; // boosts can be bought multiple times
    if (item.type === "premium") return user?.is_premium === 1;
    return purchasedItems.some(p => p.item_type === item.type && p.item_value === item.value);
  };

  const itemCoverImage = (item) => {
    if (item.id === "wood_pieces") return "/wood_pieces.png";
    if (item.id === "neon_pieces") return "/neon_pieces.png";
    if (item.id === "gold_pieces") return "/gold_pieces.png";
    if (item.id === "golden_theme") return "/golden_board.png";
    if (item.id === "neon_theme") return "/neon_board.png";
    if (item.id === "vip_badge") return "/vip_badge.png";
    if (item.id === "avatar_king") return "/avatar_king.png";
    if (item.id === "avatar_wizard") return "/avatar_wizard.png";
    if (item.id === "level_up_boost") return "/level_up_boost.png";
    switch (item.type) {
      case "premium":
        return "/shop_premium.png";
      case "board_theme":
        return "/shop_boards.png";
      case "pieces_theme":
        return "/shop_pieces.png";
      default:
        return "/shop_avatar_booster.png";
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", color: "var(--muted)" }}>
        {lang === "ar" ? "جاري تحميل المتجر..." : "Loading shop items..."}
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "24px 16px",
      color: "var(--text)",
      direction: lang === "ar" ? "rtl" : "ltr",
      textAlign: lang === "ar" ? "right" : "left"
    }}>
      {/* Header Banner */}
      <div className="panel" style={{
        borderRadius: "16px",
        padding: "24px",
        marginBottom: "32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px", margin: 0, color: "var(--text)" }}>
            <ShoppingBag style={{ color: "var(--accent)" }} size={32} />
            {lang === "ar" ? "متجر الشطرنج الاحترافي" : "GCA Chess Store"}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: "6px 0 0 0" }}>
            {lang === "ar" 
              ? "استبدل عملاتك باشتراك بريميوم، أشكال رقع وقطع مميزة، أفاتارات ونقاط المستوى!" 
              : "Exchange your coins for Premium memberships, unique board & piece themes, avatar borders, and level boosters!"}
          </p>
        </div>

        {/* Coins display */}
        <div style={{
          background: "var(--accent-glow)",
          border: "1px solid var(--accent)",
          padding: "12px 24px",
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: "var(--accent)",
          fontSize: "1.1rem",
          fontWeight: "800"
        }}>
          <Coins size={20} />
          <span>{user?.coins ?? 0} {lang === "ar" ? "كوين" : "Coins"}</span>
        </div>
      </div>

      {/* Grid List */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "24px"
      }}>
        {shopItems.map((item) => {
          const owned = isOwned(item);

          return (
            <div
              key={item.id}
              className="panel"
              style={{
                borderRadius: "16px",
                padding: "0 0 20px 0",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "100%",
                boxShadow: "var(--shadow)",
                transition: "transform 0.2s, border-color 0.2s",
                border: owned ? "2px solid var(--accent)" : "1px solid var(--line)",
                overflow: "hidden"
              }}
            >
              {/* Card Cover Image */}
              <div style={{
                position: "relative",
                width: "100%",
                height: "155px",
                overflow: "hidden",
                borderBottom: "1px solid var(--line)"
              }}>
                <img 
                  src={itemCoverImage(item)} 
                  alt={item.title_en}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
                
                {/* Floating Badge */}
                <div style={{
                  position: "absolute",
                  top: "12px",
                  left: "12px",
                  background: "rgba(0,0,0,0.75)",
                  backdropFilter: "blur(6px)",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  color: "var(--accent)",
                  border: "1px solid var(--accent)",
                  fontWeight: "800"
                }}>
                  {item.type.toUpperCase().replace("_", " ")}
                </div>

                {owned && (
                  <span style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    backgroundColor: "var(--accent)",
                    color: "#000",
                    fontSize: "0.75rem",
                    fontWeight: "800",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
                  }}>
                    {lang === "ar" ? "تم شراؤه" : "Owned"}
                  </span>
                )}
              </div>

              <div style={{ padding: "20px 20px 0 20px", flexGrow: 1 }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "800", margin: "0 0 8px 0", color: "var(--text)" }}>
                  {lang === "ar" ? item.title_ar : item.title_en}
                </h3>

                <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 16px 0", lineHeight: "1.4" }}>
                  {lang === "ar" ? item.description_ar : item.description_en}
                </p>
              </div>

              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between", 
                marginTop: "12px", 
                borderTop: "1px solid var(--line)", 
                padding: "16px 20px 0 20px" 
              }}>
                {/* Cost */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent)", fontWeight: "800", fontSize: "1.05rem" }}>
                  <Coins size={18} />
                  <span>{item.cost} {lang === "ar" ? "كوين" : "Coins"}</span>
                </div>

                {/* Action button */}
                <button
                  type="button"
                  disabled={owned || buyingId === item.id}
                  onClick={() => handleBuy(item.id)}
                  style={{
                    backgroundColor: owned 
                      ? "var(--input-bg)" 
                      : (user?.coins ?? 0) >= item.cost 
                        ? "var(--accent)" 
                        : "rgba(255,255,255,0.03)",
                    color: owned 
                      ? "var(--muted)" 
                      : (user?.coins ?? 0) >= item.cost 
                        ? "#000" 
                        : "var(--muted)",
                    border: owned || (user?.coins ?? 0) >= item.cost ? "none" : "1px solid var(--line)",
                    padding: "8px 20px",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: "800",
                    cursor: owned || (user?.coins ?? 0) < item.cost ? "default" : "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  {buyingId === item.id ? (
                    lang === "ar" ? "جاري الشراء..." : "Buying..."
                  ) : owned ? (
                    lang === "ar" ? "مفعّل" : "Active"
                  ) : (user?.coins ?? 0) >= item.cost ? (
                    lang === "ar" ? "شراء" : "Buy"
                  ) : (
                    lang === "ar" ? "عملات غير كافية" : "Insufficient"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

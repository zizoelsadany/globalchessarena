import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { CreditCard, ShieldCheck, ArrowLeft, Copy, Upload, Check } from "lucide-react";

export default function CheckoutMock() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { lang } = useLanguage();
  
  const [method, setMethod] = useState("vodafone_cash"); // 'vodafone_cash' or 'instapay'
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [processing, setProcessing] = useState(false);

  const packages = [
    { coins: 100, priceEgp: 100, priceUsd: 1.99, isPopular: false },
    { coins: 300, priceEgp: 250, priceUsd: 4.99, isPopular: false },
    { coins: 500, priceEgp: 400, priceUsd: 7.99, isPopular: true, noteAr: "كافٍ للاشتراك البريميوم", noteEn: "Enough for Premium!" },
    { coins: 1000, priceEgp: 750, priceUsd: 14.99, isPopular: false }
  ];

  const [selectedPackage, setSelectedPackage] = useState(packages[2]); // Default 500 coins

  const supportPhone = "01026612375";
  const instapayAddress = "zizoelsadany5";
  const vfCashLink = "http://vf.eg/vfcash?id=mt&qrId=nrvIyb";
  const instapayLink = "https://ipn.eg/S/zizoelsadany5/instapay/7O6Lqm";

  const copyToClipboard = (text, message) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(message);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error(lang === "ar" ? "يجب رفع ملف صورة فقط" : "Only image files are allowed");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(lang === "ar" ? "حجم الصورة يجب أن لا يتجاوز 5 ميجا" : "Image size must not exceed 5MB");
        return;
      }
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  async function handleManualPaymentSubmit(e) {
    e.preventDefault();
    if (!receiptFile) {
      toast.error(lang === "ar" ? "برجاء رفع إيصال الدفع" : "Please upload your payment receipt");
      return;
    }

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("payment_method", method);
      formData.append("sender_number", senderNumber);
      formData.append("transaction_id", transactionId);
      formData.append("receipt", receiptFile);
      formData.append("coins_amount", selectedPackage.coins);
      formData.append("amount", selectedPackage.priceEgp);

      const res = await api("/premium/checkout/manual", {
        method: "POST",
        body: formData
      });

      if (res.success) {
        toast.success(
          lang === "ar"
            ? "تم إرسال طلب شراء العملات بنجاح! سيقوم المشرف بمراجعته في أقرب وقت."
            : "Coins purchase request submitted successfully! An admin will review it soon."
        );
        refreshUser();
        navigate("/shop");
      } else {
        toast.error(res.message || (lang === "ar" ? "فشل إرسال الطلب" : "Failed to submit request"));
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      backgroundColor: "var(--bg)",
      color: "var(--text)",
      fontFamily: "system-ui, sans-serif",
      flexDirection: window.innerWidth < 1024 ? "column" : "row"
    }}>
      {/* Left Panel - Package Selector */}
      <div style={{
        flex: 1.2,
        padding: "40px",
        borderRight: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "var(--bg-soft)",
        direction: lang === "ar" ? "rtl" : "ltr",
        textAlign: lang === "ar" ? "right" : "left"
      }}>
        <div>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.95rem",
              padding: 0,
              marginBottom: "24px"
            }}
          >
            <ArrowLeft size={16} style={{ transform: lang === "ar" ? "rotate(180deg)" : "none" }} />
            <span>{lang === "ar" ? "العودة للموقع" : "Back to Arena"}</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
            <CreditCard size={32} style={{ color: "var(--accent)" }} />
            <h1 style={{ fontSize: "1.5rem", fontWeight: "800", margin: 0, letterSpacing: "-0.5px", color: "var(--text)" }}>
              {lang === "ar" ? "شحن كوينزات المنصة" : "Buy GCA Coins"}
            </h1>
          </div>

          <p style={{ color: "var(--accent)", fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 16px 0", fontWeight: "bold" }}>
            {lang === "ar" ? "اختر باقة الكوينز المناسبة لك:" : "Choose a Coin Package:"}
          </p>

          {/* Grid of Packages */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
            {packages.map((pkg) => {
              const active = selectedPackage.coins === pkg.coins;
              return (
                <div
                  key={pkg.coins}
                  onClick={() => setSelectedPackage(pkg)}
                  style={{
                    border: active ? "2px solid var(--accent)" : "1px solid var(--line)",
                    backgroundColor: active ? "var(--accent-glow)" : "rgba(255,255,255,0.02)",
                    borderRadius: "12px",
                    padding: "20px",
                    cursor: "pointer",
                    position: "relative",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "140px",
                    boxShadow: active ? "0 8px 24px rgba(212, 175, 55, 0.15)" : "none"
                  }}
                >
                  {pkg.isPopular && (
                    <span style={{
                      position: "absolute",
                      top: "-10px",
                      right: "12px",
                      background: "var(--accent)",
                      color: "#000",
                      fontSize: "0.7rem",
                      fontWeight: "800",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      textTransform: "uppercase"
                    }}>
                      {lang === "ar" ? "الأكثر شعبية" : "Popular"}
                    </span>
                  )}
                  <div>
                    <h3 style={{ fontSize: "1.3rem", fontWeight: "800", margin: "0 0 4px 0", color: "var(--text)" }}>
                      {pkg.coins} {lang === "ar" ? "كوين" : "Coins"}
                    </h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--accent)", margin: 0, fontWeight: "bold" }}>
                      {lang === "ar" ? pkg.noteAr : pkg.noteEn}
                    </p>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <span style={{ fontSize: "1.4rem", fontWeight: "800", color: "var(--text)" }}>{pkg.priceEgp} ج.م</span>
                    <span style={{ color: "var(--muted)", fontSize: "0.8rem", marginLeft: "6px" }}>
                      (~ ${pkg.priceUsd})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", color: "var(--text)", fontSize: "0.9rem" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <Check size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span>{lang === "ar" ? "شراء عضوية بريميوم بقيمة 500 كوين" : "Get Premium membership for 500 coins"}</span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <Check size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span>{lang === "ar" ? "شراء أشكال رقع شطرنج مذهلة ومخصصة" : "Unlock gorgeous board skins from the store"}</span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <Check size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span>{lang === "ar" ? "شراء أشكال قطع شطرنج حصرية كلاسيكية ونيون وذهبية" : "Buy classic, neon, and gold piece themes"}</span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <Check size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span>{lang === "ar" ? "أفاتارات وشارات نادرة ومسرعات المستوى لحسابك" : "Avatar frames, VIP badges, and level boosters"}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted)", fontSize: "0.85rem", marginTop: "24px" }}>
          <ShieldCheck size={16} />
          <span>{lang === "ar" ? "نظام مالي يدوي آمن وموثوق ومراجع يدوياً." : "Secure manual verification payment system."}</span>
        </div>
      </div>

      {/* Right Panel - Transfer & Form */}
      <div style={{
        flex: 1,
        padding: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg)"
      }}>
        <div style={{ width: "100%", maxWidth: "460px" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "20px", color: "var(--text)", textAlign: lang === "ar" ? "right" : "left" }}>
            {lang === "ar" ? "اختر طريقة التحويل" : "Select Payment Method"}
          </h2>

          {/* Payment Method Selector */}
          <div style={{
            display: "flex",
            gap: "12px",
            marginBottom: "24px"
          }}>
            <button
              type="button"
              onClick={() => setMethod("vodafone_cash")}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "10px",
                border: method === "vodafone_cash" ? "2px solid var(--accent)" : "1px solid var(--line)",
                backgroundColor: method === "vodafone_cash" ? "var(--accent-glow)" : "var(--input-bg)",
                color: "var(--text)",
                cursor: "pointer",
                fontWeight: "600",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease"
              }}
            >
              <svg viewBox="0 0 100 100" width="30" height="30" style={{ marginBottom: "2px" }} fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="48" fill="#E60000" />
                <path d="M50 20 C33.4 20 20 33.4 20 50 C20 62.4 27.5 73.1 38 77.6 L34.5 83 L47 79 C48 79.5 49 79.7 50 79.7 C66.6 79.7 80 66.3 80 50 C80 33.4 66.6 20 50 20 Z M50 32 C59.9 32 68 40.1 68 50 C68 59.9 59.9 68 50 68 C45 68 40.5 66 37 62.7 L33.8 65.9 L34.9 61.5 C33.1 58.3 32 54.3 32 50 C32 40.1 40.1 32 50 32 Z" fill="#ffffff" />
              </svg>
              <span>{lang === "ar" ? "فودافون كاش" : "Vodafone Cash"}</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod("instapay")}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "10px",
                border: method === "instapay" ? "2px solid var(--accent)" : "1px solid var(--line)",
                backgroundColor: method === "instapay" ? "var(--accent-glow)" : "var(--input-bg)",
                color: "var(--text)",
                cursor: "pointer",
                fontWeight: "600",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease"
              }}
            >
              <svg viewBox="0 0 100 100" width="30" height="30" style={{ marginBottom: "2px" }} fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="instapay-btn-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00b4d8" />
                    <stop offset="100%" stopColor="#0d9488" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="48" fill="url(#instapay-btn-grad)" />
                <path d="M55 20 L30 52 L48 52 L40 80 L70 44 L50 44 Z" fill="#ffffff" />
              </svg>
              <span>{lang === "ar" ? "إنستا باي" : "InstaPay"}</span>
            </button>
          </div>

          {/* Transfer Instructions Box */}
          <div style={{
            backgroundColor: "var(--bg-soft)",
            border: "1px solid var(--line)",
            borderRadius: "10px",
            padding: "20px",
            marginBottom: "24px",
            direction: lang === "ar" ? "rtl" : "ltr",
            textAlign: lang === "ar" ? "right" : "left"
          }}>
            <h3 style={{ fontSize: "1rem", margin: "0 0 10px 0", color: "var(--accent)" }}>
              {lang === "ar" ? "تعليمات الدفع والتحويل:" : "Payment Instructions:"}
            </h3>
            
            {method === "vodafone_cash" ? (
              <div>
                <p style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "var(--text)" }}>
                  {lang === "ar" 
                    ? `قم بتحويل مبلغ ${selectedPackage.priceEgp} ج.م إلى الرقم التالي عبر فودافون كاش:` 
                    : `Transfer ${selectedPackage.priceEgp} EGP to the following number via Vodafone Cash:`}
                </p>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "var(--input-bg)",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)"
                }}>
                  <strong style={{ fontSize: "1.1rem", letterSpacing: "1px", color: "var(--text)" }}>{supportPhone}</strong>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(supportPhone, lang === "ar" ? "تم نسخ رقم فودافون كاش!" : "Vodafone Cash number copied!")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      padding: 4
                    }}
                    title={lang === "ar" ? "نسخ الرقم" : "Copy number"}
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <div style={{ textAlign: "center", marginTop: "12px" }}>
                  <a
                    href={vfCashLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      fontSize: "0.85rem",
                      color: "var(--accent)",
                      textDecoration: "underline",
                      fontWeight: "bold"
                    }}
                  >
                    {lang === "ar" ? "أو اضغط هنا للدفع السريع عبر فودافون كاش" : "Or click here for quick pay via Vodafone Cash"}
                  </a>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "var(--text)" }}>
                  {lang === "ar" 
                    ? `قم بتحويل مبلغ ${selectedPackage.priceEgp} ج.م على عنوان إنستا باي (InstaPay) التالي:` 
                    : `Transfer ${selectedPackage.priceEgp} EGP to the following InstaPay Address:`}
                </p>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "var(--input-bg)",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)"
                }}>
                  <strong style={{ fontSize: "0.95rem", color: "var(--text)" }}>{instapayAddress}</strong>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(instapayAddress, lang === "ar" ? "تم نسخ عنوان إنستا باي!" : "InstaPay address copied!")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      padding: 4
                    }}
                    title={lang === "ar" ? "نسخ" : "Copy"}
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <div style={{ textAlign: "center", marginTop: "12px" }}>
                  <a
                    href={instapayLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      fontSize: "0.85rem",
                      color: "var(--accent)",
                      textDecoration: "underline",
                      fontWeight: "bold"
                    }}
                  >
                    {lang === "ar" ? "أو اضغط هنا للدفع السريع عبر إنستا باي" : "Or click here for quick pay via InstaPay"}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleManualPaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ textAlign: lang === "ar" ? "right" : "left" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)", marginBottom: "6px" }}>
                {method === "vodafone_cash"
                  ? (lang === "ar" ? "رقم الهاتف المحول منه (محفظتك)" : "Sender Vodafone Cash number")
                  : (lang === "ar" ? "رقم الهاتف / عنوان إنستا باي المحول منه" : "Sender Phone / InstaPay address")
                } <span style={{ color: "var(--accent)" }}>*</span>
              </label>
              <input
                type="text"
                placeholder={method === "vodafone_cash" ? "01xxxxxxxxx" : "username@instapay"}
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--input-bg)",
                  color: "var(--text)",
                  fontSize: "0.95rem"
                }}
              />
            </div>

            <div style={{ textAlign: lang === "ar" ? "right" : "left" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)", marginBottom: "6px" }}>
                {lang === "ar" ? "رقم المعاملة / العملية (اختياري)" : "Transaction Reference ID (Optional)"}
              </label>
              <input
                type="text"
                placeholder="Reference No."
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--input-bg)",
                  color: "var(--text)",
                  fontSize: "0.95rem"
                }}
              />
            </div>

            {/* Receipt Upload */}
            <div style={{ textAlign: lang === "ar" ? "right" : "left" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)", marginBottom: "6px" }}>
                {lang === "ar" ? "إرفاق صورة إيصال التحويل" : "Attach transfer receipt screenshot"} <span style={{ color: "var(--accent)" }}>*</span>
              </label>
              <div style={{
                border: "2px dashed var(--line)",
                borderRadius: "8px",
                padding: "20px",
                textAlign: "center",
                cursor: "pointer",
                backgroundColor: "var(--input-bg)",
                position: "relative"
              }}
              onClick={() => document.getElementById("receipt-file-input").click()}
              >
                <input
                  id="receipt-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                
                {receiptPreview ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <img 
                      src={receiptPreview} 
                      alt="Receipt Preview" 
                      style={{ maxHeight: "120px", maxWidth: "100%", borderRadius: "4px" }} 
                    />
                    <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: "bold" }}>
                      {lang === "ar" ? "تم اختيار الصورة" : "Receipt selected"}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: "var(--muted)" }}>
                    <Upload size={24} />
                    <span>
                      {lang === "ar" ? "اسحب وأفلت أو اضغط لرفع إيصال التحويل" : "Click or drag & drop to upload transfer receipt"}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)", opacity: 0.8 }}>
                      PNG, JPG, WEBP (Max 5MB)
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={processing}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "var(--accent)",
                color: "var(--accent-text)",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "background-color 0.2s ease",
                boxShadow: "0 4px 12px var(--accent-glow)",
                marginTop: "12px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}
            >
              {processing 
                ? (lang === "ar" ? "جاري الإرسال..." : "Submitting...") 
                : (lang === "ar" ? `تأكيد شراء ${selectedPackage.coins} كوين` : `Confirm Purchase of ${selectedPackage.coins} Coins`)
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <SocketProvider>
            <ErrorBoundary>
              <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "940530069798-btep8vnv8d38hakcjp8237higegtqfll.apps.googleusercontent.com"}>
                <App />
              </GoogleOAuthProvider>
            </ErrorBoundary>
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: "var(--panel-solid)",
                  color: "var(--text)",
                  border: "1px solid var(--line)",
                  fontSize: "1rem",
                  padding: "12px 18px",
                  borderRadius: "10px",
                  boxShadow: "var(--shadow)",
                },
                error: {
                  duration: 5000,
                  style: {
                    border: "2px solid #ef6461",
                    background: "var(--panel-solid)",
                    color: "var(--text)",
                    fontSize: "1.05rem",
                    fontWeight: "bold",
                    padding: "16px 24px",
                    boxShadow: "0 10px 40px rgba(239, 100, 97, 0.15)",
                    borderRadius: "12px",
                  },
                },
                success: {
                  duration: 4000,
                  style: {
                    border: "2px solid var(--accent)",
                    background: "var(--panel-solid)",
                    color: "var(--text)",
                    fontSize: "1.05rem",
                    fontWeight: "bold",
                    padding: "16px 24px",
                    boxShadow: "0 10px 40px var(--accent-glow)",
                    borderRadius: "12px",
                  },
                },
              }}
            />
          </SocketProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </BrowserRouter>
</StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

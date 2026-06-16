import { Crown } from "lucide-react";

const pieces = ["♜", "♞", "♝", "♛", "♚", "♙"];

export default function AuthShell({ title, subtitle, children }) {
  return (
    <main className="auth-screen">
      <section className="auth-visual">
        <div className="brand large">
          <Crown />
          <div>
            <strong>Global Chess</strong>
            <span>Arena</span>
          </div>
        </div>
        <div className="hero-board" aria-hidden="true">
          {Array.from({ length: 64 }).map((_, index) => (
            <span key={index}>{pieces[index % pieces.length]}</span>
          ))}
        </div>
      </section>
      <section className="auth-card glass">
        <span className="eyebrow">Real-time chess</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {children}
      </section>
    </main>
  );
}

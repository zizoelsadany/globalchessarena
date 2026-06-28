import { useEffect, useRef, useState } from "react";

export default function StatCard({ label, value, icon, accent }) {
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.3 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`stat-card-v2 ${isVisible ? "stat-visible" : ""}`}
      style={{ "--card-delay": `${accent || 0}ms` }}
    >
      <div className="stat-card-glow" />
      <div className="stat-card-content">
        <div className="stat-card-header">
          <div className="stat-icon-wrap">
            {icon}
          </div>
          <span className="stat-label">{label}</span>
        </div>
        <div className="stat-value-row">
          <strong className="stat-value">{value}</strong>
          <div className="stat-bar">
            <div className="stat-bar-fill" />
          </div>
        </div>
      </div>
    </div>
  );
}

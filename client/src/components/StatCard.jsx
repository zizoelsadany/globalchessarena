export default function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card glass">
      <div className="stat-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

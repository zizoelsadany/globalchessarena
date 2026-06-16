export default function Loader({ label = "Loading" }) {
  return (
    <div className="center-stage">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}

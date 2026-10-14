export const Card = ({ title, children, className = '' }) => (
  <section className={`card ${className}`}>{title && <h3>{title}</h3>}{children}</section>
);
export const Stat = ({ label, value, suffix = '' }) => (
  <div className="stat"><div className="num">{value}{suffix}</div><div className="lbl">{label}</div></div>
);
export const Bar = ({ value, max = 100 }) => (
  <div className="bar"><div style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
);

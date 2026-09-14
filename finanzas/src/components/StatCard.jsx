import { formatMoney } from '../lib/format';

export default function StatCard({ label, value, tone = 'neutral' }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className={`value ${tone}`}>{formatMoney(value)}</div>
    </div>
  );
}

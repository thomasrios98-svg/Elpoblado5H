import { MONTH_NAMES } from '../lib/format';

/**
 * mode: 'monthly' | 'annual'
 * value: { year, month } (month es 1-12, ignorado en modo annual)
 */
export default function PeriodPicker({ mode, onModeChange, value, onChange, years }) {
  return (
    <div className="filters-bar" style={{ marginBottom: 0 }}>
      <div className="tabs">
        <button className={mode === 'monthly' ? 'active' : ''} onClick={() => onModeChange('monthly')}>
          Mensual
        </button>
        <button className={mode === 'annual' ? 'active' : ''} onClick={() => onModeChange('annual')}>
          Anual
        </button>
      </div>

      <div className="field">
        <label>Año</label>
        <select value={value.year} onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {mode === 'monthly' && (
        <div className="field">
          <label>Mes</label>
          <select value={value.month} onChange={(e) => onChange({ ...value, month: Number(e.target.value) })}>
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

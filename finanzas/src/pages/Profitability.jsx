import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import PeriodPicker from '../components/PeriodPicker';
import { filterMovements, computeProfitability, availableYears } from '../lib/calculations';
import { formatMoney } from '../lib/format';
import { UNITS } from '../lib/constants';

export default function Profitability() {
  const { movements, transfers, loading } = useData();
  const now = new Date();
  const [mode, setMode] = useState('monthly');
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const years = useMemo(() => availableYears(movements, transfers), [movements, transfers]);

  const filtered = useMemo(() => {
    const f = mode === 'monthly' ? period : { year: period.year };
    return filterMovements(movements, f);
  }, [movements, period, mode]);

  const profitability = useMemo(() => computeProfitability(filtered), [filtered]);

  if (loading) return <div className="empty-state">Cargando datos…</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Rentabilidad</h1>
        <PeriodPicker mode={mode} onModeChange={setMode} value={period} onChange={setPeriod} years={years} />
      </div>

      <div className="grid cols-3">
        {UNITS.map((u) => {
          const d = profitability.perUnit[u.id];
          return (
            <div key={u.id} className="card">
              <div className="section-title">{u.label}</div>
              <table>
                <tbody>
                  <tr>
                    <td>Ingresos</td>
                    <td style={{ textAlign: 'right', color: 'var(--income)', fontWeight: 600 }}>{formatMoney(d.income)}</td>
                  </tr>
                  <tr>
                    <td>Gastos individuales</td>
                    <td style={{ textAlign: 'right', color: 'var(--expense)', fontWeight: 600 }}>-{formatMoney(d.individualExpense)}</td>
                  </tr>
                  <tr>
                    <td>Parte de gastos generales (⅓)</td>
                    <td style={{ textAlign: 'right', color: 'var(--expense)', fontWeight: 600 }}>-{formatMoney(d.generalShare)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>Resultado</td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        borderTop: '2px solid var(--border)',
                        color: d.result >= 0 ? 'var(--income)' : 'var(--expense)',
                      }}
                    >
                      {formatMoney(d.result)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="section-title">Global</div>
        <table>
          <tbody>
            <tr>
              <td>Ingresos totales</td>
              <td style={{ textAlign: 'right', color: 'var(--income)', fontWeight: 600 }}>{formatMoney(profitability.global.income)}</td>
            </tr>
            <tr>
              <td>Gastos individuales (suma de las 3 unidades)</td>
              <td style={{ textAlign: 'right', color: 'var(--expense)', fontWeight: 600 }}>-{formatMoney(profitability.global.individualExpense)}</td>
            </tr>
            <tr>
              <td>Gastos generales</td>
              <td style={{ textAlign: 'right', color: 'var(--expense)', fontWeight: 600 }}>-{formatMoney(profitability.global.generalExpense)}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>Resultado global</td>
              <td
                style={{
                  textAlign: 'right',
                  fontWeight: 700,
                  borderTop: '2px solid var(--border)',
                  color: profitability.global.result >= 0 ? 'var(--income)' : 'var(--expense)',
                }}
              >
                {formatMoney(profitability.global.result)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

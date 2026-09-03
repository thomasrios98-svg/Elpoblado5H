import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import PeriodPicker from '../components/PeriodPicker';
import { filterMovements, totals, computeProfitability, availableYears } from '../lib/calculations';
import { formatMoney, monthLabel } from '../lib/format';
import { UNITS, UNIT_LABELS } from '../lib/constants';
import {
  exportMovementsToExcel,
  exportMovementsToPDF,
  exportSummaryToExcel,
  exportSummaryToPDF,
} from '../lib/export';

const SCOPES = [
  { id: 'global', label: 'Global' },
  { id: 'unit', label: 'Por unidad' },
];

export default function Reports() {
  const { movements, transfers, loading } = useData();
  const now = new Date();
  const [mode, setMode] = useState('monthly');
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [scope, setScope] = useState('global');
  const [unit, setUnit] = useState(UNITS[0].id);

  const years = useMemo(() => availableYears(movements, transfers), [movements, transfers]);

  const periodFilter = useMemo(() => (mode === 'monthly' ? period : { year: period.year }), [mode, period]);
  const periodLabel =
    mode === 'monthly'
      ? monthLabel(`${period.year}-${String(period.month).padStart(2, '0')}`)
      : String(period.year);

  const scopedMovements = useMemo(() => {
    const base = filterMovements(movements, periodFilter);
    if (scope === 'unit') return base.filter((m) => m.unit === unit);
    return base;
  }, [movements, periodFilter, scope, unit]);

  const t = totals(scopedMovements);
  const profitability = useMemo(() => computeProfitability(filterMovements(movements, periodFilter)), [movements, periodFilter]);

  const title =
    scope === 'unit'
      ? `Reporte ${UNIT_LABELS[unit]} — ${periodLabel}`
      : `Reporte global — ${periodLabel}`;

  const summaryRows =
    scope === 'unit'
      ? [
          { label: 'Ingresos', value: profitability.perUnit[unit].income },
          { label: 'Gastos individuales', value: -profitability.perUnit[unit].individualExpense },
          { label: 'Parte de gastos generales (⅓)', value: -profitability.perUnit[unit].generalShare },
          { label: 'Resultado', value: profitability.perUnit[unit].result },
        ]
      : [
          { label: 'Ingresos', value: t.income },
          { label: 'Gastos', value: t.expense },
          { label: 'Ganancia', value: t.profit },
        ];

  const filenameBase = `${scope === 'unit' ? unit : 'global'}_${mode === 'monthly' ? `${period.year}-${String(period.month).padStart(2, '0')}` : period.year}`;

  if (loading) return <div className="empty-state">Cargando datos…</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Reportes</h1>
        <PeriodPicker mode={mode} onModeChange={setMode} value={period} onChange={setPeriod} years={years} />
      </div>

      <div className="card">
        <div className="filters-bar" style={{ marginBottom: 0 }}>
          <div className="tabs">
            {SCOPES.map((s) => (
              <button key={s.id} className={scope === s.id ? 'active' : ''} onClick={() => setScope(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          {scope === 'unit' && (
            <div className="field">
              <label>Unidad</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                {UNITS.map((u) => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-title">{title}</div>
        <table>
          <tbody>
            {summaryRows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td
                  style={{
                    textAlign: 'right',
                    fontWeight: 600,
                    color: row.value >= 0 ? 'var(--income)' : 'var(--expense)',
                  }}
                >
                  {formatMoney(row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn secondary" onClick={() => exportSummaryToExcel(summaryRows, `resumen_${filenameBase}.xlsx`)}>
            Exportar resumen (Excel)
          </button>
          <button className="btn secondary" onClick={() => exportSummaryToPDF(title, [{ heading: 'Resumen', rows: summaryRows }], `resumen_${filenameBase}.pdf`)}>
            Exportar resumen (PDF)
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          Movimientos del periodo ({scopedMovements.length})
        </div>
        <div className="btn-row" style={{ marginBottom: 14 }}>
          <button
            className="btn secondary"
            disabled={scopedMovements.length === 0}
            onClick={() => exportMovementsToExcel(scopedMovements, `movimientos_${filenameBase}.xlsx`)}
          >
            Exportar movimientos (Excel)
          </button>
          <button
            className="btn secondary"
            disabled={scopedMovements.length === 0}
            onClick={() => exportMovementsToPDF(scopedMovements, title, `movimientos_${filenameBase}.pdf`)}
          >
            Exportar movimientos (PDF)
          </button>
        </div>

        {scopedMovements.length === 0 ? (
          <div className="empty-state">No hay movimientos en este periodo.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Monto</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {scopedMovements.map((mv) => (
                  <tr key={mv.id}>
                    <td>{mv.date}</td>
                    <td>{mv.type === 'income' ? 'Ingreso' : 'Gasto'}</td>
                    <td>{mv.category || '—'}</td>
                    <td style={{ color: mv.type === 'income' ? 'var(--income)' : 'var(--expense)', fontWeight: 600 }}>
                      {formatMoney(mv.amount)}
                    </td>
                    <td>{mv.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

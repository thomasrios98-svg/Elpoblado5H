import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useData } from '../context/DataContext';
import PeriodPicker from '../components/PeriodPicker';
import StatCard from '../components/StatCard';
import {
  filterMovements,
  totals,
  groupByMonth,
  groupByCategory,
  groupByMethod,
  groupByUnit,
  availableYears,
} from '../lib/calculations';
import { formatMoney, monthLabel } from '../lib/format';
import { UNIT_LABELS, METHOD_LABELS } from '../lib/constants';

function previousPeriod(mode, period) {
  if (mode === 'annual') return { year: period.year - 1 };
  let { year, month } = period;
  month -= 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return { year, month };
}

function pctChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export default function Statistics() {
  const { movements, transfers, loading } = useData();
  const now = new Date();
  const [mode, setMode] = useState('monthly');
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const years = useMemo(() => availableYears(movements, transfers), [movements, transfers]);

  const activeFilter = useMemo(() => (mode === 'monthly' ? period : { year: period.year }), [mode, period]);
  const filtered = useMemo(() => filterMovements(movements, activeFilter), [movements, activeFilter]);
  const prevFilter = useMemo(() => previousPeriod(mode, period), [mode, period]);
  const prevFiltered = useMemo(() => filterMovements(movements, prevFilter), [movements, prevFilter]);

  const current = totals(filtered);
  const previous = totals(prevFiltered);

  const evolution = useMemo(() => groupByMonth(movements).slice(-12), [movements]);
  const byCategory = useMemo(() => groupByCategory(filtered), [filtered]);
  const byMethod = useMemo(
    () => groupByMethod(filtered).map((m) => ({ ...m, label: METHOD_LABELS[m.method] || m.method })),
    [filtered]
  );
  const byUnit = useMemo(
    () => groupByUnit(filtered).map((u) => ({ ...u, label: UNIT_LABELS[u.unit] || u.unit })),
    [filtered]
  );

  if (loading) return <div className="empty-state">Cargando datos…</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Estadísticas</h1>
        <PeriodPicker mode={mode} onModeChange={setMode} value={period} onChange={setPeriod} years={years} />
      </div>

      <div className="grid cols-3">
        <StatCard label="Ingresos" value={current.income} tone="income" />
        <StatCard label="Gastos" value={current.expense} tone="expense" />
        <StatCard label="Ganancia" value={current.profit} tone={current.profit >= 0 ? 'income' : 'expense'} />
      </div>

      <div className="card">
        <div className="section-title">
          Comparación con el periodo anterior ({mode === 'annual' ? prevFilter.year : monthLabel(`${prevFilter.year}-${String(prevFilter.month).padStart(2, '0')}`)})
        </div>
        <div className="grid cols-3">
          <div>
            <div className="text-muted" style={{ fontSize: 12 }}>Ingresos</div>
            <div style={{ fontWeight: 700 }}>
              {formatMoney(current.income)}{' '}
              <span style={{ fontSize: 12, color: current.income >= previous.income ? 'var(--income)' : 'var(--expense)' }}>
                ({pctChange(current.income, previous.income).toFixed(1)}%)
              </span>
            </div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 12 }}>Gastos</div>
            <div style={{ fontWeight: 700 }}>
              {formatMoney(current.expense)}{' '}
              <span style={{ fontSize: 12, color: current.expense <= previous.expense ? 'var(--income)' : 'var(--expense)' }}>
                ({pctChange(current.expense, previous.expense).toFixed(1)}%)
              </span>
            </div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 12 }}>Ganancia</div>
            <div style={{ fontWeight: 700 }}>
              {formatMoney(current.profit)}{' '}
              <span style={{ fontSize: 12, color: current.profit >= previous.profit ? 'var(--income)' : 'var(--expense)' }}>
                ({pctChange(current.profit, previous.profit).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="section-title">Evolución mensual (últimos 12 meses)</div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={evolution.map((e) => ({ ...e, label: monthLabel(e.key) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e6ee" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(v) => formatMoney(v)} />
            <Legend />
            <Line type="monotone" dataKey="income" name="Ingresos" stroke="#1f8a58" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="expense" name="Gastos" stroke="#c23b3b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="chart-card">
          <div className="section-title">Gastos por categoría</div>
          {byCategory.length === 0 ? (
            <div className="empty-state">Sin gastos en este periodo.</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, byCategory.length * 34)}>
              <BarChart data={byCategory} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e6ee" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={140} />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Bar dataKey="amount" name="Gasto" fill="#c23b3b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <div className="section-title">Por método de pago</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byMethod}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e1e6ee" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Legend />
              <Bar dataKey="income" name="Ingresos" fill="#1f8a58" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Gastos" fill="#c23b3b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card" style={{ marginTop: 16 }}>
        <div className="section-title">Comparación entre unidades</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byUnit}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e6ee" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(v) => formatMoney(v)} />
            <Legend />
            <Bar dataKey="income" name="Ingresos" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Gastos individuales" fill="#b5791b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

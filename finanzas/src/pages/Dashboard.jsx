import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useData } from '../context/DataContext';
import PeriodPicker from '../components/PeriodPicker';
import StatCard from '../components/StatCard';
import {
  filterMovements,
  totals,
  computeBalances,
  computeProfitability,
  groupByMonth,
  availableYears,
} from '../lib/calculations';
import { formatMoney, monthLabel } from '../lib/format';
import { UNITS } from '../lib/constants';

const UNIT_COLORS = { apto5h: '#1e3a5f', kichi: '#2f7d5f', yamaha: '#b5791b' };

export default function Dashboard() {
  const { movements, transfers, loading } = useData();
  const now = new Date();
  const [mode, setMode] = useState('monthly');
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const years = useMemo(() => availableYears(movements, transfers), [movements, transfers]);

  const filtered = useMemo(() => {
    const f = mode === 'monthly' ? period : { year: period.year };
    return filterMovements(movements, f);
  }, [movements, period, mode]);

  const { income, expense, profit } = totals(filtered);
  const { global: availableMoney } = useMemo(() => computeBalances(movements, transfers), [movements, transfers]);
  const profitability = useMemo(() => computeProfitability(filtered), [filtered]);

  const trend = useMemo(() => groupByMonth(movements).slice(-12), [movements]);

  const unitPieData = UNITS.map((u) => ({
    name: u.label,
    value: profitability.perUnit[u.id]?.income || 0,
    id: u.id,
  })).filter((d) => d.value > 0);

  if (loading) return <div className="empty-state">Cargando datos…</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <PeriodPicker mode={mode} onModeChange={setMode} value={period} onChange={setPeriod} years={years} />
      </div>

      <div className="grid cols-4">
        <StatCard label="Ingresos" value={income} tone="income" />
        <StatCard label="Gastos" value={expense} tone="expense" />
        <StatCard label="Ganancia" value={profit} tone={profit >= 0 ? 'income' : 'expense'} />
        <StatCard label="Dinero disponible" value={availableMoney} tone="neutral" />
      </div>

      <div className="grid cols-3" style={{ marginTop: 16 }}>
        {UNITS.map((u) => {
          const result = profitability.perUnit[u.id]?.result || 0;
          return (
            <StatCard
              key={u.id}
              label={`Resultado ${u.label}`}
              value={result}
              tone={result >= 0 ? 'income' : 'expense'}
            />
          );
        })}
      </div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="chart-card">
          <div className="section-title">Ingresos vs. gastos (últimos 12 meses)</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trend.map((t) => ({ ...t, label: monthLabel(t.key) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e1e6ee" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Legend />
              <Bar dataKey="income" name="Ingresos" fill="#1f8a58" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Gastos" fill="#c23b3b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="section-title">Ingresos por unidad (periodo seleccionado)</div>
          {unitPieData.length === 0 ? (
            <div className="empty-state">Sin ingresos en este periodo.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={unitPieData} dataKey="value" nameKey="name" outerRadius={100} label={(d) => d.name}>
                  {unitPieData.map((d) => (
                    <Cell key={d.id} fill={UNIT_COLORS[d.id]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

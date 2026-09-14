import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import StatCard from '../components/StatCard';
import { computeBalances } from '../lib/calculations';
import { formatMoney, formatDate, todayISO } from '../lib/format';
import { PAYMENT_METHODS, METHOD_LABELS } from '../lib/constants';

const emptyTransfer = () => ({
  date: todayISO(),
  fromMethod: PAYMENT_METHODS[0].id,
  toMethod: PAYMENT_METHODS[1].id,
  amount: '',
  note: '',
});

export default function Balances() {
  const { movements, transfers, addTransfer, deleteTransfer, loading } = useData();
  const [form, setForm] = useState(emptyTransfer());
  const [error, setError] = useState('');

  const { balances, global } = useMemo(() => computeBalances(movements, transfers), [movements, transfers]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!form.amount || Number.isNaN(amt) || amt <= 0) {
      setError('El monto debe ser mayor a 0.');
      return;
    }
    if (form.fromMethod === form.toMethod) {
      setError('El origen y el destino deben ser métodos distintos.');
      return;
    }
    setError('');
    await addTransfer({
      date: form.date,
      fromMethod: form.fromMethod,
      toMethod: form.toMethod,
      amount: Number(amt.toFixed(2)),
      note: form.note.trim() || null,
    });
    setForm(emptyTransfer());
  }

  async function handleDelete(id) {
    if (window.confirm('¿Eliminar esta transferencia interna?')) {
      await deleteTransfer(id);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Saldos</h1>
      </div>

      <div className="grid cols-4">
        {PAYMENT_METHODS.map((m) => (
          <StatCard key={m.id} label={m.label} value={balances[m.id]} tone="neutral" />
        ))}
      </div>

      <div className="card">
        <div className="section-title">Saldo global</div>
        <div className="value neutral" style={{ fontSize: 28, fontWeight: 700 }}>
          {formatMoney(global)}
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <div className="section-title">Transferencia interna entre métodos</div>
        <p className="text-muted" style={{ marginTop: -6, marginBottom: 12, fontSize: 13 }}>
          Mueve dinero entre tus métodos de pago sin que afecte ingresos ni ganancias.
        </p>
        <div className="form-grid">
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
          </div>
          <div className="field">
            <label>Desde</label>
            <select value={form.fromMethod} onChange={(e) => update('fromMethod', e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Hacia</label>
            <select value={form.toMethod} onChange={(e) => update('toMethod', e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Monto (USD)</label>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={(e) => update('amount', e.target.value)} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Nota (opcional)</label>
            <input type="text" value={form.note} onChange={(e) => update('note', e.target.value)} />
          </div>
        </div>
        {error && <p style={{ color: 'var(--expense)', fontSize: 13, marginTop: 10 }}>{error}</p>}
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button type="submit" className="btn">Transferir</button>
        </div>
      </form>

      <div className="card">
        <div className="section-title">Historial de transferencias</div>
        {loading ? (
          <div className="empty-state">Cargando…</div>
        ) : transfers.length === 0 ? (
          <div className="empty-state">Aún no se han registrado transferencias internas.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Desde</th>
                  <th>Hacia</th>
                  <th>Monto</th>
                  <th>Nota</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((tr) => (
                  <tr key={tr.id}>
                    <td>{formatDate(tr.date)}</td>
                    <td>{METHOD_LABELS[tr.fromMethod] || tr.fromMethod}</td>
                    <td>{METHOD_LABELS[tr.toMethod] || tr.toMethod}</td>
                    <td>{formatMoney(tr.amount)}</td>
                    <td>{tr.note || '—'}</td>
                    <td>
                      <button className="btn danger small" onClick={() => handleDelete(tr.id)}>Eliminar</button>
                    </td>
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

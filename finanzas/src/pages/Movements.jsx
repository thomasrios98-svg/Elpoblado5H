import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import MovementForm from '../components/MovementForm';
import { filterMovements, availableYears } from '../lib/calculations';
import { formatMoney, formatDate, MONTH_NAMES } from '../lib/format';
import { UNITS, UNIT_LABELS, PAYMENT_METHODS, METHOD_LABELS, EXPENSE_CATEGORIES } from '../lib/constants';

const emptyFilters = { year: '', month: '', unit: '', type: '', category: '', method: '' };

export default function Movements() {
  const { movements, transfers, addMovement, updateMovement, deleteMovement, loading } = useData();
  const [filters, setFilters] = useState(emptyFilters);
  const [editingId, setEditingId] = useState(null);

  const years = useMemo(() => availableYears(movements, transfers), [movements, transfers]);

  const activeFilters = useMemo(() => {
    const f = {};
    if (filters.year) f.year = Number(filters.year);
    if (filters.month) f.month = Number(filters.month);
    if (filters.unit) f.unit = filters.unit;
    if (filters.type) f.type = filters.type;
    if (filters.category) f.category = filters.category;
    if (filters.method) f.method = filters.method;
    return f;
  }, [filters]);

  const filtered = useMemo(() => filterMovements(movements, activeFilters), [movements, activeFilters]);

  const editingMovement = editingId ? movements.find((m) => m.id === editingId) : null;

  async function handleSubmit(payload, id) {
    if (id) await updateMovement(id, payload);
    else await addMovement(payload);
  }

  async function handleDelete(id) {
    if (window.confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')) {
      await deleteMovement(id);
      if (editingId === id) setEditingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Movimientos</h1>
      </div>

      <MovementForm
        editingMovement={editingMovement}
        onSubmit={handleSubmit}
        onCancelEdit={() => setEditingId(null)}
      />

      <div className="card">
        <div className="section-title">Filtros</div>
        <div className="filters-bar">
          <div className="field">
            <label>Año</label>
            <select value={filters.year} onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}>
              <option value="">Todos</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Mes</label>
            <select value={filters.month} onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}>
              <option value="">Todos</option>
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Unidad</label>
            <select value={filters.unit} onChange={(e) => setFilters((f) => ({ ...f, unit: e.target.value }))}>
              <option value="">Todas</option>
              {UNITS.map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Tipo</label>
            <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
              <option value="">Todos</option>
              <option value="income">Ingreso</option>
              <option value="expense">Gasto</option>
            </select>
          </div>
          <div className="field">
            <label>Categoría</label>
            <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
              <option value="">Todas</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Método de pago</label>
            <select value={filters.method} onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}>
              <option value="">Todos</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          {Object.values(filters).some(Boolean) && (
            <button className="btn secondary small" onClick={() => setFilters(emptyFilters)}>
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          {filtered.length} movimiento{filtered.length !== 1 ? 's' : ''}
        </div>
        {loading ? (
          <div className="empty-state">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No hay movimientos con estos filtros.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Unidad</th>
                  <th>Categoría</th>
                  <th>Método</th>
                  <th>Monto</th>
                  <th>Descripción</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((mv) => (
                  <tr key={mv.id}>
                    <td>{formatDate(mv.date)}</td>
                    <td>
                      <span className={`badge ${mv.type}`}>{mv.type === 'income' ? 'Ingreso' : 'Gasto'}</span>
                      {mv.scope === 'general' && <span className="badge general" style={{ marginLeft: 4 }}>General</span>}
                    </td>
                    <td>{mv.unit ? UNIT_LABELS[mv.unit] : '—'}</td>
                    <td>{mv.category || '—'}</td>
                    <td>{METHOD_LABELS[mv.method] || mv.method}</td>
                    <td style={{ fontWeight: 600, color: mv.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
                      {mv.type === 'income' ? '+' : '-'}{formatMoney(mv.amount)}
                    </td>
                    <td>
                      {mv.description}
                      {mv.note && <div className="text-muted" style={{ fontSize: 12 }}>{mv.note}</div>}
                    </td>
                    <td>
                      <div className="btn-row">
                        <button className="btn secondary small" onClick={() => setEditingId(mv.id)}>Editar</button>
                        <button className="btn danger small" onClick={() => handleDelete(mv.id)}>Eliminar</button>
                      </div>
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

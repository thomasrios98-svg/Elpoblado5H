import { useEffect, useRef, useState } from 'react';
import { UNITS, PAYMENT_METHODS, EXPENSE_CATEGORIES, EXPENSE_SCOPES } from '../lib/constants';
import { todayISO } from '../lib/format';

const emptyForm = () => ({
  type: 'income',
  date: todayISO(),
  amount: '',
  method: PAYMENT_METHODS[0].id,
  unit: UNITS[0].id,
  scope: 'individual',
  category: EXPENSE_CATEGORIES[0],
  description: '',
  note: '',
});

export default function MovementForm({ editingMovement, onSubmit, onCancelEdit }) {
  const [form, setForm] = useState(emptyForm());
  const [quickEntry, setQuickEntry] = useState(false);
  const [error, setError] = useState('');
  const amountRef = useRef(null);

  useEffect(() => {
    if (editingMovement) {
      setForm({
        type: editingMovement.type,
        date: editingMovement.date,
        amount: String(editingMovement.amount ?? ''),
        method: editingMovement.method,
        unit: editingMovement.unit || UNITS[0].id,
        scope: editingMovement.scope || 'individual',
        category: editingMovement.category || EXPENSE_CATEGORIES[0],
        description: editingMovement.description || '',
        note: editingMovement.note || '',
      });
    }
  }, [editingMovement]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    if (!form.date) return 'La fecha es obligatoria.';
    const amt = Number(form.amount);
    if (!form.amount || Number.isNaN(amt) || amt <= 0) return 'El monto debe ser mayor a 0.';
    if (!form.method) return 'Selecciona un método de pago.';
    if (!form.description.trim()) return 'La descripción es obligatoria.';
    if (form.type === 'income' && !form.unit) return 'Selecciona la unidad del ingreso.';
    if (form.type === 'expense' && form.scope === 'individual' && !form.unit) {
      return 'Selecciona la unidad del gasto individual.';
    }
    if (form.type === 'expense' && !form.category) return 'Selecciona una categoría.';
    return '';
  }

  function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError('');

    const payload = {
      type: form.type,
      date: form.date,
      amount: Number(Number(form.amount).toFixed(2)),
      method: form.method,
      description: form.description.trim(),
      note: form.note.trim() || null,
    };
    if (form.type === 'income') {
      payload.unit = form.unit;
      payload.category = null;
      payload.scope = null;
    } else {
      payload.category = form.category;
      payload.scope = form.scope;
      payload.unit = form.scope === 'individual' ? form.unit : null;
    }

    onSubmit(payload, editingMovement?.id);

    if (editingMovement) {
      onCancelEdit();
    } else if (quickEntry) {
      setForm((f) => ({ ...f, amount: '', description: '', note: '' }));
      amountRef.current?.focus();
    } else {
      setForm(emptyForm());
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="section-title">{editingMovement ? 'Editar movimiento' : 'Nuevo movimiento'}</div>

      <div className="tabs" style={{ marginBottom: 14 }}>
        <button type="button" className={form.type === 'income' ? 'active' : ''} onClick={() => update('type', 'income')}>
          Ingreso
        </button>
        <button type="button" className={form.type === 'expense' ? 'active' : ''} onClick={() => update('type', 'expense')}>
          Gasto
        </button>
      </div>

      <div className="form-grid">
        <div className="field">
          <label>Fecha</label>
          <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
        </div>

        <div className="field">
          <label>Monto (USD)</label>
          <input
            ref={amountRef}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => update('amount', e.target.value)}
          />
        </div>

        <div className="field">
          <label>Método de pago</label>
          <select value={form.method} onChange={(e) => update('method', e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {form.type === 'income' && (
          <div className="field">
            <label>Unidad</label>
            <select value={form.unit} onChange={(e) => update('unit', e.target.value)}>
              {UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {form.type === 'expense' && (
          <>
            <div className="field">
              <label>Alcance del gasto</label>
              <select value={form.scope} onChange={(e) => update('scope', e.target.value)}>
                {EXPENSE_SCOPES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {form.scope === 'individual' && (
              <div className="field">
                <label>Unidad</label>
                <select value={form.unit} onChange={(e) => update('unit', e.target.value)}>
                  {UNITS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="field">
              <label>Categoría</label>
              <select value={form.category} onChange={(e) => update('category', e.target.value)}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Descripción</label>
          <input
            type="text"
            placeholder="Ej: Pago de limpieza semanal"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </div>

        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Nota (opcional)</label>
          <textarea value={form.note} onChange={(e) => update('note', e.target.value)} />
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--expense)', fontSize: 13, marginTop: 10 }}>{error}</p>
      )}

      <div className="btn-row" style={{ marginTop: 14, alignItems: 'center' }}>
        <button type="submit" className="btn">
          {editingMovement ? 'Guardar cambios' : 'Agregar movimiento'}
        </button>
        {editingMovement && (
          <button type="button" className="btn secondary" onClick={onCancelEdit}>
            Cancelar
          </button>
        )}
        {!editingMovement && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={quickEntry} onChange={(e) => setQuickEntry(e.target.checked)} />
            Registro rápido (mantener método/unidad/categoría para el siguiente)
          </label>
        )}
      </div>
    </form>
  );
}

import { useEffect, useRef, useState } from 'react';
import { UNITS, UNIT_LABELS, PAYMENT_METHODS, EXPENSE_CATEGORIES, EXPENSE_SCOPES } from '../lib/constants';
import { todayISO } from '../lib/format';
import { fetchBcvEurRate } from '../lib/exchangeRate';
import { bsConversion, fetchParaleloRate } from '../lib/reparto';
import { formatMoney } from '../lib/format';

const emptyForm = () => ({
  type: 'income',
  date: todayISO(),
  currency: 'USD',
  amount: '',
  vesAmount: '',
  binanceRate: '',
  keepBs: '',
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
  const [rateInfo, setRateInfo] = useState(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState('');
  const [manualRate, setManualRate] = useState('');
  const [paralelo, setParalelo] = useState(null);
  const amountRef = useRef(null);

  useEffect(() => {
    if (editingMovement) {
      setForm({
        type: editingMovement.type,
        date: editingMovement.date,
        currency: 'USD',
        amount: String(editingMovement.amount ?? ''),
        vesAmount: '',
        binanceRate: '',
        keepBs: '',
        method: editingMovement.method,
        unit: editingMovement.unit || UNITS[0].id,
        scope: editingMovement.scope || 'individual',
        category: editingMovement.category || EXPENSE_CATEGORIES[0],
        description: editingMovement.description || '',
        note: editingMovement.note || '',
      });
    }
  }, [editingMovement]);

  useEffect(() => {
    if (form.currency !== 'VES' || rateInfo || rateLoading) return;
    setRateLoading(true);
    setRateError('');
    fetchBcvEurRate()
      .then((data) => setRateInfo(data))
      .catch((err) => setRateError(err?.message || 'No se pudo obtener la tasa del BCV.'))
      .finally(() => setRateLoading(false));
  }, [form.currency, rateInfo, rateLoading]);

  // Tasa paralelo en vivo: sugerencia para la tasa Binance a la que se cambian los Bs.
  useEffect(() => {
    if (form.currency !== 'VES' || paralelo) return;
    fetchParaleloRate()
      .then((p) => {
        setParalelo(p);
        setForm((f) => (f.binanceRate ? f : { ...f, binanceRate: p.rate.toFixed(2) }));
      })
      .catch(() => setParalelo({ error: true }));
  }, [form.currency, paralelo]);

  const effectiveRate = Number(rateInfo?.rate) || Number(manualRate) || 0;
  const conv =
    form.currency === 'VES'
      ? bsConversion({ bs: form.vesAmount, bcv: effectiveRate, binance: Number(form.binanceRate), keepBs: form.keepBs })
      : null;

  useEffect(() => {
    if (form.currency !== 'VES') return;
    const ves = Number(form.vesAmount);
    if (!ves || !effectiveRate) {
      setForm((f) => ({ ...f, amount: '' }));
      return;
    }
    setForm((f) => ({ ...f, amount: (ves / effectiveRate).toFixed(2) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.vesAmount, form.currency, effectiveRate]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function refreshRate() {
    setRateInfo(null);
    setRateError('');
  }

  function validate() {
    if (!form.date) return 'La fecha es obligatoria.';
    if (form.currency === 'VES') {
      const ves = Number(form.vesAmount);
      if (!form.vesAmount || Number.isNaN(ves) || ves <= 0) return 'El monto en Bolívares debe ser mayor a 0.';
      if (!effectiveRate) return 'No hay una tasa del BCV disponible. Espera a que cargue o escribe una manualmente.';
    }
    const amt = Number(form.amount);
    if (!form.amount || Number.isNaN(amt) || amt <= 0) return 'El monto debe ser mayor a 0.';
    if (!form.method) return 'Selecciona un método de pago.';
    if (form.type === 'expense' && !form.description.trim()) return 'La descripción es obligatoria.';
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

    const description =
      form.description.trim() ||
      (form.type === 'income' ? `Alquiler ${UNIT_LABELS[form.unit] || ''}`.trim() : '');

    const payload = {
      type: form.type,
      date: form.date,
      amount: Number(Number(form.amount).toFixed(2)),
      method: form.method,
      description,
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

    // Bs con tasa Binance: el reparto usa lo que de verdad queda al cambiar y la
    // diferencia contra la tasa BCV se registra como gasto aparte.
    const extras = [];
    if (form.type === 'income' && conv && !editingMovement) {
      payload.method = 'pago_movil';
      payload.reparto = {
        bs: conv.bs,
        bcv: conv.bcv,
        binance: conv.binance,
        keepBs: conv.keepBs,
        keepUsd: conv.keepUsd,
        usdtNet: conv.usdtNet,
      };
      const bsNote = `${conv.bs.toLocaleString('es-VE')} Bs · BCV ${conv.bcv.toFixed(2)} · Binance ${conv.binance}`;
      payload.note = payload.note ? `${payload.note} · ${bsNote}` : bsNote;
      if (conv.perdida >= 0.01) {
        extras.push({
          type: 'expense',
          date: form.date,
          amount: conv.perdida,
          method: 'pago_movil',
          description: `Diferencia cambiaria BCV → Binance (${description})`,
          note: `${conv.convBs.toLocaleString('es-VE')} Bs cambiados: BCV ${conv.bcv.toFixed(2)} vs Binance ${conv.binance}`,
          category: 'Diferencia cambiaria',
          scope: 'general',
          unit: null,
        });
      }
    }

    onSubmit(payload, editingMovement?.id, extras);

    if (editingMovement) {
      onCancelEdit();
    } else if (quickEntry) {
      setForm((f) => ({ ...f, amount: '', vesAmount: '', keepBs: '', description: '', note: '' }));
      amountRef.current?.focus();
    } else {
      setForm(emptyForm());
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="section-title">{editingMovement ? 'Editar movimiento' : 'Nuevo movimiento'}</div>

      <div className="tabs" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className={form.type === 'income' ? 'active' : ''}
          onClick={() => update('type', 'income')}
        >
          Ingreso
        </button>
        <button
          type="button"
          className={form.type === 'expense' ? 'active' : ''}
          onClick={() => setForm((f) => ({ ...f, type: 'expense', currency: 'USD', vesAmount: '' }))}
        >
          Gasto
        </button>
      </div>

      <div className="form-grid">
        <div className="field">
          <label>Fecha</label>
          <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
        </div>

        {form.type === 'income' && (
          <div className="field">
            <label>Moneda del ingreso</label>
            <select
              value={form.currency}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  currency: e.target.value,
                  vesAmount: '',
                  amount: '',
                  method: e.target.value === 'VES' ? 'pago_movil' : f.method,
                }))
              }
            >
              <option value="USD">Dólares (USD)</option>
              <option value="VES">Bolívares (Bs)</option>
            </select>
          </div>
        )}

        {form.currency === 'VES' ? (
          <div className="field">
            <label>Monto en Bolívares</label>
            <input
              ref={amountRef}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.vesAmount}
              onChange={(e) => update('vesAmount', e.target.value)}
            />
          </div>
        ) : (
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
        )}

        {form.currency === 'VES' && (
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Tasa BCV (Euro) y equivalente en USD</label>
            {rateLoading && <div className="text-muted" style={{ fontSize: 13 }}>Consultando tasa del BCV…</div>}
            {!rateLoading && rateInfo && (
              <div className="text-muted" style={{ fontSize: 13 }}>
                1 EUR = {rateInfo.rate.toFixed(2)} Bs
                {rateInfo.rateDate ? ` (actualizada ${new Date(rateInfo.rateDate).toLocaleDateString('es-VE')})` : ''}
                {rateInfo.stale ? ' — no se pudo actualizar, usando la última tasa guardada' : ''}
                {' · '}
                <button type="button" className="btn secondary small" onClick={refreshRate} style={{ marginLeft: 6 }}>
                  Actualizar tasa
                </button>
              </div>
            )}
            {!rateLoading && rateError && !rateInfo && (
              <div style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--expense)' }}>{rateError}</span>{' '}
                <button type="button" className="btn secondary small" onClick={refreshRate}>
                  Reintentar
                </button>
                <div className="field" style={{ marginTop: 6, maxWidth: 200 }}>
                  <label>O escribe la tasa manualmente (Bs por Euro)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualRate}
                    onChange={(e) => setManualRate(e.target.value)}
                  />
                </div>
              </div>
            )}
            {form.vesAmount && effectiveRate > 0 && (
              <div style={{ fontSize: 13, marginTop: 4, fontWeight: 600 }}>
                Equivalente: ${form.amount || '0.00'}
              </div>
            )}
          </div>
        )}

        {form.currency === 'VES' && form.type === 'income' && !editingMovement && (
          <>
            <div className="field">
              <label>Tasa Binance al cambiar (Bs por USDT)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Opcional"
                value={form.binanceRate}
                onChange={(e) => update('binanceRate', e.target.value)}
              />
              <span className="text-muted" style={{ fontSize: 11 }}>
                {paralelo?.rate
                  ? `Paralelo ahora: ${paralelo.rate.toFixed(2)}. Pon la que te dio Binance.`
                  : paralelo?.error
                    ? 'No cargó el paralelo: escríbela.'
                    : 'Consultando paralelo…'}
              </span>
            </div>
            <div className="field">
              <label>Bs que dejo en Banesco para gastos</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={form.keepBs}
                onChange={(e) => update('keepBs', e.target.value)}
              />
            </div>
            {conv && (
              <div className={'rep-note ' + (conv.perdida >= 0.01 ? 'warn' : 'ok')} style={{ gridColumn: '1 / -1', marginTop: 0 }}>
                Cambias {conv.convBs.toLocaleString('es-VE')} Bs y te llegan unos {formatMoney(conv.usdtNet)} en USDT.
                {conv.perdida >= 0.01
                  ? ` Se pierden ${formatMoney(conv.perdida)} (${conv.perdidaPct.toFixed(1)}%) contra la tasa BCV: se registra solo como gasto "Diferencia cambiaria". En Reparto se reparten ${formatMoney(conv.usdtNet + conv.keepUsd)}.`
                  : ` No se pierde nada en el cambio.`}
              </div>
            )}
          </>
        )}

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
          <label>Descripción{form.type === 'income' ? ' (opcional)' : ''}</label>
          <input
            type="text"
            placeholder={
              form.type === 'income'
                ? `Si la dejas vacía se usa "Alquiler ${UNIT_LABELS[form.unit] || ''}"`
                : 'Ej: Pago de limpieza semanal'
            }
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

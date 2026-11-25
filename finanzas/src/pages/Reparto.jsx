import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { subDays, format, parseISO } from 'date-fns';
import { useData } from '../context/DataContext';
import {
  REPARTO,
  REPARTO_ACCOUNTS,
  REPARTO_ACCOUNT_LABELS,
  REPARTO_SECTIONS,
  UNITS,
  UNIT_LABELS,
  METHOD_LABELS,
} from '../lib/constants';
import { formatMoney, formatDate, todayISO } from '../lib/format';
import { fetchBcvEurRate } from '../lib/exchangeRate';
import {
  allocate,
  bsConversion,
  computeReparto,
  fetchParaleloRate,
  nextInterest,
  sectionTotal,
} from '../lib/reparto';

const VIAS = [
  { id: 'pago_movil', label: 'Bolívares' },
  { id: 'binance', label: 'Binance' },
  { id: 'zelle', label: 'Zelle' },
  { id: 'efectivo', label: 'Efectivo' },
];

const SEC_LABEL = Object.fromEntries(REPARTO_SECTIONS.map((s) => [s.id, s.label]));
const ACC_SEC = Object.fromEntries(REPARTO_ACCOUNTS.map((a) => [a.id, a.sec]));
const WEEKLY_CATEGORIES = ['Marina/Muelle', 'Gasolina'];

function Move({ acc, amount, why, loan }) {
  return (
    <div className={'rep-move' + (loan ? ' loan' : '')}>
      <span>
        <strong>{REPARTO_ACCOUNT_LABELS[acc]}</strong>
        <span className="rep-why">{why}</span>
      </span>
      <span className="rep-amt">{formatMoney(amount)}</span>
    </div>
  );
}

/** Pasos a seguir para un ingreso ya repartido (asign = cuenta → monto). */
function Steps({ method, asign, extra, conv }) {
  const salWhy = 'Salario' + (extra ? ' (ya llegaste al techo del mes)' : '');
  if (method === 'efectivo') {
    return (
      <ol className="rep-steps">
        <li>Se queda en Tucacas para marinos y gastos de allá. No se reparte.</li>
      </ol>
    );
  }
  if (method !== 'pago_movil' && method !== 'binance') {
    return (
      <ol className="rep-steps">
        <li>
          Pasa la parte del préstamo y la del salario:
          <div className="rep-moves">
            <Move acc="bofa6614" amount={asign.bofa6614 || 0} why="Préstamo · hazlo hoy" loan />
            <Move acc="bofa4962" amount={asign.bofa4962 || 0} why={salWhy} />
          </div>
        </li>
        <li>
          Lo demás queda en Chase ({formatMoney((asign.chase_mant || 0) + (asign.chase_ops || 0))}):
          <div className="rep-moves">
            <Move acc="chase_mant" amount={asign.chase_mant || 0} why="Mantenimiento" />
            <Move acc="chase_ops" amount={asign.chase_ops || 0} why="Operación" />
          </div>
        </li>
      </ol>
    );
  }
  return (
    <ol className="rep-steps">
      {method === 'pago_movil' && conv && conv.keepBs > 0 && (
        <li>Deja {conv.keepBs.toLocaleString('es-VE')} Bs en Banesco para los gastos en Bs.</li>
      )}
      {method === 'pago_movil' && conv && (
        <li>
          Cambia {conv.convBs.toLocaleString('es-VE')} Bs a USDT en Binance (te deben llegar unos {formatMoney(conv.usdtNet)}).
        </li>
      )}
      <li>
        {method === 'pago_movil' ? 'En Binance, repártelo así:' : 'Desde donde te llegó en Binance, repártelo así:'}
        <div className="rep-moves">
          <Move acc="usdt" amount={asign.usdt || 0} why="Préstamo · hazlo hoy" loan />
          <Move acc="sol" amount={asign.sol || 0} why="Mantenimiento" />
          <Move acc="eth" amount={asign.eth || 0} why={salWhy} />
          {asign.btc > 0 && <Move acc="btc" amount={asign.btc} why="Operación" />}
        </div>
      </li>
    </ol>
  );
}

const emptyForm = () => ({
  method: '',
  amount: '',
  bs: '',
  keepBs: '',
  binanceRate: '',
  unit: UNITS[0].id,
  description: '',
  date: todayISO(),
});

export default function Reparto() {
  const {
    movements,
    repartoMovs,
    repartoError,
    addMovement,
    updateMovement,
    addRepartoMov,
    deleteRepartoMov,
    loading,
  } = useData();
  const today = todayISO();
  const [form, setForm] = useState(emptyForm());
  const [bcv, setBcv] = useState(null);
  const [bcvManual, setBcvManual] = useState('');
  const [paralelo, setParalelo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [mv, setMv] = useState({ de: 'btc', a: 'usdt', monto: '', fecha: todayISO(), nota: '' });
  const [mvMsg, setMvMsg] = useState('');

  const isBs = form.method === 'pago_movil';

  // Tasas: BCV Euro (función de la app) y paralelo en vivo como sugerencia de la tasa Binance.
  useEffect(() => {
    if (!isBs) return;
    if (!bcv) fetchBcvEurRate().then(setBcv).catch(() => setBcv({ error: true }));
    if (!paralelo)
      fetchParaleloRate()
        .then((p) => {
          setParalelo(p);
          setForm((f) => (f.binanceRate ? f : { ...f, binanceRate: p.rate.toFixed(2) }));
        })
        .catch(() => setParalelo({ error: true }));
  }, [isBs, bcv, paralelo]);

  const bcvRate = Number(bcv?.rate) || Number(bcvManual) || 0;

  const { balances, incomes, expenses, salByMonth } = useMemo(
    () => computeReparto(movements, repartoMovs),
    [movements, repartoMovs]
  );

  // Vista previa del cobro que se está escribiendo.
  const conv = isBs
    ? bsConversion({ bs: form.bs, bcv: bcvRate, binance: Number(form.binanceRate), keepBs: form.keepBs })
    : null;
  const previewBase = isBs ? (conv ? conv.usdtNet + conv.keepUsd : 0) : Number(form.amount) || 0;
  const preview =
    form.method && previewBase > 0
      ? allocate({
          method: form.method,
          base: previewBase,
          keepUsd: conv?.keepUsd || 0,
          salarioMes: salByMonth[form.date.slice(0, 7)] || 0,
        })
      : null;

  const pending = incomes.filter((i) => !i.mv.repartido).slice().reverse();

  // Pagos semanales (marinos, muelle, gasolina): promedio de las últimas 4 semanas.
  const weekly = useMemo(() => {
    const from = format(subDays(parseISO(today), 28), 'yyyy-MM-dd');
    const total = movements
      .filter(
        (m) =>
          m.type === 'expense' &&
          m.date >= from &&
          m.date <= today &&
          (WEEKLY_CATEGORIES.includes(m.category) ||
            (m.category === 'Personal' && !/salario/i.test(m.description || '')))
      )
      .reduce((s, m) => s + Number(m.amount || 0), 0);
    return total / 4;
  }, [movements, today]);

  const ni = nextInterest(today);
  const totals = Object.fromEntries(REPARTO_SECTIONS.map((s) => [s.id, sectionTotal(balances, s.id)]));
  const salMes = salByMonth[today.slice(0, 7)] || 0;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!preview || saving) return;
    setSaving(true);
    setMsg('');
    const description = form.description.trim() || `Cobro ${UNIT_LABELS[form.unit]}`;
    try {
      const base = {
        type: 'income',
        date: form.date,
        method: form.method,
        unit: form.unit,
        description,
        note: null,
        category: null,
        scope: null,
        repartido: true,
      };
      if (isBs) {
        await addMovement({
          ...base,
          amount: conv.incomeUsd,
          note: `${conv.bs.toLocaleString('es-VE')} Bs · BCV ${conv.bcv} · Binance ${conv.binance}`,
          reparto: {
            bs: conv.bs,
            bcv: conv.bcv,
            binance: conv.binance,
            keepBs: conv.keepBs,
            keepUsd: conv.keepUsd,
            usdtNet: conv.usdtNet,
          },
        });
        if (conv.perdida >= 0.01) {
          await addMovement({
            type: 'expense',
            date: form.date,
            amount: conv.perdida,
            method: 'pago_movil',
            description: `Diferencia cambiaria BCV → Binance (${description})`,
            note: `${conv.convBs.toLocaleString('es-VE')} Bs: BCV ${conv.bcv} vs Binance ${conv.binance}`,
            category: 'Diferencia cambiaria',
            scope: 'general',
            unit: null,
          });
        }
      } else {
        await addMovement({ ...base, amount: Number(Number(form.amount).toFixed(2)) });
      }
      setMsg(`Registrado: ${formatMoney(isBs ? conv.incomeUsd : Number(form.amount))} por ${VIAS.find((v) => v.id === form.method).label}.`);
      setForm((f) => ({ ...emptyForm(), method: f.method, unit: f.unit, binanceRate: f.binanceRate, date: f.date }));
    } catch (err) {
      setMsg('No se pudo registrar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleMove(e) {
    e.preventDefault();
    const monto = Number(mv.monto);
    if (!(monto > 0) || mv.de === mv.a) return;
    try {
      await addRepartoMov({ fecha: mv.fecha, de: mv.de, a: mv.a, monto: Number(monto.toFixed(2)), nota: mv.nota.trim() || null });
      setMv((m) => ({ ...m, monto: '', nota: '' }));
      setMvMsg('Anotado.');
    } catch (err) {
      setMvMsg(
        err.code === 'permission-denied'
          ? 'Firestore rechazó el registro: faltan publicar las reglas de "repartoMovs".'
          : 'No se pudo anotar: ' + err.message
      );
    }
  }

  async function handleDeleteMove(id) {
    if (window.confirm('¿Borrar este movimiento entre cuentas?')) await deleteRepartoMov(id);
  }

  if (loading) return <div className="empty-state">Cargando datos…</div>;

  const opsShort = weekly - totals.ops;

  return (
    <div>
      <div className="page-header">
        <h1>Reparto</h1>
      </div>
      <p className="text-muted rep-intro">
        Cada cobro se reparte igual, entre por donde entre: préstamo {REPARTO.pct.pre}% · mantenimiento {REPARTO.pct.mant}% ·
        salario {REPARTO.pct.sal}% · operación {REPARTO.pct.ops}%. Los saldos empezaron en cero el 25/11/2026 y cuentan todo lo que
        registres desde entonces, aquí o en <Link to="/movimientos">Movimientos</Link>.
      </p>

      {repartoError && (
        <div className="rep-note warn">
          No se pudieron leer los movimientos entre cuentas ({repartoError.code || repartoError.message}).
        </div>
      )}

      <div className="rep-top">
        <form className="card" onSubmit={handleSave}>
          <div className="section-title">Me entró</div>
          <div className="rep-seg" role="group" aria-label="Por dónde entró">
            {VIAS.map((v) => (
              <button
                type="button"
                key={v.id}
                aria-pressed={form.method === v.id}
                onClick={() => update('method', v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="form-grid" style={{ marginTop: 12 }}>
            {isBs ? (
              <>
                <div className="field">
                  <label>Monto en Bs</label>
                  <input type="number" min="0" step="0.01" value={form.bs} onChange={(e) => update('bs', e.target.value)} />
                </div>
                <div className="field">
                  <label>Tasa BCV Euro</label>
                  {bcv?.rate ? (
                    <input type="number" value={bcv.rate} readOnly />
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={bcv?.error ? 'Escríbela' : 'Consultando…'}
                      value={bcvManual}
                      onChange={(e) => setBcvManual(e.target.value)}
                    />
                  )}
                </div>
                <div className="field">
                  <label>Tasa Binance al cambiar</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.binanceRate}
                    onChange={(e) => update('binanceRate', e.target.value)}
                  />
                  <span className="rep-hint">
                    {paralelo?.rate
                      ? `Paralelo ahora: ${paralelo.rate.toFixed(2)}. Pon la que te dio Binance.`
                      : paralelo?.error
                        ? 'No cargó el paralelo: escríbela.'
                        : 'Consultando paralelo…'}
                  </span>
                </div>
                <div className="field">
                  <label>Bs que dejo en Banesco</label>
                  <input type="number" min="0" step="0.01" placeholder="0" value={form.keepBs} onChange={(e) => update('keepBs', e.target.value)} />
                </div>
              </>
            ) : (
              <div className="field">
                <label>Monto (USD)</label>
                <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => update('amount', e.target.value)} />
              </div>
            )}
            <div className="field">
              <label>Unidad</label>
              <select value={form.unit} onChange={(e) => update('unit', e.target.value)}>
                {UNITS.map((u) => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Descripción (opcional)</label>
              <input type="text" placeholder={`Cobro ${UNIT_LABELS[form.unit]}`} value={form.description} onChange={(e) => update('description', e.target.value)} />
            </div>
          </div>

          {isBs && conv && (
            <div className={'rep-note ' + (conv.perdida >= 0.01 ? 'warn' : 'ok')}>
              A tasa BCV son {formatMoney(conv.incomeUsd)}.
              {conv.perdida >= 0.01
                ? ` Al cambiar a tasa Binance se pierden ${formatMoney(conv.perdida)} (${conv.perdidaPct.toFixed(1)}%): se registra como gasto "Diferencia cambiaria" y se reparte sobre ${formatMoney(previewBase)}.`
                : ` Al cambiar no se pierde nada: se reparten ${formatMoney(previewBase)}.`}
            </div>
          )}

          {preview ? (
            <div style={{ marginTop: 12 }}>
              <div className="section-title" style={{ marginBottom: 6 }}>Qué hacer</div>
              <Steps method={form.method} asign={preview.asign} extra={preview.extra} conv={conv} />
              {preview.extra > 0 && (
                <div className="rep-note ok">Tu salario del mes ya llegó a {formatMoney(REPARTO.salarioTecho)}: {formatMoney(preview.extra)} van al préstamo.</div>
              )}
            </div>
          ) : (
            <p className="text-muted" style={{ fontSize: 13 }}>
              {form.method ? 'Escribe el monto y aquí te digo a qué cuenta va cada parte.' : 'Elige por dónde entró.'}
            </p>
          )}

          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="submit" className="btn" disabled={!preview || saving}>
              {saving ? 'Registrando…' : 'Registrar · ya lo repartí'}
            </button>
          </div>
          {msg && <p className="text-muted" style={{ fontSize: 13, marginBottom: 0 }}>{msg}</p>}
        </form>

        <div className="card">
          <div className="section-title">Saldos</div>
          <div className="rep-sections">
            {REPARTO_SECTIONS.map((s) => (
              <div key={s.id} className={'rep-sec' + (s.id === 'pre' ? ' loan' : '')}>
                <div className="rep-sec-head">
                  <span>{s.label}</span>
                  <strong>{formatMoney(totals[s.id])}</strong>
                </div>
                {s.id === 'pre' && (
                  <div className="rep-bar" role="img" aria-label={`Ahorrado ${formatMoney(totals.pre)} de ${formatMoney(REPARTO.prestamoMeta)}`}>
                    <i style={{ width: Math.max(0, Math.min(100, (totals.pre / REPARTO.prestamoMeta) * 100)) + '%' }} />
                  </div>
                )}
                {REPARTO_ACCOUNTS.filter((a) => a.sec === s.id).map((a) => (
                  <div key={a.id} className="rep-acc">
                    <span>{a.label}</span>
                    <span>{formatMoney(balances[a.id])}</span>
                  </div>
                ))}
                {s.id === 'pre' && (
                  <>
                    <div className="rep-acc"><span>Falta para {formatMoney(REPARTO.prestamoMeta)}</span><span>{formatMoney(Math.max(0, REPARTO.prestamoMeta - totals.pre))}</span></div>
                    <div className="rep-acc"><span>Próximo interés ({formatMoney(REPARTO.interes)})</span><span>{formatDate(ni.date)} · {ni.days} d</span></div>
                  </>
                )}
                {s.id === 'sal' && (
                  <div className="rep-acc"><span>Este mes</span><span>{formatMoney(salMes)} / {formatMoney(REPARTO.salarioTecho)}</span></div>
                )}
                {s.id === 'ops' && weekly > 0 && (
                  <div className="rep-acc"><span>Pagos semanales típicos</span><span>{formatMoney(weekly)}</span></div>
                )}
              </div>
            ))}
          </div>
          {weekly > 0 && (
            <div className={'rep-note ' + (opsShort > 0 ? 'warn' : 'ok')}>
              Marinos, muelle y gasolina te cuestan unos {formatMoney(weekly)} por semana (promedio de las últimas 4).{' '}
              {opsShort > 0
                ? `En operación hay ${formatMoney(totals.ops)}: faltan ${formatMoney(opsShort)} para el pago del lunes. No los saques del préstamo.`
                : `En operación hay ${formatMoney(totals.ops)}: alcanza para el pago del lunes.`}
            </div>
          )}
          {ni.days <= 7 && (
            <div className="rep-note warn">
              El {formatDate(ni.date)} toca pagar {formatMoney(REPARTO.interes)} de interés desde Binance USDT o BofA 6614. Regístralo
              como gasto con categoría Intereses.
            </div>
          )}
          <p className="text-muted" style={{ fontSize: 12, marginBottom: 0 }}>
            Los gastos que registres en Movimientos se descuentan solos: Bs de Banesco, efectivo de Tucacas; Binance y Zelle de la
            sección según la categoría (Mantenimiento/Reparaciones → mantenimiento, Intereses/Pago de préstamo → préstamo, "salario"
            → salario, lo demás → operación).
          </p>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="card">
          <div className="section-title">Por repartir ({pending.length})</div>
          <p className="text-muted" style={{ fontSize: 13, marginTop: -6 }}>Cobros registrados en Movimientos que todavía no marcas como repartidos.</p>
          {pending.map((i) => (
            <div key={i.mv.id} className="rep-pending">
              <div className="rep-sec-head">
                <span>
                  {formatDate(i.mv.date)} · {UNIT_LABELS[i.mv.unit] || i.mv.unit} · {METHOD_LABELS[i.mv.method] || i.mv.method} ·{' '}
                  {formatMoney(i.mv.amount)}
                </span>
                <button className="btn small" onClick={() => updateMovement(i.mv.id, { repartido: true })}>Ya lo repartí</button>
              </div>
              <Steps method={i.mv.method} asign={i.asign} extra={i.extra} conv={null} />
              {i.mv.method === 'pago_movil' && !i.mv.reparto && (
                <p className="rep-hint">Registrado sin tasa Binance: se reparte sobre el monto a tasa BCV. Para contar la pérdida del cambio, regístralo desde esta página.</p>
              )}
            </div>
          ))}
        </div>
      )}

      <form className="card" onSubmit={handleMove}>
        <div className="section-title">Moví plata entre cuentas</div>
        <p className="text-muted" style={{ fontSize: 13, marginTop: -6 }}>
          Por ejemplo, lo que sobró de operación al préstamo, o de SOL a Banesco para pagar una reparación en Bs.
        </p>
        <div className="form-grid">
          <div className="field">
            <label>De</label>
            <select value={mv.de} onChange={(e) => setMv({ ...mv, de: e.target.value })}>
              {REPARTO_ACCOUNTS.map((a) => (
                <option key={a.id} value={a.id}>{a.label} · {SEC_LABEL[a.sec]}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>A</label>
            <select value={mv.a} onChange={(e) => setMv({ ...mv, a: e.target.value })}>
              {REPARTO_ACCOUNTS.map((a) => (
                <option key={a.id} value={a.id}>{a.label} · {SEC_LABEL[a.sec]}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Monto (USD)</label>
            <input type="number" min="0" step="0.01" value={mv.monto} onChange={(e) => setMv({ ...mv, monto: e.target.value })} />
          </div>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={mv.fecha} onChange={(e) => setMv({ ...mv, fecha: e.target.value })} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Nota (opcional)</label>
            <input type="text" value={mv.nota} onChange={(e) => setMv({ ...mv, nota: e.target.value })} />
          </div>
        </div>
        {mv.de === mv.a && <p style={{ color: 'var(--expense)', fontSize: 13 }}>Elige dos cuentas distintas.</p>}
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button type="submit" className="btn" disabled={!(Number(mv.monto) > 0) || mv.de === mv.a}>Anotar</button>
          {mvMsg && <span className="text-muted" style={{ fontSize: 13 }}>{mvMsg}</span>}
        </div>
      </form>

      <div className="card">
        <div className="section-title">Desde el 25/11/2026</div>
        {incomes.length + expenses.length + repartoMovs.length === 0 ? (
          <div className="empty-state">Todavía no hay nada. El primer cobro que registres aparece aquí.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Qué</th>
                  <th>Cuentas</th>
                  <th>Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...incomes.map((i) => ({ key: 'i' + i.mv.id, date: i.mv.date, kind: 'in', i })),
                  ...expenses.map((x) => ({ key: 'e' + x.mv.id, date: x.mv.date, kind: 'out', x })),
                  ...repartoMovs.map((t) => ({ key: 't' + t.id, date: t.fecha, kind: 'mv', t })),
                ]
                  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                  .slice(0, 80)
                  .map((row) => (
                    <tr key={row.key}>
                      <td>{formatDate(row.date)}</td>
                      {row.kind === 'in' && (
                        <>
                          <td><span className="badge income">Entró</span> {row.i.mv.description}</td>
                          <td>{Object.entries(row.i.asign).map(([k, v]) => `${REPARTO_ACCOUNT_LABELS[k]} ${formatMoney(v)}`).join(' · ')}</td>
                          <td>{formatMoney(row.i.mv.amount)}</td>
                          <td></td>
                        </>
                      )}
                      {row.kind === 'out' && (
                        <>
                          <td><span className="badge expense">Salió</span> {row.x.mv.description}</td>
                          <td>{REPARTO_ACCOUNT_LABELS[row.x.acc]} ({SEC_LABEL[ACC_SEC[row.x.acc]]})</td>
                          <td>{formatMoney(row.x.mv.amount)}</td>
                          <td></td>
                        </>
                      )}
                      {row.kind === 'mv' && (
                        <>
                          <td><span className="badge general">Movió</span> {row.t.nota || ''}</td>
                          <td>{REPARTO_ACCOUNT_LABELS[row.t.de]} → {REPARTO_ACCOUNT_LABELS[row.t.a]}</td>
                          <td>{formatMoney(row.t.monto)}</td>
                          <td><button className="btn danger small" onClick={() => handleDeleteMove(row.t.id)}>Borrar</button></td>
                        </>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 0 }}>
          Los cobros y gastos se editan o borran en Movimientos. Aquí solo se borran los movimientos entre cuentas.
        </p>
      </div>
    </div>
  );
}

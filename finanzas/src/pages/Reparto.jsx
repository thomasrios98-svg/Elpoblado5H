import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { subDays, format, parseISO } from 'date-fns';
import { useData } from '../context/DataContext';
import {
  REPARTO,
  REPARTO_ACCOUNTS,
  REPARTO_ACCOUNT_LABELS,
  REPARTO_SECTIONS,
  REPARTO_AJUSTE,
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

/** Pasos a seguir para repartir un ingreso (asign = cuenta → monto). */
function Steps({ method, asign, extra, bs }) {
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
            <Move acc="bofa6614" amount={asign.bofa6614 || 0} why="Préstamo" loan />
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
      {bs && bs.keepBs > 0 && <li>Deja {bs.keepBs.toLocaleString('es-VE')} Bs en Banesco para los gastos en Bs.</li>}
      {bs && (
        <li>
          Cambia {bs.convBs.toLocaleString('es-VE')} Bs a USDT en Binance (te llegan unos {formatMoney(bs.usdtNet)}).
        </li>
      )}
      <li>
        {method === 'pago_movil' ? 'En Binance, repártelo así:' : 'Desde donde te llegó en Binance, repártelo así:'}
        <div className="rep-moves">
          <Move acc="usdt" amount={asign.usdt || 0} why="Préstamo" loan />
          <Move acc="sol" amount={asign.sol || 0} why="Mantenimiento" />
          <Move acc="eth" amount={asign.eth || 0} why={salWhy} />
          {asign.btc > 0 && <Move acc="btc" amount={asign.btc} why="Operación" />}
        </div>
      </li>
    </ol>
  );
}

/** Un cobro por repartir. Los de Bs sin tasa Binance la piden aquí, al repartir. */
function PendingItem({ item, rates, onDone }) {
  const { mv } = item;
  const needsRate = mv.method === 'pago_movil' && !mv.reparto;
  const [bcv, setBcv] = useState('');
  const [binance, setBinance] = useState('');
  const [keepBs, setKeepBs] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (needsRate && !bcv && rates.bcv) setBcv(rates.bcv.toFixed(2));
  }, [needsRate, bcv, rates.bcv]);
  useEffect(() => {
    if (needsRate && !binance && rates.paralelo) setBinance(rates.paralelo.toFixed(2));
  }, [needsRate, binance, rates.paralelo]);

  // Bs recibidos = USD registrado × tasa BCV (así se convirtió al registrar).
  const conv = needsRate
    ? bsConversion({ bs: Number(mv.amount) * Number(bcv), bcv: Number(bcv), binance: Number(binance), keepBs })
    : null;
  const shown = needsRate
    ? conv
      ? allocate({ method: mv.method, base: conv.usdtNet + conv.keepUsd, keepUsd: conv.keepUsd, salarioMes: item.salarioMesAntes })
      : null
    : item;
  const bsInfo = needsRate
    ? conv
    : mv.reparto
      ? { keepBs: mv.reparto.keepBs || 0, convBs: (mv.reparto.bs || 0) - (mv.reparto.keepBs || 0), usdtNet: mv.reparto.usdtNet }
      : null;

  async function done() {
    setBusy(true);
    try {
      await onDone(mv, conv);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rep-pending">
      <div className="rep-sec-head">
        <span>
          {formatDate(mv.date)} · {UNIT_LABELS[mv.unit] || mv.unit} · {METHOD_LABELS[mv.method] || mv.method} ·{' '}
          {formatMoney(mv.amount)}
        </span>
        <button className="btn small" onClick={done} disabled={busy || (needsRate && !conv)}>
          {busy ? 'Guardando…' : 'Ya lo repartí'}
        </button>
      </div>
      <div className="text-muted" style={{ fontSize: 12 }}>{mv.description}</div>
      {needsRate && (
        <div className="form-grid">
          <div className="field">
            <label>Tasa BCV Euro</label>
            <input type="number" min="0" step="0.01" value={bcv} onChange={(e) => setBcv(e.target.value)} placeholder="Consultando…" />
          </div>
          <div className="field">
            <label>Tasa Binance al cambiar</label>
            <input type="number" min="0" step="0.01" value={binance} onChange={(e) => setBinance(e.target.value)} placeholder="Bs por USDT" />
            <span className="rep-hint">{rates.paralelo ? `Paralelo ahora: ${rates.paralelo.toFixed(2)}` : 'Escríbela'}</span>
          </div>
          <div className="field">
            <label>Bs que dejo en Banesco</label>
            <input type="number" min="0" step="0.01" value={keepBs} onChange={(e) => setKeepBs(e.target.value)} placeholder="0" />
          </div>
        </div>
      )}
      {needsRate && conv && (
        <div className={'rep-note ' + (conv.perdida >= 0.01 ? 'warn' : 'ok')}>
          {conv.bs.toLocaleString('es-VE')} Bs.{' '}
          {conv.perdida >= 0.01
            ? `Al cambiar se pierden ${formatMoney(conv.perdida)} (${conv.perdidaPct.toFixed(1)}%): se registra como gasto "Diferencia cambiaria" y se reparten ${formatMoney(conv.usdtNet + conv.keepUsd)}.`
            : 'No se pierde nada en el cambio.'}
        </div>
      )}
      {shown && <Steps method={mv.method} asign={shown.asign} extra={shown.extra} bs={bsInfo} />}
    </div>
  );
}

export default function Reparto() {
  const { movements, repartoMovs, repartoError, addMovement, updateMovement, addRepartoMov, deleteRepartoMov, loading } =
    useData();
  const today = todayISO();
  const [mv, setMv] = useState({ de: 'btc', a: 'usdt', monto: '', fecha: todayISO(), nota: '' });
  const [mvMsg, setMvMsg] = useState('');
  const [rates, setRates] = useState({});
  const [doneMsg, setDoneMsg] = useState('');

  const { balances, incomes, expenses, salByMonth } = useMemo(
    () => computeReparto(movements, repartoMovs),
    [movements, repartoMovs]
  );
  const pending = incomes.filter((i) => !i.mv.repartido).slice().reverse();
  const needsRates = pending.some((i) => i.mv.method === 'pago_movil' && !i.mv.reparto);

  // Tasas solo si hay cobros en Bs sin tasa Binance.
  useEffect(() => {
    if (!needsRates || rates.loaded) return;
    setRates((r) => ({ ...r, loaded: true }));
    fetchBcvEurRate()
      .then((d) => setRates((r) => ({ ...r, bcv: Number(d.rate) || null })))
      .catch(() => {});
    fetchParaleloRate()
      .then((p) => setRates((r) => ({ ...r, paralelo: p.rate })))
      .catch(() => {});
  }, [needsRates, rates.loaded]);

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
  const opsShort = weekly - totals.ops;

  async function markDone(m, conv) {
    if (conv) {
      await updateMovement(m.id, {
        repartido: true,
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
          date: m.date,
          amount: conv.perdida,
          method: 'pago_movil',
          description: `Diferencia cambiaria BCV → Binance (${m.description})`,
          note: `${conv.convBs.toLocaleString('es-VE')} Bs cambiados: BCV ${conv.bcv} vs Binance ${conv.binance}`,
          category: 'Diferencia cambiaria',
          scope: 'general',
          unit: null,
        });
      }
    } else {
      await updateMovement(m.id, { repartido: true });
    }
    setDoneMsg(`Repartido: ${m.description}.`);
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
      setMvMsg('No se pudo anotar: ' + err.message);
    }
  }

  async function handleDeleteMove(id) {
    if (window.confirm('¿Borrar este movimiento entre cuentas?')) await deleteRepartoMov(id);
  }

  if (loading) return <div className="empty-state">Cargando datos…</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Reparto</h1>
      </div>
      <p className="text-muted rep-intro">
        Cada cobro se reparte igual, entre por donde entre: préstamo {REPARTO.pct.pre}% · mantenimiento {REPARTO.pct.mant}% ·
        salario {REPARTO.pct.sal}% · operación {REPARTO.pct.ops}%. Los cobros y gastos se registran en{' '}
        <Link to="/movimientos">Movimientos</Link> y aquí aparecen solos. Cuenta todo lo que tenga fecha desde el 26/11/2026.
      </p>

      {repartoError && (
        <div className="rep-note warn">
          No se pudieron leer los movimientos entre cuentas ({repartoError.code || repartoError.message}).
        </div>
      )}

      <div className="rep-top">
        <div className="card">
          <div className="section-title">Por repartir {pending.length > 0 && `(${pending.length})`}</div>
          {pending.length === 0 ? (
            <div className="empty-state">
              Nada pendiente. Cuando registres un cobro en Movimientos, aparece aquí con lo que tienes que mover a cada cuenta.
            </div>
          ) : (
            pending.map((i) => <PendingItem key={i.mv.id} item={i} rates={rates} onDone={markDone} />)
          )}
          {doneMsg && <p className="text-muted" style={{ fontSize: 13, marginBottom: 0 }}>{doneMsg}</p>}
        </div>

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
              en Movimientos como gasto con categoría Intereses.
            </div>
          )}
          <p className="text-muted" style={{ fontSize: 12, marginBottom: 0 }}>
            Los gastos de Movimientos se descuentan solos: Bs de Banesco, efectivo de Tucacas; Binance y Zelle de la sección según la
            categoría (Mantenimiento/Reparaciones → mantenimiento, Intereses/Pago de préstamo → préstamo, "salario" → salario, lo
            demás → operación).
          </p>
        </div>
      </div>

      <form className="card" onSubmit={handleMove}>
        <div className="section-title">Moví plata entre cuentas</div>
        <p className="text-muted" style={{ fontSize: 13, marginTop: -6 }}>
          Por ejemplo, lo que sobró de operación al préstamo, o de SOL a Banesco para pagar una reparación en Bs. Para cargar plata que ya tenías, elige "Saldo inicial / ajuste" como origen.
        </p>
        <div className="form-grid">
          <div className="field">
            <label>De</label>
            <select value={mv.de} onChange={(e) => setMv({ ...mv, de: e.target.value })}>
              <option value={REPARTO_AJUSTE}>Saldo inicial / ajuste (plata que ya tenías)</option>
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
        <div className="section-title">Desde el 26/11/2026</div>
        {incomes.length + expenses.length + repartoMovs.length === 0 ? (
          <div className="empty-state">Todavía no hay nada. El primer cobro que registres en Movimientos aparece aquí.</div>
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
                          <td>
                            <span className="badge income">Entró</span> {row.i.mv.description}
                            {!row.i.mv.repartido && <span className="badge general" style={{ marginLeft: 6 }}>Por repartir</span>}
                          </td>
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
                          <td><span className="badge general">{row.t.de === REPARTO_AJUSTE ? 'Saldo inicial' : 'Movió'}</span> {row.t.nota || ''}</td>
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

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import StatCard from '../components/StatCard';
import { CORTE_CONFIG, METHOD_LABELS } from '../lib/constants';
import { formatMoney, formatDate, todayISO } from '../lib/format';
import {
  computeCorte,
  lastCompleteWeek,
  loanStatus,
  shiftWeek,
  weekEndOf,
} from '../lib/corte';

const cfg = CORTE_CONFIG;

function Ticket({ title, hint, amount, main }) {
  return (
    <div className={'cut-ticket' + (main ? ' main' : '')}>
      <div>
        <div className="cut-ticket-title">{title}</div>
        <div className="cut-ticket-hint">{hint}</div>
      </div>
      <div className="cut-ticket-amount">{formatMoney(amount)}</div>
    </div>
  );
}

function Note({ tone = 'info', children }) {
  return <div className={`cut-note ${tone}`}>{children}</div>;
}

export default function WeeklyCut() {
  const { movements, cortes, cortesError, saveCorte, deleteCorte, loading } = useData();
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(() => lastCompleteWeek(today));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const saved = cortes.find((c) => c.weekStart === weekStart);
  const live = useMemo(
    () => computeCorte({ movements, cortes, weekStart }),
    [movements, cortes, weekStart]
  );
  const shown = saved || live;
  const changed = saved && Math.abs(Number(saved.total) - live.total) > 0.5;
  const weekNotOver = weekEndOf(weekStart) >= today;

  const loan = useMemo(
    () =>
      loanStatus({
        movements,
        cortes,
        todayStr: today,
        extraPrestamo: saved ? 0 : live.prestamo,
      }),
    [movements, cortes, today, saved, live.prestamo]
  );
  const savedPct = Math.min(100, (Math.max(0, loan.saldoAhorro - (saved ? 0 : live.prestamo)) / loan.deuda) * 100 || 0);
  const addPct = saved ? 0 : Math.min(100 - savedPct, (live.prestamo / loan.deuda) * 100 || 0);

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      const { porMetodo, ...rest } = live;
      const { count, ...metodos } = porMetodo;
      await saveCorte({ ...rest, porMetodo: metodos, movimientos: count });
    } catch (err) {
      console.error(err);
      setSaveError(
        err.code === 'permission-denied'
          ? 'Firestore rechazó el registro: hay que publicar las reglas nuevas (colección "cortes").'
          : 'No se pudo registrar el corte: ' + err.message
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (window.confirm('¿Borrar el registro de este corte? Los movimientos no se tocan.')) {
      await deleteCorte(weekStart);
    }
  }

  if (loading) return <div className="empty-state">Cargando datos…</div>;

  const m = shown.porMetodo || {};
  const notes = [];
  if (shown.total === 0) {
    notes.push(<Note key="empty" tone="warn">No hay ingresos registrados en esta semana. Anótalos en <Link to="/movimientos">Movimientos</Link> y vuelve.</Note>);
  } else {
    notes.push(
      <Note key="ops">
        Operación {formatMoney(shown.operacion)}: el efectivo cubre {formatMoney(shown.operacionEfectivo)}
        {shown.efectivoAnterior > 0 && ` (incluye ${formatMoney(shown.efectivoAnterior)} que sobraron la semana pasada)`}
        {shown.operacionBs > 0 && `, los Bs ${formatMoney(shown.operacionBs)}`}
        {shown.operacionDolares > 0 && ` y quedan ${formatMoney(shown.operacionDolares)} en dólares`}.
      </Note>
    );
  }
  if (shown.excedenteSalario > 0)
    notes.push(<Note key="techo" tone="ok">Tu salario llegó al techo de {formatMoney(cfg.salarioTecho)} este mes: {formatMoney(shown.excedenteSalario)} extra van al préstamo.</Note>);
  if (shown.efectivoSobrante > 0)
    notes.push(<Note key="cash" tone="warn">Sobran {formatMoney(shown.efectivoSobrante)} de efectivo en Tucacas. Déjalos allá: el próximo corte los cuenta para operación.{shown.faltante > 0 && ` Por eso esta semana faltan ${formatMoney(shown.faltante)} en digital para completar las secciones.`}</Note>);
  else if (shown.faltante > 0)
    notes.push(<Note key="short" tone="warn">Faltan {formatMoney(shown.faltante)} en Zelle/Binance para completar las secciones.</Note>);
  if (shown.ultimoDelMes)
    notes.push(
      shown.faltaPiso > 0 ? (
        <Note key="piso" tone="warn">Último corte del mes: tu salario queda en {formatMoney(shown.salarioMes)}. Faltan {formatMoney(shown.faltaPiso)} para el piso de {formatMoney(cfg.salarioPiso)}: sácalos del fondo de emergencia, nunca de Binance 1.</Note>
      ) : (
        <Note key="piso" tone="ok">Último corte del mes: tu salario del mes queda en {formatMoney(shown.salarioMes)}.</Note>
      )
    );
  if (loan.proximoInteres.days <= 7)
    notes.push(<Note key="int" tone="warn">El {formatDate(loan.proximoInteres.date)} toca el interés: paga {formatMoney(cfg.interesMensual)} desde Binance 1 y regístralo como gasto con categoría <strong>Intereses</strong>.</Note>);

  return (
    <div>
      <div className="page-header">
        <h1>Corte semanal</h1>
        <div className="btn-row cut-week-nav">
          <button className="btn secondary small" onClick={() => setWeekStart((w) => shiftWeek(w, -1))} aria-label="Semana anterior">◀</button>
          <strong>
            {formatDate(weekStart).slice(0, 5)} – {formatDate(weekEndOf(weekStart))}
          </strong>
          <button className="btn secondary small" onClick={() => setWeekStart((w) => shiftWeek(w, 1))} aria-label="Semana siguiente">▶</button>
          {saved ? <span className="badge income">Registrado</span> : <span className="badge general">Pendiente</span>}
        </div>
      </div>

      <p className="text-muted cut-intro">
        División durante el préstamo de la Luki Sea: operación {cfg.pct.operacion}% · mantenimiento {cfg.pct.mantenimiento}% · salario {cfg.pct.salario}% · préstamo {cfg.pct.prestamo}%, sobre todo lo que entró en la semana.
      </p>

      {cortesError && (
        <Note tone="warn">No se pudieron leer los cortes registrados ({cortesError.code || cortesError.message}). El cálculo funciona, pero no se puede guardar hasta publicar las reglas de Firestore.</Note>
      )}

      <div className="grid cols-4">
        <StatCard label="Efectivo" value={m.efectivo} />
        <StatCard label="Pago Móvil (Bs)" value={m.pago_movil} />
        <StatCard label="Zelle" value={m.zelle} />
        <StatCard label={m.tarjeta ? 'Binance + tarjeta' : 'Binance'} value={(m.binance || 0) + (m.tarjeta || 0)} />
      </div>

      <div className="card cut-total">
        <div>
          <div className="section-title" style={{ marginBottom: 2 }}>Ingreso bruto de la semana</div>
          <div className="text-muted" style={{ fontSize: 13 }}>
            Sale de los ingresos registrados en Movimientos. Si un cliente pagó por Binance y lo cambiaste a Bs, el ingreso va como Binance y el cambio se anota en <Link to="/saldos">Saldos → Transferencia interna</Link>.
          </div>
        </div>
        <div className="cut-total-value">{formatMoney(shown.total)}</div>
      </div>

      {changed && (
        <Note tone="warn">
          Los ingresos de esta semana cambiaron desde que registraste el corte ({formatMoney(saved.total)} → {formatMoney(live.total)}). Vuelve a registrarlo para actualizar los montos.
        </Note>
      )}

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card" style={{ marginTop: 0 }}>
          <div className="section-title">Transferencias del corte</div>
          <div className="cut-tickets">
            <Ticket main title="Binance 1 · Préstamo" hint="No se toca. Sale el interés y el pago final." amount={shown.prestamo} />
            <Ticket title="Binance 2 · Mantenimiento" hint="Reparaciones y fallas" amount={shown.mantenimiento} />
            <Ticket title="Zelle 2 · Tu salario" hint={`Con este corte llevas ${formatMoney(shown.salarioMes)} este mes`} amount={shown.salario} />
            {shown.bsAUsdt > 0.5 && <Ticket title="Bs → USDT" hint="Bs que sobran después de los gastos en Bs. Pásalos antes de 48 h." amount={shown.bsAUsdt} />}
            <Ticket title="Operación en dólares (Zelle 1)" hint="Lo que no cubren el efectivo y los Bs" amount={shown.operacionDolares} />
          </div>
          <div className="cut-notes">{notes}</div>
          {saveError && <p style={{ color: 'var(--expense)', fontSize: 13 }}>{saveError}</p>}
          <div className="btn-row" style={{ marginTop: 14 }}>
            {(!saved || changed) && (
              <button className="btn" onClick={handleSave} disabled={saving || live.total === 0}>
                {saving ? 'Registrando…' : saved ? 'Actualizar corte' : 'Registrar corte'}
              </button>
            )}
            {saved && <button className="btn danger small" onClick={handleDelete}>Borrar registro</button>}
          </div>
          {!saved && weekNotOver && live.total > 0 && (
            <p className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>Esta semana todavía no termina: regístrala el lunes, cuando ya estén todos los ingresos.</p>
          )}
        </div>

        <div className="card" style={{ marginTop: 0 }}>
          <div className="section-title">Préstamo Luki Sea</div>
          <div className="cut-bar" role="img" aria-label={`Ahorro para el préstamo: ${formatMoney(loan.saldoAhorro)} de ${formatMoney(loan.deuda)}`}>
            <i style={{ width: savedPct + '%' }} />
            <i className="add" style={{ width: addPct + '%' }} />
          </div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
            {saved ? 'Ahorro en Binance 1' : 'Ahorro en Binance 1, contando este corte (en dorado)'}
          </div>
          <div className="cut-loan-grid">
            <div><span>Ahorrado</span><strong>{formatMoney(loan.saldoAhorro)}</strong></div>
            <div><span>Falta</span><strong>{loan.falta === 0 ? '¡Listo para pagar!' : formatMoney(loan.falta)}</strong></div>
            <div><span>Próximo interés</span><strong>{formatDate(loan.proximoInteres.date)} · {loan.proximoInteres.days} d</strong></div>
            <div><span>A este ritmo</span><strong>{loan.semanasEstimadas == null ? '—' : loan.semanasEstimadas === 0 ? 'Ya' : `~${loan.semanasEstimadas} semanas`}</strong></div>
            <div><span>Intereses pagados</span><strong>{formatMoney(loan.intereses)}</strong></div>
            <div><span>Capital pagado</span><strong>{formatMoney(loan.pagos)}</strong></div>
          </div>
          <p className="text-muted" style={{ fontSize: 12, marginBottom: 0 }}>
            El interés de {formatMoney(cfg.interesMensual)} no baja con abonos: junta todo en Binance 1 y paga los {formatMoney(cfg.prestamoMeta)} de una vez. Registra los intereses como gasto con categoría <strong>Intereses</strong> y el pago final con <strong>Pago de préstamo</strong>.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Cortes registrados</div>
        {cortes.length === 0 ? (
          <div className="empty-state">Todavía no has registrado ningún corte. El primero sale de la semana que elijas arriba.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Semana</th>
                  <th>Ingreso</th>
                  <th>Préstamo</th>
                  <th>Mantenimiento</th>
                  <th>Salario</th>
                  <th>Operación</th>
                  <th>Efectivo sobrante</th>
                </tr>
              </thead>
              <tbody>
                {cortes.map((c) => (
                  <tr key={c.weekStart} onClick={() => setWeekStart(c.weekStart)} style={{ cursor: 'pointer' }}>
                    <td>{formatDate(c.weekStart)}</td>
                    <td>{formatMoney(c.total)}</td>
                    <td>{formatMoney(c.prestamo)}</td>
                    <td>{formatMoney(c.mantenimiento)}</td>
                    <td>{formatMoney(c.salario)}</td>
                    <td>{formatMoney(c.operacion)}</td>
                    <td>{formatMoney(c.efectivoSobrante)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-muted" style={{ fontSize: 12 }}>
        Métodos: {['efectivo', 'pago_movil', 'zelle', 'binance', 'tarjeta'].map((k) => METHOD_LABELS[k]).join(' · ')}. Tarjeta internacional cuenta como dólares digitales.
      </p>
    </div>
  );
}

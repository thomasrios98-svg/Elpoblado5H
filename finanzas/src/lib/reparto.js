import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { REPARTO, REPARTO_ACCOUNTS } from './constants';

const START_MS = Date.parse(REPARTO.start);
const r2 = (v) => Math.round(v * 100) / 100;

/** Mundo de cada método de pago: Binance (incluye Bs), bancos (Zelle) o efectivo. */
export function worldOf(method) {
  if (method === 'pago_movil') return 'bs';
  if (method === 'binance') return 'binance';
  if (method === 'efectivo') return 'efectivo';
  return 'zelle'; // zelle y tarjeta internacional
}

const WORLD_ACCOUNT = {
  binance: { pre: 'usdt', mant: 'sol', sal: 'eth', ops: 'btc' },
  zelle: { pre: 'bofa6614', mant: 'chase_mant', sal: 'bofa4962', ops: 'chase_ops' },
};

function createdMs(mv) {
  // `clientCreatedAt` lo pone la app al crear (existe aunque el servidor no haya confirmado).
  if (typeof mv.clientCreatedAt === 'number') return mv.clientCreatedAt;
  const c = mv.createdAt;
  if (c && typeof c.toMillis === 'function') return c.toMillis();
  if (c && typeof c.seconds === 'number') return c.seconds * 1000;
  return 0; // movimientos viejos o importados sin fecha de creación: no cuentan
}

/** Solo cuenta lo registrado desde el inicio del reparto. */
export function inReparto(mv) {
  return createdMs(mv) >= START_MS;
}

/**
 * Bs: el reparto se hace sobre lo que de verdad queda después de cambiar a
 * tasa Binance (USDT recibidos) más los Bs que se dejaron para gastos.
 */
export function bsConversion({ bs, bcv, binance, keepBs }) {
  const total = Number(bs) || 0;
  const keep = Math.min(Math.max(0, Number(keepBs) || 0), total);
  if (!(total > 0) || !(bcv > 0) || !(binance > 0)) return null;
  const incomeUsd = total / bcv;
  const keepUsd = keep / bcv;
  const convBs = total - keep;
  const usdtNet = convBs / binance;
  const diff = convBs / bcv - usdtNet; // > 0: se pierde en el cambio
  return {
    bs: r2(total),
    bcv,
    binance,
    keepBs: r2(keep),
    incomeUsd: r2(incomeUsd),
    keepUsd: r2(keepUsd),
    convBs: r2(convBs),
    usdtNet: r2(usdtNet),
    perdida: r2(Math.max(0, diff)),
    perdidaPct: convBs > 0 ? Math.max(0, diff) / (convBs / bcv) * 100 : 0,
  };
}

/** Monto sobre el que se reparte un ingreso. */
export function baseOf(mv) {
  if (mv.method === 'pago_movil' && mv.reparto && typeof mv.reparto.usdtNet === 'number') {
    return mv.reparto.usdtNet + (mv.reparto.keepUsd || 0);
  }
  return Number(mv.amount || 0);
}

/** Reparto de un ingreso. `salarioMes`: salario ya asignado ese mes. */
export function allocate({ method, base, keepUsd = 0, salarioMes = 0 }) {
  const world = worldOf(method);
  if (!(base > 0)) return { asign: {}, extra: 0, world };
  if (world === 'efectivo') return { asign: { efectivo: r2(base) }, extra: 0, world };
  const pct = REPARTO.pct;
  let pre = (base * pct.pre) / 100;
  const mant = (base * pct.mant) / 100;
  let sal = (base * pct.sal) / 100;
  const ops = (base * pct.ops) / 100;
  let extra = 0;
  if (salarioMes + sal > REPARTO.salarioTecho) {
    extra = Math.min(sal, salarioMes + sal - REPARTO.salarioTecho);
    sal -= extra;
    pre += extra;
  }
  const acc = WORLD_ACCOUNT[world === 'zelle' ? 'zelle' : 'binance'];
  const asign = { [acc.pre]: pre, [acc.mant]: mant, [acc.sal]: sal };
  if (world === 'bs') {
    const keep = Math.min(Math.max(0, keepUsd), ops);
    if (keep > 0) asign.banesco = keep;
    asign.btc = ops - keep;
  } else {
    asign[acc.ops] = ops;
  }
  for (const k of Object.keys(asign)) {
    asign[k] = r2(asign[k]);
    if (!asign[k]) delete asign[k];
  }
  return { asign, extra: r2(extra), world };
}

/** De qué cuenta sale un gasto, según método y categoría. */
export function expenseAccount(mv) {
  if (mv.category === 'Diferencia cambiaria') return null; // ya está descontado en el reparto
  if (mv.method === 'pago_movil') return 'banesco';
  if (mv.method === 'efectivo') return 'efectivo';
  let sec = 'ops';
  if (mv.category === 'Mantenimiento' || mv.category === 'Reparaciones') sec = 'mant';
  else if (mv.category === 'Intereses' || mv.category === 'Pago de préstamo') sec = 'pre';
  else if (/salario/i.test(mv.description || '')) sec = 'sal';
  return WORLD_ACCOUNT[mv.method === 'binance' ? 'binance' : 'zelle'][sec];
}

const byDateThenCreated = (a, b) =>
  (a.date || '').localeCompare(b.date || '') || createdMs(a) - createdMs(b);

/** Saldos por cuenta y detalle de cada ingreso repartido. */
export function computeReparto(movements, repartoMovs) {
  const balances = Object.fromEntries(REPARTO_ACCOUNTS.map((a) => [a.id, 0]));
  const salByMonth = {};
  const incomes = [];
  const expenses = [];

  const own = movements.filter(inReparto).sort(byDateThenCreated);
  for (const mv of own) {
    if (mv.type === 'income') {
      const month = (mv.date || '').slice(0, 7);
      const salarioMes = salByMonth[month] || 0;
      const res = allocate({ method: mv.method, base: baseOf(mv), keepUsd: mv.reparto?.keepUsd || 0, salarioMes });
      salByMonth[month] = salarioMes + (res.asign.eth || 0) + (res.asign.bofa4962 || 0);
      for (const [k, v] of Object.entries(res.asign)) balances[k] += v;
      incomes.push({ mv, ...res, salarioMesAntes: salarioMes });
    } else if (mv.type === 'expense') {
      const acc = expenseAccount(mv);
      if (!acc) continue;
      balances[acc] -= Number(mv.amount || 0);
      expenses.push({ mv, acc });
    }
  }
  for (const t of repartoMovs) {
    const amt = Number(t.monto || 0);
    if (t.de in balances) balances[t.de] -= amt;
    if (t.a in balances) balances[t.a] += amt;
  }
  for (const k of Object.keys(balances)) balances[k] = r2(balances[k]);
  return { balances, incomes, expenses, salByMonth };
}

export function sectionTotal(balances, sec) {
  return r2(REPARTO_ACCOUNTS.filter((a) => a.sec === sec).reduce((s, a) => s + balances[a.id], 0));
}

export function nextInterest(todayStr) {
  let d = parseISO(REPARTO.primerInteres);
  const t = parseISO(todayStr);
  while (d < t) d = addDays(d, REPARTO.interesCadaDias);
  return { date: format(d, 'yyyy-MM-dd'), days: differenceInCalendarDays(d, t) };
}

/** Tasa paralelo en vivo (aprox. Binance), solo como sugerencia. */
export async function fetchParaleloRate() {
  const res = await fetch('https://ve.dolarapi.com/v1/dolares/paralelo', { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  const rate = Number(data.promedio ?? data.venta ?? data.compra);
  if (!(rate > 0)) throw new Error('Sin tasa');
  return { rate, date: data.fechaActualizacion || null };
}

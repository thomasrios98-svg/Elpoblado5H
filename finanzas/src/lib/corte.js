import { addDays, format, parseISO, startOfWeek, differenceInCalendarDays } from 'date-fns';
import { CORTE_CONFIG } from './constants';

const DIGITAL = ['zelle', 'binance', 'tarjeta'];

export function mondayOf(dateStr) {
  return format(startOfWeek(parseISO(dateStr), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function shiftWeek(weekStart, weeks) {
  return format(addDays(parseISO(weekStart), 7 * weeks), 'yyyy-MM-dd');
}

export function weekEndOf(weekStart) {
  return format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd');
}

/** Semana completa más reciente: la que terminó el domingo anterior a hoy. */
export function lastCompleteWeek(todayStr) {
  return shiftWeek(mondayOf(todayStr), -1);
}

/** Próxima fecha de interés en o después de `todayStr`. */
export function nextInterestDate(todayStr, cfg = CORTE_CONFIG) {
  let d = parseISO(cfg.primerInteres);
  const today = parseISO(todayStr);
  while (d < today) d = addDays(d, cfg.interesCadaDias);
  return { date: format(d, 'yyyy-MM-dd'), days: differenceInCalendarDays(d, today) };
}

export function incomeByMethod(movements, weekStart) {
  const end = weekEndOf(weekStart);
  const out = { efectivo: 0, pago_movil: 0, zelle: 0, binance: 0, tarjeta: 0 };
  let count = 0;
  for (const mv of movements) {
    if (mv.type !== 'income' || !mv.date || mv.date < weekStart || mv.date > end) continue;
    const k = mv.method in out ? mv.method : 'zelle';
    out[k] += Number(mv.amount || 0);
    count += 1;
  }
  return { ...out, count };
}

const r2 = (v) => Math.round(v * 100) / 100;

/**
 * Calcula el corte de una semana.
 * - Operación se cubre primero con efectivo (más el sobrante de la semana
 *   anterior), luego con Bs, y lo que falte con dólares digitales.
 * - Los Bs que sobren se pasan a USDT para llenar las otras secciones.
 * - El salario no pasa del techo mensual: el excedente va al préstamo.
 * - Si hay poco digital, se llena en orden: préstamo, mantenimiento, salario.
 */
export function computeCorte({ movements, cortes, weekStart, cfg = CORTE_CONFIG }) {
  const m = incomeByMethod(movements, weekStart);
  const total = m.efectivo + m.pago_movil + m.zelle + m.binance + m.tarjeta;
  const digital = DIGITAL.reduce((a, k) => a + m[k], 0);

  const earlier = cortes.filter((c) => c.weekStart < weekStart).sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
  const prevCash = Number(earlier[0]?.efectivoSobrante || 0);

  const monthKey = weekStart.slice(0, 7);
  const salarioMes = cortes
    .filter((c) => c.weekStart !== weekStart && c.weekStart.slice(0, 7) === monthKey)
    .reduce((a, c) => a + Number(c.salario || 0), 0);
  const ultimoDelMes = shiftWeek(weekStart, 1).slice(0, 7) !== monthKey;

  const ops = (total * cfg.pct.operacion) / 100;
  const mant = (total * cfg.pct.mantenimiento) / 100;
  let sal = (total * cfg.pct.salario) / 100;
  let pre = (total * cfg.pct.prestamo) / 100;

  let excedenteSalario = 0;
  if (salarioMes + sal > cfg.salarioTecho) {
    excedenteSalario = Math.min(sal, salarioMes + sal - cfg.salarioTecho);
    sal -= excedenteSalario;
    pre += excedenteSalario;
  }

  const cash = m.efectivo + prevCash;
  let efectivoSobrante = 0;
  let bsUsados = 0;
  let bsAUsdt = m.pago_movil;
  let opsDigital = 0;
  if (cash >= ops) {
    efectivoSobrante = cash - ops;
  } else {
    bsUsados = Math.min(m.pago_movil, ops - cash);
    bsAUsdt = m.pago_movil - bsUsados;
    opsDigital = ops - cash - bsUsados;
  }

  let left = digital + bsAUsdt - opsDigital;
  const give = (amt) => {
    const g = Math.max(0, Math.min(amt, left));
    left -= g;
    return g;
  };
  const prestamo = give(pre);
  const mantenimiento = give(mant);
  const salario = give(sal);
  const faltante = pre - prestamo + (mant - mantenimiento) + (sal - salario);
  const opsEnDolares = opsDigital + Math.max(0, left);

  const salarioMesTotal = salarioMes + salario;
  return {
    weekStart,
    weekEnd: weekEndOf(weekStart),
    porMetodo: m,
    total: r2(total),
    operacion: r2(ops),
    operacionEfectivo: r2(Math.min(cash, ops)),
    operacionBs: r2(bsUsados),
    operacionDolares: r2(opsEnDolares),
    mantenimiento: r2(mantenimiento),
    salario: r2(salario),
    prestamo: r2(prestamo),
    bsAUsdt: r2(bsAUsdt),
    efectivoAnterior: r2(prevCash),
    efectivoSobrante: r2(efectivoSobrante),
    faltante: r2(faltante),
    excedenteSalario: r2(excedenteSalario),
    salarioMes: r2(salarioMesTotal),
    ultimoDelMes,
    faltaPiso: ultimoDelMes ? r2(Math.max(0, cfg.salarioPiso - salarioMesTotal)) : 0,
  };
}

/** Estado del préstamo a partir de los cortes registrados y los gastos de intereses/pagos. */
export function loanStatus({ movements, cortes, todayStr, extraPrestamo = 0, cfg = CORTE_CONFIG }) {
  const depositado = cortes.reduce((a, c) => a + Number(c.prestamo || 0), 0) + extraPrestamo;
  const desde = '2026-11-01';
  let intereses = 0;
  let pagos = 0;
  for (const mv of movements) {
    if (mv.type !== 'expense' || !mv.date || mv.date < desde) continue;
    if (mv.category === 'Intereses') intereses += Number(mv.amount || 0);
    if (mv.category === 'Pago de préstamo') pagos += Number(mv.amount || 0);
  }
  const saldoAhorro = depositado - intereses - pagos;
  const deuda = Math.max(0, cfg.prestamoMeta - pagos);
  const falta = Math.max(0, deuda - saldoAhorro);
  const semanas = cortes.length + (extraPrestamo ? 1 : 0);
  const promedio = semanas ? depositado / semanas : 0;
  const netoSemana = promedio - (cfg.interesMensual * 7) / 30;
  return {
    depositado: r2(depositado),
    intereses: r2(intereses),
    pagos: r2(pagos),
    saldoAhorro: r2(saldoAhorro),
    deuda: r2(deuda),
    falta: r2(falta),
    semanasEstimadas: falta === 0 ? 0 : netoSemana > 0 ? Math.ceil(falta / netoSemana) : null,
    proximoInteres: nextInterestDate(todayStr, cfg),
  };
}

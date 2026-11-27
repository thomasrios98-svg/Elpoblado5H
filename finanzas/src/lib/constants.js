export const UNITS = [
  { id: 'apto5h', label: 'Apto 5H' },
  { id: 'kichi', label: 'Kichi' },
  { id: 'yamaha', label: 'Yamaha' },
  // `since`: first day the unit shares general expenses. General expenses dated
  // before it are split only among the units that existed then.
  { id: 'lukisea', label: 'Luki Sea', since: '2026-12-15' },
];

export const UNIT_LABELS = Object.fromEntries(UNITS.map((u) => [u.id, u.label]));

export const PAYMENT_METHODS = [
  { id: 'pago_movil', label: 'Pago Móvil' },
  { id: 'zelle', label: 'Zelle' },
  { id: 'binance', label: 'Binance Pay (USDT)' },
  { id: 'tarjeta', label: 'Tarjeta internacional' },
  { id: 'efectivo', label: 'Efectivo' },
];

export const METHOD_LABELS = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.id, m.label]));

export const EXPENSE_CATEGORIES = [
  'Mantenimiento',
  'Servicios (luz/agua/gas)',
  'Internet/Cable',
  'Limpieza',
  'Insumos',
  'Personal',
  'Comisiones',
  'Impuestos',
  'Seguros',
  'Marketing',
  'Reparaciones',
  'Marina/Muelle',
  'Gasolina',
  'Intereses',
  'Pago de préstamo',
  'Diferencia cambiaria',
  'Otros',
];

export const MOVEMENT_TYPES = [
  { id: 'income', label: 'Ingreso' },
  { id: 'expense', label: 'Gasto' },
];

export const EXPENSE_SCOPES = [
  { id: 'individual', label: 'Individual (de una unidad)' },
  { id: 'general', label: 'General (se reparte entre las unidades activas)' },
];

/** Units active on a given date (YYYY-MM-DD); general expenses are split evenly among them. */
export function activeUnits(dateStr) {
  return UNITS.filter((u) => !u.since || !dateStr || dateStr >= u.since);
}

/**
 * Reparto de cobros (fase préstamo Luki Sea). Cada ingreso se reparte igual,
 * entre por donde entre. Los saldos empiezan en cero el 26/11/2026.
 */
export const REPARTO = {
  // Cuenta todo movimiento con fecha desde `startDate` (sirve también para lo
  // que se escribe por fuera de la app, sin fecha de creación), más lo creado
  // en la app después de `start`.
  startDate: '2026-11-26',
  start: '2026-11-25T21:36:00Z',
  pct: { pre: 23, mant: 22, sal: 17, ops: 38 },
  salarioTecho: 2500,
  prestamoMeta: 12000,
  interes: 240,
  primerInteres: '2026-12-20',
  interesCadaDias: 30,
};

export const REPARTO_SECTIONS = [
  { id: 'pre', label: 'Préstamo' },
  { id: 'mant', label: 'Mantenimiento' },
  { id: 'sal', label: 'Salario' },
  { id: 'ops', label: 'Operación' },
];

// Cuentas reales por sección. Chase guarda mantenimiento y operación juntos.
export const REPARTO_ACCOUNTS = [
  { id: 'usdt', label: 'Binance USDT', sec: 'pre' },
  { id: 'bofa6614', label: 'BofA 6614', sec: 'pre' },
  { id: 'sol', label: 'Binance SOL', sec: 'mant' },
  { id: 'chase_mant', label: 'Chase · mantenimiento', sec: 'mant' },
  { id: 'eth', label: 'Binance ETH', sec: 'sal' },
  { id: 'bofa4962', label: 'BofA 4962', sec: 'sal' },
  { id: 'btc', label: 'Binance BTC', sec: 'ops' },
  { id: 'chase_ops', label: 'Chase · operación', sec: 'ops' },
  { id: 'banesco', label: 'Banesco (Bs)', sec: 'ops' },
  { id: 'efectivo', label: 'Efectivo Tucacas', sec: 'ops' },
];

// `ajuste` no es una cuenta: es el origen de un saldo inicial o una corrección.
export const REPARTO_AJUSTE = 'ajuste';

export const REPARTO_ACCOUNT_LABELS = {
  ...Object.fromEntries(REPARTO_ACCOUNTS.map((a) => [a.id, a.label])),
  [REPARTO_AJUSTE]: 'Saldo inicial / ajuste',
};

export const UNITS = [
  { id: 'apto5h', label: 'Apto 5H' },
  { id: 'kichi', label: 'Kichi' },
  { id: 'yamaha', label: 'Yamaha' },
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
  'Otros',
];

export const MOVEMENT_TYPES = [
  { id: 'income', label: 'Ingreso' },
  { id: 'expense', label: 'Gasto' },
];

export const EXPENSE_SCOPES = [
  { id: 'individual', label: 'Individual (de una unidad)' },
  { id: 'general', label: 'General (se reparte entre las 3 unidades)' },
];

export const GENERAL_EXPENSE_SHARE = 1 / 3;

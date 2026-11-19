export const UNITS = [
  { id: 'apto5h', label: 'Apto 5H' },
  { id: 'kichi', label: 'Kichi' },
  { id: 'yamaha', label: 'Yamaha' },
  // `since`: first day the unit is part of the business. General expenses dated
  // before it are split only among the units that existed then.
  { id: 'luckysea', label: 'Lucky Sea', since: '2026-11-19' },
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

import { UNITS, PAYMENT_METHODS, GENERAL_EXPENSE_SHARE } from './constants';

export function inPeriod(dateStr, { year, month }) {
  if (!dateStr) return false;
  const [y, m] = dateStr.split('-').map(Number);
  if (year && y !== year) return false;
  if (month && m !== month) return false;
  return true;
}

export function filterMovements(movements, filters = {}) {
  return movements.filter((mv) => {
    if (filters.year || filters.month) {
      if (!inPeriod(mv.date, filters)) return false;
    }
    if (filters.type && mv.type !== filters.type) return false;
    if (filters.unit && mv.unit !== filters.unit) return false;
    if (filters.category && mv.category !== filters.category) return false;
    if (filters.method && mv.method !== filters.method) return false;
    if (filters.scope && mv.scope !== filters.scope) return false;
    return true;
  });
}

export function sum(movements) {
  return movements.reduce((acc, mv) => acc + Number(mv.amount || 0), 0);
}

export function totals(movements) {
  const income = sum(movements.filter((m) => m.type === 'income'));
  const expense = sum(movements.filter((m) => m.type === 'expense'));
  return { income, expense, profit: income - expense };
}

/** Saldo por método de pago (histórico completo, no se filtra por periodo). */
export function computeBalances(movements, transfers) {
  const balances = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.id, 0]));

  for (const mv of movements) {
    if (!mv.method || !(mv.method in balances)) continue;
    if (mv.type === 'income') balances[mv.method] += Number(mv.amount || 0);
    else if (mv.type === 'expense') balances[mv.method] -= Number(mv.amount || 0);
  }

  for (const tr of transfers) {
    const amt = Number(tr.amount || 0);
    if (tr.fromMethod in balances) balances[tr.fromMethod] -= amt;
    if (tr.toMethod in balances) balances[tr.toMethod] += amt;
  }

  const global = Object.values(balances).reduce((a, b) => a + b, 0);
  return { balances, global };
}

/**
 * Rentabilidad por unidad: ingresos de la unidad - gastos individuales de la
 * unidad - 1/3 de los gastos generales (dentro del conjunto de movimientos dado,
 * ya filtrado por periodo si aplica).
 */
export function computeProfitability(movements) {
  const incomeByUnit = Object.fromEntries(UNITS.map((u) => [u.id, 0]));
  const individualExpenseByUnit = Object.fromEntries(UNITS.map((u) => [u.id, 0]));
  let generalExpense = 0;

  for (const mv of movements) {
    const amt = Number(mv.amount || 0);
    if (mv.type === 'income' && mv.unit) {
      incomeByUnit[mv.unit] = (incomeByUnit[mv.unit] || 0) + amt;
    } else if (mv.type === 'expense') {
      if (mv.scope === 'general') {
        generalExpense += amt;
      } else if (mv.unit) {
        individualExpenseByUnit[mv.unit] = (individualExpenseByUnit[mv.unit] || 0) + amt;
      }
    }
  }

  const generalShare = generalExpense * GENERAL_EXPENSE_SHARE;

  const perUnit = Object.fromEntries(
    UNITS.map((u) => {
      const income = incomeByUnit[u.id] || 0;
      const individualExpense = individualExpenseByUnit[u.id] || 0;
      const result = income - individualExpense - generalShare;
      return [u.id, { income, individualExpense, generalShare, result }];
    })
  );

  const globalIncome = Object.values(incomeByUnit).reduce((a, b) => a + b, 0);
  const globalIndividualExpense = Object.values(individualExpenseByUnit).reduce((a, b) => a + b, 0);
  const globalResult = globalIncome - globalIndividualExpense - generalExpense;

  return { perUnit, generalExpense, global: { income: globalIncome, individualExpense: globalIndividualExpense, generalExpense, result: globalResult } };
}

export function groupByMonth(movements) {
  const map = new Map();
  for (const mv of movements) {
    if (!mv.date) continue;
    const key = mv.date.slice(0, 7); // YYYY-MM
    if (!map.has(key)) map.set(key, { key, income: 0, expense: 0 });
    const entry = map.get(key);
    if (mv.type === 'income') entry.income += Number(mv.amount || 0);
    else entry.expense += Number(mv.amount || 0);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function groupByCategory(movements) {
  const map = new Map();
  for (const mv of movements.filter((m) => m.type === 'expense')) {
    const key = mv.category || 'Sin categoría';
    map.set(key, (map.get(key) || 0) + Number(mv.amount || 0));
  }
  return [...map.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

export function groupByMethod(movements) {
  const map = new Map();
  for (const mv of movements) {
    const key = mv.method || 'Sin método';
    if (!map.has(key)) map.set(key, { method: key, income: 0, expense: 0 });
    const entry = map.get(key);
    if (mv.type === 'income') entry.income += Number(mv.amount || 0);
    else entry.expense += Number(mv.amount || 0);
  }
  return [...map.values()];
}

export function groupByUnit(movements) {
  const map = new Map();
  for (const u of UNITS) map.set(u.id, { unit: u.id, income: 0, expense: 0 });
  for (const mv of movements) {
    if (!mv.unit || !map.has(mv.unit)) continue;
    const entry = map.get(mv.unit);
    if (mv.type === 'income') entry.income += Number(mv.amount || 0);
    else entry.expense += Number(mv.amount || 0);
  }
  return [...map.values()];
}

export function availableYears(movements, transfers = []) {
  const years = new Set();
  for (const mv of movements) if (mv.date) years.add(Number(mv.date.slice(0, 4)));
  for (const tr of transfers) if (tr.date) years.add(Number(tr.date.slice(0, 4)));
  const current = new Date().getFullYear();
  years.add(current);
  return [...years].sort((a, b) => b - a);
}

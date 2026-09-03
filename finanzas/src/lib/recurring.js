function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

function daysBetween(a, b) {
  return Math.abs(new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24);
}

export function patternKey(mv) {
  return [normalize(mv.description), mv.category || '', mv.unit || '', mv.scope || ''].join('|');
}

/**
 * Detecta grupos de gastos que se repiten con una cadencia aproximadamente
 * mensual y montos similares. Es una sugerencia local, no usa IA externa:
 * el usuario decide si confirma el patrón como recurrente.
 */
export function detectRecurringCandidates(movements) {
  const expenses = movements.filter((m) => m.type === 'expense' && m.description);
  const groups = new Map();

  for (const mv of expenses) {
    const key = patternKey(mv);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(mv);
  }

  const candidates = [];
  for (const [key, group] of groups.entries()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date));
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date));
    }
    const monthlyish = gaps.filter((g) => g >= 20 && g <= 40).length;
    if (monthlyish === 0) continue;

    const amounts = sorted.map((m) => Number(m.amount || 0));
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const withinRange = amounts.every((a) => avg === 0 || Math.abs(a - avg) / avg <= 0.35);
    if (!withinRange) continue;

    const last = sorted[sorted.length - 1];
    candidates.push({
      key,
      description: last.description,
      category: last.category,
      unit: last.unit,
      scope: last.scope,
      occurrences: sorted.length,
      averageAmount: avg,
      lastDate: last.date,
      movementIds: sorted.map((m) => m.id),
    });
  }

  return candidates.sort((a, b) => b.occurrences - a.occurrences);
}

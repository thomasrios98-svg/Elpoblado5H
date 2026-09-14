import {
  totals,
  computeBalances,
  computeProfitability,
  groupByMonth,
  groupByCategory,
  groupByMethod,
  groupByUnit,
} from './calculations';

const MAX_MOVEMENTS = 400;

/**
 * Arma un resumen compacto del historial financiero para enviarle al asistente
 * de IA como contexto. Se mandan agregados (totales, por mes/categoría/método/
 * unidad, saldos, rentabilidad) más los movimientos más recientes para preguntas
 * de detalle. El asistente es de solo lectura: nunca modifica estos datos.
 */
export function buildFinancialContext(movements, transfers) {
  const overall = totals(movements);
  const { balances, global: globalBalance } = computeBalances(movements, transfers);
  const profitability = computeProfitability(movements);

  const recentMovements = [...movements]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_MOVEMENTS)
    .map((m) => ({
      date: m.date,
      type: m.type,
      unit: m.unit || null,
      scope: m.scope || null,
      category: m.category || null,
      method: m.method,
      amount: m.amount,
      description: m.description,
    }));

  return {
    totalMovements: movements.length,
    overallTotals: overall,
    balancesByMethod: balances,
    globalBalance,
    profitability,
    monthlyEvolution: groupByMonth(movements),
    byCategory: groupByCategory(movements),
    byMethod: groupByMethod(movements),
    byUnit: groupByUnit(movements),
    recentMovements,
    note:
      recentMovements.length < movements.length
        ? `Se incluyen los ${MAX_MOVEMENTS} movimientos más recientes de un total de ${movements.length}; para periodos más antiguos usa los agregados mensuales.`
        : undefined,
  };
}

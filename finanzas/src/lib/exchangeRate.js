import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const BCV_EUR_URL = 'https://ve.dolarapi.com/v1/euros/oficial';

/**
 * Tasa oficial del BCV para el Euro, usada para convertir ingresos registrados
 * en Bolívares a su equivalente en USD (Bs ÷ tasa = USD). Primero se pide a la
 * Cloud Function (con caché); si falla, se consulta la fuente pública directo.
 */
export async function fetchBcvEurRate() {
  try {
    const call = httpsCallable(functions, 'getBcvEurRate');
    const result = await call();
    return result.data;
  } catch (err) {
    console.warn('[finanzas] getBcvEurRate falló, consultando la tasa directo:', err);
    const res = await fetch(BCV_EUR_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw err;
    const data = await res.json();
    const rate = Number(data.promedio ?? data.venta ?? data.compra);
    if (!(rate > 0)) throw err;
    return { rate, rateDate: data.fechaActualizacion || null, stale: false, source: 'directo' };
  }
}

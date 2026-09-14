import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

/**
 * Tasa oficial del BCV para el Euro, usada para convertir ingresos registrados
 * en Bolívares a su equivalente en USD (Bs ÷ tasa = USD).
 */
export async function fetchBcvEurRate() {
  const call = httpsCallable(functions, 'getBcvEurRate');
  const result = await call();
  return result.data;
}

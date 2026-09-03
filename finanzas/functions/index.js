const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');
const anthropicModel = defineString('ANTHROPIC_MODEL', { default: 'claude-sonnet-5' });

const MAX_QUESTION_LENGTH = 1000;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `Eres el asistente financiero interno del sistema de El Poblado 5H, una
propiedad vacacional con tres unidades: Apto 5H, Kichi y Yamaha. Tu única fuente de información
es el resumen de datos financieros (JSON) que se te entrega en cada mensaje: totales, saldos por
método de pago, rentabilidad por unidad, evolución mensual, gastos por categoría y método, y los
movimientos más recientes. Todos los montos están en USD.

Reglas estrictas:
- Responde solo preguntas sobre ingresos, gastos, ganancias, unidades, categorías, métodos de
  pago, saldos, tendencias y comparaciones, usando exclusivamente los datos entregados.
- Puedes señalar problemas u oportunidades que notes en los datos (por ejemplo, gastos que
  suben mucho, una unidad con rentabilidad negativa, concentración de gastos en una categoría).
- NUNCA hagas proyecciones ni predicciones de cifras futuras. Si te piden una proyección,
  explica que no ofreces proyecciones y ofrece en su lugar un análisis de tendencias pasadas.
- NUNCA sugieras ni ejecutes cambios en los datos: no puedes crear, editar ni eliminar
  movimientos. Solo lees y analizas.
- Si la pregunta no se puede responder con los datos entregados, dilo claramente en vez de
  inventar cifras.
- Responde siempre en español, de forma clara y concisa, citando cifras concretas en USD.`;

exports.financialAssistant = onCall(
  { secrets: [anthropicApiKey], cors: true, timeoutSeconds: 60 },
  async (request) => {
    const { question, history, context } = request.data || {};

    if (typeof question !== 'string' || !question.trim()) {
      throw new HttpsError('invalid-argument', 'Falta la pregunta.');
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      throw new HttpsError('invalid-argument', 'La pregunta es demasiado larga.');
    }
    if (!context || typeof context !== 'object') {
      throw new HttpsError('invalid-argument', 'Falta el contexto financiero.');
    }

    const apiKey = anthropicApiKey.value();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'El asistente de IA no está configurado (falta ANTHROPIC_API_KEY).');
    }

    const priorTurns = Array.isArray(history)
      ? history
          .filter((h) => h && typeof h.text === 'string' && (h.role === 'user' || h.role === 'assistant'))
          .slice(-8, -1)
      : [];

    const messages = [
      ...priorTurns.map((h) => ({ role: h.role, content: h.text })),
      {
        role: 'user',
        content: `Datos financieros actuales (JSON):\n${JSON.stringify(context)}\n\nPregunta: ${question}`,
      },
    ];

    let response;
    try {
      response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: anthropicModel.value(),
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages,
        }),
      });
    } catch (err) {
      logger.error('Error de red al llamar a Anthropic', err);
      throw new HttpsError('unavailable', 'No se pudo contactar al proveedor de IA.');
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      logger.error('Anthropic API error', response.status, bodyText);
      throw new HttpsError('internal', 'El asistente de IA no pudo procesar la pregunta.');
    }

    const data = await response.json();
    const answer = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    return { answer: answer || 'No obtuve una respuesta del modelo.' };
  }
);

const BCV_EUR_URL = 'https://ve.dolarapi.com/v1/monedas/eur';
const BCV_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas: el BCV solo actualiza una vez por día hábil

/**
 * Devuelve la tasa oficial del BCV para el Euro, usada para convertir ingresos
 * registrados en Bolívares a su equivalente en USD. Se cachea en Firestore
 * para no depender de la fuente externa en cada consulta y para poder servir
 * el último valor conocido si la fuente falla.
 */
exports.getBcvEurRate = onCall({ cors: true, timeoutSeconds: 30 }, async () => {
  const cacheRef = db.collection('exchangeRates').doc('bcv_eur');
  const snap = await cacheRef.get();
  const cached = snap.exists ? snap.data() : null;
  const isFresh = cached?.fetchedAt && Date.now() - cached.fetchedAt.toMillis() < BCV_CACHE_TTL_MS;

  if (isFresh) {
    return { rate: cached.rate, rateDate: cached.rateDate || null, stale: false, source: 'cache' };
  }

  try {
    const res = await fetch(BCV_EUR_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rate = Number(data.promedio ?? data.venta ?? data.compra);
    if (!rate || Number.isNaN(rate) || rate <= 0) throw new Error('Respuesta sin tasa válida');

    const rateDate = data.fechaActualizacion || null;
    await cacheRef.set({ rate, rateDate, fetchedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { rate, rateDate, stale: false, source: 'bcv' };
  } catch (err) {
    logger.error('Error obteniendo tasa BCV EUR', err);
    if (cached?.rate) {
      return { rate: cached.rate, rateDate: cached.rateDate || null, stale: true, source: 'cache-stale' };
    }
    throw new HttpsError(
      'unavailable',
      'No se pudo obtener la tasa del BCV y no hay ninguna tasa guardada anteriormente.'
    );
  }
});

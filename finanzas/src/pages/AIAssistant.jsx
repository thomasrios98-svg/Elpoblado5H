import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useData } from '../context/DataContext';
import { buildFinancialContext } from '../lib/aiContext';

const SUGGESTIONS = [
  '¿Cuál unidad fue más rentable este año?',
  '¿En qué categoría gasto más?',
  'Compara los ingresos de este mes con el mes pasado.',
  '¿Hay algo raro en los gastos generales recientes?',
];

export default function AIAssistant() {
  const { movements, transfers, loading } = useData();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text:
        'Hola, soy el asistente financiero de El Poblado 5H. Puedo responder preguntas sobre ingresos, gastos, ganancias, unidades, categorías, métodos de pago, saldos y tendencias a partir de tu historial. No hago proyecciones y no modifico información.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function send(question) {
    const text = (question ?? input).trim();
    if (!text || sending) return;

    const nextMessages = [...messages, { role: 'user', text }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setError('');

    try {
      const context = buildFinancialContext(movements, transfers);
      const call = httpsCallable(functions, 'financialAssistant');
      const result = await call({
        question: text,
        history: nextMessages.slice(-8).map((m) => ({ role: m.role, text: m.text })),
        context,
      });
      const answer = result.data?.answer || 'No obtuve respuesta del asistente.';
      setMessages((msgs) => [...msgs, { role: 'assistant', text: answer }]);
    } catch (err) {
      setError(
        err?.message ||
          'No se pudo contactar al asistente de IA. Verifica que la función financialAssistant esté desplegada.'
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Asistente IA</h1>
      </div>

      <div className="card">
        <div className="chat-window">
          {messages.map((m, idx) => (
            <div key={idx} className={`chat-bubble ${m.role}`}>
              {m.text}
            </div>
          ))}
          {sending && <div className="chat-bubble assistant">Analizando el historial…</div>}
        </div>

        {error && <p style={{ color: 'var(--expense)', fontSize: 13, marginTop: 10 }}>{error}</p>}

        <div className="btn-row" style={{ marginTop: 12 }}>
          {SUGGESTIONS.map((s) => (
            <button key={s} className="btn secondary small" disabled={loading || sending} onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>

        <div className="chat-input-row">
          <textarea
            rows={2}
            placeholder="Pregunta algo sobre tus finanzas…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="btn" disabled={loading || sending || !input.trim()} onClick={() => send()}>
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

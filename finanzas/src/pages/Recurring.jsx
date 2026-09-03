import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { detectRecurringCandidates } from '../lib/recurring';
import { formatMoney, formatDate } from '../lib/format';
import { UNIT_LABELS } from '../lib/constants';

export default function Recurring() {
  const { movements, recurringPatterns, setRecurringPatternStatus, loading } = useData();

  const decided = useMemo(() => {
    const map = new Map();
    for (const p of recurringPatterns) map.set(p.key, p);
    return map;
  }, [recurringPatterns]);

  const candidates = useMemo(() => detectRecurringCandidates(movements), [movements]);

  const statusOf = (c) => decided.get(c.key)?.status || 'pending';
  const pending = candidates.filter((c) => statusOf(c) === 'pending');
  const confirmed = candidates.filter((c) => statusOf(c) === 'confirmed');
  const dismissed = candidates.filter((c) => statusOf(c) === 'dismissed');

  function confirm(candidate) {
    setRecurringPatternStatus(candidate.key, 'confirmed', {
      description: candidate.description,
      category: candidate.category || null,
      unit: candidate.unit || null,
    });
  }

  function dismiss(candidate) {
    setRecurringPatternStatus(candidate.key, 'dismissed', {
      description: candidate.description,
      category: candidate.category || null,
      unit: candidate.unit || null,
    });
  }

  function unmark(candidate) {
    setRecurringPatternStatus(candidate.key, 'pending', {
      description: candidate.description,
      category: candidate.category || null,
      unit: candidate.unit || null,
    });
  }

  if (loading) return <div className="empty-state">Cargando datos…</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Recurrentes</h1>
      </div>
      <p className="text-muted" style={{ marginTop: -10, marginBottom: 16 }}>
        Detección local de patrones: si un gasto se repite con una cadencia aproximadamente mensual
        y montos similares, aparece aquí como sugerencia. Tú decides si se clasifica como recurrente —
        no se crea ni se modifica nada automáticamente.
      </p>

      <div className="card">
        <div className="section-title">Sugerencias pendientes ({pending.length})</div>
        {pending.length === 0 ? (
          <div className="empty-state">No hay nuevos patrones para revisar.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map((c) => (
              <div key={c.key} className="suggestion-card">
                <div>
                  <strong>{c.description}</strong>
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    {c.category || 'Sin categoría'} · {c.unit ? UNIT_LABELS[c.unit] : 'General'} · {c.occurrences} veces ·
                    promedio {formatMoney(c.averageAmount)} · último {formatDate(c.lastDate)}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13 }}>
                    Parece que este gasto es recurrente. ¿Quieres clasificarlo como recurrente?
                  </div>
                </div>
                <div className="btn-row">
                  <button className="btn small" onClick={() => confirm(c)}>Sí, es recurrente</button>
                  <button className="btn secondary small" onClick={() => dismiss(c)}>No, ignorar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-title">Confirmados como recurrentes ({confirmed.length})</div>
        {confirmed.length === 0 ? (
          <div className="empty-state">Aún no has confirmado ningún patrón.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {confirmed.map((c) => (
              <div key={c.key} className="suggestion-card">
                <div>
                  <span className="badge recurring">Recurrente</span>{' '}
                  <strong>{c.description}</strong>
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    {c.category || 'Sin categoría'} · {c.unit ? UNIT_LABELS[c.unit] : 'General'} · promedio {formatMoney(c.averageAmount)}
                  </div>
                </div>
                <button className="btn secondary small" onClick={() => unmark(c)}>Quitar marca</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {dismissed.length > 0 && (
        <div className="card">
          <div className="section-title">Ignorados ({dismissed.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dismissed.map((c) => (
              <div key={c.key} className="suggestion-card">
                <div>
                  <strong>{c.description}</strong>
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    {c.category || 'Sin categoría'} · {c.unit ? UNIT_LABELS[c.unit] : 'General'}
                  </div>
                </div>
                <button className="btn secondary small" onClick={() => unmark(c)}>Reconsiderar</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

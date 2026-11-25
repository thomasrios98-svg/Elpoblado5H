import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [movements, setMovements] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [recurringPatterns, setRecurringPatterns] = useState([]);
  const [cortes, setCortes] = useState([]);
  const [cortesError, setCortesError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    function handleError(source) {
      return (err) => {
        console.error(`[finanzas] Firestore (${source}):`, err);
        setError(err);
        setLoading(false);
      };
    }

    const unsubs = [
      onSnapshot(
        query(collection(db, 'movements'), orderBy('date', 'desc')),
        (snap) => {
          setMovements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setLoading(false);
        },
        handleError('movements')
      ),
      onSnapshot(
        query(collection(db, 'transfers'), orderBy('date', 'desc')),
        (snap) => setTransfers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        handleError('transfers')
      ),
      onSnapshot(
        collection(db, 'recurringPatterns'),
        (snap) => setRecurringPatterns(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        handleError('recurringPatterns')
      ),
      onSnapshot(
        query(collection(db, 'cortes'), orderBy('weekStart', 'desc')),
        (snap) => setCortes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        // Si las reglas de `cortes` aún no están publicadas, solo falla el
        // corte semanal: no se muestra el error global del resto de la app.
        (err) => {
          console.error('[finanzas] Firestore (cortes):', err);
          setCortesError(err);
        }
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const api = useMemo(
    () => ({
      movements,
      transfers,
      recurringPatterns,
      cortes,
      cortesError,
      loading,
      error,
      addMovement: (data) =>
        addDoc(collection(db, 'movements'), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      updateMovement: (id, data) =>
        updateDoc(doc(db, 'movements', id), { ...data, updatedAt: serverTimestamp() }),
      deleteMovement: (id) => deleteDoc(doc(db, 'movements', id)),
      addTransfer: (data) =>
        addDoc(collection(db, 'transfers'), { ...data, createdAt: serverTimestamp() }),
      updateTransfer: (id, data) => updateDoc(doc(db, 'transfers', id), data),
      deleteTransfer: (id) => deleteDoc(doc(db, 'transfers', id)),
      setRecurringPatternStatus: (key, status, meta) =>
        setDoc(
          doc(db, 'recurringPatterns', encodeURIComponent(key)),
          { key, status, ...meta, updatedAt: serverTimestamp() },
          { merge: true }
        ),
      // Un corte por semana: el id es el lunes de la semana (YYYY-MM-DD).
      saveCorte: (data) =>
        setDoc(doc(db, 'cortes', data.weekStart), { ...data, updatedAt: serverTimestamp() }),
      deleteCorte: (weekStart) => deleteDoc(doc(db, 'cortes', weekStart)),
    }),
    [movements, transfers, recurringPatterns, cortes, cortesError, loading, error]
  );

  return <DataContext.Provider value={api}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData debe usarse dentro de <DataProvider>');
  return ctx;
}

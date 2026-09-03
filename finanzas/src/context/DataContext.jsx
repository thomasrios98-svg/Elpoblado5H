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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubs = [
      onSnapshot(
        query(collection(db, 'movements'), orderBy('date', 'desc')),
        (snap) => {
          setMovements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setLoading(false);
        },
        (err) => setError(err)
      ),
      onSnapshot(
        query(collection(db, 'transfers'), orderBy('date', 'desc')),
        (snap) => setTransfers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => setError(err)
      ),
      onSnapshot(
        collection(db, 'recurringPatterns'),
        (snap) => setRecurringPatterns(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => setError(err)
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const api = useMemo(
    () => ({
      movements,
      transfers,
      recurringPatterns,
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
    }),
    [movements, transfers, recurringPatterns, loading, error]
  );

  return <DataContext.Provider value={api}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData debe usarse dentro de <DataProvider>');
  return ctx;
}

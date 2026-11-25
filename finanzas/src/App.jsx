import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Movements from './pages/Movements';
import Balances from './pages/Balances';
import Profitability from './pages/Profitability';
import Statistics from './pages/Statistics';
import Recurring from './pages/Recurring';
import AIAssistant from './pages/AIAssistant';

// Reportes carga exceljs/jspdf, que son pesados: se separan en su propio chunk.
const Reports = lazy(() => import('./pages/Reports'));

export default function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/movimientos" element={<Movements />} />
            <Route path="/saldos" element={<Balances />} />
            <Route path="/rentabilidad" element={<Profitability />} />
            <Route path="/estadisticas" element={<Statistics />} />
            <Route path="/recurrentes" element={<Recurring />} />
            <Route path="/ia" element={<AIAssistant />} />
            <Route
              path="/reportes"
              element={
                <Suspense fallback={<div className="empty-state">Cargando…</div>}>
                  <Reports />
                </Suspense>
              }
            />
          </Routes>
        </Layout>
      </HashRouter>
    </DataProvider>
  );
}

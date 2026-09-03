import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../context/DataContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/movimientos', label: 'Movimientos', icon: '💵' },
  { to: '/saldos', label: 'Saldos', icon: '🏦' },
  { to: '/rentabilidad', label: 'Rentabilidad', icon: '📈' },
  { to: '/estadisticas', label: 'Estadísticas', icon: '📉' },
  { to: '/recurrentes', label: 'Recurrentes', icon: '🔁' },
  { to: '/ia', label: 'Asistente IA', icon: '🤖' },
  { to: '/reportes', label: 'Reportes', icon: '🧾' },
];

function NavItems({ onNavigate }) {
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          onClick={onNavigate}
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

function ErrorBanner() {
  const { error } = useData();
  if (!error) return null;

  const isPermissionDenied = error.code === 'permission-denied';

  return (
    <div
      style={{
        background: '#fbe6e6',
        border: '1px solid #f0c9c9',
        color: 'var(--expense)',
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 16,
        fontSize: 13,
      }}
    >
      <strong>No se pudo conectar con la base de datos.</strong>{' '}
      {isPermissionDenied
        ? 'Firestore está rechazando las lecturas/escrituras — revisa que las reglas de seguridad (firestore.rules) estén publicadas en la consola de Firebase.'
        : error.message}
    </div>
  );
}

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>El Poblado 5H</strong>
          <span>Sistema financiero</span>
        </div>
        <nav>
          <NavItems />
        </nav>
      </aside>

      {open && (
        <>
          <div className="sidebar-backdrop" onClick={() => setOpen(false)} />
          <aside className="sidebar open">
            <div className="brand">
              <strong>El Poblado 5H</strong>
              <span>Sistema financiero</span>
            </div>
            <nav>
              <NavItems onNavigate={() => setOpen(false)} />
            </nav>
          </aside>
        </>
      )}

      <div className="main">
        <div className="topbar">
          <strong>El Poblado 5H · Finanzas</strong>
          <button onClick={() => setOpen((v) => !v)}>☰ Menú</button>
        </div>
        <div className="content">
          <ErrorBanner />
          {children}
        </div>
      </div>
    </div>
  );
}

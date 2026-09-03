import { useState } from 'react';
import { NavLink } from 'react-router-dom';

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
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

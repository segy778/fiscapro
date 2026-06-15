// Barre de navigation principale.

import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/revenus', label: 'Revenus' },
  { to: '/depenses', label: 'Dépenses' },
  { to: '/vehicule', label: 'Véhicule' },
  { to: '/rapports', label: 'Rapports' },
  { to: '/reglages', label: 'Réglages' },
];

export function NavBar() {
  return (
    <nav className="border-b border-ardoise-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-1 px-5 py-3">
        <span className="mr-4 font-display text-lg text-sapin-700">FiscaPro QC</span>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sapin-50 text-sapin-700'
                  : 'text-ardoise-500 hover:bg-ardoise-100 hover:text-ardoise-700'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

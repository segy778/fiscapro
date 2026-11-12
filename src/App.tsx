import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { UnlockScreen } from './features/security/UnlockScreen';
import { AutoLockWarning } from './features/security/AutoLockWarning';
import { useFiscalStore } from './store/useFiscalStore';
import { useAutoLock } from './lib/crypto/useAutoLock';

// Pages chargées à la demande : chaque section devient un fichier séparé,
// téléchargé seulement quand l'utilisateur y navigue.
const Dashboard = lazy(() => import('./features/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })));
const IncomePage = lazy(() => import('./features/income/IncomePage').then((m) => ({ default: m.IncomePage })));
const ExpensePage = lazy(() => import('./features/expenses/ExpensePage').then((m) => ({ default: m.ExpensePage })));
const VehiclePage = lazy(() => import('./features/vehicle/VehiclePage').then((m) => ({ default: m.VehiclePage })));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const pageFallback = (
  <div className="mx-auto max-w-5xl px-5 py-8">
    <p className="text-ardoise-500">Chargement…</p>
  </div>
);

function App() {
  const initialize = useFiscalStore((s) => s.initialize);
  const loaded = useFiscalStore((s) => s.loaded);
  const needsUnlock = useFiscalStore((s) => s.needsUnlock);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Verrouillage automatique après inactivité (si chiffrement déverrouillé).
  const { warning, stayUnlocked } = useAutoLock();

  // Chiffrement activé mais non déverrouillé : écran de déverrouillage seul.
  if (needsUnlock) {
    return <UnlockScreen />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-ardoise-50 font-sans text-ardoise-900">
        <NavBar />
        {warning && <AutoLockWarning onStay={stayUnlocked} />}
        {!loaded ? (
          <div className="mx-auto max-w-5xl px-5 py-8">
            <p className="text-ardoise-500">Chargement de vos données…</p>
          </div>
        ) : (
          <Suspense fallback={pageFallback}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/revenus" element={<IncomePage />} />
              <Route path="/depenses" element={<ExpensePage />} />
              <Route path="/vehicule" element={<VehiclePage />} />
              <Route path="/rapports" element={<ReportsPage />} />
              <Route path="/reglages" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { Dashboard } from './features/dashboard/Dashboard';
import { IncomePage } from './features/income/IncomePage';
import { ExpensePage } from './features/expenses/ExpensePage';
import { VehiclePage } from './features/vehicle/VehiclePage';
import { ReportsPage } from './features/reports/ReportsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { UnlockScreen } from './features/security/UnlockScreen';
import { AutoLockWarning } from './features/security/AutoLockWarning';
import { useFiscalStore } from './store/useFiscalStore';
import { useAutoLock } from './lib/crypto/useAutoLock';

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
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/revenus" element={<IncomePage />} />
            <Route path="/depenses" element={<ExpensePage />} />
            <Route path="/vehicule" element={<VehiclePage />} />
            <Route path="/rapports" element={<ReportsPage />} />
            <Route path="/reglages" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;

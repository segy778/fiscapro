// Écran de déverrouillage : affiché quand le chiffrement est activé mais la
// session verrouillée. Sans le bon mot de passe, aucune donnée n'est accessible.

import { useState } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import { Field, TextInput, Button } from '../../components/FormField';

export function UnlockScreen() {
  const unlockApp = useFiscalStore((s) => s.unlockApp);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const handleUnlock = async () => {
    if (!password) return;
    setWorking(true);
    setError(null);
    const ok = await unlockApp(password);
    setWorking(false);
    if (!ok) {
      setError('Mot de passe incorrect.');
      setPassword('');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ardoise-50 px-5">
      <div className="w-full max-w-sm rounded-2xl border border-ardoise-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-widest text-sapin-600">FiscaPro QC</p>
        <h1 className="mt-1 font-display text-2xl text-ardoise-900">Déverrouiller</h1>
        <p className="mt-2 text-sm text-ardoise-500">
          Vos données sont chiffrées. Entrez votre mot de passe pour y accéder.
        </p>

        <div className="mt-5">
          <Field label="Mot de passe" htmlFor="unlock-pw">
            <TextInput
              id="unlock-pw"
              value={password}
              onChange={setPassword}
              type="password"
              placeholder="Votre mot de passe"
              onKeyDown={(e) => { if (e.key === 'Enter') void handleUnlock(); }}
            />
          </Field>
          {error && <p className="mb-3 text-sm text-ambre-700">{error}</p>}
          <Button onClick={handleUnlock} disabled={working || !password}>
            {working ? 'Déverrouillage…' : 'Déverrouiller'}
          </Button>
        </div>
      </div>
    </div>
  );
}

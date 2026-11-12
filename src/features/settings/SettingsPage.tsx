// Page Réglages : réinitialisation des données.

import { useState } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import { Button, Checkbox, Field, TextInput } from '../../components/FormField';
import { PasswordStrength } from '../../components/PasswordStrength';
import { checkPassword } from '../../lib/crypto/passwordPolicy';

const PASSWORD_HINT = '12 caractères minimum. Idéal : une phrase de passe, ex. « trois chats mangent des poires ».';
const POLICY_ERROR = 'Ce mot de passe est trop faible. Corrigez les points indiqués sous le champ.';

export function SettingsPage() {
  const resetAll = useFiscalStore((s) => s.resetAll);
  const incomes = useFiscalStore((s) => s.incomes);
  const expenses = useFiscalStore((s) => s.expenses);
  const trips = useFiscalStore((s) => s.trips);
  const taxRegistered = useFiscalStore((s) => s.taxRegistered);
  const setTaxRegistered = useFiscalStore((s) => s.setTaxRegistered);
  const encryptionEnabled = useFiscalStore((s) => s.encryptionEnabled);
  const enableEncryption = useFiscalStore((s) => s.enableEncryption);
  const disableEncryption = useFiscalStore((s) => s.disableEncryption);
  const changePassword = useFiscalStore((s) => s.changePassword);
  const lockApp = useFiscalStore((s) => s.lockApp);
  const weakPassword = useFiscalStore((s) => s.weakPassword);

  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [encError, setEncError] = useState<string | null>(null);
  const [encWorking, setEncWorking] = useState(false);

  // Désactivation
  const [disabling, setDisabling] = useState(false);
  const [disablePw, setDisablePw] = useState('');
  const [disableError, setDisableError] = useState<string | null>(null);
  const [disableWorking, setDisableWorking] = useState(false);

  // Changement de mot de passe
  const [changing, setChanging] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw1, setNewPw1] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeMessage, setChangeMessage] = useState<string | null>(null);
  const [changeWorking, setChangeWorking] = useState(false);

  const enableCheck = checkPassword(pw1);
  const changeCheck = checkPassword(newPw1);

  const resetChangeForm = () => {
    setChanging(false);
    setOldPw('');
    setNewPw1('');
    setNewPw2('');
    setChangeError(null);
  };

  const handleChangePassword = async () => {
    if (!changeCheck.acceptable) {
      setChangeError(POLICY_ERROR);
      return;
    }
    if (newPw1 !== newPw2) {
      setChangeError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    setChangeError(null);
    setChangeWorking(true);
    const ok = await changePassword(oldPw, newPw1);
    setChangeWorking(false);
    if (ok) {
      resetChangeForm();
      setChangeMessage('Mot de passe modifié.');
    } else {
      setChangeError('Mot de passe actuel incorrect.');
      setOldPw('');
    }
  };

  const handleEnableEncryption = async () => {
    if (!enableCheck.acceptable) {
      setEncError(POLICY_ERROR);
      return;
    }
    if (pw1 !== pw2) {
      setEncError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setEncError(null);
    setEncWorking(true);
    await enableEncryption(pw1);
    setEncWorking(false);
    setPw1('');
    setPw2('');
  };

  const handleDisableEncryption = async () => {
    if (!disablePw) return;
    setDisableWorking(true);
    setDisableError(null);
    const ok = await disableEncryption(disablePw);
    setDisableWorking(false);
    if (ok) {
      setDisabling(false);
      setDisablePw('');
    } else {
      setDisableError('Mot de passe incorrect.');
      setDisablePw('');
    }
  };

  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [working, setWorking] = useState(false);

  const totalEntries = incomes.length + expenses.length + trips.length;

  const handleReset = async () => {
    setWorking(true);
    await resetAll();
    setWorking(false);
    setConfirming(false);
    setDone(true);
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-sapin-600">Réglages</p>
        <h1 className="mt-1 font-display text-3xl text-ardoise-900">Vos données</h1>
      </header>

      <section className="mb-6 rounded-xl border border-ardoise-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl text-ardoise-900">Chiffrement des données</h2>
        {encryptionEnabled ? (
          <>
            <p className="mt-2 text-sm text-sapin-700">
              Le chiffrement est activé. Vos données sont protégées par votre mot de passe.
            </p>
            {weakPassword && (
              <p className="mt-3 rounded-lg border border-ambre-500/30 bg-ambre-50 p-3 text-sm text-ambre-700">
                <span className="font-semibold">Mot de passe faible :</span> il ne respecte pas
                les exigences actuelles et pourrait être deviné par quelqu'un qui copie vos
                données. Changez-le ci-dessous.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={lockApp}
                className="rounded-lg border border-ardoise-200 px-4 py-2 text-sm font-medium text-ardoise-700 hover:bg-ardoise-100"
              >
                Verrouiller maintenant
              </button>
              {!changing && !disabling && (
                <button
                  onClick={() => { setChanging(true); setChangeMessage(null); }}
                  className="rounded-lg border border-ardoise-200 px-4 py-2 text-sm font-medium text-ardoise-700 hover:bg-ardoise-100"
                >
                  Changer le mot de passe
                </button>
              )}
              {!disabling && !changing && (
                <button
                  onClick={() => { setDisabling(true); setDisableError(null); }}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Désactiver le chiffrement
                </button>
              )}
            </div>

            {changeMessage && !changing && (
              <p className="mt-3 text-sm text-sapin-700">{changeMessage}</p>
            )}

            {changing && (
              <div className="mt-4 max-w-sm rounded-lg border border-ardoise-200 bg-ardoise-50 p-4">
                <p className="mb-3 text-sm font-medium text-ardoise-700">Changer le mot de passe</p>
                <Field label="Mot de passe actuel" htmlFor="chg-old">
                  <TextInput id="chg-old" value={oldPw} onChange={setOldPw} type="password" placeholder="Actuel" />
                </Field>
                <Field label="Nouveau mot de passe" htmlFor="chg-new1" hint={PASSWORD_HINT}>
                  <TextInput id="chg-new1" value={newPw1} onChange={(v) => { setNewPw1(v); setChangeError(null); }} type="password" placeholder="Nouveau" />
                </Field>
                <PasswordStrength check={changeCheck} empty={newPw1.length === 0} />
                <Field label="Confirmer le nouveau" htmlFor="chg-new2">
                  <TextInput id="chg-new2" value={newPw2} onChange={(v) => { setNewPw2(v); setChangeError(null); }} type="password" placeholder="Confirmer" />
                </Field>
                {changeError && <p className="mb-3 text-sm text-ambre-700">{changeError}</p>}
                <div className="flex gap-2">
                  <Button onClick={handleChangePassword} disabled={changeWorking || !oldPw || !newPw1}>
                    {changeWorking ? 'Modification…' : 'Changer'}
                  </Button>
                  <Button onClick={resetChangeForm} variant="ghost">Annuler</Button>
                </div>
              </div>
            )}

            {disabling && (
              <div className="mt-4 rounded-lg border border-ambre-500/30 bg-ambre-50 p-4">
                <p className="text-sm text-ambre-700">
                  <span className="font-semibold">Attention :</span> désactiver le
                  chiffrement rendra vos données lisibles par quiconque accède à cet
                  appareil. Entrez votre mot de passe pour confirmer.
                </p>
                <div className="mt-3 max-w-sm">
                  <Field label="Mot de passe actuel" htmlFor="disable-pw">
                    <TextInput
                      id="disable-pw"
                      value={disablePw}
                      onChange={setDisablePw}
                      type="password"
                      placeholder="Votre mot de passe"
                    />
                  </Field>
                  {disableError && <p className="mb-3 text-sm text-ambre-700">{disableError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleDisableEncryption}
                      disabled={disableWorking || !disablePw}
                      className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
                    >
                      {disableWorking ? 'Désactivation…' : 'Confirmer la désactivation'}
                    </button>
                    <Button
                      onClick={() => { setDisabling(false); setDisablePw(''); setDisableError(null); }}
                      variant="ghost"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-ardoise-500">
              Protégez vos données financières avec un mot de passe. Une fois activé,
              il faudra l'entrer à chaque ouverture pour accéder à vos données.
            </p>
            <p className="mt-2 text-sm text-ardoise-500">
              Activez-le le plus tôt possible. À l'activation, vos données sont copiées
              dans un espace chiffré et l'ancien espace est supprimé, mais des traces des
              données saisies avant peuvent subsister sur le disque de l'appareil.
            </p>
            <div className="mt-3 rounded-lg border border-ambre-500/30 bg-ambre-50 p-3">
              <p className="text-sm text-ambre-700">
                <span className="font-semibold">Important :</span> si vous oubliez ce mot
                de passe, vos données seront <span className="font-semibold">définitivement
                irrécupérables</span>. Il n'existe aucun moyen de les restaurer. Notez-le
                en lieu sûr.
              </p>
            </div>
            <div className="mt-4 max-w-sm">
              <Field label="Mot de passe" htmlFor="enc-pw1" hint={PASSWORD_HINT}>
                <TextInput id="enc-pw1" value={pw1} onChange={(v) => { setPw1(v); setEncError(null); }} type="password" placeholder="Mot de passe" />
              </Field>
              <PasswordStrength check={enableCheck} empty={pw1.length === 0} />
              <Field label="Confirmer le mot de passe" htmlFor="enc-pw2">
                <TextInput id="enc-pw2" value={pw2} onChange={(v) => { setPw2(v); setEncError(null); }} type="password" placeholder="Confirmer" />
              </Field>
              {encError && <p className="mb-3 text-sm text-ambre-700">{encError}</p>}
              <Button onClick={handleEnableEncryption} disabled={encWorking}>
                {encWorking ? 'Activation…' : 'Activer le chiffrement'}
              </Button>
            </div>
          </>
        )}
      </section>

      <section className="mb-6 rounded-xl border border-ardoise-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl text-ardoise-900">Taxes de vente</h2>
        <p className="mt-2 text-sm text-ardoise-500">
          Si vous êtes inscrit aux fichiers de la TPS et de la TVQ (obligatoire au-delà
          de 30 000 $ de revenus sur quatre trimestres), l'application affiche un
          sommaire de la taxe perçue, récupérable et de votre remise nette.
        </p>
        <div className="mt-4">
          <Checkbox
            id="tax-registered"
            checked={taxRegistered}
            onChange={(v) => void setTaxRegistered(v)}
            label="Je suis inscrit aux fichiers de la TPS et de la TVQ"
          />
        </div>
      </section>

      <section className="rounded-xl border border-ardoise-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl text-ardoise-900">Réinitialiser les données</h2>
        <p className="mt-2 text-sm text-ardoise-500">
          Efface définitivement tous vos revenus, dépenses, trajets et frais de
          véhicule. Utile pour repartir à zéro après avoir exploré l'application
          avec les données d'exemple. Cette action est irréversible.
        </p>

        {done ? (
          <p className="mt-4 rounded-lg bg-sapin-50 p-3 text-sm text-sapin-700">
            Données effacées. Vous pouvez maintenant saisir vos propres entrées.
          </p>
        ) : confirming ? (
          <div className="mt-4 rounded-lg border border-ambre-500/30 bg-ambre-50 p-4">
            <p className="text-sm text-ambre-700">
              Confirmer la suppression de {totalEntries} entrée
              {totalEntries > 1 ? 's' : ''} (et les frais de véhicule) ? Cette action
              ne peut pas être annulée.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleReset}
                disabled={working}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                {working ? 'Suppression…' : 'Oui, tout effacer'}
              </button>
              <Button onClick={() => setConfirming(false)} variant="ghost">
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <button
              onClick={() => setConfirming(true)}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Réinitialiser toutes les données
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

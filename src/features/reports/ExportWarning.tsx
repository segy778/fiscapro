// Avertissement avant un export : le fichier produit (CSV, PDF, calendrier)
// est enregistré EN CLAIR hors de l'app, même si les données y sont chiffrées.

import { useState } from 'react';
import { Button, Checkbox } from '../../components/FormField';

interface ExportWarningProps {
  /** Nom du fichier qui sera produit (affiché à l'utilisateur). */
  fileName: string;
  /** Le chiffrement est-il activé dans l'app ? (message plus explicite) */
  encryptionEnabled: boolean;
  /** Confirmé; `dontAskAgain` = ne plus demander pendant cette session. */
  onConfirm: (dontAskAgain: boolean) => void;
  onCancel: () => void;
}

export function ExportWarning({ fileName, encryptionEnabled, onConfirm, onCancel }: ExportWarningProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  return (
    <div
      role="alertdialog"
      aria-labelledby="export-warning-title"
      className="mb-6 rounded-xl border border-ambre-500/30 bg-ambre-50 p-4"
    >
      <p id="export-warning-title" className="font-semibold text-ambre-700">
        Ce fichier ne sera pas chiffré
      </p>
      <p className="mt-1 text-sm text-ambre-700">
        {encryptionEnabled && 'Vos données sont chiffrées dans l’app, mais pas les fichiers exportés. '}
        <span className="font-medium">{fileName}</span> sera enregistré dans vos téléchargements et pourra
        être lu par toute personne qui accède à cet appareil ou à ce fichier (courriel, nuage, clé USB).
        Conservez-le en lieu sûr et supprimez-le quand vous n&apos;en avez plus besoin.
      </p>
      <div className="mt-3">
        <Checkbox
          id="export-dont-ask"
          checked={dontAskAgain}
          onChange={setDontAskAgain}
          label="Ne plus me le demander jusqu'à la fermeture de l'app"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onConfirm(dontAskAgain)}>Télécharger quand même</Button>
        <Button onClick={onCancel} variant="ghost">Annuler</Button>
      </div>
    </div>
  );
}

// Encart d'avertissement de verrouillage imminent. Non bloquant (coin de
// l'écran). Le bouton « Rester connecté » réinitialise le compte à rebours.

interface AutoLockWarningProps {
  onStay: () => void;
}

export function AutoLockWarning({ onStay }: AutoLockWarningProps) {
  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm rounded-xl border border-ambre-500/40 bg-white p-4 shadow-lg">
      <p className="text-sm font-medium text-ardoise-900">Verrouillage imminent</p>
      <p className="mt-1 text-sm text-ardoise-500">
        Par sécurité, l'application va se verrouiller dans moins d'une minute
        d'inactivité. Vos données chiffrées resteront protégées.
      </p>
      <button
        onClick={onStay}
        className="mt-3 rounded-lg bg-sapin-700 px-4 py-2 text-sm font-medium text-white hover:bg-sapin-800"
      >
        Rester connecté
      </button>
    </div>
  );
}

// Boutons d'action sur une entrée de liste : modifier + supprimer avec
// confirmation en ligne (pas de confirm() natif bloquant).

import { useState } from 'react';

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function RowActions({ onEdit, onDelete }: RowActionsProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-ardoise-500">Supprimer ?</span>
        <button
          onClick={onDelete}
          className="rounded px-2 py-1 font-medium text-red-700 hover:bg-red-50"
        >
          Oui
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded px-2 py-1 text-ardoise-500 hover:bg-ardoise-100"
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onEdit}
        className="rounded px-2 py-1 text-sm text-ardoise-500 hover:bg-ardoise-100 hover:text-ardoise-700"
        aria-label="Modifier"
      >
        Modifier
      </button>
      <button
        onClick={() => setConfirming(true)}
        className="rounded px-2 py-1 text-sm text-ardoise-500 hover:bg-red-50 hover:text-red-700"
        aria-label="Supprimer"
      >
        Supprimer
      </button>
    </div>
  );
}

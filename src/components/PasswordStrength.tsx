// Jauge de robustesse d'un mot de passe + liste des problèmes à corriger.
// Affichage seulement : l'évaluation vient de lib/crypto/passwordPolicy.

import { SCORE_LABELS, type PasswordCheck } from '../lib/crypto/passwordPolicy';

const SEGMENT_COLORS = ['bg-red-600', 'bg-red-600', 'bg-ambre-500', 'bg-sapin-600', 'bg-sapin-700'];

interface PasswordStrengthProps {
  check: PasswordCheck;
  /** Masque la jauge tant que rien n'est saisi. */
  empty: boolean;
}

export function PasswordStrength({ check, empty }: PasswordStrengthProps) {
  if (empty) return null;
  const filled = check.score + 1;
  const color = SEGMENT_COLORS[check.score];
  return (
    <div className="-mt-2 mb-4" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < filled ? color : 'bg-ardoise-200'}`} />
        ))}
      </div>
      <p className="mt-1 text-xs text-ardoise-600">
        Robustesse : <span className="font-medium">{SCORE_LABELS[check.score]}</span>
      </p>
      {check.problems.length > 0 && (
        <ul className="mt-1 list-disc pl-4 text-xs text-ambre-700">
          {check.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

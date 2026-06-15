// Zone de saisie/affichage des taxes TPS/TVQ pour un montant.
// Mode auto : affiche les taxes calculées (lecture seule).
// Mode manuel : champs éditables pour les cas particuliers.

import { Field, TextInput, Checkbox } from './FormField';
import { formatCents } from '../lib/format/money';

interface TaxFieldsProps {
  /** Taxes calculées automatiquement (pour l'affichage en mode auto). */
  autoGstCents: number;
  autoQstCents: number;
  /** Mode manuel actif ? */
  manual: boolean;
  onManualChange: (manual: boolean) => void;
  /** Valeurs manuelles (chaînes de saisie en dollars). */
  gstValue: string;
  qstValue: string;
  onGstChange: (value: string) => void;
  onQstChange: (value: string) => void;
  idPrefix: string;
}

export function TaxFields({
  autoGstCents,
  autoQstCents,
  manual,
  onManualChange,
  gstValue,
  qstValue,
  onGstChange,
  onQstChange,
  idPrefix,
}: TaxFieldsProps) {
  return (
    <div className="mb-4 rounded-lg border border-ardoise-200 bg-ardoise-50 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ardoise-500">Taxes</p>

      {!manual && (
        <div className="mb-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-ardoise-700">TPS (5 %)</span>
            <span className="tabular-nums text-ardoise-900">{formatCents(autoGstCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ardoise-700">TVQ (9,975 %)</span>
            <span className="tabular-nums text-ardoise-900">{formatCents(autoQstCents)}</span>
          </div>
        </div>
      )}

      <Checkbox
        id={`${idPrefix}-manual`}
        checked={manual}
        onChange={onManualChange}
        label="Ajuster les taxes manuellement"
      />

      {manual && (
        <div className="mt-1">
          <Field label="TPS perçue/payée" htmlFor={`${idPrefix}-gst`} hint="En dollars. 0 si non taxé (ex. assurance).">
            <TextInput id={`${idPrefix}-gst`} value={gstValue} onChange={onGstChange} inputMode="decimal" placeholder="0,00" />
          </Field>
          <Field label="TVQ perçue/payée" htmlFor={`${idPrefix}-qst`} hint="En dollars. 0 si non récupérable (ex. assurance au RTI).">
            <TextInput id={`${idPrefix}-qst`} value={qstValue} onChange={onQstChange} inputMode="decimal" placeholder="0,00" />
          </Field>
        </div>
      )}
    </div>
  );
}

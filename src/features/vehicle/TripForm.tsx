// Formulaire d'ajout OU de modification de trajet.

import { useState, useEffect } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import { Field, TextInput, Button } from '../../components/FormField';
import type { Trip } from '../../core/models/vehicle';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseKm(input: string): number | null {
  const cleaned = input.replace(/\s/g, '').replace(',', '.');
  if (cleaned === '') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

interface TripFormProps {
  editing?: Trip | null;
  onDone?: () => void;
  onCancel?: () => void;
}

export function TripForm({ editing, onDone, onCancel }: TripFormProps) {
  const addTrip = useFiscalStore((s) => s.addTrip);
  const updateTrip = useFiscalStore((s) => s.updateTrip);
  const isEdit = !!editing;

  const [date, setDate] = useState(today());
  const [businessKm, setBusinessKm] = useState('');
  const [personalKm, setPersonalKm] = useState('');
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setDate(editing.date);
      setBusinessKm(String(editing.businessKm));
      setPersonalKm(editing.personalKm ? String(editing.personalKm) : '');
      setPurpose(editing.purpose ?? '');
    } else {
      setDate(today());
      setBusinessKm('');
      setPersonalKm('');
      setPurpose('');
    }
    setError(null);
  }, [editing]);

  const handleSave = async () => {
    const bKm = parseKm(businessKm);
    const pKm = parseKm(personalKm);
    if (bKm === null || pKm === null) {
      setError('Les kilomètres doivent être des nombres positifs.');
      return;
    }
    if (bKm === 0 && pKm === 0) {
      setError('Entrez au moins un kilométrage.');
      return;
    }
    setError(null);
    setSaving(true);
    const trip: Trip = {
      id: editing?.id ?? crypto.randomUUID(),
      date,
      businessKm: bKm,
      personalKm: pKm,
      purpose: purpose.trim() || undefined,
    };
    if (isEdit) {
      await updateTrip(trip);
    } else {
      await addTrip(trip);
    }
    setSaving(false);
    onDone?.();
  };

  return (
    <div className="rounded-xl border border-ardoise-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-display text-xl text-ardoise-900">
        {isEdit ? 'Modifier le trajet' : 'Ajouter un trajet'}
      </h2>

      <Field label="Date" htmlFor="trip-date">
        <TextInput id="trip-date" value={date} onChange={setDate} type="date" />
      </Field>

      <Field label="Kilomètres d'affaires" htmlFor="trip-bkm" hint="Déplacements pour le travail">
        <TextInput id="trip-bkm" value={businessKm} onChange={setBusinessKm} inputMode="decimal" placeholder="0" />
      </Field>

      <Field label="Kilomètres personnels" htmlFor="trip-pkm" hint="Optionnel — sert au calcul du ratio d'usage">
        <TextInput id="trip-pkm" value={personalKm} onChange={setPersonalKm} inputMode="decimal" placeholder="0" />
      </Field>

      <Field label="Motif" htmlFor="trip-purpose" hint="Optionnel">
        <TextInput id="trip-purpose" value={purpose} onChange={setPurpose} placeholder="Ex. visite client" />
      </Field>

      {error && <p className="mb-3 text-sm text-ambre-700">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Enregistrer le trajet'}
        </Button>
        {isEdit && (
          <Button onClick={() => onCancel?.()} variant="ghost">
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
}

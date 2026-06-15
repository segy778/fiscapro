// Formulaire d'ajout OU de modification de revenu.

import { useState, useEffect } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import { Field, TextInput, Checkbox, Button } from '../../components/FormField';
import { TaxFields } from '../../components/TaxFields';
import { parseDollarsToCents } from '../../lib/format/parseMoney';
import { centsToDollars } from '../../lib/format/money';
import { loadFiscalConfig } from '../../core/tax/loadConfig';
import { computeSalesTax } from '../../core/tax/salesTax';
import type { Income } from '../../core/models/income';

const config = loadFiscalConfig(2026);

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface IncomeFormProps {
  /** Si fourni, le formulaire est en mode édition. */
  editing?: Income | null;
  onDone?: () => void;
  onCancel?: () => void;
}

export function IncomeForm({ editing, onDone, onCancel }: IncomeFormProps) {
  const addIncome = useFiscalStore((s) => s.addIncome);
  const updateIncome = useFiscalStore((s) => s.updateIncome);
  const taxRegistered = useFiscalStore((s) => s.taxRegistered);
  const isEdit = !!editing;

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [gstQst, setGstQst] = useState(false);
  const [taxManual, setTaxManual] = useState(false);
  const [gstValue, setGstValue] = useState('');
  const [qstValue, setQstValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pré-remplir en mode édition (ou réinitialiser en mode ajout).
  useEffect(() => {
    if (editing) {
      setAmount(String(centsToDollars(editing.amountCents)).replace('.', ','));
      setDate(editing.date);
      setClient(editing.client ?? '');
      setDescription(editing.description ?? '');
      setGstQst(editing.gstQstCollected ?? false);
      const hasManual = editing.gstCents !== undefined && editing.qstCents !== undefined;
      setTaxManual(hasManual);
      setGstValue(hasManual ? String(centsToDollars(editing.gstCents!)).replace('.', ',') : '');
      setQstValue(hasManual ? String(centsToDollars(editing.qstCents!)).replace('.', ',') : '');
    } else {
      setAmount('');
      setDate(today());
      setClient('');
      setDescription('');
      setGstQst(false);
      setTaxManual(false);
      setGstValue('');
      setQstValue('');
    }
    setError(null);
  }, [editing]);

  const amountCentsForTax = parseDollarsToCents(amount) ?? 0;
  const autoTax = computeSalesTax(amountCentsForTax, config);

  const handleSave = async () => {
    const cents = parseDollarsToCents(amount);
    if (cents === null || cents <= 0) {
      setError('Entrez un montant valide (ex. 320,00).');
      return;
    }
    if (!date) {
      setError('Choisissez une date.');
      return;
    }
    setError(null);
    setSaving(true);
    const income: Income = {
      id: editing?.id ?? crypto.randomUUID(),
      date,
      amountCents: cents,
      client: client.trim() || undefined,
      description: description.trim() || undefined,
      gstQstCollected: gstQst,
    };
    if (taxRegistered && gstQst && taxManual) {
      income.gstCents = parseDollarsToCents(gstValue) ?? 0;
      income.qstCents = parseDollarsToCents(qstValue) ?? 0;
    }
    if (isEdit) {
      await updateIncome(income);
    } else {
      await addIncome(income);
    }
    setSaving(false);
    onDone?.();
  };

  return (
    <div className="rounded-xl border border-ardoise-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-display text-xl text-ardoise-900">
        {isEdit ? 'Modifier le revenu' : 'Ajouter un revenu'}
      </h2>

      <Field label="Montant" htmlFor="inc-amount" hint="En dollars, ex. 320,00">
        <TextInput id="inc-amount" value={amount} onChange={setAmount} inputMode="decimal" placeholder="0,00" />
      </Field>

      <Field label="Date" htmlFor="inc-date">
        <TextInput id="inc-date" value={date} onChange={setDate} type="date" />
      </Field>

      <Field label="Client" htmlFor="inc-client" hint="Optionnel">
        <TextInput id="inc-client" value={client} onChange={setClient} placeholder="Nom du client" />
      </Field>

      <Field label="Description" htmlFor="inc-desc" hint="Optionnel">
        <TextInput id="inc-desc" value={description} onChange={setDescription} placeholder="Détail du revenu" />
      </Field>

      <Checkbox id="inc-gst" checked={gstQst} onChange={setGstQst} label="TPS/TVQ perçue sur ce revenu" />

      {taxRegistered && gstQst && (
        <TaxFields
          idPrefix="inc"
          autoGstCents={autoTax.gstCents}
          autoQstCents={autoTax.qstCents}
          manual={taxManual}
          onManualChange={setTaxManual}
          gstValue={gstValue}
          qstValue={qstValue}
          onGstChange={setGstValue}
          onQstChange={setQstValue}
        />
      )}

      {error && <p className="mb-3 text-sm text-ambre-700">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Enregistrer le revenu'}
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

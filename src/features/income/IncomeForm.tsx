// Formulaire d'ajout OU de modification de revenu.

import { useState, useEffect } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import { Field, TextInput, Checkbox, Button } from '../../components/FormField';
import { TaxFields } from '../../components/TaxFields';
import { parseDollarsToCents } from '../../lib/format/parseMoney';
import { centsToDollars, formatCents } from '../../lib/format/money';
import { loadFiscalConfig } from '../../core/tax/loadConfig';
import { computeSalesTax, extractSalesTaxFromTotal, splitIncomeTotal } from '../../core/tax/salesTax';
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
  // Le montant saisi inclut-il les taxes facturées au client ?
  const [taxesIncluded, setTaxesIncluded] = useState(false);
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
      // Le revenu est stocké avant taxes : on le réaffiche tel quel.
      setTaxesIncluded(false);
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
      setTaxesIncluded(false);
      setTaxManual(false);
      setGstValue('');
      setQstValue('');
    }
    setError(null);
  }, [editing]);

  const amountCentsForTax = parseDollarsToCents(amount) ?? 0;
  const included = gstQst && taxesIncluded;
  const autoTax = included
    ? extractSalesTaxFromTotal(amountCentsForTax, config)
    : computeSalesTax(amountCentsForTax, config);
  const manualTaxes = () => ({
    gstCents: parseDollarsToCents(gstValue) ?? 0,
    qstCents: parseDollarsToCents(qstValue) ?? 0,
  });
  const useManual = taxRegistered && gstQst && taxManual;
  // Aperçu du montant avant taxes quand le total inclut les taxes.
  const previewSplit = included
    ? splitIncomeTotal(amountCentsForTax, config, useManual ? manualTaxes() : undefined)
    : null;

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
    // Total taxes comprises : on stocke le montant AVANT taxes et les taxes
    // extraites, pour que le revenu imposable n'inclue jamais la TPS/TVQ.
    const split = included
      ? splitIncomeTotal(cents, config, useManual ? manualTaxes() : undefined)
      : null;
    if (split && split.amountCents <= 0) {
      setError('Les taxes ne peuvent pas dépasser le montant total.');
      setSaving(false);
      return;
    }
    const income: Income = {
      id: editing?.id ?? crypto.randomUUID(),
      date,
      amountCents: split ? split.amountCents : cents,
      client: client.trim() || undefined,
      description: description.trim() || undefined,
      gstQstCollected: gstQst,
    };
    if (split) {
      income.gstCents = split.gstCents;
      income.qstCents = split.qstCents;
    } else if (useManual) {
      const t = manualTaxes();
      income.gstCents = t.gstCents;
      income.qstCents = t.qstCents;
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

      {gstQst && (
        <Checkbox
          id="inc-taxes-included"
          checked={taxesIncluded}
          onChange={setTaxesIncluded}
          label="Ce montant inclut la TPS et la TVQ"
        />
      )}

      {previewSplit && amountCentsForTax > 0 && (
        <p className="mb-4 text-sm text-ardoise-600">
          Revenu avant taxes : <span className="tabular-nums font-medium">{formatCents(previewSplit.amountCents)}</span>
        </p>
      )}

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

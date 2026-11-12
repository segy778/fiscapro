// Formulaire d'ajout OU de modification de dépense.

import { useState, useEffect } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import { Field, TextInput, SelectInput, Button } from '../../components/FormField';
import { TaxFields } from '../../components/TaxFields';
import { parseDollarsToCents } from '../../lib/format/parseMoney';
import { centsToDollars } from '../../lib/format/money';
import { loadFiscalConfig } from '../../core/tax/loadConfig';
import { listExpenseCategories } from '../../core/tax/categories';
import { extractSalesTaxFromTotal } from '../../core/tax/salesTax';
import { ReceiptScanner } from './ReceiptScanner';
import { ReceiptImageView } from './ReceiptImageView';
import type { ParsedReceipt } from '../../lib/ocr/parseReceipt';
import { centsToDollars as toDollars } from '../../lib/format/money';
import type { Expense } from '../../core/models/income';

const config = loadFiscalConfig(2026);
const categories = listExpenseCategories(config);

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ExpenseFormProps {
  editing?: Expense | null;
  onDone?: () => void;
  onCancel?: () => void;
}

export function ExpenseForm({ editing, onDone, onCancel }: ExpenseFormProps) {
  const addExpense = useFiscalStore((s) => s.addExpense);
  const updateExpense = useFiscalStore((s) => s.updateExpense);
  const taxRegistered = useFiscalStore((s) => s.taxRegistered);
  const attachReceiptImage = useFiscalStore((s) => s.attachReceiptImage);
  const detachReceiptImage = useFiscalStore((s) => s.detachReceiptImage);
  const isEdit = !!editing;
  const firstCategory = categories[0]!;

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState(firstCategory.value);
  const [percent, setPercent] = useState(
    String(Math.round((firstCategory.defaultDeductiblePercent ?? 1) * 100)),
  );
  const [description, setDescription] = useState('');
  const [taxManual, setTaxManual] = useState(false);
  const [gstValue, setGstValue] = useState('');
  const [qstValue, setQstValue] = useState('');
  const [receiptImageId, setReceiptImageId] = useState<string | undefined>(undefined);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setAmount(String(centsToDollars(editing.amountCents)).replace('.', ','));
      setDate(editing.date);
      setCategory(editing.category);
      setPercent(String(Math.round(editing.deductiblePercent * 100)));
      setDescription(editing.description ?? '');
      const hasManual = editing.gstCents !== undefined && editing.qstCents !== undefined;
      setTaxManual(hasManual);
      setGstValue(hasManual ? String(centsToDollars(editing.gstCents!)).replace('.', ',') : '');
      setQstValue(hasManual ? String(centsToDollars(editing.qstCents!)).replace('.', ',') : '');
      setReceiptImageId(editing.receiptImageId);
    } else {
      setAmount('');
      setDate(today());
      setCategory(firstCategory.value);
      setPercent(String(Math.round((firstCategory.defaultDeductiblePercent ?? 1) * 100)));
      setDescription('');
      setTaxManual(false);
      setGstValue('');
      setQstValue('');
      setReceiptImageId(undefined);
    }
    setImagePreview(null);
    setError(null);
  }, [editing, firstCategory]);

  // Taxes calculées automatiquement à partir du montant saisi (pour l'affichage).
  const amountCentsForTax = parseDollarsToCents(amount) ?? 0;
  // Le montant saisi est le total de la facture : les taxes en sont extraites.
  const autoTax = extractSalesTaxFromTotal(amountCentsForTax, config);

  // Pré-remplissage depuis l'OCR : ne remplit que les champs détectés.
  const handleExtracted = (parsed: ParsedReceipt) => {
    if (parsed.totalCents !== null) {
      setAmount(String(toDollars(parsed.totalCents)).replace('.', ','));
    }
    if (parsed.date !== null) {
      setDate(parsed.date);
    }
    // Si l'OCR a trouvé des taxes et que l'utilisateur est inscrit, basculer en
    // mode manuel avec les montants détectés (à confirmer/corriger).
    if (taxRegistered && (parsed.gstCents !== null || parsed.qstCents !== null)) {
      setTaxManual(true);
      if (parsed.gstCents !== null) setGstValue(String(toDollars(parsed.gstCents)).replace('.', ','));
      if (parsed.qstCents !== null) setQstValue(String(toDollars(parsed.qstCents)).replace('.', ','));
    }
  };

  // Stocke l'image de facture choisie (compressée) et en montre un aperçu.
  const handleImage = async (file: File) => {
    try {
      const id = await attachReceiptImage(file);
      setReceiptImageId(id);
      setImagePreview(URL.createObjectURL(file));
    } catch {
      // Échec silencieux du stockage image : la dépense reste saisissable.
    }
  };

  // Détache l'image : la supprime du stockage et vide la référence.
  const handleDetachImage = async () => {
    if (receiptImageId) {
      await detachReceiptImage(receiptImageId);
    }
    setReceiptImageId(undefined);
    setImagePreview(null);
  };

  const selected = categories.find((c) => c.value === category);
  const isVehicle = selected?.vehicleProRata === true;

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    const cat = categories.find((c) => c.value === value);
    if (cat && cat.defaultDeductiblePercent !== undefined) {
      setPercent(String(Math.round(cat.defaultDeductiblePercent * 100)));
    }
  };

  const handleSave = async () => {
    const cents = parseDollarsToCents(amount);
    if (cents === null || cents <= 0) {
      setError('Entrez un montant valide (ex. 49,99).');
      return;
    }
    const pct = Number(percent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setError('Le pourcentage déductible doit être entre 0 et 100.');
      return;
    }
    setError(null);
    setSaving(true);
    const expense: Expense = {
      id: editing?.id ?? crypto.randomUUID(),
      date,
      amountCents: cents,
      category,
      deductiblePercent: pct / 100,
      description: description.trim() || undefined,
      receiptImageId,
    };
    // En mode manuel, figer les montants de taxe saisis. En mode auto, ne rien
    // stocker pour que le calcul reste dynamique (suit les taux de la config).
    if (taxRegistered && taxManual) {
      expense.gstCents = parseDollarsToCents(gstValue) ?? 0;
      expense.qstCents = parseDollarsToCents(qstValue) ?? 0;
    }
    if (isEdit) {
      await updateExpense(expense);
    } else {
      await addExpense(expense);
    }
    setSaving(false);
    onDone?.();
  };

  return (
    <div className="rounded-xl border border-ardoise-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-display text-xl text-ardoise-900">
        {isEdit ? 'Modifier la dépense' : 'Ajouter une dépense'}
      </h2>

      {!isEdit && <ReceiptScanner onExtracted={handleExtracted} onImage={handleImage} />}

      <Field label="Montant total (taxes comprises)" htmlFor="exp-amount" hint="Le total payé sur la facture, ex. 114,98">
        <TextInput id="exp-amount" value={amount} onChange={setAmount} inputMode="decimal" placeholder="0,00" />
      </Field>

      <Field label="Date" htmlFor="exp-date">
        <TextInput id="exp-date" value={date} onChange={setDate} type="date" />
      </Field>

      <Field label="Catégorie" htmlFor="exp-cat">
        <SelectInput
          id="exp-cat"
          value={category}
          onChange={handleCategoryChange}
          options={categories.map((c) => ({ value: c.value, label: c.label }))}
        />
      </Field>

      {isVehicle ? (
        <p className="mb-4 rounded-lg bg-ardoise-50 p-3 text-xs text-ardoise-500">
          Cette catégorie est déduite selon votre ratio d'usage commercial
          (kilométrage d'affaires), pas un pourcentage fixe. Saisissez vos trajets
          dans la section Véhicule.
        </p>
      ) : (
        <Field label="% déductible" htmlFor="exp-pct" hint="Pré-rempli selon la catégorie, ajustable">
          <TextInput id="exp-pct" value={percent} onChange={setPercent} inputMode="numeric" />
        </Field>
      )}

      <Field label="Description" htmlFor="exp-desc" hint="Optionnel">
        <TextInput id="exp-desc" value={description} onChange={setDescription} placeholder="Détail de la dépense" />
      </Field>

      {taxRegistered && (
        <TaxFields
          idPrefix="exp"
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

      <ReceiptImageView imageId={receiptImageId} previewUrl={imagePreview} onDetach={handleDetachImage} />

      {error && <p className="mb-3 text-sm text-ambre-700">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Enregistrer la dépense'}
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

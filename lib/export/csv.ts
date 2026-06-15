// Export CSV du rapport annuel. Aucune dépendance. BOM UTF-8 pour Excel (accents).

import type { AnnualReport } from '../../core/tax/report';
import { centsToDollars } from '../format/money';

/** Échappe une valeur CSV (guillemets, points-virgules, retours ligne). */
function esc(value: string | number): string {
  const s = String(value);
  if (/[";\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Formate un montant en cents -> dollars avec 2 décimales (point décimal). */
function money(cents: number): string {
  return centsToDollars(cents).toFixed(2);
}

/**
 * Construit le contenu CSV du rapport.
 * Séparateur point-virgule (convention fr-CA / Excel francophone).
 */
export function reportToCsv(report: AnnualReport): string {
  const lines: string[] = [];
  const row = (...cells: (string | number)[]) => lines.push(cells.map(esc).join(';'));

  row(`Rapport annuel FiscaPro QC ${report.year}`);
  row('Généré le', new Date(report.generatedAt).toLocaleString('fr-CA'));
  row('Estimation seulement — ne remplace pas un avis comptable ou fiscaliste agréé.');
  row('');

  row('REVENUS');
  row('Revenu brut total', money(report.grossIncomeCents));
  row('Nombre de revenus', report.incomeCount);
  row('');

  row('DÉPENSES PAR CATÉGORIE');
  row('Catégorie', 'Total', 'Déductible');
  for (const c of report.expensesByCategory) {
    row(c.label, money(c.totalCents), money(c.deductibleCents));
  }
  row('');

  row('VÉHICULE');
  row('Kilomètres affaires', report.km.totalBusinessKm);
  row('Kilomètres personnels', report.km.totalPersonalKm);
  row('Ratio usage commercial', `${(report.km.businessRatio * 100).toFixed(1)} %`);
  row('Frais de véhicule (total)', money(report.vehicleTotalCents));
  row('Frais de véhicule (déductible)', money(report.vehicleDeductibleCents));
  row('');

  row('DÉDUCTIONS');
  row('Total des dépenses', money(report.totalExpensesCents));
  row('Total déductible', money(report.totalDeductibleExpensesCents));
  row('Dépenses avec justificatif', String(report.receiptsCount));
  row('');

  row('TPS / TVQ');
  if (report.gstQst.registered && report.gstQst.salesTax) {
    const st = report.gstQst.salesTax;
    row('Revenus avec TPS/TVQ perçue', report.gstQst.incomesWithGstQst);
    row('TPS perçue', money(st.gstCollectedCents));
    row('TPS récupérable (CTI)', money(st.gstRecoverableCents));
    row('TPS à remettre (net)', money(st.gstNetCents));
    row('TVQ perçue', money(st.qstCollectedCents));
    row('TVQ récupérable (RTI)', money(st.qstRecoverableCents));
    row('TVQ à remettre (net)', money(st.qstNetCents));
  } else {
    row('Non inscrit aux taxes', 'Sommaire TPS/TVQ non applicable');
  }
  row('');

  row('ESTIMATION FISCALE');
  row("Revenu net d'entreprise", money(report.tax.netBusinessIncomeCents));
  row('Impôt fédéral (après abattement)', money(report.tax.federalTaxCents));
  row('Impôt provincial (Québec)', money(report.tax.provincialTaxCents));
  row('Cotisation RRQ', money(report.tax.rrqCents));
  row('Cotisation RQAP', money(report.tax.rqapCents));
  row('Total à payer estimé', money(report.tax.totalTaxCents));
  row('Provision suggérée', money(report.tax.suggestedSetAsideCents));
  row('');

  row('ACOMPTES PROVISIONNELS');
  if (report.installments.anyRequired) {
    row('Date', 'Fédéral', 'Québec', 'Total');
    for (const p of report.installments.payments) {
      row(p.dueDate, money(p.federalCents), money(p.quebecCents), money(p.totalCents));
    }
    row('Note', 'Estimation année courante; RRQ/RQAP réglés à la production.');
  } else {
    row('Aucun acompte requis', 'Sous les seuils (féd 3 000 $ / QC 1 800 $).');
  }

  // BOM UTF-8 pour qu'Excel affiche correctement les accents.
  return '\uFEFF' + lines.join('\r\n');
}

/** Déclenche le téléchargement d'un fichier texte. */
export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

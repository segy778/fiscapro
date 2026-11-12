// Export PDF du rapport annuel via jsPDF. Document prêt à remettre au comptable.

import { jsPDF } from 'jspdf';
import type { AnnualReport } from '../../core/tax/report';
import { formatCents } from '../format/money';

export function reportToPdf(report: AnnualReport): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 56;
  const pageWidth = doc.internal.pageSize.getWidth();
  const right = pageWidth - margin;
  let y = margin;

  const line = (gap = 16) => { y += gap; };
  const ensureSpace = (needed = 20) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // En-tête
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor('#1c4131');
  doc.text('FiscaPro QC', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor('#3b434d');
  line(20);
  doc.text(`Rapport annuel ${report.year}`, margin, y);
  line(14);
  doc.setFontSize(9);
  doc.setTextColor('#697483');
  doc.text(`Généré le ${new Date(report.generatedAt).toLocaleString('fr-CA')}`, margin, y);
  line(20);

  // Ligne d'une paire libellé / valeur
  const kv = (label: string, value: string, bold = false) => {
    ensureSpace();
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#3b434d');
    doc.text(label, margin, y);
    doc.text(value, right, y, { align: 'right' });
    line(15);
  };

  const sectionTitle = (title: string) => {
    ensureSpace(28);
    line(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor('#24543f');
    doc.text(title, margin, y);
    line(6);
    doc.setDrawColor('#dde1e5');
    doc.line(margin, y, right, y);
    line(12);
  };

  sectionTitle('Revenus');
  kv('Revenu brut total', formatCents(report.grossIncomeCents));
  kv('Nombre de revenus', String(report.incomeCount));

  sectionTitle('Dépenses par catégorie');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor('#697483');
  doc.text('Catégorie', margin, y);
  doc.text('Total', right - 120, y, { align: 'right' });
  doc.text('Déductible', right, y, { align: 'right' });
  line(14);
  for (const c of report.expensesByCategory) {
    ensureSpace();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#3b434d');
    doc.text(c.label, margin, y);
    doc.text(formatCents(c.totalCents), right - 120, y, { align: 'right' });
    doc.text(formatCents(c.deductibleCents), right, y, { align: 'right' });
    line(14);
  }

  sectionTitle('Véhicule');
  kv('Kilomètres affaires', `${report.km.totalBusinessKm} km`);
  kv('Kilomètres personnels', `${report.km.totalPersonalKm} km`);
  kv('Ratio usage commercial', `${(report.km.businessRatio * 100).toFixed(1)} %`);
  kv('Frais de véhicule (total)', formatCents(report.vehicleTotalCents));
  kv('Frais de véhicule (déductible)', formatCents(report.vehicleDeductibleCents));

  sectionTitle('TPS / TVQ');
  if (report.gstQst.registered && report.gstQst.salesTax) {
    const st = report.gstQst.salesTax;
    kv('Revenus avec TPS/TVQ perçue', String(report.gstQst.incomesWithGstQst));
    kv('TPS perçue', formatCents(st.gstCollectedCents));
    kv('TPS récupérable (CTI)', formatCents(st.gstRecoverableCents));
    kv('TPS à remettre (net)', formatCents(st.gstNetCents), true);
    kv('TVQ perçue', formatCents(st.qstCollectedCents));
    kv('TVQ récupérable (RTI)', formatCents(st.qstRecoverableCents));
    kv('TVQ à remettre (net)', formatCents(st.qstNetCents), true);
  } else {
    kv('Statut', 'Non inscrit aux taxes');
  }

  sectionTitle('Estimation fiscale');
  kv("Revenu net d'entreprise", formatCents(report.tax.netBusinessIncomeCents));
  kv('Impôt fédéral (après abattement)', formatCents(report.tax.federalTaxCents));
  kv('Impôt provincial (Québec)', formatCents(report.tax.provincialTaxCents));
  kv('Cotisation RRQ', formatCents(report.tax.rrqCents));
  kv('Cotisation RQAP', formatCents(report.tax.rqapCents));
  kv('Total à payer estimé', formatCents(report.tax.totalTaxCents), true);
  kv('Provision suggérée', formatCents(report.tax.suggestedSetAsideCents), true);

  sectionTitle('Acomptes provisionnels');
  if (report.installments.anyRequired) {
    for (const p of report.installments.payments) {
      kv(new Date(p.dueDate + 'T00:00:00').toLocaleDateString('fr-CA'), formatCents(p.totalCents));
    }
    line(4);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor('#697483');
    const note = doc.splitTextToSize(
      'Estimation basée sur l\'année courante. RRQ et RQAP ne font pas l\'objet d\'acomptes (réglés à la production).',
      right - margin,
    );
    doc.text(note, margin, y);
    line(14);
  } else {
    kv('Statut', 'Sous les seuils — aucun acompte requis');
  }

  // Avertissement
  line(10);
  ensureSpace(40);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor('#8a5e12');
  const disclaimer = doc.splitTextToSize(
    "Estimation seulement. Ces montants ne remplacent pas l'avis d'un comptable ou d'un fiscaliste agréé. Les paramètres doivent être validés auprès de Revenu Québec et de l'Agence du revenu du Canada.",
    right - margin,
  );
  doc.text(disclaimer, margin, y);

  return doc;
}

/** Une dépense avec son image (déjà chargée comme data URL) pour l'annexe. */
export interface ReceiptEntry {
  dateLabel: string;
  amountLabel: string;
  categoryLabel: string;
  description?: string;
  dataUrl: string;   // image en data URL (JPEG/PNG)
  mimeType: string;
}

/**
 * Ajoute une annexe « Pièces justificatives » au PDF : une grille de factures,
 * chacune étiquetée avec sa dépense. Modifie le doc en place.
 */
export function appendReceiptsAnnex(doc: jsPDF, receipts: ReceiptEntry[]): void {
  if (receipts.length === 0) return;

  const margin = 56;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;

  doc.addPage();
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor('#24543f');
  doc.text('Pièces justificatives', margin, y);
  y += 8;
  doc.setDrawColor('#dde1e5');
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  // Deux colonnes de factures.
  const colGap = 20;
  const colWidth = (usableWidth - colGap) / 2;
  const imgMaxH = 200; // hauteur max d'une vignette
  const labelH = 30;
  const cellH = imgMaxH + labelH + 16;

  let col = 0;
  for (const r of receipts) {
    // Nouvelle page si la cellule ne tient pas.
    if (y + cellH > pageHeight - margin) {
      doc.addPage();
      y = margin;
      col = 0;
    }
    const x = margin + col * (colWidth + colGap);

    // Étiquette de la dépense.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor('#3b434d');
    doc.text(`${r.dateLabel} — ${r.amountLabel}`, x, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor('#697483');
    const sub = r.description ? `${r.categoryLabel} · ${r.description}` : r.categoryLabel;
    doc.text(doc.splitTextToSize(sub, colWidth), x, y + 22);

    // Image, ajustée à la largeur de colonne en conservant le ratio.
    try {
      const props = doc.getImageProperties(r.dataUrl);
      const ratio = props.height / props.width;
      let w = colWidth;
      let h = w * ratio;
      if (h > imgMaxH) {
        h = imgMaxH;
        w = h / ratio;
      }
      const format = r.mimeType.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(r.dataUrl, format, x, y + labelH, w, h);
    } catch {
      doc.setFontSize(8);
      doc.setTextColor('#a33');
      doc.text('[image illisible]', x, y + labelH + 12);
    }

    // Avancer colonne/ligne.
    col += 1;
    if (col >= 2) {
      col = 0;
      y += cellH;
    }
  }
}

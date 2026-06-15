// Page Rapports : sommaire annuel à l'écran + exports CSV et PDF.

import { useState } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import { loadFiscalConfig } from '../../core/tax/loadConfig';
import { buildAnnualReport } from '../../core/tax/report';
import { formatCents, formatKm, formatDateShort, formatDate } from '../../lib/format/money';
import { reportToCsv, downloadTextFile } from '../../lib/export/csv';
import type { ReceiptEntry } from '../../lib/export/pdf';
import { buildInstallmentsIcs } from '../../core/tax/reminders';

const config = loadFiscalConfig(2026);

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Lecture image échouée'));
    reader.readAsDataURL(blob);
  });
}

function categoryLabel(key: string): string {
  return config.expenseCategories[key]?.label ?? key;
}

export function ReportsPage() {
  const incomes = useFiscalStore((s) => s.incomes);
  const expenses = useFiscalStore((s) => s.expenses);
  const trips = useFiscalStore((s) => s.trips);
  const vehicle = useFiscalStore((s) => s.vehicle);
  const taxRegistered = useFiscalStore((s) => s.taxRegistered);
  const getReceiptImage = useFiscalStore((s) => s.getReceiptImage);

  const [pdfWorking, setPdfWorking] = useState(false);

  const report = buildAnnualReport(config, incomes, expenses, trips, vehicle, taxRegistered);

  const handleCsv = () => {
    const csv = reportToCsv(report);
    downloadTextFile(`FiscaPro-QC-${report.year}.csv`, csv, 'text/csv;charset=utf-8');
  };

  const handleIcs = () => {
    const ics = buildInstallmentsIcs(report.installments, report.year, (c) => formatCents(c));
    downloadTextFile(`Acomptes-${report.year}.ics`, ics, 'text/calendar;charset=utf-8');
  };

  const handlePdf = async (withReceipts: boolean) => {
    setPdfWorking(true);
    try {
      // Import dynamique : le code PDF (jsPDF, volumineux) n'est téléchargé
      // qu'au premier clic, pas au démarrage de l'application.
      const { reportToPdf, appendReceiptsAnnex } = await import('../../lib/export/pdf');
      const doc = reportToPdf(report);
      if (withReceipts) {
        // Charger les images des dépenses qui en ont une, en data URL.
        const withImage = expenses.filter((e) => e.receiptImageId);
        const entries: ReceiptEntry[] = [];
        for (const e of withImage) {
          const blob = await getReceiptImage(e.receiptImageId!);
          if (!blob) continue;
          const dataUrl = await blobToDataUrl(blob);
          entries.push({
            dateLabel: formatDate(e.date),
            amountLabel: formatCents(e.amountCents),
            categoryLabel: categoryLabel(e.category),
            description: e.description,
            dataUrl,
            mimeType: blob.type || 'image/jpeg',
          });
        }
        appendReceiptsAnnex(doc, entries);
      }
      doc.save(`FiscaPro-QC-${report.year}.pdf`);
    } finally {
      setPdfWorking(false);
    }
  };

  const { tax } = report;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sapin-600">
            Rapport annuel {report.year}
          </p>
          <h1 className="mt-1 font-display text-3xl text-ardoise-900">Sommaire et exports</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCsv}
            className="rounded-lg border border-ardoise-200 px-4 py-2 text-sm font-medium text-ardoise-700 hover:bg-ardoise-100"
          >
            Exporter CSV
          </button>
          <button
            onClick={() => void handlePdf(false)}
            disabled={pdfWorking}
            className="rounded-lg bg-sapin-700 px-4 py-2 text-sm font-medium text-white hover:bg-sapin-800 disabled:opacity-50"
          >
            {pdfWorking ? 'Génération…' : 'Télécharger PDF'}
          </button>
          {report.receiptsCount > 0 && (
            <button
              onClick={() => void handlePdf(true)}
              disabled={pdfWorking}
              className="rounded-lg border border-sapin-700 px-4 py-2 text-sm font-medium text-sapin-700 hover:bg-sapin-50 disabled:opacity-50"
            >
              {pdfWorking ? 'Génération…' : `PDF avec factures (${report.receiptsCount})`}
            </button>
          )}
          {report.installments.anyRequired && (
            <button
              onClick={handleIcs}
              className="rounded-lg border border-ardoise-200 px-4 py-2 text-sm font-medium text-ardoise-700 hover:bg-ardoise-100"
            >
              Ajouter les acomptes au calendrier
            </button>
          )}
        </div>
      </header>

      <div className="space-y-5">
        {/* Revenus */}
        <Section title="Revenus">
          <Row label="Revenu brut total" value={formatCents(report.grossIncomeCents)} />
          <Row label="Nombre de revenus" value={String(report.incomeCount)} />
        </Section>

        {/* Dépenses par catégorie */}
        <Section title="Dépenses par catégorie">
          {report.expensesByCategory.length === 0 ? (
            <p className="text-sm text-ardoise-500">Aucune dépense saisie.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ardoise-500">
                  <th className="pb-2 font-medium">Catégorie</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                  <th className="pb-2 text-right font-medium">Déductible</th>
                </tr>
              </thead>
              <tbody>
                {report.expensesByCategory.map((c) => (
                  <tr key={c.category} className="border-t border-ardoise-100">
                    <td className="py-2 text-ardoise-700">{c.label}</td>
                    <td className="py-2 text-right tabular-nums text-ardoise-900">{formatCents(c.totalCents)}</td>
                    <td className="py-2 text-right tabular-nums text-sapin-700">{formatCents(c.deductibleCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Véhicule */}
        <Section title="Véhicule">
          <Row label="Kilomètres d'affaires" value={formatKm(report.km.totalBusinessKm)} />
          <Row label="Kilomètres personnels" value={formatKm(report.km.totalPersonalKm)} />
          <Row label="Ratio d'usage commercial" value={`${(report.km.businessRatio * 100).toFixed(1)} %`} />
          <Row label="Frais de véhicule (total)" value={formatCents(report.vehicleTotalCents)} />
          <Row label="Frais déductibles" value={formatCents(report.vehicleDeductibleCents)} accent />
        </Section>

        {/* TPS/TVQ */}
        <Section title="TPS / TVQ">
          {report.gstQst.registered && report.gstQst.salesTax ? (
            <>
              <Row label="Revenus avec TPS/TVQ perçue" value={String(report.gstQst.incomesWithGstQst)} />
              <div className="my-2 border-t border-ardoise-100" />
              <Row label="TPS perçue" value={formatCents(report.gstQst.salesTax.gstCollectedCents)} />
              <Row label="TPS récupérable (CTI)" value={formatCents(report.gstQst.salesTax.gstRecoverableCents)} />
              <Row label="TPS à remettre (net)" value={formatCents(report.gstQst.salesTax.gstNetCents)} accent />
              <div className="my-2 border-t border-ardoise-100" />
              <Row label="TVQ perçue" value={formatCents(report.gstQst.salesTax.qstCollectedCents)} />
              <Row label="TVQ récupérable (RTI)" value={formatCents(report.gstQst.salesTax.qstRecoverableCents)} />
              <Row label="TVQ à remettre (net)" value={formatCents(report.gstQst.salesTax.qstNetCents)} accent />
            </>
          ) : (
            <p className="text-sm text-ardoise-500">
              Vous n'êtes pas marqué comme inscrit aux taxes. Activez l'option dans les
              Réglages pour voir le sommaire TPS/TVQ (perçue, récupérable, remise nette).
            </p>
          )}
        </Section>

        {/* Estimation fiscale */}
        <Section title="Estimation fiscale">
          <Row label="Revenu net d'entreprise" value={formatCents(tax.netBusinessIncomeCents)} />
          <Row label="Impôt fédéral (après abattement)" value={formatCents(tax.federalTaxCents)} />
          <Row label="Impôt provincial (Québec)" value={formatCents(tax.provincialTaxCents)} />
          <Row label="Cotisation RRQ" value={formatCents(tax.rrqCents)} />
          <Row label="Cotisation RQAP" value={formatCents(tax.rqapCents)} />
          <Row label="Total à payer estimé" value={formatCents(tax.totalTaxCents)} accent />
          <Row label="Provision suggérée" value={formatCents(tax.suggestedSetAsideCents)} accent />
        </Section>

        {/* Acomptes provisionnels */}
        <Section title="Acomptes provisionnels">
          {report.installments.anyRequired ? (
            <>
              <p className="mb-3 text-sm text-ardoise-500">
                Selon votre impôt estimé, vous pourriez devoir verser des acomptes
                trimestriels{report.installments.federalRequired ? ' au fédéral' : ''}
                {report.installments.federalRequired && report.installments.quebecRequired ? ' et' : ''}
                {report.installments.quebecRequired ? ' au Québec' : ''}.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ardoise-500">
                    <th className="pb-2 font-medium">Date</th>
                    {report.installments.federalRequired && <th className="pb-2 text-right font-medium">Fédéral</th>}
                    {report.installments.quebecRequired && <th className="pb-2 text-right font-medium">Québec</th>}
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.installments.payments.map((p) => (
                    <tr key={p.dueDate} className="border-t border-ardoise-100">
                      <td className="py-2 text-ardoise-700">{formatDateShort(p.dueDate)}</td>
                      {report.installments.federalRequired && (
                        <td className="py-2 text-right tabular-nums text-ardoise-900">{formatCents(p.federalCents)}</td>
                      )}
                      {report.installments.quebecRequired && (
                        <td className="py-2 text-right tabular-nums text-ardoise-900">{formatCents(p.quebecCents)}</td>
                      )}
                      <td className="py-2 text-right tabular-nums font-medium text-sapin-700">{formatCents(p.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-ardoise-500">
                Estimation basée sur l'année courante seulement. La règle officielle tient
                aussi compte de l'année précédente. Les cotisations RRQ et RQAP ne font pas
                l'objet d'acomptes : elles sont réglées à la production de votre déclaration.
              </p>
            </>
          ) : (
            <p className="text-sm text-ardoise-500">
              D'après l'impôt estimé, vous n'atteignez pas les seuils d'acomptes
              provisionnels (3 000 $ d'impôt fédéral, 1 800 $ d'impôt québécois). Aucun
              versement trimestriel ne serait requis sur cette base.
            </p>
          )}
        </Section>
      </div>

      <footer className="mt-6 rounded-xl border border-ambre-500/30 bg-ambre-50 p-4">
        <p className="text-sm text-ambre-700">
          <span className="font-semibold">Estimation seulement.</span> Ce rapport ne
          remplace pas l'avis d'un comptable ou d'un fiscaliste agréé. Les paramètres
          doivent être validés auprès de Revenu Québec et de l'Agence du revenu du Canada.
        </p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-ardoise-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-display text-lg text-ardoise-900">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-ardoise-700">{label}</span>
      <span className={`tabular-nums ${accent ? 'font-semibold text-sapin-700' : 'text-ardoise-900'}`}>
        {value}
      </span>
    </div>
  );
}

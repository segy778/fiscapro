// Bandeau de rappel du prochain acompte provisionnel. Affiché dans l'app
// (visibilité immédiate). Pour les vraies alertes à échéance même app fermée,
// l'utilisateur exporte le calendrier .ics depuis la page Rapports.

import { useFiscalStore } from '../../store/useFiscalStore';
import { loadFiscalConfig } from '../../core/tax/loadConfig';
import { buildAnnualReport } from '../../core/tax/report';
import { nextInstallment } from '../../core/tax/reminders';
import { formatCents, formatDate } from '../../lib/format/money';

const config = loadFiscalConfig(2026);

/** Date du jour en ISO 'YYYY-MM-DD' (locale). */
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function InstallmentReminder() {
  const incomes = useFiscalStore((s) => s.incomes);
  const expenses = useFiscalStore((s) => s.expenses);
  const trips = useFiscalStore((s) => s.trips);
  const vehicle = useFiscalStore((s) => s.vehicle);
  const taxRegistered = useFiscalStore((s) => s.taxRegistered);

  const report = buildAnnualReport(config, incomes, expenses, trips, vehicle, taxRegistered);
  const next = nextInstallment(report.installments, todayIso());

  if (!next) return null;

  const urgent = next.daysUntil <= 14;
  const dayLabel =
    next.daysUntil === 0 ? "aujourd'hui" : next.daysUntil === 1 ? 'demain' : `dans ${next.daysUntil} jours`;

  return (
    <section
      className={`mb-6 rounded-xl border p-4 ${
        urgent ? 'border-ambre-500/40 bg-ambre-50' : 'border-ardoise-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ardoise-900">
            Prochain acompte provisionnel — {formatCents(next.totalCents)}
          </p>
          <p className="mt-1 text-sm text-ardoise-500">
            Échéance le {formatDate(next.dueDate)} ({dayLabel}). Fédéral + Québec combinés.
            Estimation à valider.
          </p>
        </div>
      </div>
    </section>
  );
}

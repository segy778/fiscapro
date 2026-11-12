// Tableau de bord : vue d'ensemble fiscale en temps réel.

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useFiscalStore } from '../../store/useFiscalStore';
import { StatCard } from '../../components/StatCard';
import { InstallmentReminder } from '../reminders/InstallmentReminder';
import { formatCents, formatKm } from '../../lib/format/money';
import { buildMonthlySeries } from './monthlyData';
import { loadFiscalConfig } from '../../core/tax/loadConfig';

const config = loadFiscalConfig(2026);

export function Dashboard() {
  const getSummary = useFiscalStore((s) => s.getSummary);
  const incomes = useFiscalStore((s) => s.incomes);
  const expenses = useFiscalStore((s) => s.expenses);
  const taxRegistered = useFiscalStore((s) => s.taxRegistered);

  const summary = getSummary();
  const monthly = buildMonthlySeries(incomes, expenses, config, taxRegistered);

  const { tax, km } = summary;
  const ratioPct = (km.businessRatio * 100).toFixed(0);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-sapin-600">
          Année fiscale {summary.year}
        </p>
        <h1 className="mt-1 font-display text-4xl text-ardoise-900">Tableau de bord</h1>
        <p className="mt-2 text-ardoise-500">
          Votre situation fiscale, mise à jour à mesure que vous ajoutez revenus et dépenses.
        </p>
      </header>

      <InstallmentReminder />

      {/* Donnée vedette : provision à mettre de côté */}
      <section className="mb-6 overflow-hidden rounded-2xl bg-sapin-800 p-7 text-white shadow-md">
        <p className="text-xs font-medium uppercase tracking-widest text-sapin-100/80">
          À mettre de côté pour l'impôt
        </p>
        <p className="mt-2 font-display text-5xl tabular-nums">
          {formatCents(tax.suggestedSetAsideCents)}
        </p>
        <p className="mt-2 max-w-md text-sm text-sapin-100/80">
          Provision recommandée : impôt fédéral et québécois, RRQ et RQAP réunis.
          Mettez-la de côté progressivement pour éviter les surprises.
        </p>
      </section>

      {/* Grille de stats */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Revenu cumulé"
          value={formatCents(summary.grossIncomeCents)}
          emphasis="positive"
        />
        <StatCard
          label="Dépenses déductibles"
          value={formatCents(summary.deductibleExpensesCents)}
        />
        <StatCard
          label="Bénéfice net estimé"
          value={formatCents(summary.netIncomeCents)}
          hint="Revenus moins dépenses déductibles"
        />
        <StatCard
          label="Impôt estimé"
          value={formatCents(tax.federalTaxCents + tax.provincialTaxCents)}
          hint="Fédéral et québécois combinés"
        />
        <StatCard
          label="Cotisations RRQ + RQAP"
          value={formatCents(tax.rrqCents + tax.rqapCents)}
          hint="Les deux parts, en tant qu'autonome"
        />
        <StatCard
          label="Kilométrage d'affaires"
          value={formatKm(km.totalBusinessKm)}
          hint={`${ratioPct} % de l'usage total (${formatKm(km.totalKm)})`}
        />
      </section>

      {/* Graphique mensuel */}
      <section className="mb-8 rounded-xl border border-ardoise-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-display text-xl text-ardoise-900">Évolution mensuelle</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dde1e5" vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#697483' }} />
              <YAxis tick={{ fontSize: 12, fill: '#697483' }} width={48} />
              <Tooltip
                formatter={(v: number) => `${v.toLocaleString('fr-CA')} $`}
                contentStyle={{ borderRadius: 8, borderColor: '#dde1e5', fontSize: 13 }}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="revenus" name="Revenus" fill="#2f6b4f" radius={[4, 4, 0, 0]} />
              <Bar dataKey="depenses" name="Dépenses déduct." fill="#c2871d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Avertissement obligatoire (CLAUDE.md règle 8) */}
      <footer className="rounded-xl border border-ambre-500/30 bg-ambre-50 p-4">
        <p className="text-sm text-ambre-700">
          <span className="font-semibold">Estimation seulement.</span> Ces montants sont
          fournis à titre indicatif et ne remplacent pas l'avis d'un comptable ou d'un
          fiscaliste agréé. Les paramètres doivent être validés auprès de Revenu Québec et
          de l'Agence du revenu du Canada.
        </p>
      </footer>
    </div>
  );
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import type { DashboardSummary } from '../../store/useFiscalStore';

// État mocké du store, ajustable par test.
const state: {
  summary: DashboardSummary;
  incomes: unknown[];
  expenses: unknown[];
  trips: unknown[];
  vehicle: unknown;
  taxRegistered: boolean;
} = {
  summary: makeSummary(),
  incomes: [],
  expenses: [],
  trips: [],
  vehicle: { id: 'v1', expenses: [], annualTotals: {} },
  taxRegistered: false,
};

function makeSummary(over: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    year: 2026,
    grossIncomeCents: 5_000_000,
    deductibleExpensesCents: 1_000_000,
    netIncomeCents: 4_000_000,
    tax: {
      grossIncomeCents: 5_000_000,
      deductionsCents: 1_000_000,
      netBusinessIncomeCents: 4_000_000,
      rrq: { totalCents: 0 } as never,
      rqap: { totalCents: 0 } as never,
      rrqCents: 0,
      rqapCents: 0,
      federalTaxableIncomeCents: 4_000_000,
      quebecTaxableIncomeCents: 4_000_000,
      federalTaxCents: 500_000,
      provincialTaxCents: 400_000,
      totalTaxCents: 900_000,
      suggestedSetAsideCents: 1_200_000,
    },
    km: { totalBusinessKm: 0, totalPersonalKm: 0, totalKm: 0, businessRatio: 0 },
    vehicleTotalCents: 0,
    vehicleDeductibleCents: 0,
    ...over,
  };
}

vi.mock('../../store/useFiscalStore', () => ({
  useFiscalStore: (selector: (s: unknown) => unknown) =>
    selector({
      getSummary: () => state.summary,
      incomes: state.incomes,
      expenses: state.expenses,
      trips: state.trips,
      vehicle: state.vehicle,
      taxRegistered: state.taxRegistered,
    }),
}));

describe('Dashboard', () => {
  beforeEach(() => {
    state.summary = makeSummary();
    state.incomes = [];
    state.expenses = [];
    state.trips = [];
    state.taxRegistered = false;
  });

  it('affiche l\'année fiscale et le titre', () => {
    render(<Dashboard />);
    expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    expect(screen.getByText(/Année fiscale 2026/)).toBeInTheDocument();
  });

  it('affiche les montants dérivés (revenu brut, dépenses, net)', () => {
    render(<Dashboard />);
    // 5 000 000 cents = 50 000,00 $
    expect(screen.getByText(/50\s*000,00/)).toBeInTheDocument();
    // dépenses 10 000,00 $
    expect(screen.getByText(/10\s*000,00/)).toBeInTheDocument();
  });

  it('affiche la provision à mettre de côté', () => {
    render(<Dashboard />);
    // suggestedSetAsideCents = 1 200 000 = 12 000,00 $
    expect(screen.getByText(/12\s*000,00/)).toBeInTheDocument();
  });

  it('n\'affiche PAS le rappel d\'acompte quand l\'impôt est sous les seuils', () => {
    // Impôt faible -> pas d'acomptes requis.
    state.summary = makeSummary({
      tax: { ...makeSummary().tax, federalTaxCents: 50_000, provincialTaxCents: 40_000 },
    });
    render(<Dashboard />);
    expect(screen.queryByText(/Prochain acompte provisionnel/)).not.toBeInTheDocument();
  });
});

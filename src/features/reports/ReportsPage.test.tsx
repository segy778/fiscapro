import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportsPage } from './ReportsPage';
import type { Income, Expense } from '../../core/models/income';

const state = {
  incomes: [] as Income[],
  expenses: [] as Expense[],
  trips: [] as unknown[],
  vehicle: { id: 'v1', name: 'Véhicule', expenses: [] },
  taxRegistered: false,
};

vi.mock('../../store/useFiscalStore', () => ({
  useFiscalStore: (selector: (s: unknown) => unknown) =>
    selector({
      incomes: state.incomes,
      expenses: state.expenses,
      trips: state.trips,
      vehicle: state.vehicle,
      taxRegistered: state.taxRegistered,
      getReceiptImage: vi.fn(),
    }),
}));

describe('ReportsPage', () => {
  beforeEach(() => {
    state.incomes = [];
    state.expenses = [];
    state.trips = [];
    state.taxRegistered = false;
  });

  it('affiche les boutons d\'export de base', () => {
    render(<ReportsPage />);
    expect(screen.getByText('Exporter CSV')).toBeInTheDocument();
    expect(screen.getByText('Télécharger PDF')).toBeInTheDocument();
  });

  it('reflète le revenu brut dans le sommaire', () => {
    state.incomes = [{ id: 'i1', date: '2026-02-01', amountCents: 5_000_000 }];
    render(<ReportsPage />);
    // 50 000,00 $ doit apparaître quelque part dans le sommaire
    expect(screen.getAllByText(/50\s*000,00/).length).toBeGreaterThan(0);
  });

  it('n\'affiche PAS « PDF avec factures » sans justificatif', () => {
    state.expenses = [
      { id: 'e1', date: '2026-02-01', amountCents: 10000, category: 'fournitures_bureau', deductiblePercent: 1 },
    ];
    render(<ReportsPage />);
    expect(screen.queryByText(/PDF avec factures/)).not.toBeInTheDocument();
  });

  it('affiche « PDF avec factures (N) » quand un justificatif existe', () => {
    state.expenses = [
      { id: 'e1', date: '2026-02-01', amountCents: 10000, category: 'fournitures_bureau', deductiblePercent: 1, receiptImageId: 'img1' },
    ];
    render(<ReportsPage />);
    expect(screen.getByText(/PDF avec factures \(1\)/)).toBeInTheDocument();
  });

  it('n\'affiche PAS le bouton calendrier sans acomptes requis', () => {
    state.incomes = [{ id: 'i1', date: '2026-02-01', amountCents: 1_000_000 }]; // 10 000 $, impôt faible
    render(<ReportsPage />);
    expect(screen.queryByText(/Ajouter les acomptes au calendrier/)).not.toBeInTheDocument();
  });

  it('affiche le bouton calendrier quand des acomptes sont requis', () => {
    state.incomes = [{ id: 'i1', date: '2026-02-01', amountCents: 9_000_000 }]; // 90 000 $, acomptes requis
    render(<ReportsPage />);
    expect(screen.getByText(/Ajouter les acomptes au calendrier/)).toBeInTheDocument();
  });
});

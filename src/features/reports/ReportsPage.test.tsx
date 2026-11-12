import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportsPage } from './ReportsPage';
import type { Income, Expense } from '../../core/models/income';

const state = {
  incomes: [] as Income[],
  expenses: [] as Expense[],
  trips: [] as unknown[],
  vehicle: { id: 'v1', name: 'Véhicule', expenses: [] },
  taxRegistered: false,
  encryptionEnabled: false,
};

const downloadTextFile = vi.fn();
vi.mock('../../lib/export/csv', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/export/csv')>()),
  downloadTextFile: (...args: unknown[]) => downloadTextFile(...args),
}));

vi.mock('../../store/useFiscalStore', () => ({
  useFiscalStore: (selector: (s: unknown) => unknown) =>
    selector({
      incomes: state.incomes,
      expenses: state.expenses,
      trips: state.trips,
      vehicle: state.vehicle,
      taxRegistered: state.taxRegistered,
      encryptionEnabled: state.encryptionEnabled,
      getReceiptImage: vi.fn(),
    }),
}));

describe('ReportsPage', () => {
  beforeEach(() => {
    state.incomes = [];
    state.expenses = [];
    state.trips = [];
    state.taxRegistered = false;
    state.encryptionEnabled = false;
    downloadTextFile.mockClear();
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

  // L'ordre compte : « ne plus demander » est mémorisé pour toute la session
  // (module), donc ce test-là vient en dernier.
  it('avertit avant un export : rien n\'est téléchargé sans confirmation', () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByText('Exporter CSV'));
    expect(screen.getByText('Ce fichier ne sera pas chiffré')).toBeInTheDocument();
    expect(screen.getByText('FiscaPro-QC-2026.csv')).toBeInTheDocument();
    expect(downloadTextFile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Annuler'));
    expect(screen.queryByText('Ce fichier ne sera pas chiffré')).not.toBeInTheDocument();
    expect(downloadTextFile).not.toHaveBeenCalled();
  });

  it('précise que le fichier sort du chiffrement quand celui-ci est activé', () => {
    state.encryptionEnabled = true;
    render(<ReportsPage />);
    fireEvent.click(screen.getByText('Exporter CSV'));
    expect(screen.getByText(/chiffrées dans l.app, mais pas les fichiers exportés/)).toBeInTheDocument();
  });

  it('télécharge après confirmation', () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByText('Exporter CSV'));
    fireEvent.click(screen.getByText('Télécharger quand même'));
    expect(downloadTextFile).toHaveBeenCalledOnce();
    expect(downloadTextFile.mock.calls[0]?.[0]).toBe('FiscaPro-QC-2026.csv');
  });

  it('« Ne plus me le demander » : les exports suivants ne redemandent plus', () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByText('Exporter CSV'));
    fireEvent.click(screen.getByLabelText(/Ne plus me le demander/));
    fireEvent.click(screen.getByText('Télécharger quand même'));
    fireEvent.click(screen.getByText('Exporter CSV'));
    expect(screen.queryByText('Ce fichier ne sera pas chiffré')).not.toBeInTheDocument();
    expect(downloadTextFile).toHaveBeenCalledTimes(2);
  });
});

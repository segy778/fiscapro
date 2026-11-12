import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExpenseForm } from './ExpenseForm';

const addExpense = vi.fn();
const updateExpense = vi.fn();
let taxRegistered = false;

vi.mock('../../store/useFiscalStore', () => ({
  useFiscalStore: (selector: (s: unknown) => unknown) =>
    selector({ addExpense, updateExpense, taxRegistered }),
}));

// Mock du scanner OCR pour éviter de charger Tesseract dans les tests.
vi.mock('./ReceiptScanner', () => ({
  ReceiptScanner: () => null,
}));

describe('ExpenseForm', () => {
  beforeEach(() => {
    addExpense.mockClear();
    updateExpense.mockClear();
    taxRegistered = false;
  });

  it('enregistre une dépense avec le % déductible de la catégorie', async () => {
    render(<ExpenseForm />);
    fireEvent.change(screen.getByLabelText('Montant total (taxes comprises)'), { target: { value: '100,00' } });
    // Choisir « Repas et représentation » (50 %)
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: 'repas_representation' } });
    fireEvent.click(screen.getByText('Enregistrer la dépense'));

    await waitFor(() => expect(addExpense).toHaveBeenCalledOnce());
    const arg = addExpense.mock.calls[0]![0];
    expect(arg.amountCents).toBe(10000);
    expect(arg.category).toBe('repas_representation');
    expect(arg.deductiblePercent).toBe(0.5); // pré-rempli à 50 %
  });

  it('pré-remplit le % déductible quand on change de catégorie', () => {
    render(<ExpenseForm />);
    const pctField = () => screen.getByLabelText('% déductible') as HTMLInputElement;
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: 'repas_representation' } });
    expect(pctField().value).toBe('50');
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: 'fournitures_bureau' } });
    expect(pctField().value).toBe('100');
  });

  it('masque le champ % pour une catégorie véhicule (prorata)', () => {
    render(<ExpenseForm />);
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: 'essence_carburant' } });
    expect(screen.queryByLabelText('% déductible')).not.toBeInTheDocument();
    expect(screen.getByText(/ratio d'usage commercial/i)).toBeInTheDocument();
  });

  it('rejette un pourcentage hors bornes', async () => {
    render(<ExpenseForm />);
    fireEvent.change(screen.getByLabelText('Montant total (taxes comprises)'), { target: { value: '50,00' } });
    // S'assurer d'une catégorie non-véhicule (sinon le champ % est masqué).
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: 'fournitures_bureau' } });
    fireEvent.change(screen.getByLabelText('% déductible'), { target: { value: '150' } });
    fireEvent.click(screen.getByText('Enregistrer la dépense'));
    await waitFor(() => expect(screen.getByText(/entre 0 et 100/i)).toBeInTheDocument());
    expect(addExpense).not.toHaveBeenCalled();
  });

  it('stocke les taxes manuelles seulement si inscrit et mode manuel', async () => {
    taxRegistered = true;
    render(<ExpenseForm />);
    fireEvent.change(screen.getByLabelText('Montant total (taxes comprises)'), { target: { value: '1000,00' } });
    // Activer le mode manuel
    fireEvent.click(screen.getByLabelText('Ajuster les taxes manuellement'));
    fireEvent.change(screen.getByLabelText('TPS perçue/payée'), { target: { value: '50,00' } });
    fireEvent.change(screen.getByLabelText('TVQ perçue/payée'), { target: { value: '0' } });
    fireEvent.click(screen.getByText('Enregistrer la dépense'));

    await waitFor(() => expect(addExpense).toHaveBeenCalledOnce());
    const arg = addExpense.mock.calls[0]![0];
    expect(arg.gstCents).toBe(5000);
    expect(arg.qstCents).toBe(0); // assurance : TVQ non récupérable
  });
});

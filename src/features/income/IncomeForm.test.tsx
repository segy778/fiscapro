import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IncomeForm } from './IncomeForm';

// Mock du store : on capture les appels addIncome/updateIncome.
const addIncome = vi.fn();
const updateIncome = vi.fn();
let taxRegistered = false;

vi.mock('../../store/useFiscalStore', () => ({
  useFiscalStore: (selector: (s: unknown) => unknown) =>
    selector({
      addIncome,
      updateIncome,
      taxRegistered,
    }),
}));

describe('IncomeForm', () => {
  beforeEach(() => {
    addIncome.mockClear();
    updateIncome.mockClear();
    taxRegistered = false;
  });

  it('enregistre un revenu valide en convertissant les dollars en cents', async () => {
    render(<IncomeForm />);
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '1500,50' } });
    fireEvent.change(screen.getByLabelText('Client'), { target: { value: 'Client X' } });
    fireEvent.click(screen.getByText('Enregistrer le revenu'));

    await waitFor(() => expect(addIncome).toHaveBeenCalledOnce());
    const arg = addIncome.mock.calls[0]![0];
    expect(arg.amountCents).toBe(150050); // 1500,50 $ -> cents
    expect(arg.client).toBe('Client X');
    expect(arg.id).toBeTruthy();
  });

  it('rejette un montant invalide avec un message d\'erreur', async () => {
    render(<IncomeForm />);
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByText('Enregistrer le revenu'));

    await waitFor(() => {
      expect(screen.getByText(/montant valide/i)).toBeInTheDocument();
    });
    expect(addIncome).not.toHaveBeenCalled();
  });

  it('rejette un montant de zéro ou négatif', async () => {
    render(<IncomeForm />);
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '0' } });
    fireEvent.click(screen.getByText('Enregistrer le revenu'));
    await waitFor(() => expect(screen.getByText(/montant valide/i)).toBeInTheDocument());
    expect(addIncome).not.toHaveBeenCalled();
  });

  it('pré-remplit le formulaire en mode édition', () => {
    const editing = {
      id: 'abc', date: '2026-02-01', amountCents: 32000,
      client: 'Ancien client', gstQstCollected: false,
    };
    render(<IncomeForm editing={editing} />);
    expect((screen.getByLabelText('Montant') as HTMLInputElement).value).toBe('320');
    expect((screen.getByLabelText('Client') as HTMLInputElement).value).toBe('Ancien client');
    expect(screen.getByText('Enregistrer les modifications')).toBeInTheDocument();
  });

  it('appelle updateIncome (pas addIncome) en mode édition', async () => {
    const editing = { id: 'abc', date: '2026-02-01', amountCents: 32000 };
    render(<IncomeForm editing={editing} />);
    fireEvent.click(screen.getByText('Enregistrer les modifications'));
    await waitFor(() => expect(updateIncome).toHaveBeenCalledOnce());
    expect(addIncome).not.toHaveBeenCalled();
    expect(updateIncome.mock.calls[0]![0].id).toBe('abc');
  });

  it('n\'affiche la zone Taxes que si inscrit et TPS/TVQ perçue cochée', () => {
    taxRegistered = true;
    render(<IncomeForm />);
    // Pas encore coché -> pas de zone taxes
    expect(screen.queryByText('Ajuster les taxes manuellement')).not.toBeInTheDocument();
    // Cocher TPS/TVQ perçue
    fireEvent.click(screen.getByLabelText(/TPS\/TVQ perçue/i));
    expect(screen.getByText('Ajuster les taxes manuellement')).toBeInTheDocument();
  });
});

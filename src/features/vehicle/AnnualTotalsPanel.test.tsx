import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnnualTotalsPanel } from './AnnualTotalsPanel';

const setVehicleAnnualTotal = vi.fn();
const state: { vehicle: { id: string; name: string; expenses: unknown[]; annualTotals?: Record<string, number> } } = {
  vehicle: { id: 'v1', name: 'Véhicule', expenses: [] },
};

vi.mock('../../store/useFiscalStore', () => ({
  useFiscalStore: (selector: (s: unknown) => unknown) =>
    selector({ vehicle: state.vehicle, setVehicleAnnualTotal }),
}));

describe('AnnualTotalsPanel', () => {
  beforeEach(() => {
    setVehicleAnnualTotal.mockClear();
    state.vehicle = { id: 'v1', name: 'Véhicule', expenses: [] };
  });

  it('enregistre un total en convertissant en cents', async () => {
    render(<AnnualTotalsPanel />);
    fireEvent.change(screen.getByLabelText('Total annuel'), { target: { value: '1200,00' } });
    fireEvent.click(screen.getByText('Enregistrer le total'));
    await waitFor(() => expect(setVehicleAnnualTotal).toHaveBeenCalledOnce());
    const [kind, cents] = setVehicleAnnualTotal.mock.calls[0]!;
    expect(kind).toBe('essence'); // type par défaut
    expect(cents).toBe(120000);
  });

  it('rejette un montant invalide', async () => {
    render(<AnnualTotalsPanel />);
    fireEvent.change(screen.getByLabelText('Total annuel'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByText('Enregistrer le total'));
    await waitFor(() => expect(screen.getByText(/montant valide/)).toBeInTheDocument());
    expect(setVehicleAnnualTotal).not.toHaveBeenCalled();
  });

  it('affiche les totaux existants', () => {
    state.vehicle = { id: 'v1', name: 'Véhicule', expenses: [], annualTotals: { essence: 150000 } };
    render(<AnnualTotalsPanel />);
    // 150000 cents = 1 500,00 $
    expect(screen.getByText(/1\s*500,00/)).toBeInTheDocument();
  });

  it('pré-remplit le montant du type sélectionné', () => {
    state.vehicle = { id: 'v1', name: 'Véhicule', expenses: [], annualTotals: { essence: 90000 } };
    render(<AnnualTotalsPanel />);
    // essence est le type par défaut -> champ pré-rempli à 900
    expect((screen.getByLabelText('Total annuel') as HTMLInputElement).value).toBe('900');
  });
});

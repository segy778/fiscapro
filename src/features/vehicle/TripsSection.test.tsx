import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TripsSection } from './TripsSection';
import type { Trip } from '../../core/models/vehicle';

const state = { trips: [] as Trip[] };
const deleteTrip = vi.fn();

vi.mock('../../store/useFiscalStore', () => ({
  useFiscalStore: (selector: (s: unknown) => unknown) =>
    selector({ trips: state.trips, deleteTrip, addTrip: vi.fn(), updateTrip: vi.fn() }),
}));

describe('TripsSection', () => {
  beforeEach(() => {
    state.trips = [];
    deleteTrip.mockClear();
  });

  it('affiche l\'état vide sans trajet', () => {
    render(<TripsSection />);
    expect(screen.getByText(/Aucun trajet/)).toBeInTheDocument();
  });

  it('calcule et affiche le ratio d\'usage commercial', () => {
    // 800 km affaires + 200 km perso = 80 %
    state.trips = [
      { id: 't1', date: '2026-02-01', businessKm: 800, personalKm: 200, purpose: 'Client' },
    ];
    render(<TripsSection />);
    expect(screen.getByText('80 %')).toBeInTheDocument();
  });

  it('liste les trajets avec leur kilométrage d\'affaires', () => {
    state.trips = [
      { id: 't1', date: '2026-02-01', businessKm: 150, purpose: 'Livraison' },
    ];
    render(<TripsSection />);
    // « 150 km aff. » est le libellé unique du kilométrage d'affaires du trajet.
    expect(screen.getByText(/150 km aff/)).toBeInTheDocument();
    expect(screen.getByText(/Livraison/)).toBeInTheDocument();
  });

  it('agrège plusieurs trajets dans le ratio', () => {
    state.trips = [
      { id: 't1', date: '2026-02-01', businessKm: 100, personalKm: 0 },
      { id: 't2', date: '2026-02-02', businessKm: 100, personalKm: 100 },
    ];
    // total affaires 200, total km 300 -> 67 %
    render(<TripsSection />);
    expect(screen.getByText('67 %')).toBeInTheDocument();
  });
});

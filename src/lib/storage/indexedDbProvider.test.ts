import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDbProvider } from './indexedDbProvider';
import type { Income } from '../../core/models/income';
import type { Trip } from '../../core/models/vehicle';

describe('IndexedDbProvider', () => {
  let provider: IndexedDbProvider;

  beforeEach(async () => {
    provider = new IndexedDbProvider();
    await provider.init();
    await provider.clear();
  });

  it('persiste et relit un revenu', async () => {
    const income: Income = { id: 'x1', date: '2026-01-01', amountCents: 50000 };
    await provider.putIncome(income);
    const all = await provider.getIncomes();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(income);
  });

  it('met à jour un revenu existant (même id)', async () => {
    await provider.putIncome({ id: 'x1', date: '2026-01-01', amountCents: 50000 });
    await provider.putIncome({ id: 'x1', date: '2026-01-01', amountCents: 99999 });
    const all = await provider.getIncomes();
    expect(all).toHaveLength(1);
    expect(all[0]!.amountCents).toBe(99999);
  });

  it('supprime un revenu', async () => {
    await provider.putIncome({ id: 'x1', date: '2026-01-01', amountCents: 50000 });
    await provider.deleteIncome('x1');
    expect(await provider.getIncomes()).toHaveLength(0);
  });

  it('persiste des trajets et les recharge via loadAll', async () => {
    const trip: Trip = { id: 't1', date: '2026-02-01', businessKm: 100, personalKm: 20 };
    await provider.putTrip(trip);
    const data = await provider.loadAll();
    expect(data.trips).toHaveLength(1);
    expect(data.trips[0]!.businessKm).toBe(100);
  });

  it('clear() vide tous les stores', async () => {
    await provider.putIncome({ id: 'x1', date: '2026-01-01', amountCents: 1 });
    await provider.putTrip({ id: 't1', date: '2026-01-01', businessKm: 1 });
    await provider.clear();
    const data = await provider.loadAll();
    expect(data.incomes).toHaveLength(0);
    expect(data.trips).toHaveLength(0);
  });

  it('loadAll retourne des tableaux vides sur une base neuve', async () => {
    const data = await provider.loadAll();
    expect(data.incomes).toEqual([]);
    expect(data.expenses).toEqual([]);
    expect(data.trips).toEqual([]);
    expect(data.vehicles).toEqual([]);
  });

  it('persiste et relit une métadonnée', async () => {
    expect(await provider.getMeta('seeded')).toBeNull();
    await provider.setMeta('seeded', '1');
    expect(await provider.getMeta('seeded')).toBe('1');
  });

  it('clear() préserve les métadonnées (drapeau d\'amorçage)', async () => {
    await provider.setMeta('seeded', '1');
    await provider.putIncome({ id: 'x1', date: '2026-01-01', amountCents: 100 });
    await provider.clear();
    // Données effacées, mais le drapeau survit pour ne pas re-amorcer la démo.
    expect(await provider.getIncomes()).toHaveLength(0);
    expect(await provider.getMeta('seeded')).toBe('1');
  });
});

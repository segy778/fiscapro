import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoLock } from './useAutoLock';

const lockApp = vi.fn();
let encryptionEnabled = true;
let needsUnlock = false;

vi.mock('../../store/useFiscalStore', () => ({
  useFiscalStore: (selector: (s: unknown) => unknown) =>
    selector({ encryptionEnabled, needsUnlock, lockApp }),
}));

const FIFTEEN_MIN = 15 * 60 * 1000;

describe('useAutoLock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    lockApp.mockClear();
    encryptionEnabled = true;
    needsUnlock = false;
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('verrouille après 15 minutes d\'inactivité', () => {
    renderHook(() => useAutoLock());
    expect(lockApp).not.toHaveBeenCalled();
    vi.advanceTimersByTime(FIFTEEN_MIN);
    expect(lockApp).toHaveBeenCalledOnce();
  });

  it('ne verrouille pas avant le délai', () => {
    renderHook(() => useAutoLock());
    vi.advanceTimersByTime(FIFTEEN_MIN - 1000);
    expect(lockApp).not.toHaveBeenCalled();
  });

  it('réinitialise le compteur sur activité', () => {
    renderHook(() => useAutoLock());
    vi.advanceTimersByTime(FIFTEEN_MIN - 1000);
    // Activité : un clic
    window.dispatchEvent(new Event('mousedown'));
    // Encore presque 15 min : ne devrait pas verrouiller (compteur réinitialisé)
    vi.advanceTimersByTime(FIFTEEN_MIN - 1000);
    expect(lockApp).not.toHaveBeenCalled();
    // Mais après le délai complet depuis l'activité, oui
    vi.advanceTimersByTime(1000);
    expect(lockApp).toHaveBeenCalledOnce();
  });

  it('ne fait rien si le chiffrement n\'est pas activé', () => {
    encryptionEnabled = false;
    renderHook(() => useAutoLock());
    vi.advanceTimersByTime(FIFTEEN_MIN * 2);
    expect(lockApp).not.toHaveBeenCalled();
  });

  it('ne fait rien si en attente de déverrouillage', () => {
    needsUnlock = true;
    renderHook(() => useAutoLock());
    vi.advanceTimersByTime(FIFTEEN_MIN * 2);
    expect(lockApp).not.toHaveBeenCalled();
  });

  it('affiche l\'avertissement à 14 minutes', () => {
    const { result } = renderHook(() => useAutoLock());
    expect(result.current.warning).toBe(false);
    act(() => { vi.advanceTimersByTime(14 * 60 * 1000); });
    expect(result.current.warning).toBe(true);
    expect(lockApp).not.toHaveBeenCalled(); // pas encore verrouillé
  });

  it('verrouille 1 minute après l\'avertissement si pas d\'action', () => {
    const { result } = renderHook(() => useAutoLock());
    act(() => { vi.advanceTimersByTime(14 * 60 * 1000); });
    expect(result.current.warning).toBe(true);
    act(() => { vi.advanceTimersByTime(60 * 1000); });
    expect(lockApp).toHaveBeenCalledOnce();
  });

  it('l\'activité ordinaire NE réinitialise PAS une fois l\'avertissement affiché', () => {
    const { result } = renderHook(() => useAutoLock());
    act(() => { vi.advanceTimersByTime(14 * 60 * 1000); });
    expect(result.current.warning).toBe(true);
    // Activité : ne doit PAS annuler l'avertissement ni repousser le verrou
    act(() => { window.dispatchEvent(new Event('mousemove')); vi.advanceTimersByTime(60 * 1000); });
    expect(lockApp).toHaveBeenCalledOnce();
  });

  it('« Rester connecté » réinitialise et masque l\'avertissement', () => {
    const { result } = renderHook(() => useAutoLock());
    act(() => { vi.advanceTimersByTime(14 * 60 * 1000); });
    expect(result.current.warning).toBe(true);
    act(() => { result.current.stayUnlocked(); });
    expect(result.current.warning).toBe(false);
    // Le compteur repart : pas de verrou avant un nouveau cycle complet
    act(() => { vi.advanceTimersByTime(14 * 60 * 1000); });
    expect(lockApp).not.toHaveBeenCalled();
    expect(result.current.warning).toBe(true); // avertissement de nouveau
  });
});

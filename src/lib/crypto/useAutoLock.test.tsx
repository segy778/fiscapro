import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoLock, inactivityState } from './useAutoLock';

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

  it('réinitialise le compteur sur activité (avant l\'avertissement)', () => {
    renderHook(() => useAutoLock());
    // 13 min : l'avertissement (14 min) n'est pas encore affiché.
    act(() => { vi.advanceTimersByTime(13 * 60 * 1000); });
    act(() => { window.dispatchEvent(new Event('mousedown')); });
    // Encore presque 15 min : ne devrait pas verrouiller (compteur réinitialisé)
    act(() => { vi.advanceTimersByTime(FIFTEEN_MIN - 1000); });
    expect(lockApp).not.toHaveBeenCalled();
    // Mais après le délai complet depuis l'activité, oui
    act(() => { vi.advanceTimersByTime(1000); });
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

  // --- Mise en veille : l'heure avance mais aucune minuterie ne s'exécute ---
  const sleep = (ms: number) => vi.setSystemTime(Date.now() + ms);

  it('au réveil, la première activité verrouille au lieu de prolonger la session', () => {
    renderHook(() => useAutoLock());
    sleep(2 * 60 * 60 * 1000); // 2 h de veille
    expect(lockApp).not.toHaveBeenCalled(); // aucune minuterie n'a tourné
    act(() => { window.dispatchEvent(new Event('mousemove')); });
    expect(lockApp).toHaveBeenCalledOnce();
  });

  it('au retour sur l\'onglet après 15 min, verrouille immédiatement', () => {
    renderHook(() => useAutoLock());
    sleep(FIFTEEN_MIN + 1000);
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(lockApp).toHaveBeenCalledOnce();
  });

  it('au retour sur la fenêtre (focus) après 15 min, verrouille immédiatement', () => {
    renderHook(() => useAutoLock());
    sleep(FIFTEEN_MIN);
    act(() => { window.dispatchEvent(new Event('focus')); });
    expect(lockApp).toHaveBeenCalledOnce();
  });

  it('une courte veille (5 min) ne verrouille pas et l\'activité compte', () => {
    renderHook(() => useAutoLock());
    sleep(5 * 60 * 1000);
    act(() => { window.dispatchEvent(new Event('mousemove')); });
    expect(lockApp).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(FIFTEEN_MIN - 2000); });
    expect(lockApp).not.toHaveBeenCalled(); // compteur reparti à l'activité
  });

  it('« Rester connecté » trop tard (après 15 min de veille) ne rouvre pas la session', () => {
    const { result } = renderHook(() => useAutoLock());
    sleep(FIFTEEN_MIN + 1000);
    act(() => { result.current.stayUnlocked(); });
    expect(lockApp).toHaveBeenCalledOnce();
  });

  it('ne verrouille qu\'une fois', () => {
    renderHook(() => useAutoLock());
    sleep(FIFTEEN_MIN);
    act(() => {
      window.dispatchEvent(new Event('mousemove'));
      window.dispatchEvent(new Event('focus'));
      vi.advanceTimersByTime(5000);
    });
    expect(lockApp).toHaveBeenCalledOnce();
  });
});

describe('inactivityState', () => {
  it('actif, avertissement puis verrouillage selon le temps écoulé', () => {
    expect(inactivityState(0)).toBe('active');
    expect(inactivityState(14 * 60 * 1000 - 1)).toBe('active');
    expect(inactivityState(14 * 60 * 1000)).toBe('warning');
    expect(inactivityState(FIFTEEN_MIN - 1)).toBe('warning');
    expect(inactivityState(FIFTEEN_MIN)).toBe('lock');
  });
});

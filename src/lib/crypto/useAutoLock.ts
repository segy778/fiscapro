// Verrouillage automatique après inactivité, avec avertissement préalable.
// SEULEMENT quand le chiffrement est activé et déverrouillé.
//
// Basé sur l'HEURE RÉELLE (Date.now), pas sur la durée de minuteries : un
// `setTimeout` est suspendu ou retardé quand l'appareil se met en veille ou
// que l'onglet est en arrière-plan. Au réveil, les données resteraient
// visibles jusqu'à ce que la minuterie se décide. Ici, le temps écoulé depuis
// la dernière activité est recalculé :
//  - toutes les secondes (vérification périodique);
//  - au retour sur l'onglet ou sur la fenêtre, au réveil d'une page gelée;
//  - à CHAQUE activité, AVANT de la compter : la première activité au réveil
//    verrouille au lieu de prolonger la session.
//
// Deux phases :
//  - 0 → WARNING_MS : l'activité de l'utilisateur réinitialise le compteur.
//  - WARNING_MS → LOCK_MS : un avertissement est affiché. À partir de là, SEUL
//    le clic « Rester connecté » (stayUnlocked) réinitialise; l'activité
//    ordinaire est ignorée. Sans clic, verrouillage à LOCK_MS.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';

export const LOCK_MS = 15 * 60 * 1000;      // verrouillage à 15 min
export const WARNING_MS = 14 * 60 * 1000;   // avertissement à 14 min (1 min avant)
const CHECK_INTERVAL_MS = 1000;

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'] as const;
// Événements de retour : onglet de nouveau visible, fenêtre au premier plan,
// page restaurée du cache ou dégelée.
const RETURN_EVENTS = ['focus', 'pageshow', 'resume'] as const;

export type InactivityState = 'active' | 'warning' | 'lock';

/** État selon le temps écoulé depuis la dernière activité (fonction pure). */
export function inactivityState(elapsedMs: number): InactivityState {
  if (elapsedMs >= LOCK_MS) return 'lock';
  if (elapsedMs >= WARNING_MS) return 'warning';
  return 'active';
}

export interface AutoLockState {
  /** true quand l'avertissement de verrouillage imminent est affiché. */
  warning: boolean;
  /** Réinitialise le compte à rebours (clic « Rester connecté »). */
  stayUnlocked: () => void;
}

export function useAutoLock(): AutoLockState {
  const encryptionEnabled = useFiscalStore((s) => s.encryptionEnabled);
  const needsUnlock = useFiscalStore((s) => s.needsUnlock);
  const lockApp = useFiscalStore((s) => s.lockApp);

  const lastActivity = useRef(Date.now());
  const locked = useRef(false);
  const [warning, setWarning] = useState(false);
  // Ref pour lire l'état d'avertissement dans les écouteurs sans recréer l'effet.
  const warningRef = useRef(false);

  const active = encryptionEnabled && !needsUnlock;

  const showWarning = useCallback((value: boolean) => {
    warningRef.current = value;
    setWarning(value);
  }, []);

  /** Recalcule l'état à partir de l'heure réelle. Retourne true si verrouillé. */
  const check = useCallback((): boolean => {
    if (locked.current) return true;
    const state = inactivityState(Date.now() - lastActivity.current);
    if (state === 'lock') {
      locked.current = true;
      showWarning(false);
      lockApp();
      return true;
    }
    if (state === 'warning' && !warningRef.current) showWarning(true);
    return false;
  }, [lockApp, showWarning]);

  const stayUnlocked = useCallback(() => {
    if (check()) return; // trop tard : déjà verrouillé
    lastActivity.current = Date.now();
    showWarning(false);
  }, [check, showWarning]);

  useEffect(() => {
    if (!active) {
      showWarning(false);
      return;
    }
    locked.current = false;
    lastActivity.current = Date.now();
    showWarning(false);

    // L'activité compte seulement si le délai n'est pas déjà dépassé et que
    // l'avertissement n'est pas affiché.
    const onActivity = () => {
      if (check() || warningRef.current) return;
      lastActivity.current = Date.now();
    };
    const onReturn = () => {
      check();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };

    const timer = setInterval(check, CHECK_INTERVAL_MS);
    for (const evt of ACTIVITY_EVENTS) window.addEventListener(evt, onActivity, { passive: true });
    for (const evt of RETURN_EVENTS) window.addEventListener(evt, onReturn);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('resume', onReturn);

    return () => {
      clearInterval(timer);
      for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, onActivity);
      for (const evt of RETURN_EVENTS) window.removeEventListener(evt, onReturn);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('resume', onReturn);
    };
  }, [active, check, showWarning]);

  return { warning, stayUnlocked };
}

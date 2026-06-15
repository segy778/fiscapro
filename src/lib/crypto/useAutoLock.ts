// Verrouillage automatique après inactivité, avec avertissement préalable.
// SEULEMENT quand le chiffrement est activé et déverrouillé.
//
// Deux phases :
//  - 0 → WARNING_MS : l'activité de l'utilisateur réinitialise le compteur.
//  - WARNING_MS → LOCK_MS : un avertissement est affiché. À partir de là, SEUL
//    le clic « Rester connecté » (stayUnlocked) réinitialise ; l'activité
//    ordinaire est ignorée. Sans clic, verrouillage à LOCK_MS.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';

const LOCK_MS = 15 * 60 * 1000;      // verrouillage à 15 min
const WARNING_MS = 14 * 60 * 1000;   // avertissement à 14 min (1 min avant)

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'] as const;

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

  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [warning, setWarning] = useState(false);
  // Ref pour lire l'état d'avertissement dans les écouteurs sans recréer l'effet.
  const warningRef = useRef(false);
  warningRef.current = warning;

  const active = encryptionEnabled && !needsUnlock;

  // Réinitialise les deux timers et masque l'avertissement.
  const reset = useCallback(() => {
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (lockTimer.current) clearTimeout(lockTimer.current);
    warningRef.current = false;
    setWarning(false);
    warnTimer.current = setTimeout(() => setWarning(true), WARNING_MS);
    lockTimer.current = setTimeout(() => lockApp(), LOCK_MS);
  }, [lockApp]);

  const stayUnlocked = useCallback(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (!active) {
      setWarning(false);
      return;
    }

    // L'activité réinitialise le compteur — MAIS seulement tant que
    // l'avertissement n'est pas affiché (lu via la ref pour ne pas recréer
    // l'effet). Une fois l'avertissement visible, l'activité est ignorée.
    const onActivity = () => {
      if (!warningRef.current) reset();
    };

    reset();
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, onActivity, { passive: true });
    }

    return () => {
      if (warnTimer.current) clearTimeout(warnTimer.current);
      if (lockTimer.current) clearTimeout(lockTimer.current);
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, onActivity);
      }
    };
  }, [active, reset]);

  return { warning, stayUnlocked };
}

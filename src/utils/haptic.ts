import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export type HapticStrength = 'light' | 'medium';

/**
 * Piccola vibrazione al tocco, da usare SOLO sulle icone principali (barra in basso e icone dell'header).
 * - App Android/iOS: usa il plugin nativo di Capacitor (funziona anche nell'APK).
 * - Browser: ripiega su navigator.vibrate, se il dispositivo lo supporta.
 * Non lancia mai errori: se la vibrazione non è disponibile non succede nulla.
 */
export const hapticTap = (strength: HapticStrength = 'light'): void => {
  try {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: strength === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {});
      return;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(strength === 'medium' ? 18 : 10);
    }
  } catch {
    // Vibrazione non disponibile o bloccata: si ignora in silenzio
  }
};

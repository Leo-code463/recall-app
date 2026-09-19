/**
 * Utility to trigger subtle haptic feedback (vibration) on supported devices.
 * Uses the Web Vibration API with safe fallback guards.
 */
export const triggerHaptic = (duration: number = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      // A small vibration gives an elegant, high-end mobile feel
      navigator.vibrate(duration);
    } catch (e) {
      // Fallback silently if blocked or unsupported by browser sandbox
    }
  }
};

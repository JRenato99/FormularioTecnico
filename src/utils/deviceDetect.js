/**
 * Detecta si el dispositivo actual es móvil (celular o tablet).
 * Combina:
 *  - touch points (cubre iPad, Android, Windows touch)
 *  - matchMedia pointer:coarse (más fiable que User-Agent)
 *  - UA fallback para edge cases
 */
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  const hasTouch = (navigator.maxTouchPoints || 0) > 0;
  const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent || '');
  return (hasTouch && coarsePointer) || uaMobile;
};

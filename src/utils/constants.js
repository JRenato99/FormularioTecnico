/**
 * utils/constants.js
 * Concentramos las listas fijas y funciones que comparten los componentes 
 * de Mediciones y Topología para evitar redundancia y mantener limpio el código.
 */

export const UBICACIONES = [
  'Sala', 'Comedor', 'Cocina', 'Baño Principal', 'Baño Visitas', 
  'Habitación Principal', 'Habitación 2', 'Habitación 3', 
  'Estudio', 'Pasadizo', 'Terraza', 'Otro'
];

export const LEYENDA = [
  { color: '#006400', lbl: 'Óptima (≥ -50dBm)', bg: 'rgba(0, 100, 0, 0.1)' },
  { color: '#32CD32', lbl: 'Buena (-51 a -60dBm)', bg: 'rgba(50, 205, 50, 0.1)' },
  { color: '#FFD700', lbl: 'Baja (-61 a -77dBm)', bg: 'rgba(255, 215, 0, 0.1)' },
  { color: '#FF8C00', lbl: 'Débil (-78 a -84dBm)', bg: 'rgba(255, 140, 0, 0.1)' },
  { color: '#FF0000', lbl: 'Fuera de Cobertura (< -84)', bg: 'rgba(255, 0, 0, 0.1)' }
];

/**
 * Función que evalúa un nivel de ruido RSSI y devuelve el estilo asociado
 * y la información de la leyenda.
 * @param {string | number} rssiStr - El valor numérico de la señal
 * @returns {object|null} Objeto con propiedades color, lbl y bg de LEYENDA
 */
export const getRssiStyle = (rssiStr) => {
  if (!rssiStr || isNaN(rssiStr)) return null;
  const rssi = parseFloat(rssiStr);
  if (rssi >= -50) return LEYENDA[0];
  if (rssi >= -60) return LEYENDA[1];
  if (rssi >= -77) return LEYENDA[2];
  if (rssi >= -84) return LEYENDA[3];
  return LEYENDA[4];
};

/**
 * @fileoverview constants.js
 * Concentra las listas maestras predefinidas y las funciones puras utilitarias (Helpers)
 * compartidas a lo largo de los Módulos de Topología y Mediciones.
 * Actúa aislando toda regla dura que no requiera el ecosistema de React para procesarse.
 */

/**
 * @constant {Array<string>} UBICACIONES
 * Diccionario base inmutable que exporta los ambientes naturales de un predio promedio.
 * NOTA: Aunque este array es exportado intacto, los componentes usan State Uplifting
 * para "clonarlo" y añadir posiciones personalizadas al vuelo.
 */
export const UBICACIONES = [
  'Sala', 'Comedor', 'Cocina', 'Baño Principal', 'Baño Visitas', 
  'Habitación Principal', 'Habitación 2', 'Habitación 3', 
  'Estudio', 'Pasadizo', 'Terraza', 'Otro'
];

/**
 * @constant {Array<Object>} LEYENDA
 * Paleta central corporativa y baremos (thresholds) en dBm requeridos para evaluar 
 * las intensidades inalámbricas en una sola fuente de la verdad.
 */
export const LEYENDA = [
  { color: '#006400', lbl: 'Óptima (≥ -50dBm)', bg: 'rgba(0, 100, 0, 0.1)' },
  { color: '#32CD32', lbl: 'Buena (-51 a -60dBm)', bg: 'rgba(50, 205, 50, 0.1)' },
  { color: '#FFD700', lbl: 'Baja (-61 a -77dBm)', bg: 'rgba(255, 215, 0, 0.1)' },
  { color: '#FF8C00', lbl: 'Débil (-78 a -84dBm)', bg: 'rgba(255, 140, 0, 0.1)' },
  { color: '#FF0000', lbl: 'Fuera de Cobertura (< -84)', bg: 'rgba(255, 0, 0, 0.1)' }
];

/**
 * Motor de Evaluación de Señal RSSI
 * Analiza iterativamente un valor numérico dBm comparándolo contra las calidades pactadas
 * de manera matemática en la constante LEYENDA.
 * 
 * @function getRssiStyle
 * @param {string | number} rssiStr - Valor paramétrico recolectado en negativo (ej. "-45" o -45).
 * @returns {object|null} Retorna el objeto estructural `{ color, lbl, bg }` equivalente,
 *                        o nulo si la inyección era alfabética / carente.
 */
export const getRssiStyle = (rssiStr) => {
  if (!rssiStr || isNaN(rssiStr)) return null;
  const rssi = parseFloat(rssiStr);
  
  if (rssi >= -50) return LEYENDA[0];
  if (rssi >= -60) return LEYENDA[1];
  if (rssi >= -77) return LEYENDA[2];
  if (rssi >= -84) return LEYENDA[3];
  return LEYENDA[4]; // Caso por descarte: Menor a -84 (Fuera de cobertura)
};

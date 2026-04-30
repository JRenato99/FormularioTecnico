import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../ui';
import { Plus, Trash2, MapPin, Activity, Wifi, Save, Edit2, ChevronDown, ChevronUp, EyeOff } from 'lucide-react';
import { getRssiStyle } from '../../utils/constants';
import './FormularioMediciones.css';

/**
 * Módulo: Mediciones de Cobertura Wi-Fi
 * Opera bajo la lógica de "Lectura vs Edición" (isSaved).
 * Cada tarjeta puede colapsarse para ahorrar espacio de navegación.
 */
const FormularioMediciones = ({ equipos, mediciones, setMediciones, listaUbicaciones, onAgregarUbicacion }) => {

  /** Controla qué tarjetas están expandidas. Solo las no guardadas siempre abren. */
  const [expandedIds, setExpandedIds] = useState(new Set());
  /** Modo colapso global */
  const [allCollapsed, setAllCollapsed] = useState(false);

  /** Alterna el estado de expansión de una tarjeta individual */
  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Colapsa o expande todas las tarjetas guardadas */
  const toggleAll = () => {
    if (allCollapsed) {
      // Expandir todas
      setExpandedIds(new Set(mediciones.filter(m => m.isSaved).map(m => m.id)));
    } else {
      // Colapsar todas las guardadas
      setExpandedIds(new Set());
    }
    setAllCollapsed(!allCollapsed);
  };

  /**
   * Crea una nueva carta de medición estéril.
   * INGENIERÍA: Utiliza inserción inversa `[nuevaMedicion, ...mediciones]` (unshift paramétrico).
   * Esto garantiza que el nuevo cuarto aparezca en la cima visual, ahorrando al técnico 
   * el esfuerzo de hacer *scroll down* crónico al medir casas muy grandes.
   */
  const addMedicion = () => {
    // Bloqueador de Borradores Pendientes
    const hasUnsaved = mediciones.some(m => !m.isSaved);
    if (hasUnsaved) return alert("Por favor, guarda (💾) la medición que estás editando antes de añadir otra nueva.");

    const nuevaMedicion = {
      id: `MED-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      equipoId: equipos[0]?.id || '', // Auto-asigna a la primera base (ONT por defecto)
      piso: '1',
      ubicacion: 'Sala',
      ubicacionPersonalizada: '',
      lineaVista: 'Si',
      velocidad24g: '',
      rssi24g: '',
      velocidad5g: '',
      rssi5g: '',
      isSaved: false // Candado Lógico: Mientras sea falso, los Inputs son editables con bordes azules.
    };
    setMediciones([nuevaMedicion, ...mediciones]);
  };

  /**
   * Purgador de carta basado en timestamp ID.
   */
  const removeMedicion = (id) => {
    setMediciones(mediciones.filter(m => m.id !== id));
  };

  /**
   * Modificador Atómico Genérico.
   * Evita reescribir docenas de "setters" localizando el ID alterando un campo específico via Computable Props.
   */
  const updateMedicion = (id, field, value) => {
    setMediciones(mediciones.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  // ==========================================
  // BLOQUES DE SANITIZACIÓN AUTOMATIZADA
  // ==========================================

  /**
   * Extractor de Pisos (1-5).
   * Consume RegEx `\D` removiendo carácteres no numéricos (letras, puntos, restas).
   */
  const handlePisoChange = (id, val) => {
    let pStr = val.replace(/\D/g, '');
    if (!pStr) return updateMedicion(id, 'piso', '');
    let p = parseInt(pStr, 10);
    // Compresión Geométrica (Trunca al perímetro legal)
    if (p < 1) p = 1;
    if (p > 5) p = 5;
    updateMedicion(id, 'piso', p.toString());
  };

  /**
   * Modificador ABS para Internet (Mbps).
   * Impide lógicamente la concepción de "Velocidad Negativa (-30 Mbps)"
   */
  const handleVelocidadChange = (id, field, val) => {
    let vStr = val.replace(/\D/g, ''); // RegEx absoluto y limpio
    updateMedicion(id, field, vStr);
  };

  /**
   * Inversor Matemático de Decibelios de Sensibilidad (RSSI dBm).
   */
  const handleRssiChange = (id, field, val) => {
    let vStr = val.replace(/-/g, ''); // Arranca cualquier prefijo tipográfico erróneo manual
    if (!vStr) return updateMedicion(id, field, '');
    let v = parseInt(vStr, 10);
    if (isNaN(v)) return;
    updateMedicion(id, field, `-${Math.abs(v)}`); // Envuelve todo bajo prefijo negativo inamovible
  };

  /**
   * Condensador y Bloqueador de la Carta (Save Event)
   * 1. Verifica campos vitales vacíos.
   * 2. Si es customizado ("Otro"), levanta "hacia el Dashboard" su nombre p/ inyectarlo al general de toda la App.
   * 3. Ancla la propiedad `isSaved: true` volviendo el HTML una placa *ReadOnly*.
   */
  const handleSaveMedicion = (m) => {
    if (!m.piso || (m.ubicacion === 'Otro' && !m.ubicacionPersonalizada)) {
      return alert("Falta piso o nombre del ambiente");
    }
    // Propagación de ubicaciones global por State Uplifting
    if (m.ubicacion === 'Otro') onAgregarUbicacion(m.ubicacionPersonalizada);
    updateMedicion(m.id, 'isSaved', true);
  };

  // ==========================================
  // COMPONENTES AUXILIARES UI
  // ==========================================

  /**
   * Pequeño Tag renderizado sobre la marcha que colorea (Verde/Amarillo/Rojo)
   * el puntaje de señal en milisegundos tras tipearse su `rssiValue`.
   */
  const RssiBadge = ({ rssiValue }) => {
    const styleInfo = getRssiStyle(rssiValue);
    if (!styleInfo) return null;
    return (
      <div className="rssi-evaluation-badge" style={{ borderColor: styleInfo.color, color: styleInfo.color, background: styleInfo.bg }}>
        Evaluación: {styleInfo.lbl}
      </div>
    );
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <div className="form-mediciones-header">
         <div>
          <h2>Mediciones por Ambiente</h2>
          <p className="form-mediciones-subtitle">
            Registra las velocidades en cada habitación del domicilio
            {mediciones.length > 0 && (
              <span style={{ marginLeft: '0.5rem', color: mediciones.length >= 3 ? '#00C853' : '#ffa500', fontWeight: 'bold' }}>
                ({mediciones.filter(m => m.isSaved).length}/{mediciones.length} guardadas)
              </span>
            )}
          </p>
         </div>
         <div style={{ display: 'flex', gap: '0.5rem' }}>
          {mediciones.some(m => m.isSaved) && (
            <Button variant="secondary" onClick={toggleAll} style={{ fontSize: '0.8rem' }}>
              {allCollapsed ? <ChevronDown size={16} /> : <EyeOff size={16} />}
              {allCollapsed ? 'Expandir Todo' : 'Colapsar Todo'}
            </Button>
          )}
          <Button onClick={addMedicion} disabled={equipos.length === 0}>
            <Plus size={18} /> Añadir Medición
          </Button>
         </div>
      </div>

      {equipos.length === 0 && (
        <div className="empty-state-box animate-fade-in">
          <MapPin size={48} className="empty-state-icon" style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Aún no hay equipos configurados</h3>
          <p className="empty-state-text">Agrega la ONT en la sección superior para empezar a registrar ambientes</p>
        </div>
      )}

      {/* RENDERIZADOR DEL ARRAY (De arriba(index 0) hacia abajo) */}
      <div className="mediciones-list">
        {mediciones.map((m, index) => {
          
          // Alias booleano que apaga los 'Input' si la medición está salvaguardada en disco lógico.
          const readonly = m.isSaved;

          return (
            <Card key={m.id} className="medicion-card animate-fade-in" style={{ opacity: readonly ? 0.9 : 1, borderLeft: readonly ? '4px solid var(--win-orange)' : '1px solid var(--border-color)' }}>
              
              <div className="medicion-del-btn-container" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {/* Botón colapsar/expandir (solo para tarjetas guardadas) */}
                {readonly && (
                  <button className="medicion-del-btn" onClick={() => toggleExpand(m.id)} title={expandedIds.has(m.id) ? 'Colapsar' : 'Expandir'}>
                    {expandedIds.has(m.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                )}
                {readonly ? (
                  <button className="medicion-del-btn" style={{ color: 'var(--win-blue-light)' }} onClick={() => { updateMedicion(m.id, 'isSaved', false); setExpandedIds(p => { const n = new Set(p); n.add(m.id); return n; }); }} title="Editar medición">
                    <Edit2 size={20} />
                  </button>
                ) : (
                  <button className="medicion-del-btn" style={{ color: 'var(--win-orange)' }} onClick={() => handleSaveMedicion(m)} title="Guardar medición">
                    <Save size={20} />
                  </button>
                )}
                <button className="medicion-del-btn" onClick={() => removeMedicion(m.id)} title="Eliminar registro">
                  <Trash2 size={20} />
                </button>
              </div>

              <h4 className="medicion-card-title">
                <span className="medicion-index-badge">{mediciones.length - index}</span>
                {readonly ? `Ambiente: ${m.ubicacion === 'Otro' ? m.ubicacionPersonalizada : m.ubicacion}` : 'Nuevo Registro'}
                {readonly && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    2.4G: {m.rssi24g || '--'} | 5G: {m.rssi5g || '--'} dBm
                  </span>
                )}
              </h4>

              {/* Contenido colapsable: oculto si está guardado y NO expandido */}
              {(!readonly || expandedIds.has(m.id)) && (
              <>
              <div className="medicion-fields-grid">
                <Select 
                  label="Conectado a:" 
                  value={m.equipoId}
                  onChange={e => updateMedicion(m.id, 'equipoId', e.target.value)}
                  options={equipos.map(e => ({ label: `${e.nombre} (${e.ambienteFinal})`, value: e.id }))}
                  disabled={readonly} // Si readonly=true, este combobox no despliega ni captura eventos.
                />
                <Input 
                  label="Piso" 
                  type="number"
                  placeholder="1 a 5" 
                  value={m.piso}
                  onChange={e => handlePisoChange(m.id, e.target.value)}
                  disabled={readonly}
                />
                <Select 
                  label="Ambiente donde se mide" 
                  value={m.ubicacion}
                  onChange={e => updateMedicion(m.id, 'ubicacion', e.target.value)}
                  options={listaUbicaciones.map(u => ({ label: u, value: u }))}
                  disabled={readonly}
                />
                {m.ubicacion === 'Otro' && (
                  <Input 
                    label="Nombre del Ambiente" 
                    placeholder="Ej. Cuarto de Visitas"
                    value={m.ubicacionPersonalizada}
                    onChange={e => updateMedicion(m.id, 'ubicacionPersonalizada', e.target.value)}
                    disabled={readonly}
                  />
                )}
                <Select 
                  label="Línea de Vista (LOS)" 
                  value={m.lineaVista}
                  onChange={e => updateMedicion(m.id, 'lineaVista', e.target.value)}
                  options={[
                    { label: 'Sí (Abierto)', value: 'Si' },
                    { label: 'No (Obstáculos)', value: 'No' }
                  ]}
                  disabled={readonly}
                />
              </div>

              <div className="medicion-bottom-sections">
                <div className="medicion-bottom-col border-right">
                  <h5 className="medicion-section-title">
                    <Wifi size={16} /> Banda 2.4 GHz
                  </h5>
                  <div className="medicion-data-grid">
                     <Input 
                      label="Velocidad (Mbps)" 
                      type="number"
                      placeholder="Ej: 80" 
                      value={m.velocidad24g}
                      onChange={e => handleVelocidadChange(m.id, 'velocidad24g', e.target.value)}
                      disabled={readonly}
                    />
                    <div className="rssi-input-group">
                      <Input 
                        label="RSSI (dBm)" 
                        type="number"
                        placeholder="Se restará: Ej: 50 a -50" 
                        value={m.rssi24g}
                        onChange={e => handleRssiChange(m.id, 'rssi24g', e.target.value)}
                        disabled={readonly}
                      />
                      {m.rssi24g && <RssiBadge rssiValue={m.rssi24g} />}
                    </div>
                  </div>
                </div>

                <div className="medicion-bottom-col">
                  <h5 className="medicion-section-title">
                    <Activity size={16} /> Banda 5 GHz
                  </h5>
                  <div className="medicion-data-grid">
                    <Input 
                      label="Velocidad (Mbps)" 
                      type="number"
                      placeholder="Ej: 300" 
                      value={m.velocidad5g}
                      onChange={e => handleVelocidadChange(m.id, 'velocidad5g', e.target.value)}
                      disabled={readonly}
                    />
                    <div className="rssi-input-group">
                      <Input 
                        label="RSSI (dBm)" 
                        type="number"
                        placeholder="Ej: 60" 
                        value={m.rssi5g}
                        onChange={e => handleRssiChange(m.id, 'rssi5g', e.target.value)}
                        disabled={readonly}
                      />
                      {m.rssi5g && <RssiBadge rssiValue={m.rssi5g} />}
                    </div>
                  </div>
                </div>
              </div>

              </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default FormularioMediciones;

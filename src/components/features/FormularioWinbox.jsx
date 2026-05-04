import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../ui';
import { Plus, Trash2, Tv, Save, Edit2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { getRssiStyle } from '../../utils/constants';
import { useUI } from '../ui/Modal.jsx';

/**
 * Componente Registrador de Dispositivos WINBOX (TV)
 * Funciona de manera atómica, gestionando hasta 4 decodificadores WINBOX
 * por orden, atándolos a un equipo Padre localizando si usa Wi-Fi o Cable.
 */
const FormularioWinbox = ({ equipos, winboxes, setWinboxes, listaUbicaciones, onAgregarUbicacion }) => {
  const { showToast } = useUI();
  const [allCollapsed, setAllCollapsed] = useState(false);
  const toggleAll = () => setAllCollapsed(!allCollapsed);

  const addWinbox = () => {
    if (winboxes.length >= 4) return showToast({ type: 'warning', title: 'Límite alcanzado', message: 'Has alcanzado el límite máximo de 4 WINBOX.' });
    
    // Bloqueador de Borradores Pendientes
    const hasUnsaved = winboxes.some(w => !w.isSaved);
    if (hasUnsaved) return showToast({ type: 'warning', title: 'Winbox pendiente', message: 'Por favor, guarda (💾) el Winbox que estás editando antes de añadir otro nuevo.' });

    const nuevo = {
      id: `WB-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      serialNumber: '',
      equipoId: equipos[0]?.id || '',
      ubicacion: 'Sala',
      ubicacionPersonalizada: '',
      modoConexion: 'Cableado', // Cableado | Inalámbrico
      bandaWifi: '5G', // Novedad: Selector 2.4G / 5G
      velocidad: '',
      rssi: '',
      isSaved: false
    };
    setWinboxes([nuevo, ...winboxes]); // Inyección inicial arriba
  };

  const removeWinbox = (id) => {
    setWinboxes(winboxes.filter(w => w.id !== id));
  };

  const updateWinbox = (id, field, value) => {
    setWinboxes(winboxes.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  const handleVelocidadChange = (id, val) => {
    let vStr = val.replace(/\D/g, ''); 
    updateWinbox(id, 'velocidad', vStr);
  };

  const handleRssiChange = (id, val) => {
    let vStr = val.replace(/-/g, '');
    if (!vStr) return updateWinbox(id, 'rssi', '');
    let v = parseInt(vStr, 10);
    if (isNaN(v)) return;
    updateWinbox(id, 'rssi', `-${Math.abs(v)}`);
  };

  const handleSaveWinbox = (w) => {
    if (!w.serialNumber) return showToast({ type: 'error', title: 'S/N Faltante', message: 'Falta ingresar el número de serie (S/N) del WINBOX.' });
    if (w.ubicacion === 'Otro' && !w.ubicacionPersonalizada) return showToast({ type: 'error', title: 'Ambiente Faltante', message: 'Falta ingresar nombre de ambiente manual.' });
    
    // Condicional Fuerte para Wi-Fi
    if (w.modoConexion === 'Inalámbrico') {
      if (!w.rssi || !w.velocidad) return showToast({ type: 'warning', title: 'Datos incompletos', message: 'Un Winbox inalámbrico exige registrar obligatoriamente Mbps y RSSI.' });
      
      // La banda de 5GHz corta automáticamente si es peor a -60 dBm
      if (w.bandaWifi === '5G' && parseInt(w.rssi) < -60) {
        return showToast({ type: 'error', title: 'Rechazo de Calidad', message: 'El Winbox en conexión 5GHz no debe estar por debajo de -60 dBm para evitar cortes.' });
      }
      
      // NOTA: En la banda 2.4GHz hay flexibilidad y advertencia pasiva, permitiendo Grabar la medición.
    }

    if (w.ubicacion === 'Otro') onAgregarUbicacion(w.ubicacionPersonalizada);
    updateWinbox(w.id, 'isSaved', true);
  };

  const RssiBadge = ({ rssiValue }) => {
    const styleInfo = getRssiStyle(rssiValue);
    if (!styleInfo) return null;
    return (
      <div className="rssi-evaluation-badge" style={{ borderColor: styleInfo.color, color: styleInfo.color, background: styleInfo.bg, marginTop: '0.5rem' }}>
        Evaluación: {styleInfo.lbl}
      </div>
    );
  };

  return (
    <div style={{ marginTop: '2.5rem', marginBottom: '1rem' }}>
      <div className="form-mediciones-header">
         <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--win-orange)' }}>
            <Tv size={24} /> Despliegue WINBOX
          </h2>
          <p className="form-mediciones-subtitle">Registra hasta 4 decodificadores anexados al servicio.</p>
         </div>
         <div style={{ display: 'flex', gap: '0.5rem' }}>
           {winboxes.some(w => w.isSaved) && (
             <Button variant="secondary" onClick={toggleAll} style={{ fontSize: '0.8rem' }}>
               {allCollapsed ? <Eye size={16} /> : <EyeOff size={16} />}
               {allCollapsed ? 'Expandir Todo' : 'Colapsar Todo'}
             </Button>
           )}
           <Button onClick={addWinbox} disabled={equipos.length === 0 || winboxes.length >= 4}>
             <Plus size={18} /> Añadir Winbox ({winboxes.length}/4)
           </Button>
         </div>
      </div>

      <div className="mediciones-list">
        {winboxes.map((w, index) => {
          const readonly = w.isSaved;

          return (
            <Card key={w.id} className="medicion-card animate-fade-in" style={{ opacity: readonly ? 0.9 : 1, borderLeft: readonly ? '4px solid var(--win-orange)' : '1px solid var(--border-color)' }}>
              
              <div className="medicion-del-btn-container" style={{ display: 'flex', gap: '0.5rem' }}>
                {readonly ? (
                  <button className="medicion-del-btn" style={{ color: 'var(--text-secondary)' }} onClick={() => updateWinbox(w.id, 'isSaved', false)} title="Editar WINBOX">
                    <Edit2 size={20} />
                  </button>
                ) : (
                  <button className="medicion-del-btn" style={{ color: 'var(--win-orange)' }} onClick={() => handleSaveWinbox(w)} title="Guardar WINBOX">
                    <Save size={20} />
                  </button>
                )}
                <button className="medicion-del-btn" onClick={() => removeWinbox(w.id)} title="Borrar WINBOX">
                  <Trash2 size={20} />
                </button>
              </div>

              <h4 className="medicion-card-title">
                <span className="medicion-index-badge" style={{background: 'var(--text-secondary)'}}>WB</span>
                {readonly ? `S/N: ${w.serialNumber} (${w.ubicacion === 'Otro' ? w.ubicacionPersonalizada : w.ubicacion})` : 'Nuevo WINBOX'}
              </h4>

              {(!readonly || !allCollapsed) && (
              <>
              <div className="medicion-fields-grid">
                <Input 
                  label="Serial Number (S/N) (*)" 
                  placeholder="Ej: WINBOX-XX123" 
                  value={w.serialNumber}
                  onChange={e => updateWinbox(w.id, 'serialNumber', e.target.value.toUpperCase())}
                  disabled={readonly}
                />
                
                <Select 
                  label="Ambiente Instalado" 
                  value={w.ubicacion}
                  onChange={e => updateWinbox(w.id, 'ubicacion', e.target.value)}
                  options={listaUbicaciones.map(u => ({ label: u, value: u }))}
                  disabled={readonly}
                />
                
                {w.ubicacion === 'Otro' && (
                  <Input 
                    label="Nombre Ambiente" 
                    placeholder="Ej. Cuarto de Juegos"
                    value={w.ubicacionPersonalizada}
                    onChange={e => updateWinbox(w.id, 'ubicacionPersonalizada', e.target.value)}
                    disabled={readonly}
                  />
                )}

                <Select 
                  label="Conectado al equipo:" 
                  value={w.equipoId}
                  onChange={e => updateWinbox(w.id, 'equipoId', e.target.value)}
                  options={equipos.map(e => ({ label: `${e.nombre} (${e.ambienteFinal})`, value: e.id }))}
                  disabled={readonly}
                />
                
                <Select 
                  label="Modo de Conexión" 
                  value={w.modoConexion}
                  onChange={e => updateWinbox(w.id, 'modoConexion', e.target.value)}
                  options={[
                    { label: 'Cableada (Ethernet)', value: 'Cableado' },
                    { label: 'Inalámbrica (Wi-Fi)', value: 'Inalámbrico' }
                  ]}
                  disabled={readonly}
                />
              </div>

              {w.modoConexion === 'Inalámbrico' && (
                <div style={{ marginTop: '1.5rem', background: 'rgba(255, 171, 0, 0.05)', border: '1px dashed rgba(255, 171, 0, 0.5)', padding: '1.5rem', borderRadius: '8px' }}>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <Select 
                      label="Banda Wi-Fi" 
                      value={w.bandaWifi}
                      onChange={e => updateWinbox(w.id, 'bandaWifi', e.target.value)}
                      options={[
                        { label: '5 GHz (Recomendado)', value: '5G' },
                        { label: '2.4 GHz', value: '2.4G' }
                      ]}
                      disabled={readonly}
                    />
                  </div>

                  {w.bandaWifi === '5G' ? (
                     <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', color: '#ffb100' }}>
                        <AlertTriangle size={24} style={{flexShrink: 0}} />
                        <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>
                          <strong>Requerimiento Estricto (5G):</strong> Hacer la medición <u>exactamente al lado del WINBOX</u>. 
                          La señal resultante no debe ser menor a -60 dBm.
                        </p>
                     </div>
                  ) : (
                     <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', color: '#ff7300' }}>
                        <AlertTriangle size={24} style={{flexShrink: 0}} />
                        <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>
                          <strong>Advertencia de Calidad:</strong> Para mantener una óptima experiencia visual con el servicio, 
                          se exhorta a conectar el decodificador a la red 5GHz si es posible.
                        </p>
                     </div>
                  )}

                  <div className="medicion-data-grid">
                     <Input 
                      label="Velocidad (Mbps) (*)" 
                      type="number"
                      placeholder="Ej: 150" 
                      value={w.velocidad}
                      onChange={e => handleVelocidadChange(w.id, e.target.value)}
                      disabled={readonly}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <Input 
                        label={`RSSI ${w.bandaWifi} (dBm) (*)`} 
                        type="number"
                        placeholder="Ej: -55" 
                        value={w.rssi}
                        onChange={e => handleRssiChange(w.id, e.target.value)}
                        disabled={readonly}
                      />
                      {w.rssi && <RssiBadge rssiValue={w.rssi} />}
                    </div>
                  </div>
                </div>
              )}
              </>
              )}

            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default FormularioWinbox;

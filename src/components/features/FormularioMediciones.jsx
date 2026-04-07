import React from 'react';
import { Card, Button, Input, Select } from '../ui';
import { Plus, Trash2, MapPin, Activity, Wifi, Save, Edit2 } from 'lucide-react';
import { getRssiStyle } from '../../utils/constants';
import './FormularioMediciones.css';

const FormularioMediciones = ({ equipos, mediciones, setMediciones, listaUbicaciones, onAgregarUbicacion }) => {

  // Crear una nueva medición insertándola al INICIO de la lista
  const addMedicion = () => {
    const nuevaMedicion = {
      id: Date.now().toString(),
      equipoId: equipos[0]?.id || '', // Por defecto el primero (ONT orginalmente)
      piso: '1',
      ubicacion: 'Sala',
      ubicacionPersonalizada: '',
      lineaVista: 'Si',
      velocidad24g: '',
      rssi24g: '',
      velocidad5g: '',
      rssi5g: '',
      isSaved: false // Estado de protección anti-edición
    };
    setMediciones([nuevaMedicion, ...mediciones]);
  };

  const removeMedicion = (id) => {
    setMediciones(mediciones.filter(m => m.id !== id));
  };

  const updateMedicion = (id, field, value) => {
    setMediciones(mediciones.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handlePisoChange = (id, val) => {
    let pStr = val.replace(/\D/g, '');
    if (!pStr) return updateMedicion(id, 'piso', '');
    let p = parseInt(pStr, 10);
    if (p < 1) p = 1;
    if (p > 5) p = 5;
    updateMedicion(id, 'piso', p.toString());
  };

  const handleVelocidadChange = (id, field, val) => {
    let vStr = val.replace(/\D/g, ''); // Sin negativos
    updateMedicion(id, field, vStr);
  };

  const handleRssiChange = (id, field, val) => {
    let vStr = val.replace(/-/g, ''); // Remover guiones tipográficos si hay
    if (!vStr) return updateMedicion(id, field, '');
    let v = parseInt(vStr, 10);
    if (isNaN(v)) return;
    updateMedicion(id, field, `-${Math.abs(v)}`);
  };

  const handleSaveMedicion = (m) => {
    if (!m.piso || (m.ubicacion === 'Otro' && !m.ubicacionPersonalizada)) {
      return alert("Falta piso o nombre del ambiente");
    }
    // Propagación de ubicaciones global
    if (m.ubicacion === 'Otro') onAgregarUbicacion(m.ubicacionPersonalizada);
    updateMedicion(m.id, 'isSaved', true);
  };

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
          <p className="form-mediciones-subtitle">Registra las velocidades en cada habitación del domicilio</p>
         </div>
         <Button onClick={addMedicion} disabled={equipos.length === 0}>
           <Plus size={18} /> Añadir Ambiente
         </Button>
      </div>

      {equipos.length === 0 && (
        <div className="empty-state-box animate-fade-in">
          <MapPin size={48} className="empty-state-icon" style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Aún no hay equipos configurados</h3>
          <p className="empty-state-text">Agrega la ONT en la sección superior para empezar a registrar ambientes</p>
        </div>
      )}

      <div className="mediciones-list">
        {mediciones.map((m, index) => {
          const readonly = m.isSaved;

          return (
            <Card key={m.id} className="medicion-card animate-fade-in" style={{ opacity: readonly ? 0.9 : 1, borderLeft: readonly ? '4px solid var(--win-orange)' : '1px solid var(--border-color)' }}>
              
              <div className="medicion-del-btn-container" style={{ display: 'flex', gap: '0.5rem' }}>
                {readonly ? (
                  <button className="medicion-del-btn" style={{ color: 'var(--win-blue-light)' }} onClick={() => updateMedicion(m.id, 'isSaved', false)} title="Editar medición">
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
              </h4>

              <div className="medicion-fields-grid">
                <Select 
                  label="Conectado a:" 
                  value={m.equipoId}
                  onChange={e => updateMedicion(m.id, 'equipoId', e.target.value)}
                  options={equipos.map(e => ({ label: `${e.nombre} (${e.ambienteFinal})`, value: e.id }))}
                  disabled={readonly}
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

            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default FormularioMediciones;

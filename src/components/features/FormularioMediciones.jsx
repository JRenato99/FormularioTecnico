import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../ui';
import { Plus, Trash2, Home, Activity } from 'lucide-react';
import './FormularioMediciones.css';

const UBICACIONES = [
  'Sala', 'Comedor', 'Cocina', 'Baño Principal', 'Baño Visitas', 
  'Habitación Principal', 'Habitación 2', 'Habitación 3', 
  'Estudio', 'Pasadizo', 'Terraza', 'Otro'
];

/**
 * Componente FormularioMediciones
 * Aquí el técnico irá registrando cada cuarto/ambiente de la casa.
 * Además, asocia el ambiente al equipo emisor e indica cómo llega la señal.
 */
const FormularioMediciones = ({ equipos }) => {
  const [mediciones, setMediciones] = useState([]);

  // Crear una nueva medición vacía en la lista
  const addMedicion = () => {
    setMediciones([...mediciones, {
      id: Date.now(),
      ubicacion: 'Sala',
      ubicacionPersonalizada: '',
      piso: '1',
      equipoId: 'ONT',
      rssi24g: '',
      rssi5g: ''
    }]);
  };

  // Actualizar un campo específico de una medición por su ID
  const updateMedicion = (id, field, value) => {
    setMediciones(mediciones.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeMedicion = (id) => {
    setMediciones(mediciones.filter(m => m.id !== id));
  };

  return (
    <Card>
      
      {/* Cabecera del formulario con botón de acción global */}
      <div className="form-mediciones-header">
        <div>
          <h2>Mediciones por Ambiente</h2>
          <p className="form-mediciones-subtitle">Registra los niveles de señal en cada zona de la casa.</p>
        </div>
        <Button onClick={addMedicion}>
          <Plus size={18} /> Agregar Ambiente
        </Button>
      </div>

      {/* Pantalla vacía cuando no hay mediciones aún */}
      {mediciones.length === 0 ? (
        <div className="empty-state-box">
          <Home size={48} color="var(--text-muted)" className="empty-state-icon" />
          <p className="empty-state-text">Aún no has registrado ninguna medición.</p>
        </div>
      ) : (
        
        /* Contenedor principal de la lista iterativa */
        <div className="mediciones-list">
          {mediciones.map((med, index) => (
            
            /* Tarjeta individual de medición con glassmorphism generalizado */
            <div key={med.id} className="glass-panel animate-fade-in medicion-card">
              
              <div className="medicion-del-btn-container">
                <button onClick={() => removeMedicion(med.id)} className="medicion-del-btn">
                  <Trash2 size={20} />
                </button>
              </div>

              <h4 className="medicion-card-title">
                <span className="medicion-index-badge">
                  {index + 1}
                </span>
                Detalle del Ambiente
              </h4>
              
              <div className="medicion-fields-grid">
                <Select 
                  label="Ubicación" 
                  value={med.ubicacion}
                  onChange={e => updateMedicion(med.id, 'ubicacion', e.target.value)}
                  options={UBICACIONES.map(u => ({ label: u, value: u }))}
                />
                
                {med.ubicacion === 'Otro' && (
                  <Input 
                    label="Nombre del Ambiente" 
                    placeholder="Ej. Sótano"
                    value={med.ubicacionPersonalizada}
                    onChange={e => updateMedicion(med.id, 'ubicacionPersonalizada', e.target.value)}
                  />
                )}

                <Input 
                  label="Piso" 
                  type="number"
                  placeholder="Ej. 1"
                  value={med.piso}
                  onChange={e => updateMedicion(med.id, 'piso', e.target.value)}
                />

                <Select 
                  label="Equipo que da servicio aquí" 
                  value={med.equipoId}
                  onChange={e => updateMedicion(med.id, 'equipoId', e.target.value)}
                  options={equipos.map(e => ({ label: e.nombre, value: e.id }))}
                />
              </div>

              {/* Sub-sección específica para RSSI de este ambiente */}
              <div className="medicion-rssi-section">
                <p className="medicion-rssi-title">
                  <Activity size={16} /> Mediciones Sensoriales RSSI (dBm)
                </p>
                <div className="medicion-rssi-grid">
                   <Input 
                    label="Señal 2.4 GHz" 
                    type="number"
                    placeholder="Ej. -45"
                    value={med.rssi24g}
                    onChange={e => updateMedicion(med.id, 'rssi24g', e.target.value)}
                  />
                   <Input 
                    label="Señal 5 GHz" 
                    type="number"
                    placeholder="Ej. -50"
                    value={med.rssi5g}
                    onChange={e => updateMedicion(med.id, 'rssi5g', e.target.value)}
                  />
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default FormularioMediciones;

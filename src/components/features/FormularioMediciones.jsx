import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../ui';
import { Plus, Trash2, Home, Activity } from 'lucide-react';

const UBICACIONES = [
  'Sala', 'Comedor', 'Cocina', 'Baño Principal', 'Baño Visitas', 
  'Habitación Principal', 'Habitación 2', 'Habitación 3', 
  'Estudio', 'Pasadizo', 'Terraza', 'Otro'
];

const FormularioMediciones = ({ equipos }) => {
  const [mediciones, setMediciones] = useState([]);

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

  const updateMedicion = (id, field, value) => {
    setMediciones(mediciones.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeMedicion = (id) => {
    setMediciones(mediciones.filter(m => m.id !== id));
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Mediciones por Ambiente</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Registra los niveles de señal en cada zona de la casa.</p>
        </div>
        <Button onClick={addMedicion}>
          <Plus size={18} /> Agregar Ambiente
        </Button>
      </div>

      {mediciones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <Home size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Aún no has registrado ninguna medición.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {mediciones.map((med, index) => (
            <div key={med.id} className="glass-panel animate-fade-in" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', position: 'relative' }}>
              
              <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
                <button onClick={() => removeMedicion(med.id)} style={{ color: 'var(--error)', background: 'transparent' }}>
                  <Trash2 size={20} />
                </button>
              </div>

              <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ 
                  background: 'var(--win-orange)', color: 'white', width: '24px', height: '24px', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem'
                }}>
                  {index + 1}
                </span>
                Detalle del Ambiente
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
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

              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={16} /> Mediciones RSSI (dBm)
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                   <Input 
                    label="Señal 2.4 GHz" 
                    type="number"
                    placeholder="-45"
                    value={med.rssi24g}
                    onChange={e => updateMedicion(med.id, 'rssi24g', e.target.value)}
                  />
                   <Input 
                    label="Señal 5 GHz" 
                    type="number"
                    placeholder="-50"
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

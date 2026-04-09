import React from 'react';
import { Card, Button, Input, Select } from '../ui';
import { Plus, Trash2, MonitorPlay, Save, Edit2 } from 'lucide-react';

/**
 * Módulo Registrador de APP WINTV (Servicio Streaming)
 * Se enfoca exclusivamente en la captura de perfiles de Smart TVs
 * de los clientes, mapeando las marcas y su acceso a la red interna.
 */
const FormularioWintv = ({ televisores, setTelevisores, listaUbicaciones, onAgregarUbicacion }) => {

  const MARCAS_TV = [
    'Samsung', 'LG', 'Sony', 'Hisense', 'Xiaomi', 'TCL', 'Philips', 'AOC', 'Panasonic', 'Otro'
  ];

  const addTelevisor = () => {
    // Bloqueador de Borradores Pendientes
    const hasUnsaved = televisores.some(t => !t.isSaved);
    if (hasUnsaved) return alert("Por favor, guarda (💾) la TV que estás editando antes de añadir otro registro.");

    const nuevo = {
      id: Date.now().toString(),
      ubicacion: 'Sala',
      ubicacionPersonalizada: '',
      marca: 'Samsung',
      marcaPersonalizada: '',
      modelo: '',
      modoConexion: 'Inalámbrico 5G', // Cableado Ethernet | Inalámbrico 5G | Inalámbrico 2.4G
      isSaved: false
    };
    setTelevisores([nuevo, ...televisores]);
  };

  const removeTelevisor = (id) => {
    setTelevisores(televisores.filter(t => t.id !== id));
  };

  const updateTelevisor = (id, field, value) => {
    setTelevisores(televisores.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSaveTelevisor = (t) => {
    if (t.ubicacion === 'Otro' && !t.ubicacionPersonalizada) return alert("Falta ingresar el nombre manual del ambiente.");
    if (t.marca === 'Otro' && !t.marcaPersonalizada) return alert("Debes detallar la marca de esta TV.");
    if (!t.modelo.trim()) return alert("El Modelo exacto del TV es obligatorio para el reporte.");

    if (t.ubicacion === 'Otro') onAgregarUbicacion(t.ubicacionPersonalizada);
    updateTelevisor(t.id, 'isSaved', true);
  };

  return (
    <div style={{ marginTop: '2.5rem', marginBottom: '1rem' }}>
      <div className="form-mediciones-header">
         <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--win-blue-light, #00A3FF)' }}>
            <MonitorPlay size={24} /> Configuración WINTV
          </h2>
          <p className="form-mediciones-subtitle">Registra las pantallas Smart TV que usarán la aplicación corporativa de WinTV.</p>
         </div>
         <Button 
            onClick={addTelevisor} 
            style={{ background: 'var(--win-blue-light, #00A3FF)' }}
         >
           <Plus size={18} /> Añadir Televisor WINTV
         </Button>
      </div>

      <div className="mediciones-list">
        {televisores.length === 0 && (
           <div className="empty-state-box animate-fade-in" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center', opacity: 0.6 }}>
             <i>No has registrado ningún televisor usando WINTV. Presiona el botón añadir.</i>
           </div>
        )}

        {televisores.map((t, index) => {
          const readonly = t.isSaved;

          return (
            <Card key={t.id} className="medicion-card animate-fade-in" style={{ opacity: readonly ? 0.9 : 1, borderLeft: readonly ? '4px solid var(--win-blue-light, #00A3FF)' : '1px solid var(--border-color)' }}>
              
              <div className="medicion-del-btn-container" style={{ display: 'flex', gap: '0.5rem' }}>
                {readonly ? (
                  <button className="medicion-del-btn" style={{ color: 'var(--text-secondary)' }} onClick={() => updateTelevisor(t.id, 'isSaved', false)} title="Editar Pantalla">
                    <Edit2 size={20} />
                  </button>
                ) : (
                  <button className="medicion-del-btn" style={{ color: 'var(--win-blue-light, #00A3FF)' }} onClick={() => handleSaveTelevisor(t)} title="Guardar Registro WINTV">
                    <Save size={20} />
                  </button>
                )}
                <button className="medicion-del-btn" onClick={() => removeTelevisor(t.id)} title="Borrar Registro">
                  <Trash2 size={20} />
                </button>
              </div>

              <h4 className="medicion-card-title">
                <span className="medicion-index-badge" style={{background: 'var(--text-secondary)'}}>TV</span>
                {readonly ? `Pantalla: ${t.marca === 'Otro' ? t.marcaPersonalizada : t.marca} (${t.ubicacion === 'Otro' ? t.ubicacionPersonalizada : t.ubicacion})` : 'Nueva Televisión WINTV'}
              </h4>

              <div className="medicion-fields-grid">
                
                <Select 
                  label="Ambiente Instalado" 
                  value={t.ubicacion}
                  onChange={e => updateTelevisor(t.id, 'ubicacion', e.target.value)}
                  options={listaUbicaciones.map(u => ({ label: u, value: u }))}
                  disabled={readonly}
                />
                
                {t.ubicacion === 'Otro' && (
                  <Input 
                    label="Nombre Ambiente" 
                    placeholder="Ej. Cuarto de Juegos"
                    value={t.ubicacionPersonalizada}
                    onChange={e => updateTelevisor(t.id, 'ubicacionPersonalizada', e.target.value)}
                    disabled={readonly}
                  />
                )}

                <Select 
                  label="Marca del Televisor (*)" 
                  value={t.marca}
                  onChange={e => updateTelevisor(t.id, 'marca', e.target.value)}
                  options={MARCAS_TV.map(m => ({ label: m, value: m }))}
                  disabled={readonly}
                />

                {t.marca === 'Otro' && (
                  <Input 
                    label="Especifique Marca" 
                    placeholder="Ej: JVC / Vizio"
                    value={t.marcaPersonalizada}
                    onChange={e => updateTelevisor(t.id, 'marcaPersonalizada', e.target.value)}
                    disabled={readonly}
                  />
                )}

                <Input 
                  label="Modelo Específico (*)" 
                  placeholder="Ej: OLED65C1PUB"
                  value={t.modelo}
                  onChange={e => updateTelevisor(t.id, 'modelo', e.target.value)}
                  disabled={readonly}
                />
                
                <Select 
                  label="Tipo de Conexión de Red" 
                  value={t.modoConexion}
                  onChange={e => updateTelevisor(t.id, 'modoConexion', e.target.value)}
                  options={[
                    { label: 'Cableado (Ethernet)', value: 'Cableado' },
                    { label: 'Inalámbrico (Wi-Fi 5G)', value: 'Inalámbrico 5G' },
                    { label: 'Inalámbrico (Wi-Fi 2.4G)', value: 'Inalámbrico 2.4G' }
                  ]}
                  disabled={readonly}
                />

              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default FormularioWintv;

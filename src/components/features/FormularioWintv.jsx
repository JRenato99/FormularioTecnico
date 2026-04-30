import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../ui';
import { Plus, Trash2, MonitorPlay, Save, Edit2, ChevronDown, ChevronUp, EyeOff, AlertTriangle } from 'lucide-react';

/**
 * Módulo: Registro de Smart TVs (Servicio WinTV)
 * - Campo Modelo es opcional (se exporta como null si se deja en blanco).
 * - Alerta cuando el modo de conexión es 2.4G.
 * - Lista colapsable para mejorar la navegación.
 */
const FormularioWintv = ({ televisores, setTelevisores, listaUbicaciones, onAgregarUbicacion }) => {

  const [expandedIds, setExpandedIds] = useState(new Set());
  const [allCollapsed, setAllCollapsed] = useState(false);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allCollapsed) setExpandedIds(new Set(televisores.filter(t => t.isSaved).map(t => t.id)));
    else setExpandedIds(new Set());
    setAllCollapsed(!allCollapsed);
  };

  const MARCAS_TV = [
    'Samsung', 'LG', 'Sony', 'Hisense', 'Xiaomi', 'TCL', 'Philips', 'AOC', 'Panasonic', 'Otro'
  ];

  const addTelevisor = () => {
    // Bloqueador de Borradores Pendientes
    const hasUnsaved = televisores.some(t => !t.isSaved);
    if (hasUnsaved) return alert("Por favor, guarda (💾) la TV que estás editando antes de añadir otro registro.");

    const nuevo = {
      id: `TV-${Date.now()}-${Math.random().toString(36).substring(7)}`,
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
    if (t.ubicacion === 'Otro' && !t.ubicacionPersonalizada) return alert('Falta ingresar el nombre manual del ambiente.');
    if (t.marca === 'Otro' && !t.marcaPersonalizada) return alert('Debes detallar la marca de esta TV.');
    // Modelo es OPCIONAL: si está vacío se guarda como null.
    const modeloFinal = t.modelo?.trim() || null;
    if (t.ubicacion === 'Otro') onAgregarUbicacion(t.ubicacionPersonalizada);
    updateTelevisor(t.id, 'modelo', modeloFinal);
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
         <div style={{ display: 'flex', gap: '0.5rem' }}>
           {televisores.some(t => t.isSaved) && (
             <Button variant="secondary" onClick={toggleAll} style={{ fontSize: '0.8rem' }}>
               {allCollapsed ? <ChevronDown size={16} /> : <EyeOff size={16} />}
               {allCollapsed ? 'Expandir Todo' : 'Colapsar Todo'}
             </Button>
           )}
           <Button onClick={addTelevisor} style={{ background: 'var(--win-blue-light, #00A3FF)' }}>
             <Plus size={18} /> Añadir Televisor WINTV
           </Button>
         </div>
      </div>

      <div className="mediciones-list">
        {televisores.length === 0 && (
           <div className="empty-state-box animate-fade-in" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center', opacity: 0.6 }}>
             <i>No has registrado ningún televisor usando WINTV. Presiona el botón añadir.</i>
           </div>
        )}

        {televisores.map((t, index) => {
          const readonly = t.isSaved;
          const isExpanded = !readonly || expandedIds.has(t.id);

          return (
            <Card key={t.id} className="medicion-card animate-fade-in" style={{ opacity: readonly ? 0.9 : 1, borderLeft: readonly ? '4px solid var(--win-blue-light, #00A3FF)' : '1px solid var(--border-color)' }}>
              
              <div className="medicion-del-btn-container" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {readonly && (
                  <button className="medicion-del-btn" onClick={() => toggleExpand(t.id)} title={expandedIds.has(t.id) ? 'Colapsar' : 'Expandir'}>
                    {expandedIds.has(t.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                )}
                {readonly ? (
                  <button className="medicion-del-btn" style={{ color: 'var(--text-secondary)' }} onClick={() => { updateTelevisor(t.id, 'isSaved', false); setExpandedIds(p => { const n = new Set(p); n.add(t.id); return n; }); }} title="Editar Pantalla">
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

              {isExpanded && (
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
                  label="Modelo Específico (opcional)" 
                  placeholder="Ej: OLED65C1PUB (dejar en blanco si se desconoce)"
                  value={t.modelo || ''}
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

                {/* Alerta: no recomendable usar 2.4G para WinTV */}
                {t.modoConexion === 'Inalámbrico 2.4G' && !readonly && (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', color: '#ffa500' }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>⚠️ No Recomendable:</strong> Para una mejor experiencia con WinTV no se recomienda la conexión en 2.4G. Preferir Ethernet o Wi-Fi 5G.</span>
                  </div>
                )}

              </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default FormularioWintv;

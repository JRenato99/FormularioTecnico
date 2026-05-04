import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Button, Card } from '../components/ui';
import TopologiaRed from '../components/features/TopologiaRed';
import FormularioMediciones from '../components/features/FormularioMediciones';
import FormularioWinbox from '../components/features/FormularioWinbox';
import FormularioWintv from '../components/features/FormularioWintv';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, CheckCircle, FileSpreadsheet, Save, X, Globe, Tv, Router as RouterIcon, Send } from 'lucide-react';
import { getRssiStyle, UBICACIONES } from '../utils/constants';
import { getDraft, saveDraft, saveOrder } from '../utils/databaseService';
import './FormularioTecnico.css';

/**
 * FormularioTecnico
 * Contenedor Maestro para la recopilación de datos y guardado en Caché Local.
 */
const FormularioTecnico = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const codigoCliente = location.state?.codigo;

  const [equipos, setEquipos] = useState([]);
  const [mediciones, setMediciones] = useState([]);
  const [winboxes, setWinboxes] = useState([]);
  const [televisores, setTelevisores] = useState([]); 
  
  const [listaUbicaciones, setListaUbicaciones] = useState(UBICACIONES);
  const topologiaRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  // Estados Modal de Resumen
  const [showSummary, setShowSummary] = useState(false);
  const [csvContentGenerated, setCsvContentGenerated] = useState('');

  // ==========================================
  // GUARD: Validar que se ingresó un código de cliente
  // ==========================================
  useEffect(() => {
    if (!codigoCliente) {
      alert('Debes ingresar un código de cliente desde el Buscador antes de acceder al formulario.');
      navigate('/buscar');
    }
  }, [codigoCliente, navigate]);

  // ==========================================
  // CACHÉ (AUTOGUARDADO LOCAL)
  // ==========================================
  
  // 1. Cargar estado inicial desde el Caché si existe
  useEffect(() => {
    if (!codigoCliente) return; // Guard ya redirigió
    const sessionStr = localStorage.getItem('win_session');
    if (!sessionStr) {
      navigate('/login');
      return;
    }

    const draft = getDraft(codigoCliente);
    if (draft) {
      if (draft.equipos) setEquipos(draft.equipos);
      if (draft.mediciones) setMediciones(draft.mediciones);
      if (draft.winboxes) setWinboxes(draft.winboxes);
      if (draft.televisores) setTelevisores(draft.televisores);
    }
  }, [codigoCliente, navigate]);

  // 2. Autoguardado silencioso con cada cambio (Debounced logic effect)
  useEffect(() => {
    const saveToCache = () => {
      saveDraft(codigoCliente, { equipos, mediciones, winboxes, televisores });
    };

    if (equipos.length > 0 || mediciones.length > 0) {
      saveToCache();
    }
  }, [equipos, mediciones, winboxes, televisores, codigoCliente]);


  // ==========================================
  // MÉTODOS DE LA UI
  // ==========================================

  const handleAgregarUbicacionCustom = (nueva) => {
    if (nueva && nueva.trim() !== '' && !listaUbicaciones.includes(nueva)) {
      setListaUbicaciones(prev => [...prev.filter(u => u !== 'Otro'), nueva, 'Otro']);
    }
  };

  const handleExportPDF = async () => {
    if (!topologiaRef.current) return;
    setIsExporting(true); 
    
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(topologiaRef.current, {
          scale: 2, 
          backgroundColor: getComputedStyle(document.body).getPropertyValue('background-color') || '#121212', 
          useCORS: true,
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height] 
        });
        
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        pdf.save(`Topologia_WIN_${codigoCliente}.pdf`);
        
      } catch (error) {
        console.error("Error generando PDF", error);
        alert('Hubo un error al generar el PDF. Revisa la consola.');
      } finally {
        setIsExporting(false); 
      }
    }, 100);
  };

  /**
   * Exportador Centralizado CSV Trifásico. Retorna el texto del CSV para ser guardado.
   */
  const generateCSVContent = () => {
    // 1. MATRIZ MEDICIONES 
    const headersMediciones = [
      'Serial Number Router (S/N)', 'Gestionable',
      'Ambientes', 'Piso', 'Tiene linea de vista',
      'Velocidad 2.4 GHz (Mbps)', 'Nivel de Sensibilidad 2.4 GHz', 'Nivel de Señal 2.4G',
      'Velocidad 5 GHz (Mbps)', 'Nivel de Sensibilidad 5 GHz', 'Nivel de Señal 5G',
      'Equipo al que estas conectado', 'Posición de equipo físico', 'Piso de equipo físico', 
      'Dependencia', 'Tipo de Conexión', 'RX de BH Mesh', 'Nivel de Señal BH'
    ];
    
    const rowsMediciones = mediciones.map(m => {
      const parent = equipos.find(e => e.id === m.equipoId);
      const grandparent = parent ? equipos.find(e => e.id === parent.parentId) : null;

      const serialNumber = parent?.serialNumber || 'N/A';
      const esTercero = parent?.esTercero;
      const gestionable = esTercero ? 'NO' : 'SÍ';

      const ambiente = m.ubicacion === 'Otro' ? m.ubicacionPersonalizada : m.ubicacion;
      const lineaVista = m.lineaVista === 'Si' ? 'Con Linea de Vista' : 'Sin Linea de Vista';
      const vel24 = `${m.velocidad24g} Mbps`;
      const rssi24 = `${m.rssi24g} dBm`;
      const eval24 = `Señal ${getRssiStyle(m.rssi24g)?.lbl.split(' (')[0] || 'N/A'}`; 
      const vel5 = `${m.velocidad5g} Mbps`;
      const rssi5 = `${m.rssi5g} dBm`;
      const eval5 = `Señal ${getRssiStyle(m.rssi5g)?.lbl.split(' (')[0] || 'N/A'}`;

      const parentName = parent?.nombre || 'N/A';
      const parentLoc = parent?.ambienteFinal || 'N/A';
      const parentPiso = parent?.piso || 'N/A';
      
      let tipoConn = 'N/A';
      if (parent?.tipo === 'ONT') tipoConn = 'FO';
      else if (parent?.conexion === 'Inalámbrico') tipoConn = 'inalambrico';
      else if (parent?.conexion === 'Cableado') tipoConn = 'Cableada';

      const dependencia = grandparent ? grandparent.nombre : (parent?.tipo === 'ONT' ? 'N/A' : 'ONT');
      
      const rxBh = (parent?.conexion === 'Inalámbrico' && parent?.rssiBackhaul && !esTercero) ? `${parent.rssiBackhaul} dBm` : 'N/A';
      const evalBh = (parent?.conexion === 'Inalámbrico' && parent?.rssiBackhaul && !esTercero) ? (`Señal ${getRssiStyle(parent.rssiBackhaul)?.lbl.split(' (')[0] || 'N/A'}`) : 'N/A';

      // Para equipos no gestionables limpiamos los vacios no obligatorios si es necesario
      return [
        serialNumber, gestionable, ambiente, m.piso, lineaVista, vel24, rssi24, eval24, vel5, rssi5, eval5,
        parentName, parentLoc, parentPiso, dependencia, tipoConn, rxBh, evalBh
      ].map(field => `"${field}"`).join(',');
    });

    let csvMatrix = headersMediciones.map(h => `"${h}"`).join(',') + "\n" + rowsMediciones.join('\n');

    // 2. MATRIZ WINBOX
    if (winboxes.length > 0) {
      csvMatrix += '\n\n"--- DETALLE TÉCNICO DE DECODIFICADORES WINBOX ---"\n';
      const headersWinboxes = [
        'Serial Number (S/N) Winbox', 'Ambiente Instalado', 'Piso Instalado',
        'Conectado al Equipo', 'S/N del Equipo Padre', 'Modo de Conexión', 
        'Ancho de Banda', 'Niv. Sensibilidad Wi-Fi (dBm)', 'Check Evaluativo'
      ];
      const rowsWinboxes = winboxes.map(w => {
        const parent = equipos.find(e => e.id === w.equipoId);
        const parentName = parent ? parent.nombre : 'N/A';
        const parentSN = parent ? parent.serialNumber : 'N/A';
        const ambiente = w.ubicacion === 'Otro' ? w.ubicacionPersonalizada : w.ubicacion;
        
        let vel = 'N/A';
        let rssi = 'N/A';
        let evalWB = 'N/A';
        let connModeStr = 'Cableado (Gigabit)';

        if (w.modoConexion === 'Inalámbrico') {
           connModeStr = `Wi-Fi (${w.bandaWifi})`;
           vel = `${w.velocidad} Mbps`;
           rssi = `${w.rssi} dBm`;
           evalWB = `Señal ${getRssiStyle(w.rssi)?.lbl.split(' (')[0] || 'N/A'}`;
        } else {
           vel = 'Cable UTP';
           evalWB = 'Cableado (Estable)';
        }

        return [
          w.serialNumber, ambiente, w.piso || 'N/A', parentName, parentSN, connModeStr, vel, rssi, evalWB
        ].map(field => `"${field}"`).join(',');
      });

      csvMatrix += headersWinboxes.map(h => `"${h}"`).join(',') + "\n" + rowsWinboxes.join('\n');
    }

    // 3. MATRIZ STREAMING WINTV
    if (televisores.length > 0) {
      csvMatrix += '\n\n"--- APLICACIÓN STREAMING WINTV ---"\n';
      const headersWintv = [
        'Ambiente (Visualización)', 'Piso',
        'Marca de SmartTV', 'Modelo del Televisor', 'Modalidad de Red'
      ];
      const rowsWintv = televisores.map(t => {
        const ambienteV = t.ubicacion === 'Otro' ? t.ubicacionPersonalizada : t.ubicacion;
        const marcaV = t.marca === 'Otro' ? t.marcaPersonalizada : t.marca;
        // Modelo opcional: si es null o vacío, se exporta como 'null' en CSV
        const modeloV = t.modelo ? t.modelo : 'null';
        return [
          ambienteV, t.piso || 'N/A', marcaV, modeloV, t.modoConexion
        ].map(field => `"${field}"`).join(',');
      });
      csvMatrix += headersWintv.map(h => `"${h}"`).join(',') + "\n" + rowsWintv.join('\n');
    }

    return csvMatrix;
  };

  const handlePreFinalizar = () => {
    // Auditoría Previa al envío
    if (equipos.length === 0) return alert('Debe configurar al menos la ONT base.');

    // Regla: mínimo 3 mediciones guardadas
    const medicionesGuardadas = mediciones.filter(m => m.isSaved);
    if (medicionesGuardadas.length < 3) {
      return alert(`Debes registrar y guardar un mínimo de 3 mediciones de cobertura.\nActualmente tienes: ${medicionesGuardadas.length} guardada(s).`);
    }

    for (let i = 0; i < mediciones.length; i++) {
        const m = mediciones[i];
        if (!m.piso || (m.ubicacion === 'Otro' && !m.ubicacionPersonalizada)) return alert(`Medición #${i + 1} tiene campos de ubicación en blanco.`);
        if (!m.isSaved) return alert(`Medición #${i + 1} no está guardada. Guárdala (💾) antes de continuar.`);
    }
    for (let j = 0; j < winboxes.length; j++) {
        if (!winboxes[j].isSaved) return alert(`Winbox #${j + 1} no está guardado.`);
    }
    for (let k = 0; k < televisores.length; k++) {
        if (!televisores[k].isSaved) return alert(`WinTV #${k + 1} no está guardado.`);
    }

    const csvData = generateCSVContent();
    setCsvContentGenerated(csvData);
    setShowSummary(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEnviarAdmin = async () => {
    setIsSubmitting(true);
    const payload = {
      equipos,
      mediciones,
      winboxes,
      televisores,
      clienteInfo: { csvContent: csvContentGenerated }
    };
    
    const result = await saveOrder(codigoCliente, payload);
    setIsSubmitting(false);

    if (result.success) {
      alert("¡Reporte enviado exitosamente y a la espera de Aprobación!");
      navigate('/buscar');
    } else {
      alert("Error al enviar el reporte:\n\n" + result.error);
    }
  };

  const doDescargarCSV = () => {
    const ahora = new Date();
    const dd = String(ahora.getDate()).padStart(2, '0');
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    const aa = String(ahora.getFullYear()).slice(2);
    const nombreArchivo = `${codigoCliente}-${dd}-${mm}-${aa}-mediciones.csv`;

    const blob = new Blob(['\uFEFF' + csvContentGenerated], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <Header />
      <div className="layout-container animate-fade-in">
        
        <div className="dashboard-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <h1 className="dashboard-title">Formulario de Instalación</h1>
            <p className="dashboard-subtitle">Orden/Cliente: <strong>{codigoCliente}</strong></p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Button onClick={handleExportPDF} disabled={isExporting || equipos.length === 0} variant="secondary">
              {isExporting ? 'Generando...' : <><Download size={18} /> Exportar Topología PDF</>}
            </Button>
            <Button onClick={doDescargarCSV} disabled={mediciones.length === 0} variant="primary">
              <FileSpreadsheet size={18} /> Descargar Borrador Excel
            </Button>
          </div>
        </div>

        <div className="dashboard-content-grid">
          
          {/* 1° Topología de Red */}
          <div ref={topologiaRef} style={{ background: 'var(--win-bg-dark)', padding: '1rem', borderRadius: '12px' }}>
            <TopologiaRed 
               equipos={equipos} 
               setEquipos={setEquipos} 
               isExporting={isExporting} 
               listaUbicaciones={listaUbicaciones}
               onAgregarUbicacion={handleAgregarUbicacionCustom}
            />
          </div>
          
          <div>
            {/* 2° Mediciones */}
            <FormularioMediciones 
               equipos={equipos} 
               mediciones={mediciones} 
               setMediciones={setMediciones} 
               listaUbicaciones={listaUbicaciones}
               onAgregarUbicacion={handleAgregarUbicacionCustom}
            />

            {/* 3° Despliegue Winbox */}
            <FormularioWinbox 
               equipos={equipos} 
               winboxes={winboxes} 
               setWinboxes={setWinboxes} 
               listaUbicaciones={listaUbicaciones}
               onAgregarUbicacion={handleAgregarUbicacionCustom}
            />
            
            {/* 4° Configuración WINtv */}
            <FormularioWintv 
               televisores={televisores}
               setTelevisores={setTelevisores}
               listaUbicaciones={listaUbicaciones}
               onAgregarUbicacion={handleAgregarUbicacionCustom}
            />
          </div>

        </div>
        
        {/* Nota de obligatoriedad */}
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '1rem', opacity: 0.7 }}>
          Los campos marcados con <strong style={{ color: 'var(--win-orange)' }}>(*)</strong> son obligatorios.
        </p>

        <div style={{ marginTop: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
           <Button variant="primary" style={{ padding: '1rem 3rem', fontSize: '1.1rem' }} onClick={handlePreFinalizar}>
             <Save size={20} style={{ marginRight: '0.5rem' }}/> Finalizar y Enviar Trabajo
           </Button>
        </div>

      </div>

      {/* MODAL DE RESUMEN FINAL */}
      {showSummary && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Resumen de Instalación</h3>
              <button className="del-btn" onClick={() => setShowSummary(false)}><X size={20} /></button>
            </div>
            
            <div className="modal-body" style={{ padding: '1rem 0' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Estás a punto de finalizar y enviar este formulario al Supervisor. Verifica los resúmenes a continuación:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Card style={{ padding: '1.5rem', background: 'rgba(255, 107, 0, 0.05)', textAlign: 'center' }}>
                  <RouterIcon size={32} color="var(--win-orange)" style={{ margin: '0 auto' }} />
                  <h2 style={{ margin: '10px 0 0 0', color: 'var(--text-primary)' }}>{equipos.length}</h2>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nodos de Red</span>
                </Card>
                
                <Card style={{ padding: '1.5rem', background: 'rgba(30, 144, 255, 0.05)', textAlign: 'center' }}>
                  <Globe size={32} color="#1E90FF" style={{ margin: '0 auto' }} />
                  <h2 style={{ margin: '10px 0 0 0', color: 'var(--text-primary)' }}>{mediciones.length}</h2>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mediciones Realizadas</span>
                </Card>

                <Card style={{ padding: '1.5rem', background: 'rgba(0, 200, 83, 0.05)', textAlign: 'center' }}>
                  <Tv size={32} color="#00C853" style={{ margin: '0 auto' }} />
                  <h2 style={{ margin: '10px 0 0 0', color: 'var(--text-primary)' }}>{winboxes.length}</h2>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Equipos Winbox</span>
                </Card>

                <Card style={{ padding: '1.5rem', background: 'rgba(255, 61, 0, 0.05)', textAlign: 'center' }}>
                  <Tv size={32} color="#FF3D00" style={{ margin: '0 auto' }} />
                  <h2 style={{ margin: '10px 0 0 0', color: 'var(--text-primary)' }}>{televisores.length}</h2>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Servicios WinTV</span>
                </Card>
              </div>

              <div style={{ marginTop: '2rem', padding: '15px', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '4px solid var(--win-orange)' }}>
                <strong>Total a exportar:</strong> O.T. {codigoCliente} listará {equipos.length + mediciones.length + winboxes.length + televisores.length} registros en el sistema.
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <Button style={{ flex: 1 }} variant="secondary" onClick={() => setShowSummary(false)}>
                Aún no, seguir editando
              </Button>
              <Button style={{ flex: 1, display: 'flex', justifyContent: 'center' }} onClick={handleEnviarAdmin}>
                <Send size={18} style={{ marginRight: '8px' }}/> Enviar y Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FormularioTecnico;

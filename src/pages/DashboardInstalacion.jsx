import React, { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui';
import TopologiaRed from '../components/features/TopologiaRed';
import FormularioMediciones from '../components/features/FormularioMediciones';
import FormularioWinbox from '../components/features/FormularioWinbox';
import FormularioWintv from '../components/features/FormularioWintv';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { getRssiStyle, UBICACIONES } from '../utils/constants';
import './DashboardInstalacion.css';

/**
 * DashboardInstalacion
 */
const DashboardInstalacion = () => {
  const location = useLocation();
  const codigoCliente = location.state?.codigo || 'GENERIC-001';

  const [equipos, setEquipos] = useState([]);
  const [mediciones, setMediciones] = useState([]);
  const [winboxes, setWinboxes] = useState([]);
  const [televisores, setTelevisores] = useState([]); // Nuevo estado global para SmartTVs
  
  const [listaUbicaciones, setListaUbicaciones] = useState(UBICACIONES);
  const topologiaRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

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
   * Exportador Centralizado CSV Trifásico.
   * Compila: Mediciones (Arriba) > Winbox (Medio) > WinTV (Abajo)
   */
  const handleExportCSV = () => {
    
    // ==========================================
    // 1. AUDITORÍA PRE-DESCARGA
    // ==========================================
    for (let i = 0; i < mediciones.length; i++) {
      const m = mediciones[i];
      if (!m.piso || (m.ubicacion === 'Otro' && !m.ubicacionPersonalizada)) {
        return alert(`La medición #${i + 1} tiene campos de ubicación en blanco.`);
      }
      if (!m.isSaved) return alert(`La medición #${i + 1} no está guardada.`);
      if (m.velocidad24g === '' || m.rssi24g === '' || m.velocidad5g === '' || m.rssi5g === '') {
        return alert(`La medición #${i + 1} requiere los campos numéricos llenos.`);
      }
    }

    for (let j = 0; j < winboxes.length; j++) {
      if (!winboxes[j].isSaved) return alert(`El WINBOX #${j + 1} no ha sido guardado.`);
    }

    for (let k = 0; k < televisores.length; k++) {
      if (!televisores[k].isSaved) return alert(`El Televisor WINTV #${k + 1} no ha sido guardado.`);
    }

    // ==========================================
    // 2. MATRIZ MEDICIONES 
    // ==========================================
    const headersMediciones = [
      'Serial Number Router (S/N)', 
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
      
      const rxBh = (parent?.conexion === 'Inalámbrico' && parent?.rssiBackhaul) ? `${parent.rssiBackhaul} dBm` : 'N/A';
      const evalBh = (parent?.conexion === 'Inalámbrico' && parent?.rssiBackhaul) ? (`Señal ${getRssiStyle(parent.rssiBackhaul)?.lbl.split(' (')[0] || 'N/A'}`) : 'N/A';

      return [
        serialNumber, ambiente, m.piso, lineaVista, vel24, rssi24, eval24, vel5, rssi5, eval5,
        parentName, parentLoc, parentPiso, dependencia, tipoConn, rxBh, evalBh
      ].map(field => `"${field}"`).join(',');
    });

    let csvMatrix = headersMediciones.map(h => `"${h}"`).join(',') + "\n" + rowsMediciones.join('\n');

    // ==========================================
    // 3. MATRIZ WINBOX
    // ==========================================
    if (winboxes.length > 0) {
      csvMatrix += '\n\n';
      csvMatrix += '"--- DETALLE TÉCNICO DE DECODIFICADORES WINBOX ---"\n';
      
      const headersWinboxes = [
        'Serial Number (S/N) Winbox', 
        'Ambiente Instalado',
        'Conectado al Equipo',
        'S/N del Equipo Padre',
        'Modo de Conexión', 
        'Ancho de Banda', 
        'Niv. Sensibilidad Wi-Fi (dBm)',
        'Check Evaluativo'
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
          w.serialNumber, ambiente, parentName, parentSN, connModeStr, vel, rssi, evalWB
        ].map(field => `"${field}"`).join(',');
      });

      csvMatrix += headersWinboxes.map(h => `"${h}"`).join(',') + "\n" + rowsWinboxes.join('\n');
    }

    // ==========================================
    // 4. MATRIZ STREAMING WINTV (NUEVA)
    // ==========================================
    if (televisores.length > 0) {
      csvMatrix += '\n\n';
      csvMatrix += '"--- APLICACIÓN STREAMING WINTV ---"\n';
      
      const headersWintv = [
        'Ambiente (Visualización)', 
        'Marca de SmartTV',
        'Modelo del Televisor',
        'Modalidad de Red'
      ];
      
      const rowsWintv = televisores.map(t => {
        const ambienteV = t.ubicacion === 'Otro' ? t.ubicacionPersonalizada : t.ubicacion;
        const marcaV = t.marca === 'Otro' ? t.marcaPersonalizada : t.marca;

        return [
          ambienteV,
          marcaV,
          t.modelo,
          t.modoConexion
        ].map(field => `"${field}"`).join(',');
      });

      csvMatrix += headersWintv.map(h => `"${h}"`).join(',') + "\n" + rowsWintv.join('\n');
    }


    // ==========================================
    // 5. DESCARGADOR IO
    // ==========================================
    const csvFinal = "data:text/csv;charset=utf-8,\uFEFF" + csvMatrix;
    const encodedUri = encodeURI(csvFinal);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Mediciones_WIN_${codigoCliente}.csv`);
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
            <Button 
              onClick={handleExportPDF} 
              disabled={isExporting || equipos.length === 0}
              variant="secondary"
            >
              {isExporting ? 'Generando...' : <><Download size={18} /> Exportar Topología PDF</>}
            </Button>
            <Button 
              onClick={handleExportCSV} 
              disabled={mediciones.length === 0}
              variant="primary"
            >
              <FileSpreadsheet size={18} /> Exportar Reporte Excel
            </Button>
          </div>
        </div>

        <div className="dashboard-content-grid">
          
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
            {/* Winbox Arriba */}
            <FormularioWinbox 
               equipos={equipos} 
               winboxes={winboxes} 
               setWinboxes={setWinboxes} 
               listaUbicaciones={listaUbicaciones}
               onAgregarUbicacion={handleAgregarUbicacionCustom}
            />

            {/* Mediciones al Medio */}
            <FormularioMediciones 
               equipos={equipos} 
               mediciones={mediciones} 
               setMediciones={setMediciones} 
               listaUbicaciones={listaUbicaciones}
               onAgregarUbicacion={handleAgregarUbicacionCustom}
            />
            
            {/* WinTV Abajo (Recibe su propia matriz) */}
            <FormularioWintv 
               televisores={televisores}
               setTelevisores={setTelevisores}
               listaUbicaciones={listaUbicaciones}
               onAgregarUbicacion={handleAgregarUbicacionCustom}
            />
          </div>

        </div>
        
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
           <Button variant="secondary" onClick={() => alert('¡Ticket guardado en sistema!')}>
             <CheckCircle size={18} style={{ marginRight: '0.5rem' }}/> Finalizar Trabajo
           </Button>
        </div>

      </div>
    </div>
  );
};

export default DashboardInstalacion;

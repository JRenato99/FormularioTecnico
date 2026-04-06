import React, { useState, useRef } from 'react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui';
import TopologiaRed from '../components/features/TopologiaRed';
import FormularioMediciones from '../components/features/FormularioMediciones';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { getRssiStyle } from '../utils/constants';
import './DashboardInstalacion.css';

const DashboardInstalacion = () => {
  const [equipos, setEquipos] = useState([]);
  const [mediciones, setMediciones] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const topologiaRef = useRef(null);

  const handleExportPDF = async () => {
    if (!topologiaRef.current) return;
    setIsExporting(true);
    
    // Pequeño timeout para permitir que React re-renderice la interfaz ocultando los botones
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(topologiaRef.current, {
          scale: 2, 
          backgroundColor: '#121212', 
          useCORS: true,
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height] 
        });
        
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        pdf.save(`Topologia_WIN.pdf`);
        
      } catch (error) {
        console.error("Error generando PDF", error);
        alert('Hubo un error al generar el PDF. Revisa la consola.');
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  const handleExportCSV = () => {
    // 1. Validar campos en blanco
    for (let i = 0; i < mediciones.length; i++) {
      const m = mediciones[i];
      if (!m.piso || (m.ubicacion === 'Otro' && !m.ubicacionPersonalizada)) {
        return alert(`La medición #${i + 1} tiene campos de ubicación o piso en blanco.`);
      }
      if (!m.velocidad24g || !m.rssi24g || !m.velocidad5g || !m.rssi5g) {
        return alert(`La medición #${i + 1} requiere los 4 campos obligatorios de métricas Llenos (Velocidad y RSSI para 2.4G y 5G). Ingresa 0 si no aplica.`);
      }
    }

    // 2. Definir 16 columnas
    const headers = [
      'Ambientes', 
      'Piso', 
      'Tiene linea de vista',
      'Velocidad 2.4 GHz (Mbps)', 
      'Nivel de Sensibilidad 2.4 GHz', 
      'Nivel de Señal 2.4G',
      'Velocidad 5 GHz (Mbps)', 
      'Nivel de Sensibilidad 5 GHz', 
      'Nivel de Señal 5G',
      'Equipo al que estas conectado', 
      'Posición de equipo físico', 
      'Piso de equipo físico', 
      'Dependencia',
      'Tipo de Conexión', 
      'RX de BH Mesh', 
      'Nivel de Señal BH'
    ];
    
    // 3. Mapear lógica relacional
    const rows = mediciones.map(m => {
      const parent = equipos.find(e => e.id === m.equipoId);
      const grandparent = parent ? equipos.find(e => e.id === parent.parentId) : null;

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
        ambiente, m.piso, lineaVista,
        vel24, rssi24, eval24,
        vel5, rssi5, eval5,
        parentName, parentLoc, parentPiso, 
        dependencia, tipoConn, rxBh, evalBh
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.map(h => `"${h}"`).join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Reporte_Mediciones_WIN.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <Header />
      <div className="layout-container animate-fade-in">
        
        {/* Cabecera del Formulario */}
        <div className="dashboard-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <h1 className="dashboard-title">Formulario de Instalación</h1>
            <p className="dashboard-subtitle">Añade la Topología base para continuar.</p>
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
              <FileSpreadsheet size={18} /> Exportar Mediciones CSV
            </Button>
          </div>
        </div>

        <div className="dashboard-content-grid">
          
          <div ref={topologiaRef} style={{ background: '#121212', padding: '1rem', borderRadius: '12px' }}>
            <TopologiaRed equipos={equipos} setEquipos={setEquipos} isExporting={isExporting} />
          </div>
          
          <div>
            <FormularioMediciones equipos={equipos} mediciones={mediciones} setMediciones={setMediciones} />
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

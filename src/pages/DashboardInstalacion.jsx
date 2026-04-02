import React, { useState, useRef } from 'react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui';
import TopologiaRed from '../components/features/TopologiaRed';
import FormularioMediciones from '../components/features/FormularioMediciones';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, CheckCircle } from 'lucide-react';
import './DashboardInstalacion.css';

/**
 * Componente DashboardInstalacion
 * Este es el marco principal de la vista de trabajo del técnico.
 * Gestiona el estado centralizado de los 'equipos' para que pueda fluir 
 * del componente TopologiaRed hacia FormularioMediciones.
 */
const DashboardInstalacion = () => {
  // Estado centralizado con la lista de nodos. Por defecto, siempre existe la ONT.
  const [equipos, setEquipos] = useState([
    { id: 'ONT', nombre: 'ONT Principal', tipo: 'ONT' }
  ]);

  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef(null);

  /**
   * Captura el dom actual y genera un archivo PDF para descargar
   */
  const handleExportPDF = async () => {
    if (!contentRef.current) return;
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2, // Mejora de resolución
        backgroundColor: '#121212', // Fondo oscuro WIN para buen contraste
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      // Usar medidas reales orientadas a lo capturado
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height] 
      });
      
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      const clienteName = "Carlos_Rivera";
      pdf.save(`Reporte_WIN_${clienteName}.pdf`);
      
    } catch (error) {
      console.error("Error generando PDF", error);
      alert('Hubo un error al generar el PDF. Revisa la consola.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <Header />
      <div className="layout-container animate-fade-in">
        
        {/* Cabecera del Dashboard */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Dashboard de Instalación</h1>
            <p className="dashboard-subtitle">Cliente: Carlos Augusto Rivera</p>
          </div>
          <Button 
            onClick={handleExportPDF} 
            disabled={isExporting}
            className="dashboard-finish-btn"
          >
            {isExporting ? 'Generando...' : <><Download size={18} /> Exportar Reporte PDF</>}
          </Button>
        </div>

        {/* Malla del Contenido Principal envuelto para el screenshot */}
        <div ref={contentRef} style={{ padding: '1rem', background: '#121212', borderRadius: '12px' }}>
          <div className="dashboard-content-grid">
            
            {/* Módulo Interactivo de Topología: Define la red neuronal de los aparatos */}
            <TopologiaRed equipos={equipos} setEquipos={setEquipos} />
            
            {/* Módulo de Medición de Señales: Registra ambientes de la casa */}
            <FormularioMediciones equipos={equipos} />

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

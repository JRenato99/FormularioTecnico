import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui';
import TopologiaRed from '../components/features/TopologiaRed';
import FormularioMediciones from '../components/features/FormularioMediciones';

const DashboardInstalacion = () => {
  const [equipos, setEquipos] = useState([
    { id: 'ONT', nombre: 'ONT Principal', tipo: 'ONT' }
  ]);

  return (
    <div>
      <Header />
      <div className="layout-container animate-fade-in">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>Dashboard de Instalación</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Cliente: Carlos Augusto Rivera</p>
          </div>
          <Button variant="secondary" style={{ flexGrow: 1, maxWidth: '200px' }}>Finalizar Ticket</Button>
        </div>

        <div style={{ display: 'grid', gap: '2rem' }}>
          <TopologiaRed equipos={equipos} setEquipos={setEquipos} />
          
          <FormularioMediciones equipos={equipos} />
        </div>
      </div>
    </div>
  );
};

export default DashboardInstalacion;

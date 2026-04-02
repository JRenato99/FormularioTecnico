import React from 'react';
import { Wifi } from 'lucide-react';

export const Header = () => {
  return (
    <header className="app-header" style={{
      background: 'var(--win-bg-surface)',
      borderBottom: '1px solid var(--border-color)',
      padding: '1rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      <style>{`
        @media (max-width: 768px) {
          .app-header { padding: 1rem !important; }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          background: 'var(--win-orange)',
          padding: '0.4rem',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Wifi size={20} color="white" />
        </div>
        <h2 style={{ margin: 0, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>
          WIN <span style={{ color: 'var(--win-orange)', fontWeight: 300 }}>Técnicos</span>
        </h2>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Téc. Juan Pérez</p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: WIN-4829</p>
        </div>
      </div>
    </header>
  );
};

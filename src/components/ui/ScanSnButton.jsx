import React, { useState } from 'react';
import { ScanLine } from 'lucide-react';
import { isMobileDevice } from '../../utils/deviceDetect';
import BarcodeScanner from './BarcodeScanner';

/**
 * Botón compacto que abre el escáner. Sólo se renderiza en móvil/tablet.
 * Devuelve el código detectado via onScan(text).
 */
const ScanSnButton = ({ onScan, title = 'Escanear S/N' }) => {
  const [open, setOpen] = useState(false);

  if (!isMobileDevice()) return null;

  const handleResult = (text) => {
    setOpen(false);
    onScan(text);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Escanear código de barras"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '6px 10px',
          marginTop: '4px',
          background: 'rgba(255, 107, 0, 0.12)',
          border: '1px solid var(--win-orange)',
          color: 'var(--win-orange)',
          borderRadius: '6px',
          fontSize: '0.78rem',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        <ScanLine size={14} /> Escanear
      </button>
      {open && (
        <BarcodeScanner
          title={title}
          onResult={handleResult}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

export default ScanSnButton;

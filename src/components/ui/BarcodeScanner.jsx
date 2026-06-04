import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';
import './BarcodeScanner.css';

/**
 * Escáner de código de barras con vista previa y recuadro guía.
 * Detecta automáticamente al posicionar el código sobre el recuadro.
 *
 * Props:
 *  - onResult(text): callback con el texto detectado
 *  - onClose(): cerrar el modal
 *  - title?: título opcional del modal
 */
const BarcodeScanner = ({ onResult, onClose, title = 'Escanear código de barras' }) => {
  const scannerRef = useRef(null);
  const containerId = 'barcode-scanner-region';
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const html5Qr = new Html5Qrcode(containerId, { verbose: false });
    scannerRef.current = html5Qr;

    const config = {
      fps: 10,
      // qrbox dinámico — recorta la zona de detección al centro
      qrbox: (viewW, viewH) => {
        const min = Math.min(viewW, viewH);
        const boxW = Math.floor(min * 0.85);
        const boxH = Math.floor(boxW * 0.45);
        return { width: boxW, height: boxH };
      },
      aspectRatio: 1.5,
      disableFlip: false
    };

    const handleSuccess = (decodedText) => {
      if (cancelled) return;
      onResult(decodedText.trim());
    };

    html5Qr
      .start({ facingMode: { exact: 'environment' } }, config, handleSuccess, () => {})
      .catch(() => {
        if (cancelled) return;
        html5Qr
          .start({ facingMode: 'environment' }, config, handleSuccess, () => {})
          .then(() => setStarting(false))
          .catch((err) => {
            if (!cancelled) setError(err?.message || 'No se pudo acceder a la cámara.');
          });
      })
      .then(() => { if (!cancelled) setStarting(false); });

    return () => {
      cancelled = true;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          try { scannerRef.current.clear(); } catch (_) {}
        });
      }
    };
  }, [onResult]);

  return (
    <div className="scanner-overlay" onClick={onClose}>
      <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <h3><Camera size={18} /> {title}</h3>
          <button className="scanner-close-btn" onClick={onClose} aria-label="Cerrar escáner">
            <X size={22} />
          </button>
        </div>

        <div className="scanner-region-wrapper">
          <div id={containerId} className="scanner-region" />

          {/* Marco guía visual con las 4 esquinas */}
          {!error && (
            <div className="scanner-guide">
              <div className="corner top-left"></div>
              <div className="corner top-right"></div>
              <div className="corner bottom-left"></div>
              <div className="corner bottom-right"></div>
              <div className="scanner-laser"></div>
            </div>
          )}
        </div>

        <div className="scanner-hint">
          {error
            ? <span style={{ color: '#ff6b6b' }}>⚠️ {error}</span>
            : starting
              ? 'Iniciando cámara...'
              : 'Posiciona el código de barras dentro del recuadro'}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';
import './BarcodeScanner.css';

/**
 * Escáner de código de barras con vista previa.
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

    // Formatos esperables en etiquetas de equipos (ONT, AP, WINBOX)
    const formats = [
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.CODE_93,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.CODABAR,
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.DATA_MATRIX
    ];

    const html5Qr = new Html5Qrcode(containerId, {
      verbose: false,
      formatsToSupport: formats,
      // Usar BarcodeDetector nativo del browser si está disponible (mucho más rápido)
      experimentalFeatures: { useBarCodeDetectorIfSupported: true }
    });
    scannerRef.current = html5Qr;

    const config = {
      fps: 15,
      // qrbox=undefined → procesa todo el viewport de la cámara (no recorta)
      aspectRatio: window.innerWidth < window.innerHeight ? 0.75 : 1.5,
      disableFlip: false
    };

    const handleSuccess = (decodedText) => {
      if (cancelled) return;
      // Pequeño beep nativo si está disponible
      try {
        if (navigator.vibrate) navigator.vibrate(100);
      } catch (_) {}
      onResult(decodedText.trim());
    };

    const tryStart = async () => {
      try {
        await html5Qr.start({ facingMode: { exact: 'environment' } }, config, handleSuccess, () => {});
        if (!cancelled) setStarting(false);
      } catch (e1) {
        if (cancelled) return;
        try {
          await html5Qr.start({ facingMode: 'environment' }, config, handleSuccess, () => {});
          if (!cancelled) setStarting(false);
        } catch (e2) {
          if (cancelled) return;
          try {
            await html5Qr.start(true, config, handleSuccess, () => {});
            if (!cancelled) setStarting(false);
          } catch (e3) {
            if (!cancelled) setError(e3?.message || 'No se pudo acceder a la cámara.');
          }
        }
      }
    };

    tryStart();

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
        </div>

        <div className="scanner-hint">
          {error
            ? <span style={{ color: '#ff6b6b' }}>⚠️ {error}</span>
            : starting
              ? 'Iniciando cámara...'
              : 'Acerca el código de barras a la cámara hasta que enfoque'}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;

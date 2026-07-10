import { useEffect, useRef, useState } from 'react';

export default function Scanner({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let stopped = false;

    async function start() {
      if (!('BarcodeDetector' in window)) {
        setStatus('unsupported');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (stopped) return stream.getTracks().forEach((track) => track.stop());

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const supported = await window.BarcodeDetector.getSupportedFormats?.();
        const preferred = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'];
        const formats = supported?.length ? preferred.filter((item) => supported.includes(item)) : preferred;
        const detector = new window.BarcodeDetector(formats.length ? { formats } : undefined);
        setStatus('scanning');

        const detect = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes?.[0]?.rawValue?.trim();
            if (value) return onDetect(value);
          } catch {
            // Il frame può essere sfocato: viene ignorato.
          }
          frameRef.current = requestAnimationFrame(detect);
        };

        frameRef.current = requestAnimationFrame(detect);
      } catch (error) {
        setMessage(error?.message || 'Impossibile avviare la fotocamera.');
        setStatus(error?.name === 'NotAllowedError' ? 'denied' : 'error');
      }
    }

    start();
    return () => {
      stopped = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [onDetect]);

  return (
    <div className="scanner" role="dialog" aria-modal="true" aria-label="Scansione codice a barre">
      <div className="scanner__header">
        <strong>Scansiona codice</strong>
        <button className="button button--ghost button--small" onClick={onClose}>Chiudi</button>
      </div>

      {status === 'scanning' && (
        <div className="scanner__camera">
          <video ref={videoRef} playsInline muted autoPlay />
          <div className="scanner__frame" />
          <p>Inquadra il codice a barre nel riquadro.</p>
        </div>
      )}

      {status === 'loading' && <div className="scanner__message">Attivazione fotocamera…</div>}
      {status !== 'loading' && status !== 'scanning' && (
        <div className="scanner__message">
          <span className="scanner__icon">⌁</span>
          <h2>{status === 'unsupported' ? 'Scansione non supportata' : status === 'denied' ? 'Fotocamera non autorizzata' : 'Errore fotocamera'}</h2>
          <p>{status === 'unsupported' ? 'Usa Chrome o Safari aggiornato, oppure inserisci il codice manualmente.' : status === 'denied' ? 'Consenti l’accesso alla fotocamera nelle impostazioni del browser.' : message}</p>
          <button className="button" onClick={onClose}>Inserisci manualmente</button>
        </div>
      )}
    </div>
  );
}

'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import jsQR from 'jsqr';
export default function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'found' | 'error'>('starting');
  const [message, setMessage] = useState('Kamera wird gestartet …');
  const stopCamera = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) { frameRef.current = requestAnimationFrame(scanFrame); return; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      setStatus('found');
      setMessage(`Erkannt: ${code.data} — Artikel wird geöffnet …`);
      stopCamera();
      fetch(`/api/products/by-sku?sku=${encodeURIComponent(code.data)}`)
        .then(async response => {
          if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Artikel nicht gefunden.');
          return response.json() as Promise<{ id: string }>;
        })
        .then(product => router.push(`/articles/${product.id}`))
        .catch(reason => {
          setStatus('error');
          setMessage(reason instanceof Error ? reason.message : 'Artikel konnte nicht gefunden werden.');
        });
      return;
    }
    frameRef.current = requestAnimationFrame(scanFrame);
  }, [router, stopCamera]);
  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setStatus('scanning');
        setMessage('Kamera aktiv — QR-Code des Artikels in den Rahmen halten.');
        frameRef.current = requestAnimationFrame(scanFrame);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error');
          setMessage('Kein Kamerazugriff möglich. Bitte Kamera-Berechtigung im Browser erlauben und die Seite neu laden.');
        }
      });
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function retry() {
    setStatus('starting');
    setMessage('Kamera wird neu gestartet …');
    window.location.reload();
  }
  function closeCamera() {
    stopCamera();
    setStatus('starting');
    setMessage('Kamera geschlossen.');
    router.push('/articles');
  }
  return <section className="capture-card">
    <div className="capture-heading"><div><span className="step-badge">▦</span><h2>Artikel per QR-Code öffnen</h2></div></div>
    <div className="qr-scanner-frame">
      <video ref={videoRef} playsInline muted className={status === 'scanning' ? 'active' : ''} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
    <p className="field-help">{message}</p>
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem' }}>
      {status === 'error' && <button className="secondary-button centered-button" onClick={retry}>Erneut versuchen</button>}
      {(status === 'scanning' || status === 'starting') && (
        <button type="button" className="secondary-button centered-button" onClick={closeCamera}>
          Kamera schließen
        </button>
      )}
    </div>
  </section>;
}
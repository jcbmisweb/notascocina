import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { DownloadIcon, XIcon, CheckIcon } from './icons';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Tablet / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
        title="Instala la app en tu tablet o móvil para acceso rápido y evaluación offline en cocina"
      >
        <DownloadIcon className="w-3.5 h-3.5" />
        <span>Instalar App PWA</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
          title="Instrucciones para instalar en iPad / iPhone"
        >
          <DownloadIcon className="w-3.5 h-3.5" />
          <span>Instalar en iPad/iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowIOSGuide(false)}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-gray-800 animate-in fade-in zoom-in" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                  <span>📱</span> Instalar en iPad / iPhone
                </h3>
                <button onClick={() => setShowIOSGuide(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Para tener la aplicación en pantalla completa y disponible sin conexión en la cocina:
              </p>
              <ol className="space-y-3 text-sm text-gray-700 list-decimal list-inside bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                <li>Toca el botón <strong>Compartir</strong> en la barra de Safari (el icono de un cuadrado con flecha hacia arriba <span className="inline-block px-1 bg-gray-200 rounded">⎋</span>).</li>
                <li>Desplázate hacia abajo y selecciona <strong>«Añadir a la pantalla de inicio»</strong> (o <em>Add to Home Screen</em>).</li>
                <li>Pulsa <strong>Añadir</strong> en la esquina superior derecha.</li>
              </ol>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>¡Listo! Ya tendrás el icono de G-Chef para entrar directo desde el taller o cámaras frigoríficas sin cobertura.</span>
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

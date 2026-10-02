import React from 'react';
import { useAppContext } from '../context/AppContext';
import { RefreshCwIcon, CheckIcon, AlertTriangleIcon } from './icons';

export const OfflineStatusBanner: React.FC = () => {
    const { isOnline, pendingOfflineCount, flushOfflineQueue, syncStatus } = useAppContext();

    if (isOnline && pendingOfflineCount === 0 && syncStatus !== 'syncing' && syncStatus !== 'error') {
        return null;
    }

    if (!isOnline) {
        return (
            <div className="bg-amber-600 text-white px-4 py-2 text-xs md:text-sm font-medium shadow-md flex items-center justify-between transition-all duration-300 z-50">
                <div className="flex items-center space-x-2">
                    <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-100"></span>
                    </span>
                    <span className="font-bold">📡 Modo Taller / Cámaras (Sin Cobertura):</span>
                    <span>Todas las notas y calificaciones se están guardando localmente en este dispositivo de forma 100% segura.</span>
                    {pendingOfflineCount > 0 && (
                        <span className="bg-amber-800/80 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                            {pendingOfflineCount} {pendingOfflineCount === 1 ? 'cambio pendiente' : 'cambios pendientes'}
                        </span>
                    )}
                </div>
                <div className="text-[11px] opacity-90 hidden sm:block">
                    Se sincronizará automáticamente al volver a tener WiFi.
                </div>
            </div>
        );
    }

    if (pendingOfflineCount > 0) {
        return (
            <div className="bg-blue-600 text-white px-4 py-2 text-xs md:text-sm font-medium shadow-md flex items-center justify-between transition-all duration-300 z-50">
                <div className="flex items-center space-x-2">
                    <RefreshCwIcon className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    <span className="font-bold">📶 Conexión WiFi recuperada:</span>
                    <span>
                        {syncStatus === 'syncing' 
                            ? `Sincronizando ${pendingOfflineCount} ${pendingOfflineCount === 1 ? 'cambio guardado' : 'cambios guardados'} offline con la base de datos...` 
                            : `${pendingOfflineCount} ${pendingOfflineCount === 1 ? 'cambio guardado offline pendiente' : 'cambios guardados offline pendientes'} de subir.`}
                    </span>
                </div>
                {syncStatus !== 'syncing' && (
                    <button
                        onClick={() => flushOfflineQueue()}
                        className="bg-white text-blue-700 font-bold px-3 py-1 rounded-md text-xs hover:bg-blue-50 transition shadow-xs"
                    >
                        Sincronizar ahora
                    </button>
                )}
            </div>
        );
    }

    return null;
};

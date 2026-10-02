import React, { useState, useEffect } from 'react';
import { ClockIcon, PlayIcon, PauseIcon, RotateCcwIcon, AlertTriangleIcon } from './icons';
import { playKitchenBeep } from '../services/timerSound';

interface ServiceCountdownTimerProps {
    serviceName: string;
    targetTimeStr?: string; // e.g. "14:00"
}

export const ServiceCountdownTimer: React.FC<ServiceCountdownTimerProps> = ({
    serviceName,
    targetTimeStr = '14:00',
}) => {
    const [targetTime, setTargetTime] = useState(targetTimeStr);
    const [isActive, setIsActive] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
    const [isOvertime, setIsOvertime] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        if (!isActive) return;

        const updateTimer = () => {
            const now = new Date();
            const [targetH, targetM] = targetTime.split(':').map(n => parseInt(n, 10));
            const targetDate = new Date();
            targetDate.setHours(targetH || 14, targetM || 0, 0, 0);

            // If target time is earlier than current time by a lot, assume today
            const diffSeconds = Math.floor((targetDate.getTime() - now.getTime()) / 1000);

            if (diffSeconds <= 0) {
                setIsOvertime(true);
                setRemainingSeconds(Math.abs(diffSeconds));
            } else {
                setIsOvertime(false);
                setRemainingSeconds(diffSeconds);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [isActive, targetTime]);

    const formatSeconds = (totalSecs: number) => {
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleToggle = () => {
        if (!isActive) {
            playKitchenBeep('start');
        }
        setIsActive(!isActive);
    };

    const isUnder15 = !isOvertime && remainingSeconds !== null && remainingSeconds <= 900;

    return (
        <div className={`p-3 rounded-xl border transition-all ${
            isOvertime 
                ? 'bg-red-950 border-red-600 text-white shadow-md animate-pulse' 
                : isUnder15 
                    ? 'bg-amber-950 border-amber-500 text-white shadow-md' 
                    : 'bg-slate-900 border-slate-800 text-white shadow-sm'
        }`}>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${isOvertime ? 'bg-red-600 text-white' : 'bg-white/10 text-emerald-400'}`}>
                        <ClockIcon className={`w-4 h-4 ${isActive ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-200">
                                ⏱ Pase de Servicio:
                            </span>
                            <span className="text-[10px] text-gray-400">
                                {serviceName}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-0.5">
                            {isActive && remainingSeconds !== null ? (
                                <span className={`font-mono text-xl font-black ${isOvertime ? 'text-red-400' : (isUnder15 ? 'text-amber-400' : 'text-emerald-400')}`}>
                                    {isOvertime ? `+${formatSeconds(remainingSeconds)} (Retraso Pase)` : formatSeconds(remainingSeconds)}
                                </span>
                            ) : (
                                <span className="font-mono text-sm font-semibold text-gray-400">
                                    Cuenta hasta las {targetTime}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg">
                        <label className="text-[10px] text-gray-400 font-bold uppercase">Hora Pase:</label>
                        <input
                            type="time"
                            value={targetTime}
                            onChange={e => setTargetTime(e.target.value)}
                            className="bg-transparent text-white font-mono font-bold text-xs outline-none w-16"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleToggle}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1 cursor-pointer ${
                            isActive
                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                        }`}
                    >
                        {isActive ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5" />}
                        {isActive ? 'Pausar' : 'Activar Pase'}
                    </button>
                </div>
            </div>
        </div>
    );
};

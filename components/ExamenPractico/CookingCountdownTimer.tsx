import React, { useState, useEffect, useCallback } from 'react';
import { PlayIcon, PauseIcon, RotateCcwIcon, ClockIcon, AlertTriangleIcon, CheckIcon } from '../icons';
import { playKitchenBeep } from '../../services/timerSound';

interface CookingCountdownTimerProps {
    duracionMin: number;
    horaInicio?: string;
    horaFinal?: string;
    timerStartTime?: number | null;
    timerStatus?: 'idle' | 'running' | 'paused' | 'finished';
    timerRemainingSeconds?: number | null;
    studentName: string;
    onUpdateHeaderData: (updates: {
        horaInicio?: string;
        horaFinal?: string;
        duracionMin?: number;
        timerStartTime?: number | null;
        timerStatus?: 'idle' | 'running' | 'paused' | 'finished';
        timerRemainingSeconds?: number | null;
    }) => void;
    compact?: boolean;
}

export const CookingCountdownTimer: React.FC<CookingCountdownTimerProps> = ({
    duracionMin = 90,
    horaInicio = '08:15',
    horaFinal = '09:45',
    timerStartTime = null,
    timerStatus = 'idle',
    timerRemainingSeconds = null,
    studentName,
    onUpdateHeaderData,
    compact = false,
}) => {
    const totalDurationSeconds = (duracionMin || 90) * 60;
    
    // Calculate current remaining or overtime seconds
    const computeCurrentSeconds = useCallback((): { remaining: number; isOvertime: boolean; overtimeSeconds: number } => {
        if (timerStatus === 'idle') {
            return { remaining: totalDurationSeconds, isOvertime: false, overtimeSeconds: 0 };
        }
        if (timerStatus === 'paused') {
            const rem = timerRemainingSeconds !== null && timerRemainingSeconds !== undefined ? timerRemainingSeconds : totalDurationSeconds;
            const isOver = rem <= 0;
            return { remaining: Math.max(0, rem), isOvertime: isOver, overtimeSeconds: isOver ? Math.abs(rem) : 0 };
        }
        if (timerStatus === 'running' && timerStartTime) {
            const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
            const rem = totalDurationSeconds - elapsed;
            const isOver = rem <= 0;
            return { remaining: Math.max(0, rem), isOvertime: isOver, overtimeSeconds: isOver ? Math.abs(rem) : 0 };
        }
        return { remaining: 0, isOvertime: true, overtimeSeconds: 0 };
    }, [timerStatus, timerStartTime, timerRemainingSeconds, totalDurationSeconds]);

    const [state, setState] = useState(computeCurrentSeconds());
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [hasWarned15, setHasWarned15] = useState(false);
    const [hasWarnedFinish, setHasWarnedFinish] = useState(false);

    // Ticker effect
    useEffect(() => {
        const update = () => {
            const current = computeCurrentSeconds();
            setState(current);

            // Warning triggers
            if (timerStatus === 'running' && soundEnabled) {
                // 15 min warning (between 899 and 900 seconds)
                if (current.remaining <= 900 && current.remaining > 895 && !hasWarned15) {
                    playKitchenBeep('warning');
                    setHasWarned15(true);
                }
                // Finish warning (0 seconds)
                if (current.isOvertime && !hasWarnedFinish) {
                    playKitchenBeep('finish');
                    setHasWarnedFinish(true);
                }
            }
        };

        update();
        if (timerStatus === 'running') {
            const interval = setInterval(update, 1000);
            return () => clearInterval(interval);
        }
    }, [timerStatus, timerStartTime, totalDurationSeconds, computeCurrentSeconds, soundEnabled, hasWarned15, hasWarnedFinish]);

    // Format time helpers
    const formatTime = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Calculate expected end time based on start time string HH:MM
    const calculateEndTimeString = (startTimeStr: string, durationMinutes: number) => {
        const [hStr, mStr] = (startTimeStr || '08:15').split(':');
        const h = parseInt(hStr, 10) || 8;
        const m = parseInt(mStr, 10) || 0;
        const totalM = h * 60 + m + durationMinutes;
        const endH = Math.floor(totalM / 60) % 24;
        const endM = totalM % 60;
        return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    };

    // Start Timer
    const handleStart = () => {
        const now = new Date();
        const nowStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const newHoraFinal = calculateEndTimeString(nowStr, duracionMin);

        // If starting fresh
        let startTimeTimestamp = Date.now();
        if (timerStatus === 'paused' && timerRemainingSeconds !== null) {
            // Adjust start timestamp so that elapsed reflects the pause
            const alreadyElapsedSecs = totalDurationSeconds - timerRemainingSeconds;
            startTimeTimestamp = Date.now() - (alreadyElapsedSecs * 1000);
        }

        onUpdateHeaderData({
            horaInicio: timerStatus === 'idle' ? nowStr : horaInicio,
            horaFinal: timerStatus === 'idle' ? newHoraFinal : horaFinal,
            timerStartTime: startTimeTimestamp,
            timerStatus: 'running',
            timerRemainingSeconds: null,
        });

        if (soundEnabled) playKitchenBeep('start');
    };

    // Pause Timer
    const handlePause = () => {
        const current = computeCurrentSeconds();
        onUpdateHeaderData({
            timerStatus: 'paused',
            timerRemainingSeconds: current.isOvertime ? -current.overtimeSeconds : current.remaining,
            timerStartTime: null,
        });
    };

    // Reset Timer
    const handleReset = () => {
        if (window.confirm(`¿Reiniciar el temporizador de cocinado para ${studentName}?`)) {
            setHasWarned15(false);
            setHasWarnedFinish(false);
            onUpdateHeaderData({
                timerStatus: 'idle',
                timerStartTime: null,
                timerRemainingSeconds: totalDurationSeconds,
            });
        }
    };

    // Quick add minutes
    const handleAdjustMinutes = (deltaMin: number) => {
        const newMin = Math.max(5, duracionMin + deltaMin);
        const newEndTime = calculateEndTimeString(horaInicio, newMin);
        
        let newStartTime = timerStartTime;
        if (timerStatus === 'running' && timerStartTime) {
            // Keep current elapsed time
            newStartTime = timerStartTime;
        }

        onUpdateHeaderData({
            duracionMin: newMin,
            horaFinal: newEndTime,
            timerStartTime: newStartTime,
        });
    };

    // Handle manual start time edit
    const handleStartTimeChange = (newStartTimeStr: string) => {
        const newEndTime = calculateEndTimeString(newStartTimeStr, duracionMin);
        onUpdateHeaderData({
            horaInicio: newStartTimeStr,
            horaFinal: newEndTime,
        });
    };

    // Percentage of completion
    const percentCompleted = Math.min(100, Math.max(0, ((totalDurationSeconds - state.remaining) / totalDurationSeconds) * 100));

    // Progress color theme
    const isUnder15Min = !state.isOvertime && state.remaining <= 900 && state.remaining > 0;
    const isFinished = state.isOvertime;
    const penaltyMin = Math.floor(state.overtimeSeconds / 60);

    const themeColors = isFinished
        ? {
            bg: 'bg-red-950 border-red-600 text-white',
            badge: 'bg-red-600 text-white animate-pulse',
            progress: 'bg-red-500',
            glow: 'ring-4 ring-red-500/50 shadow-red-500/30'
        }
        : isUnder15Min
            ? {
                bg: 'bg-amber-950 border-amber-500 text-white',
                badge: 'bg-amber-500 text-amber-950 font-bold',
                progress: 'bg-amber-400',
                glow: 'ring-2 ring-amber-400/40'
            }
            : timerStatus === 'running'
                ? {
                    bg: 'bg-slate-900 border-slate-700 text-white',
                    badge: 'bg-emerald-600 text-white',
                    progress: 'bg-emerald-500',
                    glow: ''
                }
                : {
                    bg: 'bg-slate-800 border-slate-700 text-white',
                    badge: 'bg-slate-700 text-slate-200',
                    progress: 'bg-blue-500',
                    glow: ''
                };

    if (compact) {
        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${themeColors.bg} shadow-sm text-xs`}>
                <ClockIcon className={`w-4 h-4 ${timerStatus === 'running' ? 'text-emerald-400 animate-spin' : 'text-gray-400'}`} />
                <span className="font-mono font-bold text-sm">
                    {isFinished ? `+${formatTime(state.overtimeSeconds)} (Retraso)` : formatTime(state.remaining)}
                </span>
                {timerStatus === 'running' ? (
                    <button onClick={handlePause} className="p-1 hover:bg-white/10 rounded text-amber-400" title="Pausar">
                        <PauseIcon className="w-3.5 h-3.5" />
                    </button>
                ) : (
                    <button onClick={handleStart} className="p-1 hover:bg-white/10 rounded text-emerald-400" title="Iniciar">
                        <PlayIcon className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={`p-5 rounded-2xl border-2 transition-all duration-300 ${themeColors.bg} ${themeColors.glow} shadow-lg relative overflow-hidden`}>
            {/* Background progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/10">
                <div 
                    className={`h-full transition-all duration-500 ${themeColors.progress}`}
                    style={{ width: `${isFinished ? 100 : percentCompleted}%` }}
                />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Timer Display and Student */}
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center">
                        <ClockIcon className={`w-8 h-8 ${timerStatus === 'running' ? 'text-emerald-400 animate-pulse' : 'text-gray-300'}`} />
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${themeColors.badge}`}>
                                {isFinished 
                                    ? `🚨 TIEMPO DE COCINADO AGOTADO (${penaltyMin} min retraso)` 
                                    : isUnder15Min 
                                        ? '⚠️ RECTA FINAL / EMPLATADO (< 15 min)' 
                                        : timerStatus === 'running' 
                                            ? '🔥 COCINADO EN CURSO' 
                                            : timerStatus === 'paused' 
                                                ? '⏸ EN PAUSA' 
                                                : '⏳ PREPARADO PARA INICIAR'
                                }
                            </span>
                            <span className="text-xs text-gray-400 font-medium">
                                Examen de: <b className="text-white">{studentName}</b>
                            </span>
                        </div>

                        {/* Big Countdown Digits */}
                        <div className="flex items-baseline gap-3">
                            <div className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight">
                                {isFinished ? (
                                    <span className="text-red-400 flex items-center gap-2">
                                        +{formatTime(state.overtimeSeconds)}
                                        <span className="text-xs font-normal bg-red-900/80 text-red-200 px-2 py-1 rounded-md">
                                            Excedido
                                        </span>
                                    </span>
                                ) : (
                                    <span className={isUnder15Min ? 'text-amber-400' : 'text-white'}>
                                        {formatTime(state.remaining)}
                                    </span>
                                )}
                            </div>

                            <span className="text-xs text-gray-400 hidden sm:inline">
                                / {duracionMin} min fijados
                            </span>
                        </div>
                    </div>
                </div>

                {/* Time Configuration & Quick Start Controls */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Time details (Inicio / Fin programados) */}
                    <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10 text-xs">
                        <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-400">Hora Inicio</label>
                            <input
                                type="text"
                                value={horaInicio}
                                onChange={e => handleStartTimeChange(e.target.value)}
                                className="w-16 p-1 text-center font-bold bg-white/10 text-white border border-white/20 rounded focus:ring-1 focus:ring-blue-400 outline-none"
                            />
                        </div>
                        <span className="text-gray-500 font-bold self-center">➔</span>
                        <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-400">Hora Límite</label>
                            <span className="w-16 p-1 text-center font-bold bg-white/5 text-blue-300 border border-white/10 rounded block">
                                {horaFinal}
                            </span>
                        </div>
                    </div>

                    {/* Quick duration adjusters */}
                    <div className="flex items-center gap-1 bg-white/5 p-1.5 rounded-xl border border-white/10">
                        <button
                            type="button"
                            onClick={() => handleAdjustMinutes(-5)}
                            className="px-2 py-1 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded transition"
                            title="Restar 5 minutos"
                        >
                            -5m
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAdjustMinutes(5)}
                            className="px-2 py-1 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded transition"
                            title="Añadir 5 minutos"
                        >
                            +5m
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAdjustMinutes(15)}
                            className="px-2 py-1 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded transition"
                            title="Añadir 15 minutos"
                        >
                            +15m
                        </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                        {timerStatus === 'running' ? (
                            <button
                                type="button"
                                onClick={handlePause}
                                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <PauseIcon className="w-4 h-4" />
                                Pausar
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleStart}
                                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer animate-pulse"
                            >
                                <PlayIcon className="w-4 h-4" />
                                {timerStatus === 'paused' ? 'Reanudar Cocinado' : 'Iniciar Cocinado'}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleReset}
                            className="p-2.5 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-xl transition"
                            title="Reiniciar temporizador"
                        >
                            <RotateCcwIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Overtime penalty notice */}
            {isFinished && (
                <div className="mt-3 pt-3 border-t border-red-500/30 flex items-center justify-between text-xs text-red-200">
                    <div className="flex items-center gap-2">
                        <AlertTriangleIcon className="w-4 h-4 text-red-400 animate-bounce" />
                        <span>
                            <b>Penalización por retraso en pase:</b> {penaltyMin} minutos fuera de hora. El baremo aplica penalización si supera 15 min.
                        </span>
                    </div>
                    <span className="font-mono font-bold text-red-400 bg-red-900/60 px-2.5 py-0.5 rounded-full">
                        {penaltyMin >= 15 ? '⚠️ Supera límite 15 min' : 'Dentro margen tolerancia'}
                    </span>
                </div>
            )}
        </div>
    );
};

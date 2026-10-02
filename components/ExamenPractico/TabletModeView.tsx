import React, { useState, useMemo } from 'react';
import { PracticalExamEvaluation, ExamPeriod, Student } from '../../types';
import { FINAL_EXAM_SECTIONS, FINAL_EXAM_CHECKLIST } from '../../data/examFinalRubric';
import { PRACTICAL_EXAM_RUBRIC, SCORE_LEVELS } from '../../data/constants';
import { CookingCountdownTimer } from './CookingCountdownTimer';
import { 
    XIcon, SaveIcon, CheckIcon, AlertTriangleIcon, ClockIcon, 
    ChevronLeftIcon, ChevronRightIcon, PencilIcon, RotateCcwIcon, UsersIcon 
} from '../icons';

interface TabletModeViewProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    selectedStudentId: string | null;
    onSelectStudent: (studentId: string) => void;
    currentEvaluation: PracticalExamEvaluation | null;
    onUpdateScore: (sectionOrRaId: string, criterionId: string, score: number | null, notes: string | null) => void;
    onUpdateChecklist: (itemId: string, value: boolean) => void;
    onUpdateHeaderData: (updates: any) => void;
    onSaveEvaluation: () => void;
    isFinalFormat: boolean;
    periodLabel: string;
    finalScore: number;
    totalPoints100: number;
}

export const TabletModeView: React.FC<TabletModeViewProps> = ({
    isOpen,
    onClose,
    students,
    selectedStudentId,
    onSelectStudent,
    currentEvaluation,
    onUpdateScore,
    onUpdateChecklist,
    onUpdateHeaderData,
    onSaveEvaluation,
    isFinalFormat,
    periodLabel,
    finalScore,
    totalPoints100,
}) => {
    const [activeSectionTab, setActiveSectionTab] = useState<string>('all');
    const [contrastMode, setContrastMode] = useState<'dark' | 'light'>('dark');

    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) => a.apellido1.localeCompare(b.apellido1));
    }, [students]);

    const activeStudent = useMemo(() => {
        return students.find(s => s.id === selectedStudentId) || sortedStudents[0];
    }, [students, selectedStudentId, sortedStudents]);

    const activeStudentIndex = useMemo(() => {
        return sortedStudents.findIndex(s => s.id === activeStudent?.id);
    }, [sortedStudents, activeStudent]);

    const handlePrevStudent = () => {
        if (activeStudentIndex > 0) {
            onSelectStudent(sortedStudents[activeStudentIndex - 1].id);
        }
    };

    const handleNextStudent = () => {
        if (activeStudentIndex < sortedStudents.length - 1) {
            onSelectStudent(sortedStudents[activeStudentIndex + 1].id);
        }
    };

    if (!isOpen) return null;

    const headerData = currentEvaluation?.headerData || {
        fecha: '15/09/2026',
        horaInicio: '08:15',
        duracionMin: 90,
        horaFinal: '09:45',
        timerStatus: 'idle',
        timerStartTime: null,
    };

    return (
        <div className={`fixed inset-0 z-50 overflow-hidden flex flex-col ${contrastMode === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
            {/* TOP BAR: Student switcher & timer */}
            <div className={`p-3 sm:p-4 border-b ${contrastMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-md flex flex-col gap-3`}>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-purple-600 text-white shadow-xs">
                            📱 MODO TABLET EN PARTIDA
                        </span>
                        <span className="text-xs font-semibold opacity-70 hidden sm:inline">
                            {periodLabel}
                        </span>
                    </div>

                    {/* Quick navigation and action buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setContrastMode(contrastMode === 'dark' ? 'light' : 'dark')}
                            className="p-2 rounded-xl text-xs font-bold border border-white/20 hover:bg-white/10 transition"
                            title="Cambiar tema de alto contraste"
                        >
                            {contrastMode === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
                        </button>

                        <button
                            type="button"
                            onClick={onSaveEvaluation}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg transition flex items-center gap-2 active:scale-95 cursor-pointer"
                        >
                            <SaveIcon className="w-4 h-4" />
                            GUARDAR ({finalScore.toFixed(2)})
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition flex items-center justify-center cursor-pointer"
                            title="Salir del Modo Tablet"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* STUDENT CAROUSEL BAR (Large Touch Targets) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <button
                        type="button"
                        onClick={handlePrevStudent}
                        disabled={activeStudentIndex <= 0}
                        className="p-2 rounded-xl bg-white/10 disabled:opacity-30 hover:bg-white/20 flex-shrink-0"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2 flex-1 overflow-x-auto py-1">
                        {sortedStudents.map(st => {
                            const isSelected = st.id === activeStudent?.id;
                            return (
                                <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => onSelectStudent(st.id)}
                                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl flex-shrink-0 transition-all font-bold text-xs cursor-pointer ${
                                        isSelected
                                            ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-md scale-105'
                                            : (contrastMode === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300')
                                    }`}
                                >
                                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                                        {st.nombre.charAt(0)}{st.apellido1.charAt(0)}
                                    </div>
                                    <span>{st.apellido1} {st.nombre}</span>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={handleNextStudent}
                        disabled={activeStudentIndex >= sortedStudents.length - 1}
                        className="p-2 rounded-xl bg-white/10 disabled:opacity-30 hover:bg-white/20 flex-shrink-0"
                    >
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* LIVE COOKING COUNTDOWN TIMER IN TABLET MODE */}
            <div className="p-3 sm:p-4">
                <CookingCountdownTimer
                    duracionMin={headerData.duracionMin || 90}
                    horaInicio={headerData.horaInicio || '08:15'}
                    horaFinal={headerData.horaFinal || '09:45'}
                    timerStartTime={headerData.timerStartTime}
                    timerStatus={headerData.timerStatus || 'idle'}
                    timerRemainingSeconds={headerData.timerRemainingSeconds}
                    studentName={`${activeStudent?.nombre} ${activeStudent?.apellido1}`}
                    onUpdateHeaderData={onUpdateHeaderData}
                />
            </div>

            {/* MAIN TOUCH EVALUATION CONTENT */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-6 pb-24 space-y-6">
                {isFinalFormat ? (
                    <>
                        {/* SECTION NAVIGATION PILLS */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 sticky top-0 z-20 py-2 bg-inherit backdrop-blur-md">
                            <button
                                type="button"
                                onClick={() => setActiveSectionTab('all')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                                    activeSectionTab === 'all'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : (contrastMode === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-600 border')
                                }`}
                            >
                                Todas las Secciones
                            </button>
                            {FINAL_EXAM_SECTIONS.map((sec, idx) => (
                                <button
                                    key={sec.id}
                                    type="button"
                                    onClick={() => setActiveSectionTab(sec.id)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition ${
                                        activeSectionTab === sec.id
                                            ? 'bg-purple-600 text-white shadow-md'
                                            : (contrastMode === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-600 border')
                                    }`}
                                >
                                    {idx + 1}. {sec.title.split('(')[0]}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setActiveSectionTab('checklist')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition ${
                                    activeSectionTab === 'checklist'
                                        ? 'bg-amber-600 text-white shadow-md'
                                        : (contrastMode === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-600 border')
                                }`}
                            >
                                Checklist Obligatorio
                            </button>
                        </div>

                        {/* SECTIONS LIST */}
                        {FINAL_EXAM_SECTIONS.filter(s => activeSectionTab === 'all' || activeSectionTab === s.id).map((sec, sIdx) => (
                            <div 
                                key={sec.id} 
                                className={`rounded-2xl border p-4 sm:p-5 shadow-sm space-y-4 ${
                                    contrastMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                                }`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-700 text-white">
                                            {sec.type}
                                        </span>
                                        <h3 className="font-extrabold text-base">{sec.title}</h3>
                                    </div>
                                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-white/10">
                                        Máx {sec.totalMaxScore} pts
                                    </span>
                                </div>

                                {/* CRITERIA ROWS WITH EXTRA-LARGE TOUCH TARGETS */}
                                <div className="space-y-4">
                                    {sec.criteria.map(crit => {
                                        const scoreData = currentEvaluation?.scores?.[sec.id]?.[crit.id];
                                        const currentVal = scoreData?.score;

                                        return (
                                            <div 
                                                key={crit.id} 
                                                className={`p-4 rounded-xl border transition ${
                                                    contrastMode === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                                                }`}
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                                                    <div>
                                                        <h4 className="font-bold text-sm flex items-center gap-2">
                                                            <span>{crit.name}</span>
                                                            <span className="text-[11px] font-normal opacity-60">({crit.type})</span>
                                                        </h4>
                                                        <p className="text-xs opacity-70 mt-0.5">{crit.description}</p>
                                                    </div>

                                                    {/* CURRENT SCORE BADGE */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold opacity-60">Puntuación:</span>
                                                        <span className={`px-3 py-1.5 rounded-xl font-mono font-black text-base shadow-xs ${
                                                            currentVal !== null && currentVal !== undefined
                                                                ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                                                : 'bg-white/10 text-gray-400'
                                                        }`}>
                                                            {currentVal !== null && currentVal !== undefined ? currentVal : '-'} / {crit.maxScore}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* LARGE TOUCH BUTTONS: [ 0 ] [ 25% ] [ 50% ] [ 75% ] [ 100% (MÁX) ] */}
                                                <div className="grid grid-cols-5 gap-2 pt-2 border-t border-white/10">
                                                    {[
                                                        { label: '0', val: 0, color: 'bg-red-950/80 text-red-300 hover:bg-red-800 border-red-800' },
                                                        { label: '25%', val: Math.round((crit.maxScore * 0.25) * 10) / 10, color: 'bg-amber-950/80 text-amber-300 hover:bg-amber-800 border-amber-800' },
                                                        { label: '50%', val: Math.round((crit.maxScore * 0.5) * 10) / 10, color: 'bg-yellow-950/80 text-yellow-300 hover:bg-yellow-800 border-yellow-800' },
                                                        { label: '75%', val: Math.round((crit.maxScore * 0.75) * 10) / 10, color: 'bg-blue-950/80 text-blue-300 hover:bg-blue-800 border-blue-800' },
                                                        { label: '100% (Máx)', val: crit.maxScore, color: 'bg-emerald-950/80 text-emerald-300 hover:bg-emerald-800 border-emerald-800' },
                                                    ].map(btn => {
                                                        const isSelected = currentVal === btn.val;
                                                        return (
                                                            <button
                                                                key={btn.label}
                                                                type="button"
                                                                onClick={() => onUpdateScore(sec.id, crit.id, btn.val, null)}
                                                                className={`py-3 px-1 rounded-xl font-bold text-xs text-center border transition-all active:scale-95 cursor-pointer ${
                                                                    isSelected
                                                                        ? 'bg-emerald-600 text-white ring-2 ring-white border-transparent shadow-lg scale-102 font-black'
                                                                        : btn.color
                                                                }`}
                                                            >
                                                                <span className="block text-[10px] opacity-80">{btn.label}</span>
                                                                <span className="block font-mono text-sm">{btn.val}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* CHECKLIST IN TABLET MODE */}
                        {(activeSectionTab === 'all' || activeSectionTab === 'checklist') && (
                            <div className={`rounded-2xl border p-5 shadow-sm space-y-4 ${
                                contrastMode === 'dark' ? 'bg-slate-900 border-indigo-900' : 'bg-white border-indigo-200'
                            }`}>
                                <h3 className="font-extrabold text-base text-indigo-400 flex items-center gap-2">
                                    <span>📋</span> Verificación Obligatoria (Checklist)
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {FINAL_EXAM_CHECKLIST.map(chk => {
                                        const isChecked = currentEvaluation?.checklist?.[chk.id] ?? true;
                                        return (
                                            <button
                                                key={chk.id}
                                                type="button"
                                                onClick={() => onUpdateChecklist(chk.id, !isChecked)}
                                                className={`p-4 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer active:scale-98 ${
                                                    isChecked
                                                        ? 'bg-emerald-950/40 border-emerald-700 text-emerald-200'
                                                        : 'bg-red-950/40 border-red-700 text-red-200'
                                                }`}
                                            >
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                                                    isChecked ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                                                }`}>
                                                    {isChecked ? '✓' : '✗'}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-xs block">{chk.label}</span>
                                                    <span className="text-[10px] opacity-70 block">{chk.requirement}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* CLASSIC T1 RUBRIC IN TABLET MODE */
                    <div className="space-y-6">
                        {PRACTICAL_EXAM_RUBRIC.map(ra => (
                            <div key={ra.id} className={`p-4 rounded-2xl border ${contrastMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                <h3 className="font-bold text-base mb-3 flex items-center justify-between">
                                    <span>{ra.name}</span>
                                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">{ra.weight * 100}%</span>
                                </h3>
                                <div className="space-y-3">
                                    {ra.criteria.map(crit => {
                                        const currentScoreData = currentEvaluation?.scores?.[ra.id]?.[crit.id];
                                        return (
                                            <div key={crit.id} className="p-3 bg-white/5 rounded-xl">
                                                <p className="font-semibold text-xs mb-2">{crit.name}</p>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {SCORE_LEVELS.map(level => (
                                                        <button
                                                            key={level.value}
                                                            type="button"
                                                            onClick={() => onUpdateScore(ra.id, crit.id, level.value, null)}
                                                            className={`py-2.5 rounded-xl font-bold text-xs transition active:scale-95 ${
                                                                currentScoreData?.score === level.value
                                                                    ? 'bg-blue-600 text-white ring-2 ring-white'
                                                                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                                                            }`}
                                                        >
                                                            {level.label} ({level.value})
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* FLOATING BOTTOM BAR FOR EASY 1-HAND SAVING */}
            <div className={`fixed bottom-0 left-0 right-0 p-3 sm:p-4 border-t ${
                contrastMode === 'dark' ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
            } backdrop-blur-md flex items-center justify-between gap-4 z-40`}>
                <div className="flex items-center gap-3">
                    <div className="text-left">
                        <span className="text-[10px] uppercase font-bold opacity-60 block">Alumno</span>
                        <span className="font-extrabold text-sm">{activeStudent?.apellido1}, {activeStudent?.nombre}</span>
                    </div>
                    <div className="h-8 w-px bg-white/20"></div>
                    <div className="text-left">
                        <span className="text-[10px] uppercase font-bold opacity-60 block">Nota Final</span>
                        <span className="font-mono font-black text-xl text-blue-400">{finalScore.toFixed(2)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-3 rounded-xl border border-white/20 text-xs font-bold hover:bg-white/10 transition"
                    >
                        Salir
                    </button>
                    <button
                        type="button"
                        onClick={onSaveEvaluation}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-sm rounded-xl shadow-lg transition flex items-center gap-2 active:scale-95 cursor-pointer"
                    >
                        <SaveIcon className="w-5 h-5" />
                        GUARDAR EVALUACIÓN
                    </button>
                </div>
            </div>
        </div>
    );
};

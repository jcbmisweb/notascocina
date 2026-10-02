import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { XIcon, SaveIcon, ClipboardCheckIcon, PencilIcon, CheckIcon } from './icons';
import { Student, InstrumentoEvaluacion, ActivityGrade } from '../types';

interface ModalNotasExamenesTeoricosProps {
    isOpen: boolean;
    onClose: () => void;
    module?: 'pc' | 'optativa' | 'proyecto';
}

interface ExamOption {
    id: string; // activity id
    name: string;
    trimester: string;
    instrumentId: string;
    instrumentName: string;
}

export const ModalNotasExamenesTeoricos: React.FC<ModalNotasExamenesTeoricosProps> = ({
    isOpen,
    onClose,
    module = 'pc',
}) => {
    const { 
        students, 
        instrumentGrades, 
        setInstrumentGrades,
        academicGrades,
        setAcademicGrades,
        pcInstrumentosEvaluacion,
        optativaInstrumentosEvaluacion,
        proyectoInstrumentosEvaluacion,
        addToast 
    } = useAppContext();

    const instrumentos = useMemo(() => {
        if (module === 'optativa') return optativaInstrumentosEvaluacion;
        if (module === 'proyecto') return proyectoInstrumentosEvaluacion;
        return pcInstrumentosEvaluacion;
    }, [module, pcInstrumentosEvaluacion, optativaInstrumentosEvaluacion, proyectoInstrumentosEvaluacion]);

    // Find all exam activities
    const availableExams = useMemo<ExamOption[]>(() => {
        const list: ExamOption[] = [];
        (Object.values(instrumentos || {}) as InstrumentoEvaluacion[]).forEach((inst: InstrumentoEvaluacion) => {
            const isExamInst = inst.nombre.toLowerCase().includes('examen') || 
                               inst.id.toLowerCase().includes('examen') ||
                               inst.nombre.toLowerCase().includes('teórico') ||
                               inst.nombre.toLowerCase().includes('teorico');
            
            (inst.activities || []).forEach(act => {
                // If it's the exam instrument or the activity name has examen/teoria
                if (isExamInst || act.name.toLowerCase().includes('examen') || act.name.toLowerCase().includes('teor')) {
                    list.push({
                        id: act.id,
                        name: act.name,
                        trimester: act.trimester,
                        instrumentId: inst.id,
                        instrumentName: inst.nombre,
                    });
                }
            });
        });
        
        // If none found by filter, list all activities of first instrument
        if (list.length === 0) {
            const first = (Object.values(instrumentos || {}) as InstrumentoEvaluacion[])[0];
            if (first && first.activities) {
                first.activities.forEach(act => {
                    list.push({
                        id: act.id,
                        name: act.name,
                        trimester: act.trimester,
                        instrumentId: first.id,
                        instrumentName: first.nombre,
                    });
                });
            }
        }
        return list;
    }, [instrumentos]);

    const [selectedActivityId, setSelectedActivityId] = useState<string>('');
    const [localGrades, setLocalGrades] = useState<Record<string, { normal: number | null; rec1: number | null; rec2: number | null }>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [pasteMode, setPasteMode] = useState(false);
    const [pasteText, setPasteText] = useState('');

    // Set default selected exam
    useEffect(() => {
        if (availableExams.length > 0 && (!selectedActivityId || !availableExams.some(e => e.id === selectedActivityId))) {
            setSelectedActivityId(availableExams[0].id);
        }
    }, [availableExams, selectedActivityId]);

    // Load current grades when selectedActivityId changes
    useEffect(() => {
        if (!selectedActivityId) return;
        const initial: Record<string, { normal: number | null; rec1: number | null; rec2: number | null }> = {};
        students.forEach(st => {
            const g = instrumentGrades[st.id]?.[selectedActivityId];
            if (typeof g === 'object' && g !== null && 'normal' in g) {
                initial[st.id] = {
                    normal: g.normal ?? null,
                    rec1: g.rec1 ?? null,
                    rec2: g.rec2 ?? null,
                };
            } else if (typeof g === 'number') {
                initial[st.id] = { normal: g, rec1: null, rec2: null };
            } else {
                initial[st.id] = { normal: null, rec1: null, rec2: null };
            }
        });
        setLocalGrades(initial);
    }, [selectedActivityId, students, instrumentGrades]);

    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) => a.apellido1.localeCompare(b.apellido1));
    }, [students]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm.trim()) return sortedStudents;
        const term = searchTerm.toLowerCase();
        return sortedStudents.filter(s => 
            s.nombre.toLowerCase().includes(term) ||
            s.apellido1.toLowerCase().includes(term) ||
            s.apellido2.toLowerCase().includes(term) ||
            (s.grupo && s.grupo.toLowerCase().includes(term))
        );
    }, [sortedStudents, searchTerm]);

    const selectedExam = useMemo(() => {
        return availableExams.find(e => e.id === selectedActivityId);
    }, [availableExams, selectedActivityId]);

    const handleGradeInput = (studentId: string, field: 'normal' | 'rec1' | 'rec2', valStr: string) => {
        const cleaned = valStr.replace(',', '.');
        const num = cleaned === '' ? null : parseFloat(cleaned);
        if (cleaned !== '' && (isNaN(num as number) || (num as number) < 0 || (num as number) > 10)) return;

        setLocalGrades(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || { normal: null, rec1: null, rec2: null }),
                [field]: num,
            }
        }));
    };

    const handleApplyPaste = () => {
        if (!pasteText.trim()) return;
        const lines = pasteText
            .split(/\r?\n/)
            .map(l => l.trim().replace(',', '.'))
            .filter(l => l !== '');
        
        setLocalGrades(prev => {
            const next = { ...prev };
            filteredStudents.forEach((student, idx) => {
                if (idx < lines.length) {
                    const parsed = parseFloat(lines[idx]);
                    if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
                        next[student.id] = {
                            ...(next[student.id] || { normal: null, rec1: null, rec2: null }),
                            normal: parsed,
                        };
                    }
                }
            });
            return next;
        });
        setPasteMode(false);
        setPasteText('');
        addToast(`Notas pegadas aplicadas a ${Math.min(lines.length, filteredStudents.length)} alumnos.`, 'success');
    };

    const stats = useMemo(() => {
        const values: number[] = [];
        let aprobados = 0;
        let suspensos = 0;

        (Object.values(localGrades) as ActivityGrade[]).forEach((g: ActivityGrade) => {
            const best = Math.max(g.normal ?? 0, g.rec1 ?? 0, g.rec2 ?? 0);
            const hasAny = g.normal !== null || g.rec1 !== null || g.rec2 !== null;
            if (hasAny) {
                values.push(best);
                if (best >= 5) aprobados++;
                else suspensos++;
            }
        });

        const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : '-';
        return {
            totalEvaluados: values.length,
            aprobados,
            suspensos,
            media: avg,
        };
    }, [localGrades]);

    const handleSave = () => {
        if (!selectedActivityId) return;

        // Save to instrumentGrades
        setInstrumentGrades(prev => {
            const updated = JSON.parse(JSON.stringify(prev || {}));
            sortedStudents.forEach(st => {
                if (!updated[st.id]) updated[st.id] = {};
                const current = updated[st.id][selectedActivityId];
                const local = localGrades[st.id] || { normal: null, rec1: null, rec2: null };
                
                if (typeof current === 'object' && current !== null && 'normal' in current) {
                    updated[st.id][selectedActivityId] = {
                        ...current,
                        normal: local.normal,
                        rec1: local.rec1,
                        rec2: local.rec2,
                        isLockedNormal: false,
                    };
                } else {
                    updated[st.id][selectedActivityId] = {
                        normal: local.normal,
                        rec1: local.rec1,
                        rec2: local.rec2,
                        isLockedNormal: false,
                        isLockedRec1: false,
                        isLockedRec2: false,
                    };
                }
            });
            return updated;
        });

        // Also sync to academicGrades if it corresponds to examen1 or examen2 in PC
        if (module === 'pc' && selectedExam) {
            setAcademicGrades(prev => {
                const nextAcad = JSON.parse(JSON.stringify(prev || {}));
                const period = selectedExam.trimester;
                // Check if this exam is 1st or 2nd in period
                const samePeriodExams = availableExams.filter(e => e.trimester === period);
                const examIndex = samePeriodExams.findIndex(e => e.id === selectedExam.id);
                const instrumentKey = examIndex === 0 ? 'examen1' : 'examen2';

                sortedStudents.forEach(st => {
                    if (!nextAcad[st.id]) nextAcad[st.id] = {};
                    if (!nextAcad[st.id][period]) nextAcad[st.id][period] = { manualGrades: {} };
                    if (!nextAcad[st.id][period].manualGrades) nextAcad[st.id][period].manualGrades = {};
                    
                    const local = localGrades[st.id];
                    if (local && local.normal !== null) {
                        nextAcad[st.id][period].manualGrades[instrumentKey] = local.normal;
                    }
                });
                return nextAcad;
            });
        }

        addToast(`Calificaciones de ${selectedExam?.name || 'Examen'} guardadas con éxito.`, 'success');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                            <PencilIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white/20 rounded-md">
                                    Acción Rápida
                                </span>
                                <span className="text-xs text-blue-100 font-medium">
                                    {module.toUpperCase()} &bull; Exámenes Teóricos
                                </span>
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">Poner Notas de Exámenes Teóricos</h2>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
                        title="Cerrar ventana"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Subheader / Exam selector */}
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                        <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
                            Selecciona Examen:
                        </label>
                        <select 
                            value={selectedActivityId} 
                            onChange={e => setSelectedActivityId(e.target.value)}
                            className="bg-white border border-gray-300 font-semibold text-gray-800 text-sm rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                        >
                            {availableExams.map(ex => (
                                <option key={ex.id} value={ex.id}>
                                    {ex.name} ({ex.trimester.toUpperCase()} - {ex.instrumentName})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPasteMode(!pasteMode)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${pasteMode ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                        >
                            <ClipboardCheckIcon className="w-4 h-4 text-gray-600" />
                            {pasteMode ? 'Cerrar Pegado Rápido' : 'Pegar desde Excel / Lista'}
                        </button>
                    </div>
                </div>

                {/* Quick Paste Panel (Collapsible) */}
                {pasteMode && (
                    <div className="bg-amber-50/80 border-b border-amber-200 p-4 animate-in fade-in duration-200">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                    📋 Pegar columna de notas (una por línea)
                                </h4>
                                <p className="text-[11px] text-amber-800 mt-0.5">
                                    Copia la columna de notas desde Excel o un documento y pégalas aquí. Se asignarán por orden alfabético a los alumnos visibles.
                                </p>
                            </div>
                            <button
                                onClick={handleApplyPaste}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                            >
                                Asignar Notas
                            </button>
                        </div>
                        <textarea
                            value={pasteText}
                            onChange={e => setPasteText(e.target.value)}
                            placeholder={"7.5\n8.0\n6.2\n9\n..."}
                            rows={3}
                            className="w-full p-2 text-xs font-mono bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>
                )}

                {/* KPI Statistics Bar */}
                <div className="px-5 py-2.5 bg-slate-100 border-b border-gray-200 flex flex-wrap items-center justify-between text-xs text-gray-700 gap-4">
                    <div className="flex items-center gap-4">
                        <span className="font-semibold text-gray-900">
                            Evaluados: <span className="text-blue-700 font-bold">{stats.totalEvaluados} / {students.length}</span>
                        </span>
                        <span className="font-semibold text-gray-900">
                            Media: <span className="text-indigo-700 font-bold">{stats.media}</span>
                        </span>
                        <span className="text-green-700 font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                            Aprobados: <b>{stats.aprobados}</b>
                        </span>
                        <span className="text-red-700 font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                            Suspensos: <b>{stats.suspensos}</b>
                        </span>
                    </div>

                    <div className="w-48">
                        <input
                            type="text"
                            placeholder="Buscar alumno..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Table of Students & Grades */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                    <table className="w-full text-xs text-left border-collapse border border-gray-200 rounded-lg overflow-hidden shadow-xs">
                        <thead className="bg-gray-100 text-gray-700 font-semibold sticky top-0 shadow-xs z-10">
                            <tr>
                                <th className="p-2.5 border-b border-r border-gray-200">#</th>
                                <th className="p-2.5 border-b border-r border-gray-200">Alumno</th>
                                <th className="p-2.5 border-b border-r border-gray-200 text-center w-28 bg-blue-50/80 text-blue-950">
                                    Nota Examen (0-10)
                                </th>
                                <th className="p-2.5 border-b border-r border-gray-200 text-center w-24">Rec 1</th>
                                <th className="p-2.5 border-b border-r border-gray-200 text-center w-24">Rec 2</th>
                                <th className="p-2.5 border-b border-gray-200 text-center w-24 bg-gray-200 font-bold">Nota Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredStudents.map((st, idx) => {
                                const current = localGrades[st.id] || { normal: null, rec1: null, rec2: null };
                                const best = Math.max(current.normal ?? 0, current.rec1 ?? 0, current.rec2 ?? 0);
                                const hasGrade = current.normal !== null || current.rec1 !== null || current.rec2 !== null;

                                return (
                                    <tr key={st.id} className={`hover:bg-blue-50/40 transition ${idx % 2 !== 0 ? 'bg-gray-50/60' : 'bg-white'}`}>
                                        <td className="p-2 text-gray-400 font-mono text-[11px] border-r border-gray-200 w-8 text-center">
                                            {idx + 1}
                                        </td>
                                        <td className="p-2 border-r border-gray-200">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                                                    {st.nombre.charAt(0)}{st.apellido1.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-gray-900 block">
                                                        {st.apellido1} {st.apellido2}, {st.nombre}
                                                    </span>
                                                    {st.grupo && (
                                                        <span className="text-[10px] text-gray-500 font-normal">
                                                            {st.grupo}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        {/* Normal Exam Grade (Prominent) */}
                                        <td className="p-1.5 text-center border-r border-gray-200 bg-blue-50/30">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="10"
                                                placeholder="-"
                                                value={current.normal ?? ''}
                                                onChange={e => handleGradeInput(st.id, 'normal', e.target.value)}
                                                className="w-16 p-1.5 text-center font-bold text-sm bg-white border border-blue-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 rounded-md outline-none shadow-xs mx-auto block"
                                            />
                                        </td>
                                        {/* Rec 1 */}
                                        <td className="p-1.5 text-center border-r border-gray-200">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="10"
                                                placeholder="-"
                                                value={current.rec1 ?? ''}
                                                onChange={e => handleGradeInput(st.id, 'rec1', e.target.value)}
                                                className="w-14 p-1 text-center text-xs bg-white border border-gray-200 focus:border-indigo-500 rounded-md outline-none mx-auto block"
                                            />
                                        </td>
                                        {/* Rec 2 */}
                                        <td className="p-1.5 text-center border-r border-gray-200">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="10"
                                                placeholder="-"
                                                value={current.rec2 ?? ''}
                                                onChange={e => handleGradeInput(st.id, 'rec2', e.target.value)}
                                                className="w-14 p-1 text-center text-xs bg-white border border-gray-200 focus:border-indigo-500 rounded-md outline-none mx-auto block"
                                            />
                                        </td>
                                        {/* Final Grade Indicator */}
                                        <td className="p-2 text-center font-bold">
                                            {hasGrade ? (
                                                <span className={`px-2 py-0.5 rounded text-xs ${best >= 5 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {best.toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 font-normal">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">
                        💡 Las notas introducidas se guardan directamente en el instrumento y se sincronizan con Gestión Académica.
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition shadow-xs"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md flex items-center gap-2"
                        >
                            <SaveIcon className="w-4 h-4" />
                            Guardar Calificaciones
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

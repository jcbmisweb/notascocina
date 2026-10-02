import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PracticalExamEvaluation, ExamPeriod, Student } from '../types';
import { PRACTICAL_EXAM_RUBRIC, SCORE_LEVELS } from '../data/constants';
import { FINAL_EXAM_SECTIONS, FINAL_EXAM_CHECKLIST } from '../data/examFinalRubric';
import { downloadFinalPracticalExamPdf } from '../components/practicalExamPdfUtils';
import { SearchIcon, SaveIcon, PrinterIcon, FileTextIcon } from '../components/icons';
import { useAppContext } from '../context/AppContext';

interface ExamenesPracticosViewProps {
    isFocusMode: boolean;
    setIsFocusMode: (isFocus: boolean) => void;
}

const PERIODS: { key: ExamPeriod; label: string; shortLabel: string; isFinalFormat: boolean }[] = [
    { key: 't1', label: '1º Trimestre', shortLabel: '1º Trim', isFinalFormat: false },
    { key: 't2', label: 'Examen Final', shortLabel: 'Final', isFinalFormat: true },
    { key: 'rec', label: 'Recuperación', shortLabel: 'Recup', isFinalFormat: true },
    { key: 't3', label: 'Examen de Junio', shortLabel: 'Junio', isFinalFormat: true },
];

const ExamenesPracticosView: React.FC<ExamenesPracticosViewProps> = ({ isFocusMode, setIsFocusMode }) => {
    const { students, practicalExamEvaluations, handleSavePracticalExam, teacherData, instituteData, addToast } = useAppContext();
    
    const [activePeriod, setActivePeriod] = useState<ExamPeriod>('t2'); // Defaults to the newly updated Examen Final!
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentEvaluation, setCurrentEvaluation] = useState<PracticalExamEvaluation | null>(null);

    const currentPeriodConfig = useMemo(() => {
        return PERIODS.find(p => p.key === activePeriod) || PERIODS[0];
    }, [activePeriod]);

    const evaluatedStudents = useMemo(() => {
        return new Set(practicalExamEvaluations.filter(e => e.examPeriod === activePeriod).map(e => e.studentId));
    }, [practicalExamEvaluations, activePeriod]);

    const filteredStudents = useMemo(() => {
        return students
            .filter(student => {
                const fullName = `${student.nombre} ${student.apellido1} ${student.apellido2}`.toLowerCase();
                return fullName.includes(searchTerm.toLowerCase());
            })
            .sort((a, b) => a.apellido1.localeCompare(b.apellido1));
    }, [students, searchTerm]);

    // Calculate score for 1º Trimestre (Classic RA Rubric)
    const calculateT1Score = useCallback((evaluation: PracticalExamEvaluation | null): number => {
        if (!evaluation) return 0;
        let totalWeightedScore = 0;
        let totalWeightOfScoredItems = 0;
        PRACTICAL_EXAM_RUBRIC.forEach(ra => {
            let raScoreSum = 0;
            let criteriaInRaCount = 0;
            ra.criteria.forEach(criterion => {
                const scoreInfo = evaluation.scores?.[ra.id]?.[criterion.id];
                if (scoreInfo && typeof scoreInfo.score === 'number') {
                    raScoreSum += scoreInfo.score;
                    criteriaInRaCount++;
                }
            });
            if (criteriaInRaCount > 0) {
                const averageRaScore = raScoreSum / criteriaInRaCount;
                totalWeightedScore += averageRaScore * ra.weight;
                totalWeightOfScoredItems += ra.weight;
            }
        });
        if (totalWeightOfScoredItems === 0) return 0;
        return totalWeightedScore / totalWeightOfScoredItems;
    }, []);

    // Calculate score for Examen Final (100 points scale / 10)
    const calculateFinalFormatPoints = useCallback((evaluation: PracticalExamEvaluation | null): { total100: number; scale10: number } => {
        if (!evaluation) return { total100: 0, scale10: 0 };
        let total100 = 0;
        FINAL_EXAM_SECTIONS.forEach(section => {
            section.criteria.forEach(crit => {
                const scoreData = evaluation.scores?.[section.id]?.[crit.id];
                if (scoreData && typeof scoreData.score === 'number') {
                    total100 += scoreData.score;
                }
            });
        });
        const scale10 = parseFloat((total100 / 10).toFixed(2));
        return { total100, scale10 };
    }, []);

    // Load or initialize evaluation
    useEffect(() => {
        if (selectedStudentId) {
            const existingEval = practicalExamEvaluations.find(e => e.studentId === selectedStudentId && e.examPeriod === activePeriod);
            if (existingEval) {
                setCurrentEvaluation(JSON.parse(JSON.stringify(existingEval)));
            } else {
                const newEval: PracticalExamEvaluation = {
                    id: `${selectedStudentId}-${activePeriod}`,
                    studentId: selectedStudentId,
                    examPeriod: activePeriod,
                    scores: {},
                    checklist: {
                        metodo_mismo_genero_2: true,
                        metodo_otro_1: true,
                        salsa_realizada: true,
                        dos_guarniciones: true,
                        ingrediente_fijado: true,
                    },
                    headerData: {
                        fecha: '15/09/2026',
                        horaInicio: '08:15',
                        duracionMin: 90,
                        horaFinal: '09:45'
                    }
                };
                setCurrentEvaluation(newEval);
            }
        } else {
            setCurrentEvaluation(null);
        }
    }, [selectedStudentId, activePeriod, practicalExamEvaluations]);

    const handleScoreChange = (sectionOrRaId: string, criterionId: string, score: number | null, notes: string | null) => {
        if (!currentEvaluation) return;
        const newEval = { ...currentEvaluation };
        if (!newEval.scores[sectionOrRaId]) newEval.scores[sectionOrRaId] = {};
        if (!newEval.scores[sectionOrRaId][criterionId]) newEval.scores[sectionOrRaId][criterionId] = { score: null, notes: '' };
        if (score !== null) newEval.scores[sectionOrRaId][criterionId].score = score;
        if (notes !== null) newEval.scores[sectionOrRaId][criterionId].notes = notes;
        setCurrentEvaluation(newEval);
    };

    const handleChecklistToggle = (itemId: string, value: boolean) => {
        if (!currentEvaluation) return;
        setCurrentEvaluation(prev => {
            if (!prev) return null;
            return {
                ...prev,
                checklist: {
                    ...(prev.checklist || {}),
                    [itemId]: value
                }
            };
        });
    };

    const handleHeaderDataChange = (field: string, value: any) => {
        if (!currentEvaluation) return;
        setCurrentEvaluation(prev => {
            if (!prev) return null;
            return {
                ...prev,
                headerData: {
                    ...(prev.headerData || {}),
                    [field]: value
                }
            };
        });
    };

    const finalPointsData = useMemo(() => {
        if (currentPeriodConfig.isFinalFormat) {
            return calculateFinalFormatPoints(currentEvaluation);
        }
        const score = calculateT1Score(currentEvaluation);
        return { total100: score * 10, scale10: score };
    }, [currentEvaluation, currentPeriodConfig.isFinalFormat, calculateFinalFormatPoints, calculateT1Score]);

    const handleSaveEvaluation = () => {
        if (currentEvaluation) {
            const finalScore = finalPointsData.scale10;
            const evalToSave: PracticalExamEvaluation = {
                ...currentEvaluation,
                finalScore,
                totalPoints100: finalPointsData.total100
            };
            handleSavePracticalExam(evalToSave);
            addToast(`Examen guardado: nota final ${finalScore.toFixed(2)}`, 'success');
        }
    };

    const handleDownloadPdf = () => {
        if (!currentEvaluation || !selectedStudentId) return;
        const student = students.find(s => s.id === selectedStudentId);
        if (!student) return;

        downloadFinalPracticalExamPdf({
            student,
            evaluation: {
                ...currentEvaluation,
                finalScore: finalPointsData.scale10,
                totalPoints100: finalPointsData.total100
            },
            teacherData,
            instituteData,
            periodLabel: currentPeriodConfig.label
        });
        addToast(`PDF del examen descargado con éxito.`, 'success');
    };

    // Render for classic T1 rubric
    const renderT1Rubric = (student: Student) => (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            <header className="flex flex-wrap justify-between items-center gap-4 mb-4 pb-4 border-b">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Evaluando a: {student?.nombre} {student?.apellido1} {student?.apellido2}</h2>
                    <p className="text-sm text-gray-500">Rúbrica de Criterios (1º Trimestre)</p>
                </div>
                <div className="text-right bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Nota Final</p>
                    <p className="text-3xl font-bold text-blue-700">{finalPointsData.scale10.toFixed(2)}</p>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {PRACTICAL_EXAM_RUBRIC.map(ra => (
                    <div key={ra.id} className="bg-white p-4 rounded-xl shadow-xs border border-gray-200">
                        <h3 className="font-bold text-base mb-3 text-gray-800 flex items-center justify-between">
                            <span>{ra.name}</span>
                            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ra.weight * 100}%</span>
                        </h3>
                        <div className="space-y-4">
                            {ra.criteria.map(criterion => {
                                const currentScoreData = currentEvaluation?.scores?.[ra.id]?.[criterion.id];
                                return (
                                    <div key={criterion.id} className="border-t border-gray-100 pt-3">
                                        <p className="font-semibold text-xs text-gray-700 mb-2">{criterion.name}</p>
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            {SCORE_LEVELS.map(level => (
                                                <button key={level.value}
                                                    type="button"
                                                    onClick={() => handleScoreChange(ra.id, criterion.id, level.value, null)}
                                                    className={`px-3 py-1 text-xs text-white rounded-md transition-transform transform hover:scale-105 ${level.color} ${currentScoreData?.score === level.value ? 'ring-2 ring-offset-1 ring-black' : ''} ${currentScoreData?.score !== null && currentScoreData?.score !== level.value ? 'opacity-60' : ''}`}
                                                >
                                                    {level.label} ({level.value})
                                                </button>
                                            ))}
                                            {currentScoreData?.score !== null && (
                                                <button type="button" onClick={() => handleScoreChange(ra.id, criterion.id, null, null)} className="text-xs text-gray-400 hover:text-red-500 ml-2">Limpiar</button>
                                            )}
                                        </div>
                                        <textarea
                                            placeholder="Anotaciones técnicas..."
                                            value={currentScoreData?.notes || ''}
                                            onChange={(e) => handleScoreChange(ra.id, criterion.id, null, e.target.value)}
                                            className="w-full p-2 text-xs border rounded-md mt-1 bg-gray-50 focus:bg-white"
                                            rows={2}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <footer className="pt-4 mt-4 border-t flex gap-3">
                <button type="button" onClick={handleSaveEvaluation} className="flex-1 flex items-center justify-center bg-green-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-green-700 transition shadow-sm">
                    <SaveIcon className="w-5 h-5 mr-2" />
                    Guardar Examen
                </button>
            </footer>
        </div>
    );

    // Render for the new 100-point Examen Final rubric & checklist
    const renderFinalExamRubric = (student: Student) => {
        const headerData = currentEvaluation?.headerData || {};

        return (
            <div className="p-4 sm:p-6 h-full flex flex-col bg-gray-50/50">
                {/* Header with Title and Big Scores */}
                <header className="flex flex-wrap justify-between items-center gap-4 mb-4 pb-4 border-b bg-white p-4 rounded-2xl shadow-xs">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full inline-block mb-1">
                            {currentPeriodConfig.label} • 100 Puntos
                        </span>
                        <h2 className="text-xl font-extrabold text-gray-900">{student?.apellido1} {student?.apellido2}, {student?.nombre}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Baremo oficial de 100 puntos y checklist de verificación obligatoria</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-right bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Puntuación</span>
                            <span className="text-xl font-bold text-slate-800">{finalPointsData.total100.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ 100</span></span>
                        </div>
                        <div className="text-right bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-4 py-2 rounded-xl shadow-xs">
                            <span className="text-[10px] font-bold text-blue-200 uppercase block">Nota Final (0-10)</span>
                            <span className="text-3xl font-extrabold">{finalPointsData.scale10.toFixed(2)}</span>
                        </div>
                    </div>
                </header>

                {/* Exam Meta Info Bar (Fecha, Hora inicio, Duración, Hora fin) */}
                <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 shadow-2xs grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Fecha del Examen</label>
                        <input
                            type="text"
                            value={headerData.fecha || '15/09/2026'}
                            onChange={e => handleHeaderDataChange('fecha', e.target.value)}
                            placeholder="DD/MM/AAAA"
                            className="w-full p-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Hora de Inicio</label>
                        <input
                            type="text"
                            value={headerData.horaInicio || '08:15'}
                            onChange={e => handleHeaderDataChange('horaInicio', e.target.value)}
                            className="w-full p-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Hora Final</label>
                        <input
                            type="text"
                            value={headerData.horaFinal || '09:45'}
                            onChange={e => handleHeaderDataChange('horaFinal', e.target.value)}
                            className="w-full p-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Duración Total</label>
                        <div className="flex items-center gap-1.5">
                            <input
                                type="number"
                                value={headerData.duracionMin || 90}
                                onChange={e => handleHeaderDataChange('duracionMin', parseInt(e.target.value) || 0)}
                                className="w-20 p-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 text-center"
                            />
                            <span className="text-gray-500 font-semibold">min</span>
                        </div>
                    </div>
                </div>

                {/* Rubric Content */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-6">
                    {/* The 4 Rubric Sections */}
                    {FINAL_EXAM_SECTIONS.map((section, sIndex) => {
                        const sectionColors = [
                            { headerBg: 'bg-emerald-50 border-emerald-200 text-emerald-950', badge: 'bg-emerald-600 text-white' },
                            { headerBg: 'bg-blue-50 border-blue-200 text-blue-950', badge: 'bg-blue-600 text-white' },
                            { headerBg: 'bg-amber-50 border-amber-200 text-amber-950', badge: 'bg-amber-600 text-white' },
                            { headerBg: 'bg-purple-50 border-purple-200 text-purple-950', badge: 'bg-purple-600 text-white' },
                        ][sIndex % 4];

                        return (
                            <div key={section.id} className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                                {/* Section Header */}
                                <div className={`p-4 border-b flex flex-wrap justify-between items-center gap-2 ${sectionColors.headerBg}`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${sectionColors.badge}`}>
                                            {section.type}
                                        </span>
                                        <h3 className="font-bold text-sm tracking-wide text-gray-900">{section.title}</h3>
                                    </div>
                                    <span className="text-xs font-bold bg-white/80 border border-current px-2.5 py-1 rounded-lg">
                                        Máximo {section.totalMaxScore} pts
                                    </span>
                                </div>

                                {/* Criteria Rows */}
                                <div className="divide-y divide-gray-100">
                                    {section.criteria.map(crit => {
                                        const scoreData = currentEvaluation?.scores?.[section.id]?.[crit.id];
                                        const currentVal = scoreData?.score;

                                        return (
                                            <div key={crit.id} className="p-4 hover:bg-gray-50/50 transition">
                                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                    {/* Criterion Name & Desc */}
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-xs text-gray-900">{crit.name}</h4>
                                                            <span className="text-[10px] text-gray-500 font-medium">({crit.type})</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 leading-relaxed">{crit.description}</p>
                                                    </div>

                                                    {/* Score Input Box with Max Score indicator */}
                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                                                            <span className="text-[11px] font-bold text-gray-500 pl-1.5">Nota:</span>
                                                            <input
                                                                type="number"
                                                                step="0.5"
                                                                min="0"
                                                                max={crit.maxScore}
                                                                value={currentVal !== null && currentVal !== undefined ? currentVal : ''}
                                                                onChange={e => {
                                                                    const val = e.target.value === '' ? null : Math.min(crit.maxScore, Math.max(0, parseFloat(e.target.value) || 0));
                                                                    handleScoreChange(section.id, crit.id, val, null);
                                                                }}
                                                                placeholder="0"
                                                                className="w-16 p-1 text-center font-bold text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                            />
                                                            <span className="text-xs font-semibold text-gray-400 pr-1.5">/ {crit.maxScore}</span>
                                                        </div>

                                                        {/* Quick score buttons (0, mitad, max) */}
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleScoreChange(section.id, crit.id, 0, null)}
                                                                className="px-2 py-1 text-[10px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded"
                                                                title="Poner 0"
                                                            >
                                                                0
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleScoreChange(section.id, crit.id, Math.round((crit.maxScore / 2) * 10) / 10, null)}
                                                                className="px-2 py-1 text-[10px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded"
                                                                title="Puntuar a la mitad"
                                                            >
                                                                50%
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleScoreChange(section.id, crit.id, crit.maxScore, null)}
                                                                className="px-2 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded"
                                                                title="Puntuación máxima"
                                                            >
                                                                Máx
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Technical notes textarea */}
                                                <div className="mt-2.5">
                                                    <input
                                                        type="text"
                                                        placeholder="Observaciones técnicas / notas del criterio..."
                                                        value={scoreData?.notes || ''}
                                                        onChange={e => handleScoreChange(section.id, crit.id, null, e.target.value)}
                                                        className="w-full px-2.5 py-1 text-xs border border-gray-200 rounded-lg bg-gray-50/70 focus:bg-white focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Verification Checklist (Requisitos Obligatorios) */}
                    <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-xs p-5 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div>
                                <h3 className="font-extrabold text-sm text-indigo-950 uppercase tracking-wide flex items-center gap-2">
                                    <span>📋</span> Verificación de Requisitos Obligatorios (Checklist)
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">Comprobación técnica de condiciones mínimas exigidas en la prueba</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {FINAL_EXAM_CHECKLIST.map(group => (
                                <div key={group.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                                    <h4 className="font-bold text-xs text-slate-800 border-b border-slate-200 pb-1.5">{group.title}</h4>
                                    <div className="space-y-2">
                                        {group.items.map(item => {
                                            const isChecked = currentEvaluation?.checklist?.[item.id] ?? true;

                                            return (
                                                <div key={item.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200/60">
                                                    <span className="font-medium text-gray-700">{item.label}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleChecklistToggle(item.id, true)}
                                                            className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                                                                isChecked
                                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                            }`}
                                                        >
                                                            SÍ
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleChecklistToggle(item.id, false)}
                                                            className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                                                                !isChecked
                                                                    ? 'bg-rose-600 text-white shadow-xs'
                                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                            }`}
                                                        >
                                                            NO
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <footer className="pt-4 mt-4 border-t bg-white p-4 rounded-2xl shadow-xs flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="font-semibold text-gray-900">Total: {finalPointsData.total100.toFixed(1)} / 100</span>
                        <span>•</span>
                        <span className="font-bold text-blue-700">Calificación: {finalPointsData.scale10.toFixed(2)} / 10</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition text-xs shadow-xs active:scale-95"
                            title="Descargar la ficha de evaluación completa del examen en PDF"
                        >
                            <PrinterIcon className="w-4 h-4 mr-1.5" />
                            <span>Descargar Ficha PDF</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveEvaluation}
                            className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition text-xs shadow-xs active:scale-95"
                        >
                            <SaveIcon className="w-4 h-4 mr-1.5" />
                            <span>Guardar Examen</span>
                        </button>
                    </div>
                </footer>
            </div>
        );
    };

    const renderRubric = () => {
        if (!selectedStudentId || !currentEvaluation) {
            return (
                <div className="flex items-center justify-center h-full text-center text-gray-500 p-8">
                    <div className="max-w-md space-y-3">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                            <FileTextIcon className="w-8 h-8" />
                        </div>
                        <h3 className="font-bold text-lg text-gray-800">Selecciona un alumno</h3>
                        <p className="text-xs text-gray-500">
                            Elige a un alumno del listado izquierdo para calificar el <b>{currentPeriodConfig.label}</b>.
                        </p>
                    </div>
                </div>
            );
        }

        const student = students.find(s => s.id === selectedStudentId);
        if (!student) return null;

        if (currentPeriodConfig.isFinalFormat) {
            return renderFinalExamRubric(student);
        }
        return renderT1Rubric(student);
    };

    return (
        <div className={`flex h-full ${isFocusMode ? 'p-2 sm:p-4' : ''}`}>
            {/* Left Sidebar: Periods & Students */}
            <aside className={`flex flex-col bg-white shadow-lg border-r border-gray-200 ${isFocusMode ? 'w-full md:w-1/3' : 'w-full md:w-1/3 lg:w-1/4'}`}>
                {/* Header with Periods */}
                <header className="p-4 border-b space-y-3">
                    <div className="flex items-center justify-between">
                        <h1 className="text-lg font-extrabold text-gray-800">Exámenes Prácticos</h1>
                    </div>
                    {/* Period Tabs in exact order requested */}
                    <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1.5 rounded-xl">
                        {PERIODS.map(period => (
                            <button
                                key={period.key}
                                type="button"
                                onClick={() => setActivePeriod(period.key)}
                                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition text-center ${
                                    activePeriod === period.key
                                        ? 'bg-white shadow-xs text-blue-600'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                {period.label}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Search Input */}
                <div className="p-3 border-b">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                           <SearchIcon className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar alumno..."
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-9 p-2"
                        />
                    </div>
                </div>

                {/* Students List */}
                <nav className="flex-1 overflow-y-auto divide-y divide-gray-100">
                    {filteredStudents.map(student => {
                        const isEvaluated = evaluatedStudents.has(student.id);
                        const isSelected = selectedStudentId === student.id;

                        return (
                            <button
                                key={student.id}
                                type="button"
                                onClick={() => setSelectedStudentId(student.id)}
                                className={`w-full flex items-center p-3 text-left transition-colors border-l-4 ${
                                    isSelected
                                        ? 'bg-blue-50 border-blue-600'
                                        : 'border-transparent hover:bg-gray-50'
                                }`}
                            >
                                <img
                                    src={student.fotoUrl}
                                    alt=""
                                    className="w-8 h-8 rounded-full object-cover mr-3 border border-gray-200"
                                    onError={(e: any) => {
                                        e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(student.nombre + ' ' + student.apellido1);
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <span className="block text-xs font-semibold text-gray-800 truncate">
                                        {student.apellido1} {student.apellido2}, {student.nombre}
                                    </span>
                                </div>
                                {isEvaluated && (
                                    <span className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full" title="Examen evaluado"></span>
                                )}
                            </button>
                        );
                    })}
                    {filteredStudents.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-xs">
                            No se encontraron alumnos
                        </div>
                    )}
                </nav>

                {/* Footer with Focus Mode */}
                <footer className="p-2 border-t bg-gray-50">
                    <button
                        type="button"
                        onClick={() => setIsFocusMode(!isFocusMode)}
                        className="w-full text-xs text-center font-medium text-gray-600 hover:text-blue-600 p-1"
                    >
                        {isFocusMode ? 'Salir de Modo Foco' : 'Activar Modo Foco'}
                    </button>
                </footer>
            </aside>

            {/* Main Area: Evaluation Form */}
            <main className="flex-1 bg-gray-100 overflow-hidden">
                {renderRubric()}
            </main>
        </div>
    );
};

export default ExamenesPracticosView;

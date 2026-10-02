import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import StatCard from '../components/StatCard';
import ActionCard from '../components/ActionCard';
import { FileTextIcon, BookOpenIcon, PencilIcon, ClipboardListIcon, RotateCcwIcon, UsersIcon, CheckIcon, AlertTriangleIcon } from '../components/icons';
import { ModalNotasExamenesTeoricos } from '../components/ModalNotasExamenesTeoricos';

interface ModuleDashboardViewProps {
    module: 'pc' | 'optativa' | 'proyecto';
    onNavigate: (view: string) => void;
}

const MODULE_NAMES: Record<string, string> = {
    pc: 'Productos Culinarios',
    optativa: 'Optativa: Cocina Sostenible',
    proyecto: 'Proyecto Intermodular'
};

const ModuleDashboardView: React.FC<ModuleDashboardViewProps> = ({ module, onNavigate }) => {
    const context = useAppContext();
    const [isResetting, setIsResetting] = useState(false);
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);

    const [
        resultadosAprendizaje,
        criteriosEvaluacion,
        instrumentosEvaluacion,
        unidadesTrabajo
    ] = useMemo(() => {
        if (module === 'optativa') return [
            context.optativaResultadosAprendizaje,
            context.optativaCriteriosEvaluacion,
            context.optativaInstrumentosEvaluacion,
            context.optativaUnidadesTrabajo,
        ];
        if (module === 'proyecto') return [
            context.proyectoResultadosAprendizaje,
            context.proyectoCriteriosEvaluacion,
            context.proyectoInstrumentosEvaluacion,
            context.proyectoUnidadesTrabajo,
        ];
        return [ // default PC
            context.pcResultadosAprendizaje,
            context.pcCriteriosEvaluacion,
            context.pcInstrumentosEvaluacion,
            context.pcUnidadesTrabajo,
        ];
    }, [module, context]);

    const stats = useMemo(() => ({
        numRAs: Object.keys(resultadosAprendizaje || {}).length,
        numCriterios: Object.keys(criteriosEvaluacion || {}).length,
        numUTs: Object.keys(unidadesTrabajo || {}).length,
        numInstrumentos: Object.keys(instrumentosEvaluacion || {}).length,
    }), [resultadosAprendizaje, criteriosEvaluacion, unidadesTrabajo, instrumentosEvaluacion]);

    const moduleName = MODULE_NAMES[module];

    const handleResetCurriculum = async () => {
        if (window.confirm(`¿Deseas restablecer los RAs, Criterios, UTs e Instrumentos oficiales para el módulo ${moduleName} y sincronizarlos con la nube?`)) {
            setIsResetting(true);
            try {
                await context.handleResetModuleCurricularData(module);
            } finally {
                setIsResetting(false);
            }
        }
    };

    return (
        <div>
            <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Resumen del Módulo: {moduleName}</h1>
                    <p className="text-gray-500 mt-1">Visión general de la configuración, currículo y progreso del módulo.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    {module === 'proyecto' ? (
                        <button
                            onClick={() => onNavigate('proyecto-evaluacion')}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition"
                        >
                            <UsersIcon className="w-4 h-4" />
                            Evaluar Proyecto (Grupal / Individual)
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsExamModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                        >
                            <PencilIcon className="w-4 h-4" />
                            Acción Rápida: Poner Notas Exámenes Teóricos
                        </button>
                    )}
                    <button
                        onClick={handleResetCurriculum}
                        disabled={isResetting}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:text-blue-600 transition disabled:opacity-50"
                        title="Restaura la estructura oficial de RAs, Criterios, UTs y asociaciones de este módulo"
                    >
                        <RotateCcwIcon className={`w-4 h-4 ${isResetting ? 'animate-spin text-blue-600' : 'text-gray-500'}`} />
                        {isResetting ? 'Restableciendo...' : 'Restablecer Currículo Oficial'}
                    </button>
                </div>
            </header>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <StatCard icon={FileTextIcon} title="Resultados de Aprendizaje" value={stats.numRAs} color="#8b5cf6" />
                <StatCard icon={ClipboardListIcon} title="Criterios de Evaluación" value={stats.numCriterios} color="#3b82f6" />
                <StatCard icon={BookOpenIcon} title="Unidades de Trabajo" value={stats.numUTs} color="#10b981" />
                <StatCard icon={PencilIcon} title="Instrumentos" value={stats.numInstrumentos} color="#f59e0b" />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Acciones del Módulo</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {module === 'proyecto' ? (
                        <>
                            <ActionCard icon={ClipboardListIcon} title="Evaluación de Proyecto" description="Poner notas grupales de restaurante y notas individuales con justificaciones" onClick={() => onNavigate('proyecto-evaluacion')} color="#7c3aed" />
                            <ActionCard icon={UsersIcon} title="Definir Grupos de Proyecto" description="Crea restaurantes y equipos independientes de cocina" onClick={() => onNavigate('proyecto-grupos')} color="#9333ea" />
                            <ActionCard icon={UsersIcon} title="Coevaluación Diabólica" description="Gestión de valoraciones cruzadas entre alumnos" onClick={() => onNavigate('proyecto-coevaluacion')} color="#dc2626" />
                            <ActionCard icon={FileTextIcon} title="Gestionar RAs y Criterios" description="Define los resultados de aprendizaje" onClick={() => onNavigate(`${module}-ra`)} color="#8b5cf6" />
                            <ActionCard icon={BookOpenIcon} title="Gestionar Unidades de Trabajo" description="Organiza las fases del proyecto" onClick={() => onNavigate(`${module}-ut`)} color="#10b981" />
                            <ActionCard icon={PencilIcon} title="Gestionar Instrumentos" description="Configura los retos y fases del proyecto" onClick={() => onNavigate(`${module}-instrumentos`)} color="#f59e0b" />
                        </>
                    ) : (
                        <>
                            <ActionCard icon={PencilIcon} title="Notas Exámenes Teóricos" description="Acceso rápido para calificar exámenes teóricos sin candados" onClick={() => setIsExamModalOpen(true)} color="#2563eb" />
                            <ActionCard icon={RefreshCwIcon} title="Rotación de Brigada" description="Cuadrante automático y sugerencias de puestos equitativos" onClick={() => onNavigate('pc-rotacion-brigada')} color="#059669" />
                            <ActionCard icon={ChefHatIcon} title="Gestión Práctica" description="Planifica servicios, elaboraciones y temporizador de pase" onClick={() => onNavigate('pc-gestion-practica')} color="#d97706" />
                            <ActionCard icon={FileTextIcon} title="Gestionar RAs y Criterios" description="Define los resultados de aprendizaje" onClick={() => onNavigate(`${module}-ra`)} color="#8b5cf6" />
                            <ActionCard icon={BookOpenIcon} title="Gestionar Unidades de Trabajo" description="Organiza las unidades didácticas" onClick={() => onNavigate(`${module}-ut`)} color="#10b981" />
                            <ActionCard icon={PencilIcon} title="Gestionar Instrumentos" description="Configura los instrumentos de evaluación" onClick={() => onNavigate(`${module}-instrumentos`)} color="#f59e0b" />
                        </>
                    )}
                </div>
            </div>

            {module === 'pc' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-900 shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-blue-200 text-blue-800 rounded-lg">📝</span>
                        <div>
                            <span className="font-bold block">¿Quieres calificar o corregir exámenes teóricos?</span>
                            <span className="text-blue-700">Utiliza la acción rápida para poner notas de examen sin bloqueos y con opción de pegado masivo desde Excel.</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsExamModalOpen(true)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs transition whitespace-nowrap"
                    >
                        Abrir Calificador Rápido
                    </button>
                </div>
            )}

            {module === 'proyecto' && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-purple-900 shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-purple-200 text-purple-800 rounded-lg">🎯</span>
                        <div>
                            <span className="font-bold block">Evaluación de Proyecto por Restaurante / Equipos</span>
                            <span className="text-purple-700">Pon una nota grupal que se distribuye a todo el equipo, y personaliza la nota individual de quien no colabore o destaque indicando el motivo.</span>
                        </div>
                    </div>
                    <button
                        onClick={() => onNavigate('proyecto-evaluacion')}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-xs transition whitespace-nowrap"
                    >
                        Ir a Evaluar Proyecto
                    </button>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-md mt-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Listado de Alumnos y Notas</h2>
                    {module === 'pc' && (
                        <button
                            onClick={() => setIsExamModalOpen(true)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                            <PencilIcon className="w-3.5 h-3.5" /> Editar Exámenes Teóricos
                        </button>
                    )}
                    {module === 'proyecto' && (
                        <button
                            onClick={() => onNavigate('proyecto-evaluacion')}
                            className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                        >
                            <PencilIcon className="w-3.5 h-3.5" /> Poner / Modificar Notas de Proyecto
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 uppercase">
                            <tr>
                                <th className="px-6 py-3">Alumno</th>
                                {module === 'pc' ? (
                                    <>
                                        <th className="px-6 py-3">Examen 1 (T1)</th>
                                        <th className="px-6 py-3">Examen 2 (T2)</th>
                                        <th className="px-6 py-3">Servicios</th>
                                        <th className="px-6 py-3">Práctico</th>
                                        <th className="px-6 py-3 font-bold text-blue-900">Nota Final</th>
                                    </>
                                ) : module === 'proyecto' ? (
                                    <>
                                        <th className="px-6 py-3">Restaurante / Grupo</th>
                                        <th className="px-6 py-3 text-center">Nota Grupal</th>
                                        <th className="px-6 py-3 text-center">Nota Indiv.</th>
                                        <th className="px-6 py-3">¿Colaboró? / Motivo</th>
                                        <th className="px-6 py-3 font-bold text-purple-900 text-center">Nota Final Proyecto</th>
                                        <th className="px-6 py-3 text-center">Acción</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-6 py-3">T1</th>
                                        <th className="px-6 py-3">T2</th>
                                        <th className="px-6 py-3">T3</th>
                                        <th className="px-6 py-3">Rec</th>
                                        <th className="px-6 py-3 font-bold text-blue-900">Nota Final</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {context.students.map(student => {
                                return (
                                    <tr key={student.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{student.nombre} {student.apellido1} {student.apellido2}</td>
                                        {module === 'pc' ? (
                                            <>
                                                {(() => {
                                                    const examInstrument = Object.values(context.pcInstrumentosEvaluacion).find(inst => inst.nombre === 'Examen');
                                                    const getExamGrade = (activityName: string) => {
                                                        const activity = examInstrument?.activities.find(act => act.name === activityName);
                                                        if (!activity) return '-';
                                                        const grades = context.instrumentGrades[student.id]?.[activity.id];
                                                        const gradeObj = typeof grades === 'object' && grades !== null && 'normal' in grades ? grades : null;
                                                        if (!gradeObj) return typeof grades === 'number' ? grades.toFixed(2) : '-';
                                                        return Math.max(gradeObj.normal ?? 0, gradeObj.rec1 ?? 0, gradeObj.rec2 ?? 0).toFixed(2);
                                                    };
                                                    const studentGrades = context.calculatedStudentGrades[student.id];
                                                    const servAvg = ((studentGrades?.serviceAverages.t1 ?? 0) + (studentGrades?.serviceAverages.t2 ?? 0) + (studentGrades?.serviceAverages.t3 ?? 0));
                                                    const practAvg = ((studentGrades?.practicalExams.t1 ?? 0) + (studentGrades?.practicalExams.t2 ?? 0) + (studentGrades?.practicalExams.t3 ?? 0));
                                                    const pcFinal = studentGrades?.finalGrade !== undefined && studentGrades?.finalGrade !== null ? studentGrades.finalGrade.toFixed(2) : '-';

                                                    return (
                                                        <>
                                                            <td className="px-6 py-4 font-semibold text-gray-800">{getExamGrade('Examen 1')}</td>
                                                            <td className="px-6 py-4 font-semibold text-gray-800">{getExamGrade('Examen 2')}</td>
                                                            <td className="px-6 py-4">{servAvg.toFixed(2)}</td>
                                                            <td className="px-6 py-4">{practAvg.toFixed(2)}</td>
                                                            <td className="px-6 py-4 font-bold text-blue-700">{pcFinal}</td>
                                                        </>
                                                    );
                                                })()}
                                            </>
                                        ) : module === 'proyecto' ? (
                                            <>
                                                {(() => {
                                                    const ev = context.proyectoEvaluations?.studentEvaluations?.[student.id];
                                                    const grp = context.proyectoGroups.find(g => g.studentIds.includes(student.id));
                                                    const effectiveGrupal = ev?.notaGrupal ?? (grp ? context.proyectoEvaluations?.groupGrades?.[grp.id] ?? null : null);
                                                    const effectiveInd = ev?.notaIndividual ?? null;
                                                    const finalP = ev?.finalGrade ?? (context.courseGrades[student.id]?.proyecto?.final ?? null);
                                                    const hasIssue = ev && (!ev.collaborated || Boolean(ev.motivoAjuste));

                                                    return (
                                                        <>
                                                            <td className="px-6 py-4">
                                                                {grp ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                                                                        <span className={`w-2 h-2 rounded-full ${grp.color.split(' ')[0] || 'bg-purple-500'}`}></span>
                                                                        {grp.name}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400 italic text-xs">Sin Grupo</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center font-bold text-purple-900">
                                                                {effectiveGrupal !== null ? Number(effectiveGrupal).toFixed(2) : '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-center font-semibold text-blue-900">
                                                                {effectiveInd !== null ? Number(effectiveInd).toFixed(2) : '-'}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {hasIssue ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900" title={ev?.motivoAjuste}>
                                                                        <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-700" />
                                                                        {ev?.motivoAjuste ? ev.motivoAjuste : 'No colaboró'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-gray-500">Normal</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center font-bold text-purple-700">
                                                                {finalP !== null ? (
                                                                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${Number(finalP) >= 5 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                        {Number(finalP).toFixed(2)}
                                                                    </span>
                                                                ) : '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <button
                                                                    onClick={() => onNavigate('proyecto-evaluacion')}
                                                                    className="px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition"
                                                                >
                                                                    Evaluar
                                                                </button>
                                                            </td>
                                                        </>
                                                    );
                                                })()}
                                            </>
                                        ) : (
                                            <>
                                                {(() => {
                                                    const grades = context.courseGrades[student.id]?.[module];
                                                    const t1 = typeof grades?.t1 === 'number' ? grades.t1 : null;
                                                    const t2 = typeof grades?.t2 === 'number' ? grades.t2 : null;
                                                    const t3 = typeof grades?.t3 === 'number' ? grades.t3 : null;
                                                    const rec = typeof grades?.rec === 'number' ? grades.rec : null;
                                                    
                                                    const validTrims = [t1, t2, t3].filter((g): g is number => g !== null);
                                                    let finalGrade: string | number = '-';
                                                    if (rec !== null) {
                                                        finalGrade = rec.toFixed(2);
                                                    } else if (validTrims.length > 0) {
                                                        finalGrade = (validTrims.reduce((a, b) => a + b, 0) / validTrims.length).toFixed(2);
                                                    }

                                                    return (
                                                        <>
                                                            <td className="px-6 py-4">{grades?.t1 ?? '-'}</td>
                                                            <td className="px-6 py-4">{grades?.t2 ?? '-'}</td>
                                                            <td className="px-6 py-4">{grades?.t3 ?? '-'}</td>
                                                            <td className="px-6 py-4">{grades?.rec ?? '-'}</td>
                                                            <td className="px-6 py-4 font-bold text-blue-700">{finalGrade}</td>
                                                        </>
                                                    );
                                                })()}
                                            </>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Action Modal for Theoretical Exam Grades */}
            <ModalNotasExamenesTeoricos
                isOpen={isExamModalOpen}
                onClose={() => setIsExamModalOpen(false)}
                module={module}
            />
        </div>
    );
};

export default ModuleDashboardView;

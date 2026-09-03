import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import StatCard from '../components/StatCard';
import ActionCard from '../components/ActionCard';
import { FileTextIcon, BookOpenIcon, PencilIcon, ClipboardListIcon, RotateCcwIcon } from '../components/icons';

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
                <div className="flex items-center gap-3">
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
                    <ActionCard icon={FileTextIcon} title="Gestionar RAs y Criterios" description="Define los resultados de aprendizaje" onClick={() => onNavigate(`${module}-ra`)} color="#8b5cf6" />
                    <ActionCard icon={BookOpenIcon} title="Gestionar Unidades de Trabajo" description="Organiza las unidades didácticas" onClick={() => onNavigate(`${module}-ut`)} color="#10b981" />
                    <ActionCard icon={PencilIcon} title="Gestionar Instrumentos" description="Configura los instrumentos de evaluación" onClick={() => onNavigate(`${module}-instrumentos`)} color="#f59e0b" />
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md mt-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Listado de Alumnos y Notas</h2>
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
                                                            <td className="px-6 py-4">{getExamGrade('Examen 1')}</td>
                                                            <td className="px-6 py-4">{getExamGrade('Examen 2')}</td>
                                                            <td className="px-6 py-4">{servAvg.toFixed(2)}</td>
                                                            <td className="px-6 py-4">{practAvg.toFixed(2)}</td>
                                                            <td className="px-6 py-4 font-bold text-blue-700">{pcFinal}</td>
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
        </div>
    );
};

export default ModuleDashboardView;

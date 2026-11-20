
import React, { useState, useMemo, useEffect } from 'react';
import { Student, CourseModuleGrades, GradeValue, StudentCalculatedGrades, InstrumentoEvaluacion, StudentFemConfig, PcFemSettings } from '../types';
import { ACADEMIC_EVALUATION_STRUCTURE, COURSE_MODULES } from '../data/constants';
import { ClipboardListIcon, SaveIcon, ExportIcon, PencilIcon, LockClosedIcon, LockOpenIcon, PrinterIcon, SettingsIcon } from '../components/icons';
import { downloadExcel } from '../components/printUtils';
import { ExportButtons } from '../components/ExportButtons';
import { useAppContext } from '../context/AppContext';
import { calculateStudentPeriodAverages, calculateModularGrades, calculateStudentPcGradeComplete } from '../services/gradeCalculator';
import { generateAcademicReportPDF, generateGenericTablePDF } from '../services/reportGenerator';
import { StudentAvatar, formatStudentFullName } from '../components/StudentAvatar';

const EvaluacionInstrumentosTab: React.FC = () => {
    const { 
        students, 
        instrumentGrades, setInstrumentGrades,
        optativaInstrumentosEvaluacion,
        proyectoInstrumentosEvaluacion,
        pcInstrumentosEvaluacion,
        teacherData, instituteData,
        addToast,
        isStudentConvalidated
    } = useAppContext();

    const [selectedModule, setSelectedModule] = useState<'pc' | 'optativa' | 'proyecto'>('pc');
    const [localGrades, setLocalGrades] = useState(instrumentGrades);
    const [isDirty, setIsDirty] = useState(false);
    const [unlockedActivityIds, setUnlockedActivityIds] = useState<Set<string>>(new Set());

    const handleExport = (format: 'pdf' | 'excel') => {
        const headers = [['Alumno', ...activities.map(act => act.name)]];
        const rows = sortedStudents.map(student => [
            `${student.apellido1} ${student.apellido2}, ${student.nombre}`,
            ...activities.map(act => {
                const g = localGrades[student.id]?.[act.id];
                const val = typeof g === 'object' && g !== null && 'normal' in g ? g.normal : (typeof g === 'number' ? g : null);
                return val ?? '-';
            })
        ]);
        
        if (format === 'pdf') {
            generateGenericTablePDF(`Evaluación por Instrumentos - ${selectedModule.toUpperCase()}`, [headers[0]], rows, teacherData, instituteData);
        } else {
            downloadExcel(`Evaluación por Instrumentos - ${selectedModule.toUpperCase()}`, headers, [rows]);
        }
    };

    useEffect(() => {
        setLocalGrades(instrumentGrades);
        setIsDirty(false);
    }, [instrumentGrades]);

    useEffect(() => {
        // When module changes, check if there are unsaved changes
        if (isDirty) {
            if (window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos y cambiar de módulo?')) {
                setLocalGrades(instrumentGrades);
                setIsDirty(false);
                setUnlockedActivityIds(new Set());
            } else {
                setSelectedModule(prev => prev === 'pc' ? 'optativa' : 'pc');
            }
        } else {
            setUnlockedActivityIds(new Set());
        }
    }, [selectedModule]);

    const toggleActivityLock = (activityId: string) => {
        setUnlockedActivityIds(prev => {
            const next = new Set(prev);
            if (next.has(activityId)) {
                next.delete(activityId);
            } else {
                next.add(activityId);
            }
            return next;
        });
    };

    const handlePasteColumn = (e: React.ClipboardEvent, startIndex: number, activityId: string) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text');
        const rows = text.split(/\r?\n/).filter(r => r.trim() !== '');

        setLocalGrades(prev => {
            const newGrades = JSON.parse(JSON.stringify(prev));
            rows.forEach((rowValue, i) => {
                const studentIndex = startIndex + i;
                if (studentIndex < sortedStudents.length) {
                    const student = sortedStudents[studentIndex];
                    const numericValue = parseFloat(rowValue.trim().replace(',', '.'));
                    if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 10) {
                        if (!newGrades[student.id]) newGrades[student.id] = {};
                        newGrades[student.id][activityId] = numericValue;
                    }
                }
            });
            return newGrades;
        });
        setIsDirty(true);
    };

    const activities = useMemo(() => {
        const instruments = selectedModule === 'pc'
            ? pcInstrumentosEvaluacion
            : selectedModule === 'optativa'
            ? optativaInstrumentosEvaluacion
            : proyectoInstrumentosEvaluacion;
        const acts = Object.values(instruments as Record<string, InstrumentoEvaluacion>).flatMap(inst => 
            inst.activities.map(act => ({ ...act, instrumentName: inst.nombre }))
        );
        acts.sort((a,b) => {
            if (a.trimester < b.trimester) return -1;
            if (a.trimester > b.trimester) return 1;
            return a.name.localeCompare(b.name);
        });
        return acts;
    }, [selectedModule, pcInstrumentosEvaluacion, optativaInstrumentosEvaluacion, proyectoInstrumentosEvaluacion]);

    const sortedStudents = useMemo(() => {
        return [...students]
            .filter(student => !isStudentConvalidated(student.id, selectedModule))
            .sort((a, b) => (a.apellido1 || '').localeCompare(b.apellido1 || ''));
    }, [students, selectedModule, isStudentConvalidated]);

    const handleGradeChange = (studentId: string, activityId: string, value: string) => {
        const numericValue = value === '' ? null : parseFloat(value);
        if (value !== '' && (isNaN(numericValue) || numericValue < 0 || numericValue > 10)) return;

        setLocalGrades(prev => {
            const newGrades = JSON.parse(JSON.stringify(prev));
            if (!newGrades[studentId]) newGrades[studentId] = {};
            newGrades[studentId][activityId] = numericValue;
            return newGrades;
        });
        setIsDirty(true);
    };

    const handleSaveChanges = () => {
        setInstrumentGrades(localGrades);
        setIsDirty(false);
        addToast('Calificaciones guardadas con éxito.', 'success');
    };

    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    return (
        <div>
            <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                 <div className="flex items-center gap-4">
                    <label className="font-semibold">Seleccionar Módulo:</label>
                    <select value={selectedModule} onChange={e => setSelectedModule(e.target.value as 'optativa' | 'proyecto')} className="p-2 border rounded-md bg-white shadow-sm">
                        <option value="optativa">Optativa</option>
                        <option value="proyecto">Proyecto</option>
                    </select>
                 </div>
                 <div className="flex gap-2">
                    <ExportButtons onExportPdf={() => handleExport('pdf')} onExportExcel={() => handleExport('excel')} />
                    <button onClick={handleSaveChanges} disabled={!isDirty} className={`flex items-center px-4 py-2 rounded-lg font-semibold transition ${!isDirty ? 'bg-green-200 text-green-500 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}>
                        <SaveIcon className="w-5 h-5 mr-1" /> Guardar Cambios
                    </button>
                 </div>
            </div>
            
            <div className="overflow-x-auto">
                 {activities.length > 0 ? (
                    <table className="min-w-full text-xs text-center border-collapse">
                        <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>
                                <th className="p-2 border font-semibold text-gray-600 min-w-[220px] text-left sticky left-0 bg-gray-100 z-20">Alumno</th>
                                {activities.map(act => (
                                    <th key={act.id} className="p-2 border font-semibold text-gray-600" title={act.instrumentName}>
                                        <div className="flex items-center justify-center gap-2">
                                            {act.name} ({act.trimester.toUpperCase()})
                                            <button onClick={() => toggleActivityLock(act.id)} className="focus:outline-none">
                                                {unlockedActivityIds.has(act.id) ? (
                                                    <LockOpenIcon className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <LockClosedIcon className="w-4 h-4 text-red-600" />
                                                )}
                                            </button>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                             {sortedStudents.map((student, index) => (
                                <tr key={student.id} className={`group ${index % 2 !== 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-yellow-50`}>
                                    <td className={`p-1.5 border text-left font-semibold text-gray-800 min-w-[220px] sticky left-0 z-10 group-hover:bg-yellow-50 ${index % 2 !== 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                        <div className="flex items-center gap-2">
                                            <StudentAvatar student={student} size="xs" />
                                            <span className="truncate">{formatStudentFullName(student)}</span>
                                        </div>
                                    </td>
                                    {activities.map(act => (
                                        <td key={act.id} className="border">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0" max="10"
                                                value={localGrades[student.id]?.[act.id] ?? ''}
                                                onChange={e => handleGradeChange(student.id, act.id, e.target.value)}
                                                onPaste={e => {
                                                    handlePasteColumn(e, index, act.id);
                                                }}
                                                className="w-20 p-1.5 text-center bg-transparent focus:bg-yellow-100 outline-none"
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 ) : (
                     <div className="p-8 text-center text-gray-500">
                         No hay actividades de evaluación definidas para el módulo de {selectedModule}.
                         <br/>
                         Puedes añadirlas en la sección de 'Instrumentos' del módulo correspondiente.
                     </div>
                 )}
            </div>
        </div>
    );
}


const GestionAcademicaView: React.FC = () => {
    const { 
        students, 
        academicGrades, setAcademicGrades, 
        courseGrades, setCourseGrades, 
        calculatedStudentGrades, 
        instrumentGrades, setInstrumentGrades,
        optativaInstrumentosEvaluacion,
        proyectoInstrumentosEvaluacion,
        pcInstrumentosEvaluacion,
        teacherData, instituteData, addToast 
    } = useAppContext();

    const handleExport = (format: 'pdf' | 'excel') => {
        if (activeTab === 'principal') {
            const gradingsMap: Record<string, any> = {
                studentGrades: {}
            };

            students.forEach(student => {
                const averages = finalGradesAndAverages.studentGrades[student.id]?.averages || {};
                const calc = calculatedStudentGrades[student.id];
                const instGrades = instrumentGrades[student.id] || {};

                // Find Exam activities for calculations
                const examInstrument = (Object.values(pcInstrumentosEvaluacion) as InstrumentoEvaluacion[]).find((inst: InstrumentoEvaluacion) => 
                    inst.nombre?.toLowerCase() === 'examen' || inst.id?.toLowerCase() === 'examen'
                );
                
                const getExamGrade = (period: string, index: number) => {
                    if (!examInstrument) return null;
                    const activitiesInPeriod = (examInstrument.activities || []).filter(a => a.trimester === period);
                    const activity = activitiesInPeriod[index];
                    if (!activity) return null;
                    const grades = instGrades[activity.id];
                    return typeof grades === 'object' && grades !== null && 'normal' in grades ? grades.normal : (typeof grades === 'number' ? grades : null);
                };

                gradingsMap.studentGrades[student.id] = {
                    averages,
                    // T1
                    t1_ex1: getExamGrade('t1', 0),
                    t1_ex2: getExamGrade('t1', 1),
                    t1_serv: calc?.serviceAverages?.t1 ?? null,
                    t1_prac: calc?.practicalExams?.t1 ?? null,
                    // T2
                    t2_ex1: getExamGrade('t2', 0),
                    t2_ex2: getExamGrade('t2', 1),
                    t2_serv: calc?.serviceAverages?.t2 ?? null,
                    t2_prac: calc?.practicalExams?.t2 ?? null,
                    // Rec/Final
                    rec_ex: localAcademicGrades[student.id]?.rec?.manualGrades?.examenRec ?? null,
                    rec_prac: calc?.practicalExams?.rec ?? null
                };
            });

            if (format === 'pdf') {
                generateAcademicReportPDF(sortedStudents, gradingsMap, teacherData, instituteData);
            } else {
                const headers = [['Alumno', '1º T1_Ex1', '1º T1_Ex2', '1º Serv', '1º Prac', '1º MEDIA', '2º T1_Ex1', '2º T1_Ex2', '2º Serv', '2º Prac', '2º MEDIA', 'Rec Ex', 'Rec Prac', 'FINAL']];
                const body = sortedStudents.map(student => {
                    const g = gradingsMap.studentGrades[student.id];
                    return [
                        `${student.apellido1} ${student.apellido2}, ${student.nombre}`,
                        g.t1_ex1, g.t1_ex2, g.t1_serv, g.t1_prac, g.averages.t1,
                        g.t2_ex1, g.t2_ex2, g.t2_serv, g.t2_prac, g.averages.t2,
                        g.rec_ex, g.rec_prac, g.averages.final
                    ];
                });
                downloadExcel('Gestión Académica - Principal', headers, [body]);
            }
        } else if (activeTab === 'instrumentos') {
            // EvaluacionInstrumentosTab already handles its own export
        } else {
             addToast('Exportación para "Otros Módulos" aún no implementada.', 'info');
        }
    };
    
    const [activeTab, setActiveTab] = useState<'principal' | 'otros' | 'instrumentos' | 'fem'>('principal');
    const { 
        femConfigs, setFemConfigs, 
        pcFemSettings, setPcFemSettings 
    } = useAppContext();
    const [selectedFemStudent, setSelectedFemStudent] = useState<Student | null>(null);
    const [tempFemConfig, setTempFemConfig] = useState<StudentFemConfig>({ 
        hasFem1: false, fem1Grade: null, 
        hasFem2: false, fem2Grade: null, 
        hasFct: false, isConvalidated: false, 
        convalidationGrade: 5.0, convalidatedPart: null 
    });
    const [showWeightsModal, setShowWeightsModal] = useState<boolean>(false);
    const [tempWeights, setTempWeights] = useState<PcFemSettings>(pcFemSettings);

    const [localFemConfigs, setLocalFemConfigs] = useState(femConfigs);
    const [localPcFemSettings, setLocalPcFemSettings] = useState(pcFemSettings);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (selectedFemStudent) {
            const config = localFemConfigs[selectedFemStudent.id] || {
                hasFem1: false,
                fem1Grade: null,
                hasFem2: false,
                fem2Grade: null,
                hasFct: false,
                isConvalidated: false,
                convalidationGrade: 5.0,
                convalidatedPart: null
            };
            setTempFemConfig({ ...config });
        }
    }, [selectedFemStudent, localFemConfigs]);

    useEffect(() => {
        if (showWeightsModal) {
            setTempWeights({ ...localPcFemSettings });
        }
    }, [showWeightsModal, localPcFemSettings]);

    const handleSaveStudentFemConfig = () => {
        if (!selectedFemStudent) return;
        setLocalFemConfigs(prev => ({
            ...prev,
            [selectedFemStudent.id]: tempFemConfig
        }));
        setSelectedFemStudent(null);
        setIsDirty(true);
        addToast(`Configuración de prácticas guardada provisionalmente. Haz clic en Guardar Cambios para persistir.`, 'success');
    };

    const handleSaveWeights = () => {
        setLocalPcFemSettings(tempWeights);
        setShowWeightsModal(false);
        setIsDirty(true);
        addToast(`Ponderación ajustada provisionalmente. Haz clic en Guardar Cambios para persistir.`, 'success');
    };

    const [localAcademicGrades, setLocalAcademicGrades] = useState(academicGrades);
    const [localCourseGrades, setLocalCourseGrades] = useState(courseGrades);
    const [localInstrumentGrades, setLocalInstrumentGrades] = useState(instrumentGrades);
    const [isDirty, setIsDirty] = useState(false);
    
    const sortedStudents = useMemo(() => [...students].sort((a, b) => (a.apellido1 || '').localeCompare(b.apellido1 || '')), [students]);
    
    useEffect(() => {
        setLocalAcademicGrades(JSON.parse(JSON.stringify(academicGrades)));
        setLocalCourseGrades(JSON.parse(JSON.stringify(courseGrades)));
        setLocalFemConfigs(JSON.parse(JSON.stringify(femConfigs)));
        setLocalPcFemSettings(JSON.parse(JSON.stringify(pcFemSettings)));
        setLocalInstrumentGrades(JSON.parse(JSON.stringify(instrumentGrades)));
        setIsDirty(false);
    }, [academicGrades, courseGrades, femConfigs, pcFemSettings, instrumentGrades]);

    const finalGradesAndAverages = useMemo(() => {
        const studentGroups = students.reduce((acc, student) => {
            (acc[student.grupo] = acc[student.grupo] || []).push(student);
            return acc;
        }, {} as Record<string, Student[]>);

        Object.keys(studentGroups).forEach(groupName => {
            studentGroups[groupName].sort((a,b) => (a.apellido1 || '').localeCompare(b.apellido1 || ''));
        });

        const studentGrades: Record<string, { averages: Record<string, number | null> }> = {};
        students.forEach(student => {
            studentGrades[student.id] = {
                averages: calculateStudentPeriodAverages(
                    localAcademicGrades[student.id],
                    calculatedStudentGrades[student.id],
                    student.id,
                    localInstrumentGrades,
                    pcInstrumentosEvaluacion
                )
            };
        });
        
        return { studentGroups, studentGrades };
    }, [students, localAcademicGrades, calculatedStudentGrades, localInstrumentGrades, pcInstrumentosEvaluacion]);

    const getManualGradeDisplay = (studentId: string, periodKey: string, instrumentKey: string): string | number => {
        const manualVal = localAcademicGrades[studentId]?.[periodKey]?.manualGrades?.[instrumentKey];
        if (manualVal !== undefined && manualVal !== null) {
            return manualVal;
        }
        if (instrumentKey === 'examen1' || instrumentKey === 'examen2') {
            const examInstrument = (Object.values(pcInstrumentosEvaluacion) as InstrumentoEvaluacion[]).find((inst: InstrumentoEvaluacion) => 
                inst.nombre?.toLowerCase() === 'examen' || inst.id?.toLowerCase() === 'examen'
            );
            if (examInstrument) {
                const activitiesInPeriod = (examInstrument.activities || []).filter(a => a.trimester === periodKey);
                const activityIndex = instrumentKey === 'examen1' ? 0 : 1;
                const activity = activitiesInPeriod[activityIndex];
                if (activity) {
                    const grades = localInstrumentGrades[studentId]?.[activity.id] ?? instrumentGrades[studentId]?.[activity.id];
                    const grade = typeof grades === 'object' && grades !== null && 'normal' in grades ? grades.normal : (typeof grades === 'number' ? grades : null);
                    if (grade !== null && grade !== undefined) return grade;
                }
            }
        }
        return '';
    };

    const handleManualGradeChange = (studentId: string, periodKey: string, instrumentKey: string, value: string) => {
        const cleaned = value.replace(',', '.');
        const numericValue = cleaned === '' ? null : parseFloat(cleaned);
        if (cleaned !== '' && (isNaN(numericValue as number) || (numericValue as number) < 0 || (numericValue as number) > 10)) return;

        setLocalAcademicGrades(prev => {
            const newGrades = JSON.parse(JSON.stringify(prev));
            if (!newGrades[studentId]) newGrades[studentId] = {};
            if (!newGrades[studentId][periodKey]) newGrades[studentId][periodKey] = { manualGrades: {} };
            newGrades[studentId][periodKey].manualGrades[instrumentKey] = numericValue;
            return newGrades;
        });

        if (instrumentKey === 'examen1' || instrumentKey === 'examen2') {
            const examInstrument = (Object.values(pcInstrumentosEvaluacion) as InstrumentoEvaluacion[]).find((inst: InstrumentoEvaluacion) => 
                inst.nombre?.toLowerCase() === 'examen' || inst.id?.toLowerCase() === 'examen'
            );
            if (examInstrument) {
                const activitiesInPeriod = (examInstrument.activities || []).filter(a => a.trimester === periodKey);
                const activityIndex = instrumentKey === 'examen1' ? 0 : 1;
                const activity = activitiesInPeriod[activityIndex];
                if (activity) {
                    setLocalInstrumentGrades(prev => {
                        const newInstGrades = JSON.parse(JSON.stringify(prev));
                        if (!newInstGrades[studentId]) newInstGrades[studentId] = {};
                        const currentGrade = newInstGrades[studentId][activity.id];
                        if (typeof currentGrade === 'object' && currentGrade !== null && 'normal' in currentGrade) {
                            newInstGrades[studentId][activity.id] = { ...currentGrade, normal: numericValue, isLockedNormal: false };
                        } else {
                            newInstGrades[studentId][activity.id] = { normal: numericValue, rec1: null, rec2: null, isLockedNormal: false, isLockedRec1: false, isLockedRec2: false };
                        }
                        return newInstGrades;
                    });
                }
            }
        }

        setIsDirty(true);
    };

    const handleCourseGradeChange = (studentId: string, moduleName: string, period: keyof CourseModuleGrades, value: string) => {
        const numericValue = value === '' ? null : parseFloat(value);
         if (value !== '' && (isNaN(numericValue) || numericValue < 0 || numericValue > 10)) return;
        
        setLocalCourseGrades(prev => {
            const newGrades = JSON.parse(JSON.stringify(prev));
            if (!newGrades[studentId]) newGrades[studentId] = {};
            if (!newGrades[studentId][moduleName]) newGrades[studentId][moduleName] = {};
            newGrades[studentId][moduleName][period] = numericValue;
            return newGrades;
        });
        setIsDirty(true);
    };

    const handleToggleConvalidation = (studentId: string, moduleName: string) => {
        setLocalCourseGrades(prev => {
            const newGrades = JSON.parse(JSON.stringify(prev));
            if (!newGrades[studentId]) newGrades[studentId] = {};
            if (!newGrades[studentId][moduleName]) newGrades[studentId][moduleName] = {};

            const currentStatus = newGrades[studentId][moduleName].isConvalidated || false;
            newGrades[studentId][moduleName].isConvalidated = !currentStatus;

            if (!currentStatus) { // Si se está convalidando, limpiar notas
                newGrades[studentId][moduleName].t1 = null;
                newGrades[studentId][moduleName].t2 = null;
                newGrades[studentId][moduleName].t3 = null;
                newGrades[studentId][moduleName].rec = null;
            }

            return newGrades;
        });
        setIsDirty(true);
    };

    const handleSaveChanges = () => {
        if (activeTab === 'principal' || activeTab === 'otros' || activeTab === 'fem') {
            setAcademicGrades(localAcademicGrades);
            setCourseGrades(localCourseGrades);
            setFemConfigs(localFemConfigs);
            setPcFemSettings(localPcFemSettings);
            setInstrumentGrades(localInstrumentGrades);
            setIsDirty(false);
            addToast('Calificaciones, exámenes teóricos, ponderaciones y configuración de prácticas guardadas con éxito.', 'success');
        }
    };

    return (
    <div>
        <style type="text/css">{`
            @media print {
                .no-print { display: none !important; }
                table { page-break-inside: auto; width: 100%; border-collapse: collapse; }
                thead { display: table-header-group; }
                tr { page-break-inside: avoid; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
        `}</style>
        <header className="no-print flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                    <ClipboardListIcon className="w-8 h-8 mr-3 text-purple-500" />
                    Gestión Académica
                </h1>
                <p className="text-gray-500 mt-1">Introduce y visualiza todas las calificaciones del curso.</p>
            </div>
            {(activeTab === 'principal' || activeTab === 'otros' || activeTab === 'fem') && (
                <div className="flex items-center space-x-2">
                    {activeTab === 'principal' && (
                        <button 
                            onClick={() => setShowWeightsModal(true)} 
                            className="flex items-center px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-xs transition mr-2"
                        >
                            <SettingsIcon className="w-4 h-4 mr-1 inline-block" /> Ponderación PC/FEM
                        </button>
                    )}
                    {activeTab !== 'fem' && (
                        <ExportButtons onExportPdf={() => handleExport('pdf')} onExportExcel={() => handleExport('excel')} />
                    )}
                    <button onClick={handleSaveChanges} disabled={!isDirty} className={`flex items-center px-4 py-2 rounded-lg font-semibold transition ${!isDirty ? 'bg-green-200 text-green-500 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}>
                        <SaveIcon className="w-5 h-5 mr-1" /> Guardar Cambios
                    </button>
                </div>
            )}
        </header>

        <div className="no-print border-b border-gray-200 mb-6">
            <nav className="flex space-x-2">
                 <button onClick={() => setActiveTab('principal')} className={`px-4 py-2 font-medium text-sm rounded-md ${activeTab === 'principal' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}>Módulo Principal (PC)</button>
                 <button onClick={() => setActiveTab('fem')} className={`px-4 py-2 font-medium text-sm rounded-md ${activeTab === 'fem' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}><SettingsIcon className="w-4 h-4 mr-1 inline-block"/>Prácticas / FEM (PC)</button>
                 <button onClick={() => setActiveTab('instrumentos')} className={`px-4 py-2 font-medium text-sm rounded-md ${activeTab === 'instrumentos' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}><PencilIcon className="w-4 h-4 mr-2 inline-block"/>Evaluación por Instrumentos</button>
                 <button onClick={() => setActiveTab('otros')} className={`px-4 py-2 font-medium text-sm rounded-md ${activeTab === 'otros' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}>Otros Módulos</button>
            </nav>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {activeTab === 'principal' && (
            <div className="max-h-[75vh] overflow-y-auto overflow-x-auto relative">
                <table className="min-w-full text-xs text-center border-collapse">
                    <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th className="p-2 border font-semibold text-gray-600 min-w-[220px] text-left sticky left-0 z-30 bg-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" rowSpan={2}>Alumno</th>
                            {ACADEMIC_EVALUATION_STRUCTURE.periods.map(period => (<th key={period.key} className="p-2 border font-semibold text-gray-600 bg-gray-100" colSpan={period.instruments.length + 1}>{period.name}</th>))}
                            <th className="p-2 border font-semibold text-gray-600 bg-amber-50" rowSpan={2}>Media PC (Teo/Prac)</th>
                            <th className="p-2 border font-semibold text-gray-600 bg-stone-50" rowSpan={2}>+ Prácticas (FEM)</th>
                            <th className="p-2 border font-bold text-gray-800 bg-emerald-100" rowSpan={2}>NOTA FINAL MÓDULO</th>
                        </tr>
                        <tr>
                            {ACADEMIC_EVALUATION_STRUCTURE.periods.flatMap(period => [
                                ...period.instruments.map(instrument => (<th key={`${period.key}-${instrument.key}`} className={`p-2 border font-semibold text-gray-500 text-[10px] bg-gray-100`}>{instrument.name} ({instrument.weight * 100}%)</th>)),
                                <th key={`${period.key}-avg`} className="p-2 border font-bold text-gray-700 bg-gray-200">MEDIA</th>
                            ])}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(finalGradesAndAverages.studentGroups).map(([groupName, studentsInGroup]: [string, Student[]]) => (
                            <React.Fragment key={groupName}>
                                <tr><td colSpan={100} className="bg-gray-200 font-bold p-1 text-left pl-4 sticky top-[68px] z-10">{groupName}</td></tr>
                                {studentsInGroup.map((student, index) => (
                                <tr key={student.id} className={`group hover:bg-orange-100 ${index % 2 !== 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                        <td className={`p-1.5 border text-left font-semibold text-gray-800 min-w-[220px] sticky left-0 z-10 group-hover:bg-orange-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${index % 2 !== 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                            <div className="flex items-center gap-2">
                                                <StudentAvatar student={student} size="xs" />
                                                <span className="truncate">{formatStudentFullName(student)}</span>
                                            </div>
                                        </td>
                                        {ACADEMIC_EVALUATION_STRUCTURE.periods.flatMap(period => {
                                            const studentAverage = finalGradesAndAverages.studentGrades[student.id].averages[period.key];
                                            return [
                                                ...period.instruments.map(instrument => {
                                                    let calculatedGrade: number | null = null;
                                                    if (instrument.type === 'calculated') {
                                                        if (instrument.key === 'servicios') {
                                                            const periodKey = period.key as 't1' | 't2' | 't3';
                                                            calculatedGrade = calculatedStudentGrades[student.id]?.serviceAverages[periodKey] ?? null;
                                                        } else {
                                                            const examKeyMap: Record<string, keyof StudentCalculatedGrades['practicalExams']> = {
                                                                'exPracticoT1': 't1',
                                                                'exPracticoT2': 't2',
                                                                'exPracticoT3': 't3',
                                                                'exPracticoRec': 'rec',
                                                            };
                                                            const examKey = examKeyMap[instrument.key];
                                                            if (examKey) {
                                                                calculatedGrade = calculatedStudentGrades[student.id]?.practicalExams[examKey] ?? null;
                                                            }
                                                        }
                                                    }
                                                    return (
                                                    <td key={`${period.key}-${instrument.key}`} className={`border ${instrument.type === 'calculated' ? 'bg-sky-50' : 'bg-amber-50/20'}`}>
                                                    {instrument.type === 'manual' ? (
                                                        <input 
                                                            type="number" 
                                                            step="0.1" 
                                                            min="0" 
                                                            max="10" 
                                                            value={getManualGradeDisplay(student.id, period.key, instrument.key)} 
                                                            onChange={e => handleManualGradeChange(student.id, period.key, instrument.key, e.target.value)} 
                                                            placeholder="-"
                                                            title={`Nota de ${instrument.name} (${period.name}). Haz clic para escribir.`}
                                                            className="w-16 p-1.5 text-center bg-transparent focus:bg-yellow-100 hover:bg-white border border-transparent focus:border-blue-400 hover:border-gray-300 rounded outline-none transition font-medium text-xs"
                                                        />
                                                    ) : (<span className="p-1.5 block">{calculatedGrade !== null ? calculatedGrade.toFixed(2) : '-'}</span>)}
                                                    </td>
                                                )}),
                                                <td key={`${period.key}-avg`} className={`p-1.5 border font-bold ${studentAverage !== null && studentAverage < 5 ? 'text-red-600' : 'text-black'} bg-stone-100`}>{studentAverage?.toFixed(2) ?? '-'}</td>
                                            ]
                                        })}
                                        {(() => {
                                            const studentAverageMap = finalGradesAndAverages.studentGrades[student.id].averages;
                                            const femConfig = localFemConfigs[student.id];
                                            const complete = calculateStudentPcGradeComplete(studentAverageMap, femConfig, localPcFemSettings);
                                            
                                            return (
                                                <>
                                                    {/* Media PC (Teo/Prac) before FEM */}
                                                    <td className={`p-1.5 border font-semibold bg-amber-50/50 ${complete.isFailedAcademic ? 'text-red-600' : 'text-gray-800'}`}>
                                                        {complete.academicGrade !== null ? complete.academicGrade.toFixed(2) : '-'}
                                                    </td>

                                                    {/* + Prácticas (FEM) Status */}
                                                    <td className="p-1 border text-center whitespace-nowrap bg-stone-50">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setActiveTab('fem')} 
                                                            className="px-2 py-1 bg-white border hover:bg-indigo-50 text-indigo-700 border-indigo-200 rounded text-[10px] inline-flex items-center gap-1 font-semibold shadow-sm transition"
                                                            title="Haz clic para ver y configurar las prácticas en la pestaña dedicada"
                                                        >
                                                            <SettingsIcon className="w-3 h-3 text-indigo-500 inline-block" />
                                                            {complete.isFctActive ? 'FCT (Antigua)' : complete.isFemActive && complete.femGrade !== null ? `FEM (${complete.femGrade?.toFixed(1)})` : 'Configurar'}
                                                        </button>
                                                    </td>

                                                    {/* NOTA FINAL MÓDULO */}
                                                    <td className={`p-1.5 border font-extrabold text-[13px] ${complete.finalGrade !== null && complete.finalGrade < 5 ? 'text-red-600' : 'text-emerald-700'} bg-emerald-50`}>
                                                        {complete.finalGrade !== null ? complete.finalGrade.toFixed(2) : '-'}
                                                    </td>
                                                </>
                                            );
                                        })()}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
        {activeTab === 'fem' && (
            <div className="p-6 space-y-6">
                {/* 1. Global Weighting Controls */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100 shadow-sm">
                    <div className="flex items-center space-x-2.5 mb-3">
                        <SettingsIcon className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-gray-800 text-sm">Configuración de Ponderación Global (PC y FEM)</h3>
                    </div>
                    <p className="text-gray-600 text-xs mb-4">
                        Define los pesos porcentuales utilizados para calcular la nota final uniendo la parte académica (Productos Culinarios) y la parte práctica en empresas.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                        <div className="space-y-1.5 text-left">
                            <label className="block text-xs font-semibold text-gray-700">Ponderación Académica PC (%):</label>
                            <div className="relative rounded-md shadow-sm">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={localPcFemSettings.pcWeight}
                                    onChange={e => {
                                        const pcVal = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                        setLocalPcFemSettings(prev => ({ ...prev, pcWeight: pcVal, femWeight: 100 - pcVal }));
                                        setIsDirty(true);
                                    }}
                                    className="w-full pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 text-xs font-bold">%</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 text-left">
                            <label className="block text-xs font-semibold text-gray-700">Ponderación Prácticas FEM (%):</label>
                            <div className="relative rounded-md shadow-sm">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={localPcFemSettings.femWeight}
                                    onChange={e => {
                                        const femVal = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                        setLocalPcFemSettings(prev => ({ ...prev, femWeight: femVal, pcWeight: 100 - femVal }));
                                        setIsDirty(true);
                                    }}
                                    className="w-full pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 text-xs font-bold">%</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-white/70 border rounded-lg flex items-center cursor-pointer select-none">
                            <label className="flex items-start gap-2.5 font-medium text-gray-700 cursor-pointer w-full">
                                <input
                                    type="checkbox"
                                    checked={localPcFemSettings.recEvaluates100Percent}
                                    onChange={e => {
                                        setLocalPcFemSettings(prev => ({ ...prev, recEvaluates100Percent: e.target.checked }));
                                        setIsDirty(true);
                                    }}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5"
                                />
                                <div className="text-left">
                                    <span className="text-xs font-semibold block">REC evalúa al 100% directly</span>
                                    <span className="text-[10px] text-gray-500 block leading-tight">Ignora la nota FEM en caso de ir a recuperación.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* 2. Students List with search bar and inline editor */}
                <div className="space-y-4">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="text-left">
                            <h4 className="font-bold text-gray-800 text-sm">Régimen y Calificaciones de Prácticas por Alumno</h4>
                            <p className="text-gray-500 text-[11px]">Asigna o modifica el estado de las prácticas de cada estudiante.</p>
                        </div>
                        <div className="w-full sm:w-64">
                            <input
                                type="text"
                                placeholder="🔍 Buscar alumno..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto bg-white rounded-lg border shadow-sm">
                        <table className="min-w-full text-xs text-center border-collapse">
                            <thead className="bg-gray-100 sticky top-0 z-10 font-semibold text-gray-700">
                                <tr className="border-b">
                                    <th className="p-3 border text-left min-w-[220px] sticky left-0 bg-gray-100 z-20">Alumno</th>
                                    <th className="p-3 border w-44">Régimen de Prácticas</th>
                                    <th className="p-3 border text-left">Variables y Calificaciones de Prácticas</th>
                                    <th className="p-3 border w-36">Nota Prácticas</th>
                                    <th className="p-3 border w-40 bg-indigo-50/50">Nota Final (PC + FEM)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(finalGradesAndAverages.studentGroups).map(([groupName, studentsInGroup]: [string, Student[]]) => {
                                    // Filter students in current group based on search query
                                    const filteredStudents = studentsInGroup.filter(student => {
                                        const fullName = `${student.nombre} ${student.apellido1} ${student.apellido2}`.toLowerCase();
                                        return fullName.includes(searchQuery.toLowerCase());
                                    });

                                    if (filteredStudents.length === 0) return null;

                                    return (
                                        <React.Fragment key={groupName}>
                                            <tr className="bg-indigo-50/30">
                                                <td colSpan={5} className="border p-2 text-left font-bold text-indigo-900 border-indigo-100 pl-4 bg-indigo-50/20">
                                                    📌 {groupName}
                                                </td>
                                            </tr>
                                            {filteredStudents.map((student, sIdx) => {
                                                const stConfig = localFemConfigs[student.id] || {
                                                    hasFem1: false,
                                                    fem1Grade: null,
                                                    hasFem2: false,
                                                    fem2Grade: null,
                                                    hasFct: false,
                                                    isConvalidated: false,
                                                    convalidationGrade: 5.0,
                                                    convalidatedPart: null
                                                };

                                                const currentRegime = stConfig.isConvalidated 
                                                    ? 'convalidated' 
                                                    : stConfig.hasFct 
                                                        ? 'fct' 
                                                        : (stConfig.hasFem1 || stConfig.hasFem2) 
                                                            ? 'dual' 
                                                            : 'none';

                                                const studentAverageMap = finalGradesAndAverages.studentGrades[student.id].averages;
                                                const complete = calculateStudentPcGradeComplete(studentAverageMap, stConfig, localPcFemSettings);

                                                return (
                                                    <tr key={student.id} className={`hover:bg-indigo-50/10 border-b ${sIdx % 2 !== 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                                        {/* Student Name */}
                                                        <td className="p-2.5 border text-left font-semibold text-gray-800 min-w-[220px] sticky left-0 z-10 bg-inherit shadow-[1px_0_0_rgba(0,0,0,0.1)]">
                                                            <div className="flex items-center gap-2">
                                                                <StudentAvatar student={student} size="xs" />
                                                                <span className="truncate">{formatStudentFullName(student)}</span>
                                                            </div>
                                                        </td>

                                                        {/* Régime selection Dropdown */}
                                                        <td className="p-3 border">
                                                            <select
                                                                value={currentRegime}
                                                                onChange={e => {
                                                                    const val = e.target.value as 'none' | 'dual' | 'fct' | 'convalidated';
                                                                    setLocalFemConfigs(prev => {
                                                                        const orig = prev[student.id] || {
                                                                            hasFem1: false, fem1Grade: null,
                                                                            hasFem2: false, fem2Grade: null,
                                                                            hasFct: false, isConvalidated: false,
                                                                            convalidationGrade: 5.0, convalidatedPart: null
                                                                        };
                                                                        const updated = { ...orig };

                                                                        if (val === 'none') {
                                                                            updated.hasFem1 = false;
                                                                            updated.hasFem2 = false;
                                                                            updated.hasFct = false;
                                                                            updated.isConvalidated = false;
                                                                        } else if (val === 'dual') {
                                                                            updated.hasFem1 = false;
                                                                            updated.hasFem2 = true; // Activo FEM2 por defecto
                                                                            updated.hasFct = false;
                                                                            updated.isConvalidated = false;
                                                                            if (updated.fem2Grade === null) updated.fem2Grade = 5.0;
                                                                        } else if (val === 'fct') {
                                                                            updated.hasFem1 = false;
                                                                            updated.hasFem2 = false;
                                                                            updated.hasFct = true;
                                                                            updated.isConvalidated = false;
                                                                        } else if (val === 'convalidated') {
                                                                            updated.hasFem1 = false;
                                                                            updated.hasFem2 = false;
                                                                            updated.hasFct = false;
                                                                            updated.isConvalidated = true;
                                                                            updated.convalidationGrade = 5.0;
                                                                            updated.convalidatedPart = null;
                                                                        }
                                                                        return { ...prev, [student.id]: updated };
                                                                    });
                                                                    setIsDirty(true);
                                                                }}
                                                                className="w-full bg-white border border-gray-300 rounded px-2 py-1 bg-transparent hover:border-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                                                            >
                                                                <option value="none">Sin prácticas / No realiza</option>
                                                                <option value="dual">Dual / Prácticas FEM</option>
                                                                <option value="fct">FCT Antigua (Plan Extinto)</option>
                                                                <option value="convalidated">Convalidación / Exención</option>
                                                            </select>
                                                        </td>

                                                        {/* Regime-specific dynamic configurations */}
                                                        <td className="p-3 border text-left">
                                                            {currentRegime === 'none' && (
                                                                <span className="text-gray-400 italic">No cursa módulo de FCT/FEM ni posee convalidación aplicada.</span>
                                                            )}

                                                            {currentRegime === 'fct' && (
                                                                <span className="text-gray-500 font-semibold">
                                                                    🎓 Plan extinguido activo. No pondera (módulo académico califica al 100%).
                                                                </span>
                                                            )}

                                                            {currentRegime === 'convalidated' && (
                                                                <div className="flex flex-wrap items-center gap-4">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-gray-600 font-medium text-[11px]">Parte Convalidada:</span>
                                                                        <select
                                                                            value={stConfig.convalidatedPart || ''}
                                                                            onChange={e => {
                                                                                const partVal = (e.target.value || null) as any;
                                                                                setLocalFemConfigs(prev => ({
                                                                                    ...prev,
                                                                                    [student.id]: {
                                                                                        ...(prev[student.id] || stConfig),
                                                                                        convalidatedPart: partVal
                                                                                    }
                                                                                }));
                                                                                setIsDirty(true);
                                                                            }}
                                                                            className="bg-white border rounded px-1.5 py-0.5 text-[11px]"
                                                                        >
                                                                            <option value="">-- Módulo Completo --</option>
                                                                            <option value="fem1">FEM 1 (Prácticas Fase 1)</option>
                                                                            <option value="fem2">FEM 2 (Prácticas Fase 2)</option>
                                                                            <option value="fct">FCT (Fase Extinta)</option>
                                                                        </select>
                                                                    </div>

                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-gray-600 font-medium text-[11px]">Nota convalidada:</span>
                                                                        <input
                                                                            type="number"
                                                                            step="0.1"
                                                                            min="0"
                                                                            max="10"
                                                                            value={stConfig.convalidationGrade ?? 5.0}
                                                                            onChange={e => {
                                                                                const valFloat = Math.min(10, Math.max(0, parseFloat(e.target.value) || 0));
                                                                                setLocalFemConfigs(prev => ({
                                                                                    ...prev,
                                                                                    [student.id]: {
                                                                                        ...(prev[student.id] || stConfig),
                                                                                        convalidationGrade: valFloat
                                                                                    }
                                                                                }));
                                                                                setIsDirty(true);
                                                                            }}
                                                                            className="w-16 border rounded text-center font-bold px-1 py-0.5 text-[11px]"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {currentRegime === 'dual' && (
                                                                <div className="flex flex-wrap items-center gap-6">
                                                                    {/* FEM 1 */}
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`fem1-chk-${student.id}`}
                                                                            checked={stConfig.hasFem1}
                                                                            onChange={e => {
                                                                                const checkVal = e.target.checked;
                                                                                setLocalFemConfigs(prev => {
                                                                                    const orig = prev[student.id] || stConfig;
                                                                                    return {
                                                                                        ...prev,
                                                                                        [student.id]: {
                                                                                            ...orig,
                                                                                            hasFem1: checkVal,
                                                                                            fem1Grade: checkVal && orig.fem1Grade === null ? 5.0 : orig.fem1Grade
                                                                                        }
                                                                                    };
                                                                                });
                                                                                setIsDirty(true);
                                                                            }}
                                                                            className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                                                        />
                                                                        <label htmlFor={`fem1-chk-${student.id}`} className="font-semibold text-gray-700 cursor-pointer select-none">FEM 1 (1º Año)</label>
                                                                        {stConfig.hasFem1 && (
                                                                            <input
                                                                                type="number"
                                                                                step="0.1"
                                                                                min="0"
                                                                                max="10"
                                                                                value={stConfig.fem1Grade ?? ''}
                                                                                placeholder="0.0"
                                                                                onChange={e => {
                                                                                    const gradeVal = e.target.value === '' ? null : Math.min(10, Math.max(0, parseFloat(e.target.value) || 0));
                                                                                    setLocalFemConfigs(prev => ({
                                                                                        ...prev,
                                                                                        [student.id]: {
                                                                                            ...(prev[student.id] || stConfig),
                                                                                            fem1Grade: gradeVal
                                                                                        }
                                                                                    }));
                                                                                    setIsDirty(true);
                                                                                }}
                                                                                className="w-14 border rounded text-center px-1 font-semibold"
                                                                            />
                                                                        )}
                                                                    </div>

                                                                    {/* FEM 2 */}
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`fem2-chk-${student.id}`}
                                                                            checked={stConfig.hasFem2}
                                                                            onChange={e => {
                                                                                const checkVal = e.target.checked;
                                                                                setLocalFemConfigs(prev => {
                                                                                    const orig = prev[student.id] || stConfig;
                                                                                    return {
                                                                                        ...prev,
                                                                                        [student.id]: {
                                                                                            ...orig,
                                                                                            hasFem2: checkVal,
                                                                                            fem2Grade: checkVal && orig.fem2Grade === null ? 5.0 : orig.fem2Grade
                                                                                        }
                                                                                    };
                                                                                });
                                                                                setIsDirty(true);
                                                                            }}
                                                                            className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                                                        />
                                                                        <label htmlFor={`fem2-chk-${student.id}`} className="font-semibold text-gray-700 cursor-pointer select-none">FEM 2 (2º Año)</label>
                                                                        {stConfig.hasFem2 && (
                                                                            <input
                                                                                type="number"
                                                                                step="0.1"
                                                                                min="0"
                                                                                max="10"
                                                                                value={stConfig.fem2Grade ?? ''}
                                                                                placeholder="0.0"
                                                                                onChange={e => {
                                                                                    const gradeVal = e.target.value === '' ? null : Math.min(10, Math.max(0, parseFloat(e.target.value) || 0));
                                                                                    setLocalFemConfigs(prev => ({
                                                                                        ...prev,
                                                                                        [student.id]: {
                                                                                            ...(prev[student.id] || stConfig),
                                                                                            fem2Grade: gradeVal
                                                                                        }
                                                                                    }));
                                                                                    setIsDirty(true);
                                                                                }}
                                                                                className="w-14 border rounded text-center px-1 font-semibold"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Calculated FEM Grade block */}
                                                        <td className="p-3 border font-bold text-gray-700">
                                                            {complete.isFctActive ? (
                                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">Apto (FCT)</span>
                                                            ) : complete.isFemActive && complete.femGrade !== null ? (
                                                                <span className={`px-2.5 py-0.5 rounded text-[11px] ${complete.femGrade >= 5 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                                                    {complete.femGrade.toFixed(2)}
                                                                </span>
                                                            ) : complete.isFemActive ? (
                                                                <span className="text-gray-400 italic text-[10px]">Falta nota</span>
                                                            ) : (
                                                                <span className="text-gray-400 italic text-[10px]">-</span>
                                                            )}
                                                        </td>

                                                        {/* Combined final estimated grade */}
                                                        <td className="p-3 border bg-indigo-50/10 font-bold">
                                                            {complete.finalGrade !== null ? (
                                                                <div className="flex flex-col items-center justify-center">
                                                                    <span className={`text-[13px] font-extrabold ${complete.finalGrade >= 5 ? 'text-indigo-800' : 'text-red-600'}`}>
                                                                        {complete.finalGrade.toFixed(2)}
                                                                    </span>
                                                                    <span className="text-[9px] text-gray-400 font-normal leading-none mt-0.5" title={complete.femLabel}>
                                                                        {complete.isFctActive ? '100% PC' : complete.isFemActive && !complete.isFailedAcademic ? `${localPcFemSettings.pcWeight}% + ${localPcFemSettings.femWeight}%` : 'Módulo PC'}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
        {activeTab === 'instrumentos' && (
            <EvaluacionInstrumentosTab />
        )}
        {activeTab === 'otros' && (
             <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-center">
                     <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border font-semibold text-gray-600 text-left min-w-[220px] sticky left-0 bg-gray-100 z-20">Alumno</th>
                            {COURSE_MODULES.map(module => <th key={module.name} colSpan={module.trimesters + 3} className="p-2 border font-semibold text-gray-600">{module.name}</th>)}
                        </tr>
                         <tr>
                            <th className="p-2 border font-semibold text-gray-600 text-left min-w-[220px] sticky left-0 bg-gray-100 z-20"></th>
                            {COURSE_MODULES.flatMap(module => [
                                <th key={`${module.name}-t1`} className="p-2 border font-semibold text-gray-500 text-[10px]">T1</th>,
                                <th key={`${module.name}-t2`} className="p-2 border font-semibold text-gray-500 text-[10px]">T2</th>,
                                ...(module.trimesters === 3 ? [<th key={`${module.name}-t3`} className="p-2 border font-semibold text-gray-500 text-[10px]">T3</th>] : []),
                                <th key={`${module.name}-rec`} className="p-2 border font-semibold text-gray-500 text-[10px]">REC</th>,
                                <th key={`${module.name}-final`} className="p-2 border font-bold text-gray-700 bg-gray-200">FINAL</th>,
                                <th key={`${module.name}-action`} className="p-2 border font-semibold text-gray-500 text-[10px]">Acción</th>,
                            ])}
                        </tr>
                    </thead>
                    <tbody>
                         {students.map((student, index) => (
                            <tr key={student.id} className={`group hover:bg-orange-100 ${index % 2 !== 0 ? 'bg-blue-50' : 'bg-green-50'}`}>
                                <td className={`p-1.5 border text-left font-semibold text-gray-800 min-w-[220px] sticky left-0 z-10 group-hover:bg-orange-100 ${index % 2 !== 0 ? 'bg-blue-50' : 'bg-green-50'}`}>
                                    <div className="flex items-center gap-2">
                                        <StudentAvatar student={student} size="xs" />
                                        <span className="truncate">{formatStudentFullName(student)}</span>
                                    </div>
                                </td>
                                {COURSE_MODULES.map(module => {
                                    const studentCourseGrades = localCourseGrades[student.id] || {};
                                    const isConvalidated = studentCourseGrades[module.name]?.isConvalidated;
                                    
                                    let gradesObj: { t1: number | null, t2: number | null, t3: number | null, final: number | null };
                                    let calculated = false;

                                    if (module.name === 'Optativa') {
                                        gradesObj = calculateModularGrades(student.id, instrumentGrades, optativaInstrumentosEvaluacion, calculatedStudentGrades[student.id]);
                                        calculated = true;
                                    } else if (module.name === 'Proyecto') {
                                        gradesObj = calculateModularGrades(student.id, instrumentGrades, proyectoInstrumentosEvaluacion, calculatedStudentGrades[student.id]);
                                        calculated = true;
                                    } else {
                                        const stored = studentCourseGrades[module.name] || {};
                                        const valid = [stored.t1, stored.t2, module.trimesters === 3 ? stored.t3 : null].filter(g => g !== null && g !== undefined) as number[];
                                        gradesObj = {
                                            t1: stored.t1 ?? null,
                                            t2: stored.t2 ?? null,
                                            t3: stored.t3 ?? null,
                                            final: valid.length > 0 ? (valid.reduce((a,b) => a+b, 0) / valid.length) : null
                                        };
                                    }

                                    const recVal = studentCourseGrades[module.name]?.rec ?? null; 

                                    return (
                                        <React.Fragment key={module.name}>
                                            {isConvalidated ? (
                                                <>
                                                    <td colSpan={module.trimesters + 2} className="border text-center font-bold text-green-600 bg-green-50">CONVALIDADA</td>
                                                    <td className="border text-center"><button onClick={() => handleToggleConvalidation(student.id, module.name)} className="text-xs text-gray-500 hover:text-red-600 p-1">Anular</button></td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className={`${calculated ? 'bg-gray-50' : ''}`}>
                                                        {calculated ? 
                                                            <span className="p-1.5 block text-center font-medium text-gray-700">{gradesObj.t1?.toFixed(2) ?? '-'}</span> :
                                                            <input type="number" step="0.1" min="0" max="10" value={gradesObj.t1 ?? ''} onChange={e => handleCourseGradeChange(student.id, module.name, 't1', e.target.value)} className="w-16 p-1.5 text-center bg-transparent focus:bg-yellow-100 outline-none" />
                                                        }
                                                    </td>
                                                    <td className={`${calculated ? 'bg-gray-50' : ''}`}>
                                                        {calculated ?
                                                            <span className="p-1.5 block text-center font-medium text-gray-700">{gradesObj.t2?.toFixed(2) ?? '-'}</span> :
                                                            <input type="number" step="0.1" min="0" max="10" value={gradesObj.t2 ?? ''} onChange={e => handleCourseGradeChange(student.id, module.name, 't2', e.target.value)} className="w-16 p-1.5 text-center bg-transparent focus:bg-yellow-100 outline-none" />
                                                        }
                                                    </td>
                                                    {module.trimesters === 3 && (
                                                        <td className={`${calculated ? 'bg-gray-50' : ''}`}>
                                                            {calculated ?
                                                                <span className="p-1.5 block text-center font-medium text-gray-700">{gradesObj.t3?.toFixed(2) ?? '-'}</span> :
                                                                <input type="number" step="0.1" min="0" max="10" value={gradesObj.t3 ?? ''} onChange={e => handleCourseGradeChange(student.id, module.name, 't3', e.target.value)} className="w-16 p-1.5 text-center bg-transparent focus:bg-yellow-100 outline-none" />
                                                            }
                                                        </td>
                                                    )}
                                                    <td className="border"><input type="number" step="0.1" min="0" max="10" value={recVal ?? ''} onChange={e => handleCourseGradeChange(student.id, module.name, 'rec', e.target.value)} className="w-16 p-1.5 text-center bg-transparent focus:bg-yellow-100 outline-none" /></td>
                                                    <td className={`p-1.5 border font-bold ${gradesObj.final !== null && gradesObj.final < 5 ? 'text-red-600' : 'text-black'} bg-stone-100`}>{gradesObj.final?.toFixed(2) ?? '-'}</td>
                                                    <td className="border text-center">
                                                        <button onClick={() => handleToggleConvalidation(student.id, module.name)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">Convalidar</button>
                                                    </td>
                                                </>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                         ))}
                    </tbody>
                </table>
             </div>
        )}
        </div>

        {/* Modal: Student FEM Config */}
        {selectedFemStudent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden border">
              <div className="bg-gray-950 text-white p-4 flex justify-between items-center">
                <h3 className="font-bold text-sm">Prácticas y FEM - {selectedFemStudent.nombre} {selectedFemStudent.apellido1}</h3>
                <button 
                  onClick={() => setSelectedFemStudent(null)} 
                  className="text-gray-400 hover:text-white font-bold text-xl"
                >
                  &times;
                </button>
              </div>
              <div className="p-5 space-y-4 text-xs text-left max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={tempFemConfig.hasFct}
                      onChange={e => setTempFemConfig(prev => ({
                        ...prev,
                        hasFct: e.target.checked,
                        hasFem1: e.target.checked ? false : prev.hasFem1,
                        hasFem2: e.target.checked ? false : prev.hasFem2,
                        isConvalidated: e.target.checked ? false : prev.isConvalidated,
                      }))}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Prácticas FCT (Extinguir)</span>
                  </label>
                  <p className="text-[10px] text-gray-500 ml-6 mt-1">
                    Los alumnos que cursan FCT antigua no modifican la nota final (se evalúa al 100% la parte académica).
                  </p>
                </div>

                <hr className="my-2" />

                <div className="space-y-3">
                  <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={tempFemConfig.isConvalidated}
                      onChange={e => setTempFemConfig(prev => ({
                        ...prev,
                        isConvalidated: e.target.checked,
                        hasFct: e.target.checked ? false : prev.hasFct
                      }))}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Convalidación parcial o total (Convalidada)</span>
                  </label>
                  
                  {tempFemConfig.isConvalidated && (
                    <div className="ml-6 p-3 bg-gray-50 border rounded-md space-y-3">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-1">Nota Convalidación:</label>
                        <input 
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          value={tempFemConfig.convalidationGrade ?? 5.0}
                          onChange={e => setTempFemConfig(prev => ({ ...prev, convalidationGrade: parseFloat(e.target.value) || 0 }))}
                          className="w-full p-1.5 border rounded bg-white text-xs text-center font-bold"
                        />
                        <p className="text-[9px] text-gray-400 mt-0.5">Por defecto es 5.0, pero se permite introducir una nota superior manualmente.</p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-1">Parte Convalidada:</label>
                        <select
                          value={tempFemConfig.convalidatedPart || ''}
                          onChange={e => setTempFemConfig(prev => ({ ...prev, convalidatedPart: (e.target.value || null) as any }))}
                          className="w-full p-1.5 border rounded bg-white text-xs"
                        >
                          <option value="">-- Módulo Completo (General) --</option>
                          <option value="fem1">FEM 1 (Prácticas Fase 1)</option>
                          <option value="fem2">FEM 2 (Prácticas Fase 2)</option>
                          <option value="fct">FCT (Formación Centros de Trabajo)</option>
                        </select>
                        <p className="text-[9px] text-gray-400 mt-0.5">
                          Selecciona qué parte se convalida con esa nota.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {!tempFemConfig.hasFct && (
                  <>
                    <hr className="my-2" />

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <input 
                          type="checkbox" 
                          id="fem1-check"
                          checked={tempFemConfig.hasFem1 || (tempFemConfig.isConvalidated && tempFemConfig.convalidatedPart === 'fem1')}
                          disabled={tempFemConfig.isConvalidated && tempFemConfig.convalidatedPart === 'fem1'}
                          onChange={e => setTempFemConfig(prev => ({ ...prev, hasFem1: e.target.checked }))}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 mt-0.5"
                        />
                        <div className="flex-1">
                          <label htmlFor="fem1-check" className="font-semibold text-gray-700 block">FEM 1 (Prácticas Fase 1)</label>
                          <p className="text-[10px] text-gray-400">Si solo se completó para referencia histórica (año anterior), no modifica la nota si no hay FEM 2.</p>
                          {(tempFemConfig.hasFem1 || (tempFemConfig.isConvalidated && tempFemConfig.convalidatedPart === 'fem1')) && (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[10px] text-gray-500">Nota evaluada:</span>
                              <input 
                                type="number"
                                step="0.1" 
                                min="0"
                                max="10"
                                disabled={tempFemConfig.isConvalidated && tempFemConfig.convalidatedPart === 'fem1'}
                                value={tempFemConfig.isConvalidated && tempFemConfig.convalidatedPart === 'fem1' ? tempFemConfig.convalidationGrade : (tempFemConfig.fem1Grade ?? '')}
                                onChange={e => setTempFemConfig(prev => ({ ...prev, fem1Grade: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                                className="w-16 p-1 border rounded text-center text-xs"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <input 
                          type="checkbox" 
                          id="fem2-check"
                          checked={tempFemConfig.hasFem2 || (tempFemConfig.isConvalidated && tempFemConfig.convalidatedPart === 'fem2')}
                          disabled={tempFemConfig.isConvalidated && tempFemConfig.convalidatedPart === 'fem2'}
                          onChange={e => setTempFemConfig(prev => ({ ...prev, hasFem2: e.target.checked }))}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 mt-0.5"
                        />
                        <div className="flex-1">
                          <label htmlFor="fem2-check" className="font-semibold text-gray-700 block">FEM 2 (Prácticas Fase 2)</label>
                          {(tempFemConfig.hasFem2 || (tempFemConfig.isConvalidated && tempFemConfig.convalidatedPart === 'fem2')) && (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[10px] text-gray-500">Nota evaluada:</span>
                              <input 
                                type="number"
                                step="0.1" 
                                min="0"
                                max="10"
                                disabled={tempFemConfig.isConvalidated && tempFemConfig.convalidatedPart === 'fem2'}
                                value={tempFemConfig.isConvalidated && tempFemConfig.convalidatedPart === 'fem2' ? tempFemConfig.convalidationGrade : (tempFemConfig.fem2Grade ?? '')}
                                onChange={e => setTempFemConfig(prev => ({ ...prev, fem2Grade: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                                className="w-16 p-1 border rounded text-center text-xs"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-3 bg-gray-50 border-t flex justify-end gap-2">
                <button 
                  onClick={() => setSelectedFemStudent(null)} 
                  className="px-3 py-1.5 bg-white border text-gray-700 rounded-md hover:bg-gray-100 text-[11px]"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveStudentFemConfig} 
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-[11px] font-semibold"
                >
                  Guardar Configuración
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Global weights Settings */}
        {showWeightsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full overflow-hidden border">
              <div className="bg-gray-950 text-white p-4 flex justify-between items-center">
                <h3 className="font-bold text-sm">Ponderaciones y Recuperación</h3>
                <button 
                  onClick={() => setShowWeightsModal(false)} 
                  className="text-gray-400 hover:text-white font-bold text-xl"
                >
                  &times;
                </button>
              </div>
              <div className="p-5 space-y-4 text-xs text-left">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Ponderación Módulo Teórico/Práctico (%):</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={tempWeights.pcWeight}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      setTempWeights(prev => ({ ...prev, pcWeight: val, femWeight: 100 - val }));
                    }}
                    className="w-full p-2 border rounded text-xs text-center font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Ponderación Prácticas FEM (%):</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={tempWeights.femWeight}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      setTempWeights(prev => ({ ...prev, femWeight: val, pcWeight: 100 - val }));
                    }}
                    className="w-full p-2 border rounded text-xs text-center font-bold"
                  />
                </div>

                <hr className="my-2" />

                <div>
                  <label className="flex items-start gap-2 font-semibold text-gray-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={tempWeights.recEvaluates100Percent}
                      onChange={e => setTempWeights(prev => ({ ...prev, recEvaluates100Percent: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 mt-0.5 cursor-pointer"
                    />
                    <span>La recuperación (REC) evalúa el 100% directamente</span>
                  </label>
                  <p className="text-[10px] text-gray-500 ml-6 mt-1">
                    Si está activado, en caso de ir a convocatoria REC, la nota final será directamente la nota de recuperación (ignurando la FEM).
                    Si está desactivado, se seguirá aplicando la ponderación ({tempWeights.pcWeight}% Rec + {tempWeights.femWeight}% FEM).
                  </p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 border-t flex justify-end gap-2">
                <button 
                  onClick={() => setShowWeightsModal(false)} 
                  className="px-3 py-1.5 bg-white border text-gray-700 rounded-md hover:bg-gray-100 text-[11px]"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveWeights} 
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-[11px] font-semibold"
                >
                  Guardar Ponderación
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default GestionAcademicaView;

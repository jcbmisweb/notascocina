import React, { useState, useMemo } from 'react';
import { Student, Service, WorkshopPractice } from '../types';
import { SERVICE_GRADE_WEIGHTS, PRE_SERVICE_BEHAVIOR_ITEMS, BEHAVIOR_RATING_MAP } from '../data/constants';
import { ExportIcon, PlusIcon, TrashIcon, PrinterIcon, LockClosedIcon, LockOpenIcon } from '../components/icons';
import { downloadPdfWithTables } from '../components/printUtils';
import { useAppContext } from '../context/AppContext';

declare var XLSX: any;

interface NotasServicioViewProps {
    onNavigateToService: (serviceId: string, tab: 'evaluation') => void;
}

const NotasServicioView: React.FC<NotasServicioViewProps> = ({ onNavigateToService }) => {
    const { 
        students, services, practiceGroups, serviceEvaluations, 
        workshopPractices, setWorkshopPractices,
        teacherData, instituteData, calculatedStudentGrades, addToast,
        isStudentConvalidated
    } = useAppContext();
    
    const [activeTab, setActiveTab] = useState<'servicios' | 'dia-previo' | 'semanal'>('servicios');
    const [selectedPracticeId, setSelectedPracticeId] = useState<string | null>(null);

    const activeStudents = useMemo(() => {
        return (students || []).filter(s => typeof isStudentConvalidated === 'function' ? !isStudentConvalidated(s.id, 'pc') : true);
    }, [students, isStudentConvalidated]);

    const sortedServices = useMemo(() => {
        return [...(services || [])].sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime());
    }, [services]);

    const studentGroups = useMemo(() => {
        const groups = (activeStudents || []).reduce((acc, student) => {
            const grp = student.grupo || 'Sin Grupo';
            (acc[grp] = acc[grp] || []).push(student);
            return acc;
        }, {} as Record<string, Student[]>);

        Object.keys(groups).forEach(groupName => {
            groups[groupName].sort((a, b) => (a.apellido1 || '').localeCompare(b.apellido1 || '') || (a.nombre || '').localeCompare(b.nombre || ''));
        });
        return groups;
    }, [activeStudents]);

    // --- TAB 1: SERVICIO LOGIC ---
    const serviceDataCalc = useMemo(() => {
        const getScores = (student: Student) => {
            const serviceScores: Record<string, { final: number | null, absent: boolean }> = {};

            sortedServices.forEach(service => {
                const evaluation = (serviceEvaluations || []).find(e => e.serviceId === service.id);
                const individualEval = evaluation?.serviceDay?.individualScores?.[student.id];

                let studentParticipated = false;
                let groupEvalSourceId: string | undefined = undefined;
                const studentPracticeGroup = (practiceGroups || []).find(pg => (pg.studentIds || []).includes(student.id));

                if (service.type === 'normal' && studentPracticeGroup) {
                    studentParticipated = (service.assignedGroups?.comedor || []).includes(studentPracticeGroup.id) || 
                                       (service.assignedGroups?.takeaway || []).includes(studentPracticeGroup.id);
                    groupEvalSourceId = studentPracticeGroup.id;
                } else if (service.type === 'agrupacion') {
                    const studentAgrupacion = (service.agrupaciones || []).find(a => (a.studentIds || []).includes(student.id));
                    if (studentAgrupacion) {
                        studentParticipated = true;
                        groupEvalSourceId = studentAgrupacion.id;
                    }
                }
                
                if (!studentParticipated || !evaluation) {
                    serviceScores[service.id] = { final: null, absent: false };
                    return;
                }

                const isPresent = individualEval ? (individualEval.attendance ?? true) : true;
                if (!isPresent) {
                    serviceScores[service.id] = { final: null, absent: true };
                    return;
                }
                
                const hasIndividualData = individualEval?.scores?.some(s => s !== null);
                let individualGrade = (individualEval?.scores || []).reduce((sum, score) => sum + (score || 0), 0);
                
                let groupGrade = 0;
                let hasGroupData = false;
                if (groupEvalSourceId && evaluation.serviceDay?.groupScores) {
                    const groupEval = evaluation.serviceDay.groupScores[groupEvalSourceId];
                    if (groupEval) {
                        hasGroupData = groupEval.scores?.some(s => s !== null);
                        groupGrade = (groupEval.scores || []).reduce((sum, score) => sum + (score || 0), 0);
                    }
                }
                
                if (!hasIndividualData && !hasGroupData) {
                    serviceScores[service.id] = { final: null, absent: false };
                    return;
                }

                if (!hasIndividualData && hasGroupData) {
                    individualGrade = groupGrade;
                }

                if (individualEval?.halveGroupScore) groupGrade /= 2;

                const finalServiceScore = (individualGrade * SERVICE_GRADE_WEIGHTS.individual) + (groupGrade * SERVICE_GRADE_WEIGHTS.group);
                serviceScores[service.id] = { final: finalServiceScore, absent: false };
            });
            return serviceScores;
        };
        return { getScores };
    }, [sortedServices, serviceEvaluations, practiceGroups]);

    // --- TAB 3: WORKSHOP PRACTICES (SEMANAL / PRÁCTICAS DIARIAS) ---
    const handleCreateWorkshopPractice = () => {
        const newPractice: WorkshopPractice = {
            id: `workshop-${Date.now()}`,
            title: `Práctica Taller #${workshopPractices.length + 1}`,
            date: new Date().toISOString().split('T')[0],
            trimester: 't1',
            weekNumber: workshopPractices.length + 1,
            description: 'Práctica presencial en taller de cocina',
            isLocked: false,
            evaluations: {}
        };
        setWorkshopPractices(prev => [...prev, newPractice]);
        setSelectedPracticeId(newPractice.id);
        addToast('Práctica diaria de taller creada.', 'success');
    };

    const handleDeleteWorkshopPractice = (id: string) => {
        if (window.confirm('¿Seguro que deseas eliminar esta práctica de taller?')) {
            if (window.confirm('¡ATENCIÓN! Esta acción eliminará permanentemente la práctica y todas sus calificaciones asociadas. ¿Estás totalmente seguro?')) {
                setWorkshopPractices(prev => prev.filter(p => p.id !== id));
                if (selectedPracticeId === id) setSelectedPracticeId(null);
                addToast('Práctica eliminada correctamente.', 'info');
            }
        }
    };

    const handleUpdateWorkshopEval = (practiceId: string, studentId: string, field: string, value: any) => {
        setWorkshopPractices(prev => prev.map(p => {
            if (p.id !== practiceId) return p;
            const currentEval = p.evaluations[studentId] || { attendance: true, scores: new Array(PRE_SERVICE_BEHAVIOR_ITEMS.length).fill(null), observations: '' };
            return {
                ...p,
                evaluations: {
                    ...p.evaluations,
                    [studentId]: {
                        ...currentEval,
                        [field]: value
                    }
                }
            };
        }));
    };

    const handleUpdateWorkshopScore = (practiceId: string, studentId: string, itemIdx: number, score: number | null) => {
        setWorkshopPractices(prev => prev.map(p => {
            if (p.id !== practiceId) return p;
            const currentEval = p.evaluations[studentId] || { attendance: true, scores: new Array(PRE_SERVICE_BEHAVIOR_ITEMS.length).fill(null), observations: '' };
            const newScores = [...currentEval.scores];
            newScores[itemIdx] = score;
            return {
                ...p,
                evaluations: {
                    ...p.evaluations,
                    [studentId]: {
                        ...currentEval,
                        scores: newScores
                    }
                }
            };
        }));
    };

    const activeWorkshop = workshopPractices.find(p => p.id === selectedPracticeId) || workshopPractices[0];

    const handleExportServices = (format: 'pdf' | 'xlsx') => {
        const title = 'Resumen de Servicios';
        const head = [['Alumno', ...sortedServices.map(s => s.name), 'Media T1', 'Media T2', 'Media T3']];
        const body = students.map(student => {
            const scores = serviceDataCalc.getScores(student);
            const averages = calculatedStudentGrades[student.id]?.serviceAverages || { t1: null, t2: null, t3: null };
            const row: any[] = [`${student.apellido1} ${student.apellido2}, ${student.nombre}`];
            sortedServices.forEach(s => {
                const sc = scores[s.id];
                row.push(sc?.absent ? 'AUS' : (sc?.final?.toFixed(2) ?? '-'));
            });
            row.push(averages.t1?.toFixed(2) ?? '-');
            row.push(averages.t2?.toFixed(2) ?? '-');
            row.push(averages.t3?.toFixed(2) ?? '-');
            return row;
        });

        if (format === 'pdf') {
            downloadPdfWithTables(title, [head], [body], teacherData, instituteData);
        } else {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([head[0], ...body]);
            XLSX.utils.book_append_sheet(wb, ws, title);
            XLSX.writeFile(wb, `${title.replace(/ /g, '_')}.xlsx`);
        }
    };

    return (
        <div>
            <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Resumen y Control de Servicios y Prácticas</h1>
                    <p className="text-gray-500 mt-1">Gestiona los servicios gastronómicos, los días previos y las prácticas diarias de taller.</p>
                </div>
                <div className="flex items-center space-x-2">
                    {activeTab === 'servicios' && (
                        <>
                            <button onClick={() => handleExportServices('pdf')} disabled={sortedServices.length === 0} className="flex items-center bg-red-500 text-white px-3 py-2 rounded-lg font-semibold hover:bg-red-600 transition text-sm disabled:bg-gray-400"><ExportIcon className="w-4 h-4 mr-1" /> PDF</button>
                            <button onClick={() => handleExportServices('xlsx')} disabled={sortedServices.length === 0} className="flex items-center bg-green-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-green-700 transition text-sm disabled:bg-gray-400"><ExportIcon className="w-4 h-4 mr-1" /> XLSX</button>
                        </>
                    )}
                    {activeTab === 'semanal' && (
                        <button onClick={handleCreateWorkshopPractice} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm">
                            <PlusIcon className="w-5 h-5 mr-1.5" /> Nueva Práctica de Taller
                        </button>
                    )}
                </div>
            </header>

            {/* --- 3 TABS NAVIGATION --- */}
            <div className="border-b border-gray-200 mb-6 bg-white rounded-t-lg shadow-sm px-4 pt-2">
                <nav className="flex space-x-6">
                    <button
                        onClick={() => setActiveTab('servicios')}
                        className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'servicios' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        1. Servicio ({sortedServices.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('dia-previo')}
                        className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'dia-previo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        2. Día Previo de Servicio
                    </button>
                    <button
                        onClick={() => setActiveTab('semanal')}
                        className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'semanal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        3. Semanal / Prácticas Diarias ({workshopPractices.length})
                    </button>
                </nav>
            </div>

            {/* --- TAB 1: SERVICIO --- */}
            {activeTab === 'servicios' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                            <span className="font-bold text-sm">ℹ️ Nota Trimestral del Bloque Práctico:</span>
                            <p className="mt-0.5 text-blue-800">
                                Las columnas de media trimestral calculan automáticamente la media entre las tres partes evaluadas: 
                                <span className="font-semibold mx-1">Servicios</span> + 
                                <span className="font-semibold mx-1">Días Previos</span> + 
                                <span className="font-semibold mx-1">Prácticas Diarias (Semanal)</span>.
                            </p>
                        </div>
                    </div>
                    {sortedServices.length === 0 ? (
                        <div className="text-center p-8 bg-white rounded-lg shadow">
                            <h2 className="text-2xl font-bold text-gray-700">No hay servicios planificados</h2>
                            <p className="text-gray-500 mt-2">Crea tu primer servicio en la sección de "Gestión Práctica" para empezar a calificar.</p>
                        </div>
                    ) : (
                        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                            <table className="min-w-full text-xs text-center border-collapse">
                                <thead className="bg-gray-100 sticky top-0 z-10">
                                    <tr>
                                        <th rowSpan={2} className="p-2 border font-semibold text-gray-600 w-48 text-left sticky left-0 bg-gray-100">Alumno</th>
                                        {sortedServices.map(service => (
                                            <th key={service.id} rowSpan={2} className="p-2 border font-semibold text-gray-600 min-w-[120px]">
                                                <button onClick={() => onNavigateToService(service.id, 'evaluation')} className="hover:text-blue-600 w-full">
                                                    <span className="font-bold">{service.name}</span><br />
                                                    <span className="font-normal text-gray-500">{service.date ? new Date(service.date.replace(/-/g, '/')).toLocaleDateString('es-ES') : 'Sin fecha'}</span>
                                                </button>
                                            </th>
                                        ))}
                                        <th rowSpan={2} className="p-2 border font-semibold text-gray-600 bg-gray-200">Media Serv. T1</th>
                                        <th rowSpan={2} className="p-2 border font-semibold text-gray-600 bg-gray-200">Media Serv. T2</th>
                                        <th rowSpan={2} className="p-2 border font-semibold text-gray-600 bg-gray-200">Media Serv. T3</th>
                                    </tr>
                                    <tr></tr>
                                </thead>
                                <tbody>
                                    {(Object.entries(studentGroups) as [string, Student[]][]).map(([groupName, studentsInGroup]) => (
                                        <React.Fragment key={groupName}>
                                            <tr><td colSpan={sortedServices.length + 4} className="bg-gray-200 font-bold p-1 text-left pl-4">{groupName}</td></tr>
                                            {studentsInGroup.map((student, index) => {
                                                const scores = serviceDataCalc.getScores(student);
                                                const averages = calculatedStudentGrades[student.id]?.serviceAverages || { t1: null, t2: null, t3: null };
                                                return (
                                                <tr key={student.id} className={`group ${index % 2 !== 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50`}>
                                                    <td className={`p-1 border text-left font-semibold text-gray-800 w-48 sticky left-0 group-hover:bg-blue-50 ${index % 2 !== 0 ? 'bg-gray-50' : 'bg-white'}`}>{`${student.apellido1 || ''} ${student.apellido2 || ''}, ${student.nombre || ''}`.trim()}</td>
                                                    {sortedServices.map(service => {
                                                        const scoreInfo = scores[service.id];
                                                        const finalScore = scoreInfo?.final;
                                                        return (
                                                            <td key={service.id} className={`p-1 border font-bold ${finalScore !== null && finalScore < 5 ? 'text-red-600' : ''}`}>
                                                                {!scoreInfo || (scoreInfo.final === null && !scoreInfo.absent) ? '-' : scoreInfo.absent ? <span className="text-red-500 font-semibold">AUS</span> : <span>{finalScore?.toFixed(2)}</span>}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className={`p-1 border font-bold bg-gray-100 ${averages.t1 !== null && averages.t1 < 5 ? 'text-red-600' : ''}`}>{averages.t1?.toFixed(2) ?? '-'}</td>
                                                    <td className={`p-1 border font-bold bg-gray-100 ${averages.t2 !== null && averages.t2 < 5 ? 'text-red-600' : ''}`}>{averages.t2?.toFixed(2) ?? '-'}</td>
                                                    <td className={`p-1 border font-bold bg-gray-100 ${averages.t3 !== null && averages.t3 < 5 ? 'text-red-600' : ''}`}>{averages.t3?.toFixed(2) ?? '-'}</td>
                                                </tr>
                                            )})}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* --- TAB 2: DÍA PREVIO DE SERVICIO --- */}
            {activeTab === 'dia-previo' && (
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Evaluación del Día Previo por Servicio</h2>
                    {sortedServices.length === 0 ? (
                        <p className="text-gray-500">No hay servicios registrados para mostrar el día previo.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs border-collapse text-center">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-2 border font-semibold text-gray-700 text-left">Alumno</th>
                                        {sortedServices.map(s => (
                                            <th key={s.id} className="p-2 border font-semibold text-gray-700">{s.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeStudents.map(student => (
                                        <tr key={student.id} className="hover:bg-gray-50">
                                            <td className="p-2 border text-left font-medium text-gray-800">{`${student.apellido1 || ''} ${student.apellido2 || ''}, ${student.nombre || ''}`.trim()}</td>
                                            {sortedServices.map(s => {
                                                const evalData = serviceEvaluations.find(e => e.serviceId === s.id);
                                                // Find any pre-service day eval for this service
                                                const preServiceDays: any[] = evalData?.preService ? Object.values(evalData.preService) : [];
                                                const studentIndEval = preServiceDays.map((d: any) => d.individualEvaluations?.[student.id]).find(Boolean);
                                                
                                                if (!studentIndEval) return <td key={s.id} className="border text-gray-400">-</td>;
                                                const isPresent = studentIndEval.attendance ?? true;
                                                if (!isPresent) return <td key={s.id} className="border text-red-500 font-bold">Falta</td>;

                                                const scoresObj = studentIndEval.behaviorScores || {};
                                                const sumScores: number = (Object.values(scoresObj) as any[]).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
                                                return (
                                                    <td key={s.id} className="border font-semibold">
                                                        {sumScores > 0 ? sumScores.toFixed(1) : 'OK'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* --- TAB 3: SEMANAL / PRÁCTICAS DIARIAS --- */}
            {activeTab === 'semanal' && (
                <div className="space-y-6">
                    {workshopPractices.length === 0 ? (
                        <div className="text-center p-12 bg-white rounded-lg shadow-sm">
                            <h3 className="text-xl font-bold text-gray-700">No hay prácticas diarias de taller creadas</h3>
                            <p className="text-gray-500 mt-2 mb-4">Crea una sesión de taller semanal para registrar asistencia, elaboraciones y notas con los mismos ítems del día previo.</p>
                            <button onClick={handleCreateWorkshopPractice} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                                <PlusIcon className="w-5 h-5 inline mr-1" /> Crear Primera Práctica de Taller
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Practice Selector Sidebar */}
                            <div className="bg-white p-4 rounded-lg shadow-sm lg:col-span-1 space-y-3">
                                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Sesiones de Taller</h3>
                                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                    {workshopPractices.map(p => {
                                        const isSelected = p.id === (activeWorkshop?.id);
                                        return (
                                            <div key={p.id} onClick={() => setSelectedPracticeId(p.id)} className={`p-3 rounded-lg border cursor-pointer transition ${isSelected ? 'bg-blue-50 border-blue-300 shadow-sm' : 'hover:bg-gray-50 border-gray-200'}`}>
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-sm text-gray-800">{p.title}</h4>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteWorkshopPractice(p.id); }} className="text-gray-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">📅 {p.date} (Semana {p.weekNumber})</p>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button onClick={handleCreateWorkshopPractice} className="w-full mt-2 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 text-xs flex items-center justify-center">
                                    <PlusIcon className="w-4 h-4 mr-1" /> Añadir Práctica
                                </button>
                            </div>

                            {/* Active Practice Detail & Grading Table */}
                            {activeWorkshop && (
                                <div className="bg-white p-6 rounded-lg shadow-sm lg:col-span-3 space-y-6">
                                    <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
                                        <div>
                                            <input 
                                                type="text" 
                                                value={activeWorkshop.title} 
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setWorkshopPractices(prev => prev.map(item => item.id === activeWorkshop.id ? { ...item, title: val } : item));
                                                }}
                                                className="text-xl font-bold text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none" 
                                            />
                                            <p className="text-xs text-gray-500 mt-0.5">Usa los mismos ítems de evaluación del día previo para calificar las prácticas de taller.</p>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <input 
                                                type="date" 
                                                value={activeWorkshop.date}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setWorkshopPractices(prev => prev.map(item => item.id === activeWorkshop.id ? { ...item, date: val } : item));
                                                }}
                                                className="border rounded-md p-1.5 text-xs bg-gray-50"
                                            />
                                            <select 
                                                value={activeWorkshop.trimester}
                                                onChange={e => {
                                                    const val = e.target.value as any;
                                                    setWorkshopPractices(prev => prev.map(item => item.id === activeWorkshop.id ? { ...item, trimester: val } : item));
                                                }}
                                                className="border rounded-md p-1.5 text-xs bg-gray-50"
                                            >
                                                <option value="t1">1º Trimestre</option>
                                                <option value="t2">2º Trimestre</option>
                                                <option value="t3">3º Trimestre</option>
                                            </select>
                                            <button 
                                                onClick={() => handleDeleteWorkshopPractice(activeWorkshop.id)}
                                                className="flex items-center bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-red-700 transition"
                                                title="Eliminar esta práctica"
                                            >
                                                <TrashIcon className="w-4 h-4 mr-1" /> Eliminar
                                            </button>
                                        </div>
                                    </div>

                                    {/* Description / Elaborations */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción de Elaboraciones / Trabajos del Día:</label>
                                        <textarea 
                                            value={activeWorkshop.description}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setWorkshopPractices(prev => prev.map(item => item.id === activeWorkshop.id ? { ...item, description: val } : item));
                                            }}
                                            className="w-full p-2 border rounded-md text-xs"
                                            rows={2}
                                            placeholder="Indica las elaboraciones realizadas hoy en el taller..."
                                        />
                                    </div>

                                    {/* Student Grading Table */}
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-xs border-collapse">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="p-2 border text-left">Alumno</th>
                                                    <th className="p-2 border text-center w-20">Asistencia</th>
                                                    {PRE_SERVICE_BEHAVIOR_ITEMS.map(item => (
                                                        <th key={item.id} className="p-2 border text-center">{item.label}</th>
                                                    ))}
                                                    <th className="p-2 border text-center">Observaciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {students.map(student => {
                                                    const evalInfo = activeWorkshop.evaluations[student.id] || { attendance: true, scores: new Array(PRE_SERVICE_BEHAVIOR_ITEMS.length).fill(null), observations: '' };
                                                    const isPresent = evalInfo.attendance ?? true;
                                                    return (
                                                        <tr key={student.id} className="hover:bg-gray-50">
                                                            <td className="p-2 border font-medium text-gray-800">{student.apellido1} {student.apellido2}, {student.nombre}</td>
                                                            <td className="p-2 border text-center">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={isPresent}
                                                                    onChange={e => handleUpdateWorkshopEval(activeWorkshop.id, student.id, 'attendance', e.target.checked)}
                                                                    className="w-4 h-4 rounded text-blue-600"
                                                                />
                                                            </td>
                                                            {PRE_SERVICE_BEHAVIOR_ITEMS.map((item, idx) => {
                                                                const currentScore = evalInfo.scores[idx];
                                                                return (
                                                                    <td key={item.id} className="p-1 border text-center">
                                                                        <div className="flex justify-center items-center space-x-1">
                                                                            {BEHAVIOR_RATING_MAP.map(rating => {
                                                                                const isSelected = currentScore === rating.value;
                                                                                return (
                                                                                    <button 
                                                                                        key={rating.value}
                                                                                        onClick={() => handleUpdateWorkshopScore(activeWorkshop.id, student.id, idx, isSelected ? null : rating.value)}
                                                                                        disabled={!isPresent}
                                                                                        className={`w-6 h-6 flex items-center justify-center rounded text-[11px] font-bold transition ${isSelected ? rating.selectedColor : rating.color} disabled:opacity-40`}
                                                                                        title={rating.label}
                                                                                    >
                                                                                        {rating.symbol}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="p-1 border">
                                                                <input 
                                                                    type="text"
                                                                    value={evalInfo.observations || ''}
                                                                    onChange={e => handleUpdateWorkshopEval(activeWorkshop.id, student.id, 'observations', e.target.value)}
                                                                    disabled={!isPresent}
                                                                    className="w-full p-1 border rounded text-xs"
                                                                    placeholder="Comentarios..."
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotasServicioView;

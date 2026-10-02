import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
    UsersIcon, SaveIcon, DownloadIcon, CheckIcon, AlertTriangleIcon, 
    PencilIcon, SettingsIcon, UserIcon, RefreshCwIcon, ChevronDownIcon, ChevronUpIcon 
} from '../components/icons';
import { StudentProyectoEvaluation, Student, ProyectoGroup } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COMMON_JUSTIFICATIONS = [
    'No colaboró en la memoria escrita',
    'Falta reiterada de asistencia a reuniones de equipo',
    'No entregó su parte asignada del proyecto',
    'Participación pasiva y bajo compromiso',
    'Aportación técnica deficiente',
    'Excelente liderazgo y coordinación (+)',
    'Asumió trabajo no realizado por otros (+)'
];

export const ProyectoEvaluacionView: React.FC = () => {
    const { 
        students, 
        proyectoGroups, 
        proyectoEvaluations, 
        setProyectoEvaluations, 
        courseGrades,
        setCourseGrades,
        teacherData,
        instituteData,
        addToast 
    } = useAppContext();

    // Local state for configuration and evaluations
    const [pesoGrupal, setPesoGrupal] = useState<number>(proyectoEvaluations.pesoGrupal ?? 50);
    const [pesoIndividual, setPesoIndividual] = useState<number>(proyectoEvaluations.pesoIndividual ?? 50);
    const [groupGrades, setGroupGrades] = useState<Record<string, number | null>>(proyectoEvaluations.groupGrades || {});
    const [studentEvals, setStudentEvals] = useState<Record<string, StudentProyectoEvaluation>>(proyectoEvaluations.studentEvaluations || {});
    const [isDirty, setIsDirty] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGroup, setFilterGroup] = useState<string>('all');
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

    // Sync from context if external change occurs
    useEffect(() => {
        setPesoGrupal(proyectoEvaluations.pesoGrupal ?? 50);
        setPesoIndividual(proyectoEvaluations.pesoIndividual ?? 50);
        setGroupGrades(proyectoEvaluations.groupGrades || {});
        setStudentEvals(proyectoEvaluations.studentEvaluations || {});
        setIsDirty(false);
    }, [proyectoEvaluations]);

    // Student assignments map
    const studentGroupMap = useMemo(() => {
        const map: Record<string, ProyectoGroup | null> = {};
        students.forEach(st => { map[st.id] = null; });
        proyectoGroups.forEach(grp => {
            grp.studentIds.forEach(stId => {
                map[stId] = grp;
            });
        });
        return map;
    }, [students, proyectoGroups]);

    // Calculate final grade for a student
    const calculateStudentFinalGrade = (
        stEval: StudentProyectoEvaluation, 
        gGrade: number | null,
        pGrupal: number,
        pInd: number
    ): number | null => {
        if (stEval.overrideFinalGrade !== null && stEval.overrideFinalGrade !== undefined) {
            return stEval.overrideFinalGrade;
        }

        const effectiveGrupal = stEval.notaGrupal ?? gGrade;
        const effectiveInd = stEval.notaIndividual;

        if (effectiveGrupal === null && effectiveInd === null) return null;
        if (effectiveGrupal !== null && effectiveInd === null) return effectiveGrupal;
        if (effectiveGrupal === null && effectiveInd !== null) return effectiveInd;

        const totalP = (pGrupal + pInd) || 100;
        const finalVal = ((effectiveGrupal! * pGrupal) + (effectiveInd! * pInd)) / totalP;
        return parseFloat(finalVal.toFixed(2));
    };

    // When group grade changes, distribute to all members unless they had a hard override
    const handleGroupGradeChange = (groupId: string, valueStr: string) => {
        const cleaned = valueStr.replace(',', '.');
        const num = cleaned === '' ? null : parseFloat(cleaned);
        if (cleaned !== '' && (isNaN(num as number) || (num as number) < 0 || (num as number) > 10)) return;

        setGroupGrades(prev => ({
            ...prev,
            [groupId]: num,
        }));

        // Distribute to all students in this group
        const targetGroup = proyectoGroups.find(g => g.id === groupId);
        if (targetGroup) {
            setStudentEvals(prev => {
                const next = { ...prev };
                targetGroup.studentIds.forEach(stId => {
                    const existing = next[stId] || {
                        studentId: stId,
                        groupId: groupId,
                        notaGrupal: num,
                        notaIndividual: null,
                        collaborated: true,
                        motivoAjuste: '',
                        overrideFinalGrade: null,
                        finalGrade: null,
                    };

                    const updated: StudentProyectoEvaluation = {
                        ...existing,
                        notaGrupal: num,
                    };
                    updated.finalGrade = calculateStudentFinalGrade(updated, num, pesoGrupal, pesoIndividual);
                    next[stId] = updated;
                });
                return next;
            });
        }
        setIsDirty(true);
    };

    // Handle student individual grade change
    const handleStudentIndividualGradeChange = (studentId: string, valueStr: string) => {
        const cleaned = valueStr.replace(',', '.');
        const num = cleaned === '' ? null : parseFloat(cleaned);
        if (cleaned !== '' && (isNaN(num as number) || (num as number) < 0 || (num as number) > 10)) return;

        const grp = studentGroupMap[studentId];
        const currentGroupGrade = grp ? groupGrades[grp.id] ?? null : null;

        setStudentEvals(prev => {
            const existing = prev[studentId] || {
                studentId,
                groupId: grp?.id || null,
                notaGrupal: currentGroupGrade,
                notaIndividual: null,
                collaborated: true,
                motivoAjuste: '',
                overrideFinalGrade: null,
                finalGrade: null,
            };

            const updated: StudentProyectoEvaluation = {
                ...existing,
                notaIndividual: num,
            };
            updated.finalGrade = calculateStudentFinalGrade(updated, currentGroupGrade, pesoGrupal, pesoIndividual);
            return { ...prev, [studentId]: updated };
        });
        setIsDirty(true);
    };

    // Toggle collaboration status
    const handleToggleCollaboration = (studentId: string) => {
        const grp = studentGroupMap[studentId];
        const currentGroupGrade = grp ? groupGrades[grp.id] ?? null : null;

        setStudentEvals(prev => {
            const existing = prev[studentId] || {
                studentId,
                groupId: grp?.id || null,
                notaGrupal: currentGroupGrade,
                notaIndividual: null,
                collaborated: true,
                motivoAjuste: '',
                overrideFinalGrade: null,
                finalGrade: null,
            };

            const nextCollab = !existing.collaborated;
            const updated: StudentProyectoEvaluation = {
                ...existing,
                collaborated: nextCollab,
                motivoAjuste: nextCollab ? '' : (existing.motivoAjuste || 'No colaboró en las tareas del grupo'),
            };

            // If toggling to NOT collaborated, prompt expansion to specify justification
            if (!nextCollab) {
                setExpandedStudentId(studentId);
            }

            updated.finalGrade = calculateStudentFinalGrade(updated, currentGroupGrade, pesoGrupal, pesoIndividual);
            return { ...prev, [studentId]: updated };
        });
        setIsDirty(true);
    };

    // Handle override final grade or specific adjustment
    const handleStudentOverrideFinal = (studentId: string, valueStr: string) => {
        const cleaned = valueStr.replace(',', '.');
        const num = cleaned === '' ? null : parseFloat(cleaned);
        if (cleaned !== '' && (isNaN(num as number) || (num as number) < 0 || (num as number) > 10)) return;

        const grp = studentGroupMap[studentId];
        const currentGroupGrade = grp ? groupGrades[grp.id] ?? null : null;

        setStudentEvals(prev => {
            const existing = prev[studentId] || {
                studentId,
                groupId: grp?.id || null,
                notaGrupal: currentGroupGrade,
                notaIndividual: null,
                collaborated: true,
                motivoAjuste: '',
                overrideFinalGrade: null,
                finalGrade: null,
            };

            const updated: StudentProyectoEvaluation = {
                ...existing,
                overrideFinalGrade: num,
            };
            updated.finalGrade = calculateStudentFinalGrade(updated, currentGroupGrade, pesoGrupal, pesoIndividual);
            return { ...prev, [studentId]: updated };
        });
        setIsDirty(true);
    };

    // Set justification motive
    const handleSetMotivo = (studentId: string, motivo: string) => {
        setStudentEvals(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || {
                    studentId,
                    groupId: studentGroupMap[studentId]?.id || null,
                    notaGrupal: studentGroupMap[studentId] ? groupGrades[studentGroupMap[studentId]!.id] ?? null : null,
                    notaIndividual: null,
                    collaborated: true,
                    motivoAjuste: '',
                    overrideFinalGrade: null,
                    finalGrade: null,
                }),
                motivoAjuste: motivo,
            }
        }));
        setIsDirty(true);
    };

    // Save evaluations
    const handleSaveEvaluations = () => {
        const newState = {
            groupGrades,
            studentEvaluations: studentEvals,
            pesoGrupal,
            pesoIndividual,
        };

        setProyectoEvaluations(newState);

        // Also synchronize final grades to courseGrades.proyecto
        setCourseGrades(prev => {
            const nextCourse = JSON.parse(JSON.stringify(prev || {}));
            students.forEach(st => {
                const ev = studentEvals[st.id];
                if (ev && ev.finalGrade !== null) {
                    if (!nextCourse[st.id]) nextCourse[st.id] = {};
                    if (!nextCourse[st.id].proyecto) nextCourse[st.id].proyecto = {};
                    nextCourse[st.id].proyecto.t3 = ev.finalGrade;
                    nextCourse[st.id].proyecto.final = ev.finalGrade;
                }
            });
            return nextCourse;
        });

        setIsDirty(false);
        addToast('Evaluaciones de Proyecto guardadas y sincronizadas con éxito.', 'success');
    };

    // Filtered students
    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) => a.apellido1.localeCompare(b.apellido1));
    }, [students]);

    const filteredStudents = useMemo(() => {
        return sortedStudents.filter(st => {
            const matchSearch = `${st.nombre} ${st.apellido1} ${st.apellido2}`.toLowerCase().includes(searchTerm.toLowerCase());
            const grp = studentGroupMap[st.id];
            if (filterGroup === 'all') return matchSearch;
            if (filterGroup === 'unassigned') return matchSearch && !grp;
            return matchSearch && grp?.id === filterGroup;
        });
    }, [sortedStudents, searchTerm, filterGroup, studentGroupMap]);

    // Statistics
    const stats = useMemo(() => {
        let totalEvaluados = 0;
        let sum = 0;
        let sinColaborar = 0;
        let aprobados = 0;

        Object.values(studentEvals).forEach(ev => {
            if (ev.finalGrade !== null && ev.finalGrade !== undefined) {
                totalEvaluados++;
                sum += ev.finalGrade;
                if (ev.finalGrade >= 5) aprobados++;
            }
            if (!ev.collaborated || ev.motivoAjuste) {
                sinColaborar++;
            }
        });

        const avg = totalEvaluados > 0 ? (sum / totalEvaluados).toFixed(2) : '-';
        return {
            totalEvaluados,
            media: avg,
            sinColaborar,
            aprobados,
        };
    }, [studentEvals]);

    // PDF Export
    const handleExportPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        
        // Header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('EVALUACIÓN DEL PROYECTO INTERMODULAR', 14, 15);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${instituteData.name} - CIFP Hostelería y Turismo`, 14, 21);
        doc.text(`Profesor: ${teacherData.name} | Ponderación: Grupal (${pesoGrupal}%) - Individual (${pesoIndividual}%)`, 14, 26);
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 31);

        const tableBody = sortedStudents.map((st, i) => {
            const grp = studentGroupMap[st.id];
            const ev = studentEvals[st.id] || {
                notaGrupal: grp ? groupGrades[grp.id] ?? null : null,
                notaIndividual: null,
                collaborated: true,
                motivoAjuste: '',
                finalGrade: null,
            };

            const effectiveGrupal = ev.notaGrupal ?? (grp ? groupGrades[grp.id] ?? null : null);
            const collabStr = ev.collaborated ? 'SÍ' : 'NO (Ajustado)';

            return [
                i + 1,
                `${st.apellido1} ${st.apellido2}, ${st.nombre}`,
                grp?.name || 'Sin Grupo',
                effectiveGrupal !== null ? effectiveGrupal.toFixed(2) : '-',
                ev.notaIndividual !== null ? ev.notaIndividual.toFixed(2) : '-',
                collabStr,
                ev.motivoAjuste || '-',
                ev.finalGrade !== null ? ev.finalGrade.toFixed(2) : '-'
            ];
        });

        autoTable(doc, {
            head: [['#', 'Alumno', 'Restaurante / Grupo', 'Nota Grupal', 'Nota Indiv.', '¿Colaboró?', 'Motivo de Ajuste / Observaciones', 'Nota Final']],
            body: tableBody,
            startY: 36,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 243, 255] },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 50 },
                2: { cellWidth: 40 },
                3: { cellWidth: 22, halign: 'center' },
                4: { cellWidth: 22, halign: 'center' },
                5: { cellWidth: 22, halign: 'center' },
                6: { cellWidth: 'auto' },
                7: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
            }
        });

        doc.save(`Evaluacion_Proyecto_Intermodular_${new Date().toISOString().slice(0, 10)}.pdf`);
        addToast('Acta de evaluación de Proyecto descargada en PDF.', 'success');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
                        <UsersIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md">
                                Módulo de Proyecto
                            </span>
                            <span className="text-xs text-gray-500">
                                Ponderación: <b>{pesoGrupal}% Grupal</b> + <b>{pesoIndividual}% Individual</b>
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
                            Evaluación de Proyectos: Nota Grupal e Individual
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Asigna la nota al equipo con distribución automática a sus miembros y personaliza notas individuales para quienes no participen.
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowConfigModal(true)}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                        title="Ajustar pesos de nota grupal e individual"
                    >
                        <SettingsIcon className="w-4 h-4 text-gray-600" />
                        Ponderación ({pesoGrupal}/{pesoIndividual})
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="px-3.5 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Descargar Acta PDF
                    </button>
                    <button
                        onClick={handleSaveEvaluations}
                        disabled={!isDirty}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md ${
                            isDirty 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        <SaveIcon className="w-4 h-4" />
                        Guardar Evaluaciones
                    </button>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                    <span className="text-xs text-gray-500 block font-medium">Equipos / Restaurantes</span>
                    <span className="text-2xl font-bold text-purple-700">{proyectoGroups.length}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                    <span className="text-xs text-gray-500 block font-medium">Alumnos Evaluados</span>
                    <span className="text-2xl font-bold text-blue-700">{stats.totalEvaluados} / {students.length}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                    <span className="text-xs text-gray-500 block font-medium">Media General Proyecto</span>
                    <span className="text-2xl font-bold text-indigo-700">{stats.media}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                    <span className="text-xs text-gray-500 block font-medium">Casos con Ajuste / No Colabora</span>
                    <span className={`text-2xl font-bold ${stats.sinColaborar > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {stats.sinColaborar}
                    </span>
                </div>
            </div>

            {/* SECTION 1: GROUP / RESTAURANT QUICK GRADING CARDS */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span>🏢</span> Paso 1: Poner Nota Grupal a cada Restaurante / Equipo
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            La nota que indiques aquí se <b>distribuye automáticamente</b> a todos los alumnos que integran el equipo.
                        </p>
                    </div>
                </div>

                {proyectoGroups.length === 0 ? (
                    <div className="p-6 text-center bg-purple-50/50 rounded-xl border border-dashed border-purple-200">
                        <p className="text-sm font-semibold text-purple-900">Aún no has creado grupos de proyecto.</p>
                        <p className="text-xs text-purple-700 mt-1">
                            Ve a "Definir Grupos de Proyecto" para agrupar a tus alumnos en restaurantes o equipos.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {proyectoGroups.map(grp => {
                            const groupGrade = groupGrades[grp.id] ?? null;
                            const memberCount = grp.studentIds.length;
                            const members = students.filter(s => grp.studentIds.includes(s.id));

                            return (
                                <div key={grp.id} className="border border-purple-100 rounded-xl p-4 bg-gradient-to-br from-white to-purple-50/20 shadow-xs flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3.5 h-3.5 rounded-full ${grp.color.split(' ')[0] || 'bg-purple-400'}`}></div>
                                                <h3 className="font-bold text-sm text-gray-900">{grp.name}</h3>
                                            </div>
                                            <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                                                {memberCount} alumno{memberCount !== 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        <div className="text-xs text-gray-500 mb-3 line-clamp-2">
                                            {members.length > 0 
                                                ? members.map(m => m.apellido1).join(', ')
                                                : <span className="italic text-gray-400">Sin alumnos asignados</span>
                                            }
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-purple-100 flex items-center justify-between gap-3">
                                        <span className="text-xs font-semibold text-gray-700">Nota Grupal (0-10):</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="10"
                                                placeholder="-"
                                                value={groupGrade ?? ''}
                                                onChange={e => handleGroupGradeChange(grp.id, e.target.value)}
                                                className="w-18 p-1.5 text-center font-bold text-sm bg-white border border-purple-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 rounded-lg outline-none shadow-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* SECTION 2: STUDENT INDIVIDUAL GRADING & ADJUSTMENTS */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span>👤</span> Paso 2: Notas Individuales y Ajustes por Alumno
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Si algún alumno <b>no colabora</b> o destaca, puedes modificar su nota individual y registrar el motivo correspondiente.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={filterGroup}
                            onChange={e => setFilterGroup(e.target.value)}
                            className="bg-white border border-gray-300 text-xs rounded-lg p-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
                        >
                            <option value="all">Todos los grupos</option>
                            {proyectoGroups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                            <option value="unassigned">Sin grupo asignado</option>
                        </select>

                        <input
                            type="text"
                            placeholder="Buscar alumno..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 w-48"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="p-3 w-8 text-center">#</th>
                                <th className="p-3">Alumno</th>
                                <th className="p-3">Restaurante / Grupo</th>
                                <th className="p-3 text-center w-28 bg-purple-50/50">Nota Grupal</th>
                                <th className="p-3 text-center w-28 bg-blue-50/50">Nota Individual</th>
                                <th className="p-3 text-center w-28">¿Colaboró?</th>
                                <th className="p-3">Ajuste y Motivo</th>
                                <th className="p-3 text-center w-28 bg-gray-100 font-bold">Nota Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredStudents.map((st, idx) => {
                                const grp = studentGroupMap[st.id];
                                const currentGroupGrade = grp ? groupGrades[grp.id] ?? null : null;
                                const ev = studentEvals[st.id] || {
                                    studentId: st.id,
                                    groupId: grp?.id || null,
                                    notaGrupal: currentGroupGrade,
                                    notaIndividual: null,
                                    collaborated: true,
                                    motivoAjuste: '',
                                    overrideFinalGrade: null,
                                    finalGrade: null,
                                };

                                const effectiveGrupal = ev.notaGrupal ?? currentGroupGrade;
                                const isExpanded = expandedStudentId === st.id;
                                const hasSpecialAdjustment = !ev.collaborated || Boolean(ev.motivoAjuste) || ev.overrideFinalGrade !== null;

                                return (
                                    <React.Fragment key={st.id}>
                                        <tr className={`hover:bg-purple-50/30 transition ${hasSpecialAdjustment ? 'bg-amber-50/40' : (idx % 2 !== 0 ? 'bg-gray-50/40' : 'bg-white')}`}>
                                            <td className="p-3 text-center text-gray-400 font-mono text-[11px]">
                                                {idx + 1}
                                            </td>
                                            <td className="p-3 font-semibold text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                                                        {st.nombre.charAt(0)}{st.apellido1.charAt(0)}
                                                    </div>
                                                    <span>{st.apellido1} {st.apellido2}, {st.nombre}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                {grp ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-100 text-purple-800">
                                                        <span className={`w-2 h-2 rounded-full ${grp.color.split(' ')[0] || 'bg-purple-500'}`}></span>
                                                        {grp.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic text-[11px]">Sin Grupo</span>
                                                )}
                                            </td>

                                            {/* Nota Grupal (from group or overridden) */}
                                            <td className="p-2 text-center bg-purple-50/30">
                                                <span className="font-bold text-purple-900 text-sm">
                                                    {effectiveGrupal !== null ? effectiveGrupal.toFixed(2) : '-'}
                                                </span>
                                            </td>

                                            {/* Nota Individual Input */}
                                            <td className="p-2 text-center bg-blue-50/30">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    max="10"
                                                    placeholder="-"
                                                    value={ev.notaIndividual ?? ''}
                                                    onChange={e => handleStudentIndividualGradeChange(st.id, e.target.value)}
                                                    className="w-16 p-1.5 text-center font-semibold text-sm bg-white border border-blue-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-200 rounded-lg outline-none mx-auto block shadow-xs"
                                                />
                                            </td>

                                            {/* ¿Colaboró? Toggle */}
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleCollaboration(st.id)}
                                                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 mx-auto ${
                                                        ev.collaborated
                                                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                    }`}
                                                >
                                                    {ev.collaborated ? (
                                                        <><CheckIcon className="w-3.5 h-3.5 text-green-700" /> SÍ</>
                                                    ) : (
                                                        <><AlertTriangleIcon className="w-3.5 h-3.5 text-red-700" /> NO</>
                                                    )}
                                                </button>
                                            </td>

                                            {/* Motivo & Quick Edit Trigger */}
                                            <td className="p-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex-1 truncate">
                                                        {ev.motivoAjuste ? (
                                                            <span className="text-[11px] font-medium text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md inline-block max-w-[280px] truncate" title={ev.motivoAjuste}>
                                                                📝 {ev.motivoAjuste}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-[11px] italic">
                                                                {ev.collaborated ? 'Desempeño normal' : 'Sin motivo especificado'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedStudentId(isExpanded ? null : st.id)}
                                                        className="text-gray-400 hover:text-purple-700 p-1 rounded-md transition"
                                                        title="Añadir o editar justificación de nota individual"
                                                    >
                                                        {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <PencilIcon className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Nota Final */}
                                            <td className="p-2 text-center bg-gray-50">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold inline-block ${
                                                    ev.finalGrade !== null 
                                                        ? (ev.finalGrade >= 5 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
                                                        : 'text-gray-400 font-normal'
                                                }`}>
                                                    {ev.finalGrade !== null ? ev.finalGrade.toFixed(2) : '-'}
                                                </span>
                                            </td>
                                        </tr>

                                        {/* EXPANDABLE ROW FOR MOTIVO / JUSTIFICACIÓN */}
                                        {isExpanded && (
                                            <tr className="bg-purple-50/50 border-b border-purple-200">
                                                <td colSpan={8} className="p-4 pl-12">
                                                    <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-xs space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                                                                <PencilIcon className="w-3.5 h-3.5 text-purple-700" />
                                                                Justificación / Motivo de la nota para {st.nombre} {st.apellido1}:
                                                            </h4>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[11px] text-gray-500 font-medium">
                                                                    ¿Fijar Nota Final Manualmente?
                                                                </span>
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    min="0"
                                                                    max="10"
                                                                    placeholder="Auto"
                                                                    value={ev.overrideFinalGrade ?? ''}
                                                                    onChange={e => handleStudentOverrideFinal(st.id, e.target.value)}
                                                                    className="w-16 p-1 text-center text-xs font-bold border border-gray-300 rounded focus:border-purple-600 outline-none"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Quick Motivo Chips */}
                                                        <div>
                                                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                                                                Sugerencias rápidas:
                                                            </span>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {COMMON_JUSTIFICATIONS.map(just => (
                                                                    <button
                                                                        key={just}
                                                                        type="button"
                                                                        onClick={() => handleSetMotivo(st.id, just)}
                                                                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-800 transition"
                                                                    >
                                                                        + {just}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Textarea for custom justification */}
                                                        <div>
                                                            <textarea
                                                                rows={2}
                                                                placeholder="Escribe aquí el por qué de la nota o ajuste individual..."
                                                                value={ev.motivoAjuste}
                                                                onChange={e => handleSetMotivo(st.id, e.target.value)}
                                                                className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CONFIG MODAL */}
            {showConfigModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowConfigModal(false)}>
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-800">Ponderación de Proyecto</h3>
                            <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Ajusta el porcentaje de peso entre la Nota Grupal del Restaurante y la Nota Individual de cada alumno.
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">
                                    Peso Nota Grupal (%):
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={pesoGrupal}
                                    onChange={e => {
                                        const val = parseInt(e.target.value, 10) || 0;
                                        setPesoGrupal(val);
                                        setPesoIndividual(Math.max(0, 100 - val));
                                        setIsDirty(true);
                                    }}
                                    className="w-full p-2 border rounded-lg text-sm font-bold text-purple-700"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">
                                    Peso Nota Individual (%):
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={pesoIndividual}
                                    onChange={e => {
                                        const val = parseInt(e.target.value, 10) || 0;
                                        setPesoIndividual(val);
                                        setPesoGrupal(Math.max(0, 100 - val));
                                        setIsDirty(true);
                                    }}
                                    className="w-full p-2 border rounded-lg text-sm font-bold text-blue-700"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-3 border-t">
                            <button
                                onClick={() => setShowConfigModal(false)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition"
                            >
                                Aceptar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

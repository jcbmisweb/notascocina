import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
    UsersIcon, SaveIcon, DownloadIcon, CheckIcon, AlertTriangleIcon, 
    PencilIcon, SettingsIcon, UserIcon, RefreshCwIcon, ChevronDownIcon, ChevronUpIcon,
    PrinterIcon, SearchIcon, CheckCircleIcon
} from '../components/icons';
import { Student, ProyectoGroup, RetoGroupEntry, RetoStudentEntry } from '../types';
import { DEFAULT_PROYECTO_CONFIG, ProyectoStructureConfig, RetoConfig } from '../data/constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudentAvatar, formatStudentFullName } from '../components/StudentAvatar';

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
        addToast,
        isStudentConvalidated
    } = useAppContext();

    // Filter active students for Proyecto (exclude convalidated in this module)
    const activeStudents = useMemo(() => {
        return students.filter(s => !isStudentConvalidated(s.id, 'proyecto'));
    }, [students, isStudentConvalidated]);

    const activeStudentsMap = useMemo(() => {
        const map: Record<string, Student> = {};
        activeStudents.forEach(s => { map[s.id] = s; });
        return map;
    }, [activeStudents]);

    // Active Config: uses saved custom config or default
    const [config, setConfig] = useState<ProyectoStructureConfig>(() => {
        return proyectoEvaluations?.customConfig || DEFAULT_PROYECTO_CONFIG;
    });

    // Retos evaluations state
    const [retosGroupGrades, setRetosGroupGrades] = useState<Record<string, Record<string, RetoGroupEntry>>>(() => {
        return proyectoEvaluations?.retosGroupGrades || {};
    });

    const [retosStudentGrades, setRetosStudentGrades] = useState<Record<string, Record<string, RetoStudentEntry>>>(() => {
        return proyectoEvaluations?.retosStudentGrades || {};
    });

    const [exposicionGrades, setExposicionGrades] = useState<Record<string, number | null>>(() => {
        return proyectoEvaluations?.exposicionGrades || {};
    });

    const [overrides, setOverrides] = useState<Record<string, number | null>>({});

    const [activeTab, setActiveTab] = useState<'global' | string>('global'); // 'global' or 'reto1'..'reto8'
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGroup, setFilterGroup] = useState<string>('all');
    const [isDirty, setIsDirty] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [tempConfig, setTempConfig] = useState<ProyectoStructureConfig>(config);

    // Sync from context when it loads
    useEffect(() => {
        if (proyectoEvaluations?.customConfig) {
            setConfig(proyectoEvaluations.customConfig);
        }
        if (proyectoEvaluations?.retosGroupGrades) {
            setRetosGroupGrades(proyectoEvaluations.retosGroupGrades);
        }
        if (proyectoEvaluations?.retosStudentGrades) {
            setRetosStudentGrades(proyectoEvaluations.retosStudentGrades);
        }
        if (proyectoEvaluations?.exposicionGrades) {
            setExposicionGrades(proyectoEvaluations.exposicionGrades);
        }
        setIsDirty(false);
    }, [proyectoEvaluations]);

    // Student assignments map
    const studentGroupMap = useMemo(() => {
        const map: Record<string, ProyectoGroup | null> = {};
        activeStudents.forEach(st => { map[st.id] = null; });
        (proyectoGroups || []).forEach(grp => {
            (grp.studentIds || []).forEach(stId => {
                if (activeStudentsMap[stId]) {
                    map[stId] = grp;
                }
            });
        });
        return map;
    }, [activeStudents, proyectoGroups, activeStudentsMap]);

    // Calculate score breakdown and provisional grade for each student
    const studentCalculations = useMemo(() => {
        const calcs: Record<string, {
            puntosRetos: number;
            puntosMaxEvaluadosRetos: number;
            ajusteDiabolico: number;
            puntosExposicion: number | null;
            totalPuntosObtenidos: number;
            totalPuntosEvaluados: number;
            notaProvisionalBase10: number | null;
            notaFinalDirecta: number;
            retosCompletadosCount: number;
            detallesPorReto: Record<string, { grupal: number | null; individual: number | null; total: number | null; entregado?: boolean }>;
        }> = {};

        activeStudents.forEach(st => {
            const grp = studentGroupMap[st.id];
            const grpId = grp?.id;
            
            let puntosRetos = 0;
            let puntosMaxEvaluadosRetos = 0;
            let ajusteDiabolico = 0;
            let retosCompletados = 0;
            const detalles: Record<string, any> = {};

            config.retos.forEach(reto => {
                const groupEntry: RetoGroupEntry = grpId ? (retosGroupGrades[grpId]?.[reto.id] || {}) : {};
                const studentEntry: RetoStudentEntry = retosStudentGrades[st.id]?.[reto.id] || {};

                if (reto.id === 'reto1') {
                    // Check if delivered
                    const isEntregado = Boolean(groupEntry.entregado);
                    if (isEntregado) retosCompletados++;
                    detalles[reto.id] = { entregado: isEntregado, fecha: groupEntry.fechaEntrega || null, grupal: null, individual: null, total: null };
                    return;
                }

                if (reto.id === 'reto6') {
                    // Diabolical review: +/- 1.0 adjustment
                    const val = typeof studentEntry.ajusteDiabolico === 'number' ? studentEntry.ajusteDiabolico : 0;
                    ajusteDiabolico = val;
                    if (studentEntry.ajusteDiabolico !== null && studentEntry.ajusteDiabolico !== undefined) {
                        retosCompletados++;
                    }
                    detalles[reto.id] = { ajuste: val, total: val, grupal: null, individual: val };
                    return;
                }

                if (reto.id === 'reto8') {
                    // Exposition handled separately
                    return;
                }

                // Regular retos (R2, R3, R4, R5, R7)
                let retoPuntos = 0;
                let retoMaxEvaluado = 0;
                let hasAnyGrade = false;

                const taskGrupal = reto.tasks.find(t => t.type === 'grupal');
                const taskInd = reto.tasks.find(t => t.type === 'individual');

                let notaGrupalVal: number | null = null;
                if (taskGrupal && taskGrupal.maxScore) {
                    if (typeof groupEntry.notaGrupal === 'number') {
                        notaGrupalVal = Math.min(taskGrupal.maxScore, Math.max(0, groupEntry.notaGrupal));
                        retoPuntos += notaGrupalVal;
                        retoMaxEvaluado += taskGrupal.maxScore;
                        hasAnyGrade = true;
                    }
                }

                let notaIndVal: number | null = null;
                if (taskInd && taskInd.maxScore) {
                    if (typeof studentEntry.notaIndividual === 'number') {
                        notaIndVal = Math.min(taskInd.maxScore, Math.max(0, studentEntry.notaIndividual));
                        retoPuntos += notaIndVal;
                        retoMaxEvaluado += taskInd.maxScore;
                        hasAnyGrade = true;
                    }
                }

                puntosRetos += retoPuntos;
                puntosMaxEvaluadosRetos += retoMaxEvaluado;
                if (hasAnyGrade) retosCompletados++;

                detalles[reto.id] = {
                    grupal: notaGrupalVal,
                    individual: notaIndVal,
                    total: hasAnyGrade ? retoPuntos : null
                };
            });

            // Reto 8: Exposition (up to 3.0 pts)
            const rawExpo = exposicionGrades[st.id];
            const maxExpo = config.retos.find(r => r.id === 'reto8')?.tasks.find(t => t.id === 'individual')?.maxScore ?? 3.0;
            const puntosExpo = (typeof rawExpo === 'number') ? Math.min(maxExpo, Math.max(0, rawExpo)) : null;

            if (puntosExpo !== null) retosCompletados++;

            // Total points so far (including diabolical adjustment)
            let totalObtenido = puntosRetos + ajusteDiabolico + (puntosExpo ?? 0);
            totalObtenido = Math.max(0, Math.min(10, totalObtenido));

            let totalEvaluado = puntosMaxEvaluadosRetos + (puntosExpo !== null ? maxExpo : 0);
            totalEvaluado = Math.min(10, totalEvaluado);

            // Provisional grade: sum of points obtained so far out of 10 (waiting for all grades to be entered)
            let provisionalBase10: number | null = null;
            if (totalEvaluado > 0 || retosCompletados > 0) {
                provisionalBase10 = parseFloat(totalObtenido.toFixed(2));
            }

            // Direct sum out of 10 points
            const finalDirecta = parseFloat(totalObtenido.toFixed(2));

            calcs[st.id] = {
                puntosRetos: parseFloat(puntosRetos.toFixed(2)),
                puntosMaxEvaluadosRetos: parseFloat(puntosMaxEvaluadosRetos.toFixed(2)),
                ajusteDiabolico: parseFloat(ajusteDiabolico.toFixed(2)),
                puntosExposicion: puntosExpo !== null ? parseFloat(puntosExpo.toFixed(2)) : null,
                totalPuntosObtenidos: finalDirecta,
                totalPuntosEvaluados: parseFloat(totalEvaluado.toFixed(2)),
                notaProvisionalBase10: provisionalBase10,
                notaFinalDirecta: finalDirecta,
                retosCompletadosCount: retosCompletados,
                detallesPorReto: detalles
            };
        });

        return calcs;
    }, [activeStudents, studentGroupMap, config, retosGroupGrades, retosStudentGrades, exposicionGrades]);

    // Save changes
    const handleSaveChanges = () => {
        const newState = {
            ...proyectoEvaluations,
            customConfig: config,
            retosGroupGrades,
            retosStudentGrades,
            exposicionGrades,
        };

        setProyectoEvaluations(newState);

        // Also synchronize final / provisional grades to courseGrades.proyecto and courseGrades.Proyecto
        setCourseGrades(prev => {
            const nextCourse = JSON.parse(JSON.stringify(prev || {}));
            activeStudents.forEach(st => {
                const calc = studentCalculations[st.id];
                if (calc && calc.totalPuntosEvaluados > 0) {
                    const gradeToSync = overrides[st.id] ?? calc.notaFinalDirecta;
                    
                    if (!nextCourse[st.id]) nextCourse[st.id] = {};
                    
                    // Sync both 'proyecto' and 'Proyecto' keys so it appears across all modules
                    ['proyecto', 'Proyecto'].forEach(k => {
                        if (!nextCourse[st.id][k]) nextCourse[st.id][k] = {};
                        nextCourse[st.id][k].t3 = gradeToSync;
                        nextCourse[st.id][k].final = gradeToSync;
                    });
                }
            });
            return nextCourse;
        });

        setIsDirty(false);
        addToast('Calificaciones de los Retos de Proyecto guardadas y sincronizadas con éxito.', 'success');
    };

    // Update handlers for Retos
    const handleUpdateGroupReto = (groupId: string, retoId: string, field: keyof RetoGroupEntry, val: any) => {
        setRetosGroupGrades(prev => {
            const next = { ...prev };
            if (!next[groupId]) next[groupId] = {};
            next[groupId] = {
                ...next[groupId],
                [retoId]: {
                    ...next[groupId][retoId],
                    [field]: val
                }
            };
            return next;
        });
        setIsDirty(true);
    };

    const handleUpdateStudentReto = (studentId: string, retoId: string, field: keyof RetoStudentEntry, val: any) => {
        setRetosStudentGrades(prev => {
            const next = { ...prev };
            if (!next[studentId]) next[studentId] = {};
            next[studentId] = {
                ...next[studentId],
                [retoId]: {
                    ...next[studentId][retoId],
                    [field]: val
                }
            };
            return next;
        });
        setIsDirty(true);
    };

    const handleUpdateExposicion = (studentId: string, valStr: string) => {
        const cleaned = valStr.replace(',', '.');
        const num = cleaned === '' ? null : parseFloat(cleaned);
        const maxExpo = config.retos.find(r => r.id === 'reto8')?.tasks.find(t => t.id === 'individual')?.maxScore ?? 3.0;

        if (cleaned !== '' && (isNaN(num as number) || (num as number) < 0 || (num as number) > maxExpo)) {
            return;
        }

        setExposicionGrades(prev => ({
            ...prev,
            [studentId]: num
        }));
        setIsDirty(true);
    };

    // Filtered students for display
    const sortedStudents = useMemo(() => {
        return [...activeStudents].sort((a, b) => (a.apellido1 || '').localeCompare(b.apellido1 || ''));
    }, [activeStudents]);

    const filteredStudents = useMemo(() => {
        return sortedStudents.filter(st => {
            const matchSearch = `${st.nombre} ${st.apellido1} ${st.apellido2}`.toLowerCase().includes(searchTerm.toLowerCase());
            const grp = studentGroupMap[st.id];
            if (filterGroup === 'all') return matchSearch;
            if (filterGroup === 'unassigned') return matchSearch && !grp;
            return matchSearch && grp?.id === filterGroup;
        });
    }, [sortedStudents, searchTerm, filterGroup, studentGroupMap]);

const addImageToPdf = (doc: jsPDF, imageData: string | null | undefined, x: number, y: number, w: number, h: number) => {
    if (imageData && imageData.startsWith('data:image')) {
        try {
            const imageType = imageData.substring(imageData.indexOf('/') + 1, imageData.indexOf(';'));
            doc.addImage(imageData, imageType.toUpperCase(), x, y, w, h);
        } catch (e) {
            console.error("Error adding image to PDF:", e);
        }
    }
};

    // Export PDF Report
    const handleExportPDF = (action: 'download' | 'print' = 'download') => {
        const doc = new jsPDF('landscape');
        const pageWidth = doc.internal.pageSize.getWidth();

        // Top Logos (Center logo on left, Teacher logo on right)
        if (instituteData.logo) {
            addImageToPdf(doc, instituteData.logo, 10, 8, 16, 16);
        }
        if (teacherData.logo) {
            addImageToPdf(doc, teacherData.logo, pageWidth - 10 - 16, 8, 16, 16);
        }

        // Header Title and Info (NO CIF)
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(instituteData.name || 'Centro de Formación Profesional', pageWidth / 2, 13, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        const subheader = [
            teacherData.name ? `Docente: ${teacherData.name}` : null,
            `Fecha: ${new Date().toLocaleDateString('es-ES')}`
        ].filter(Boolean).join(' | ');
        doc.text(subheader, pageWidth / 2, 18, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(88, 28, 135);
        doc.text('EVALUACIÓN DE RETOS - MÓDULO DE PROYECTO INTERMODULAR', pageWidth / 2, 25, { align: 'center' });

        doc.setDrawColor(216, 180, 254);
        doc.setLineWidth(0.4);
        doc.line(10, 29, pageWidth - 10, 29);

        const tableHead = [
            ['#', 'Alumno', 'Equipo / Restaurante', 'R1 Conf.', 'R2 Zonas', 'R3 Carta', 'R4 Interm.', 'R5 Escand.', 'R6 Diab.', 'R7 Final', 'R8 Expo (30%)', 'TOTAL /10', 'PROVISIONAL']
        ];

        const tableRows = filteredStudents.map((st, idx) => {
            const grp = studentGroupMap[st.id];
            const isCoord = grp?.coordinadorId === st.id;
            const calc = studentCalculations[st.id];
            const d = calc?.detallesPorReto || {};

            return [
                idx + 1,
                `${st.apellido1} ${st.apellido2}, ${st.nombre}${isCoord ? ' 👑' : ''}`,
                grp?.name || 'Sin Equipo',
                d.reto1?.entregado ? 'SÍ' : 'NO',
                d.reto2?.total !== null ? d.reto2.total.toFixed(2) : '-',
                d.reto3?.total !== null ? d.reto3.total.toFixed(2) : '-',
                d.reto4?.total !== null ? d.reto4.total.toFixed(2) : '-',
                d.reto5?.total !== null ? d.reto5.total.toFixed(2) : '-',
                calc.ajusteDiabolico !== 0 ? (calc.ajusteDiabolico > 0 ? `+${calc.ajusteDiabolico.toFixed(1)}` : calc.ajusteDiabolico.toFixed(1)) : '0.0',
                d.reto7?.total !== null ? d.reto7.total.toFixed(2) : '-',
                calc.puntosExposicion !== null ? calc.puntosExposicion.toFixed(2) : '-',
                `${calc.totalPuntosObtenidos.toFixed(2)} pts`,
                calc.notaProvisionalBase10 !== null ? `${calc.notaProvisionalBase10.toFixed(2)}` : '-'
            ];
        });

        autoTable(doc, {
            startY: 32,
            head: tableHead,
            body: tableRows,
            theme: 'grid',
            headStyles: {
                fillColor: [88, 28, 135],
                textColor: [255, 255, 255],
                fontSize: 7.5,
                halign: 'center',
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 7.5,
                textColor: [50, 50, 50]
            },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 48 },
                2: { cellWidth: 36 },
                3: { cellWidth: 14, halign: 'center' },
                4: { cellWidth: 16, halign: 'center' },
                5: { cellWidth: 16, halign: 'center' },
                6: { cellWidth: 16, halign: 'center' },
                7: { cellWidth: 16, halign: 'center' },
                8: { cellWidth: 16, halign: 'center' },
                9: { cellWidth: 16, halign: 'center' },
                10: { cellWidth: 20, halign: 'center' },
                11: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
                12: { cellWidth: 24, halign: 'center', fontStyle: 'bold' }
            },
            alternateRowStyles: {
                fillColor: [250, 245, 255]
            },
            margin: { left: 10, right: 10 }
        });

        if (action === 'print') {
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        } else {
            doc.save('Evaluacion_Retos_Proyecto_Intermodular.pdf');
            addToast('Documento de calificaciones descargado en PDF.', 'success');
        }
    };

    // Save custom configuration from modal
    const handleSaveConfigModal = () => {
        setConfig(tempConfig);
        setIsDirty(true);
        setShowConfigModal(false);
        addToast('Ponderaciones y puntuaciones máximas actualizadas.', 'success');
    };

    const handleResetConfigToDefault = () => {
        if (window.confirm('¿Deseas restablecer las puntuaciones oficiales por defecto (70% Retos / 30% Exposición)?')) {
            setConfig(DEFAULT_PROYECTO_CONFIG);
            setTempConfig(DEFAULT_PROYECTO_CONFIG);
            setIsDirty(true);
            setShowConfigModal(false);
            addToast('Ponderaciones restablecidas a los valores por defecto.', 'info');
        }
    };

    if (activeStudents.length === 0) {
        return (
            <div className="text-center p-8 bg-white rounded-lg shadow border">
                <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-700">No hay alumnos evaluables en Proyecto</h2>
                <p className="text-gray-500 mt-2">
                    Todos los alumnos están convalidados para este módulo o aún no se han importado.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                        <UsersIcon className="w-8 h-8 mr-3 text-purple-600" />
                        Evaluación del Proyecto por Retos
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Control de los <strong>8 Retos</strong> (70% bloques de retos + 30% exposición oral) con <strong>nota provisional en tiempo real</strong>.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => {
                            setTempConfig(JSON.parse(JSON.stringify(config)));
                            setShowConfigModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-700 hover:text-purple-700 rounded-lg text-xs font-bold transition shadow-xs"
                        title="Modificar puntuaciones máximas y porcentajes de los retos"
                    >
                        <SettingsIcon className="w-4 h-4 text-purple-600" />
                        Configurar Puntuaciones
                    </button>

                    <button
                        onClick={() => handleExportPDF('print')}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-700 hover:text-purple-700 rounded-lg text-xs font-bold transition shadow-xs"
                    >
                        <PrinterIcon className="w-4 h-4 text-purple-600" />
                        Imprimir
                    </button>

                    <button
                        onClick={() => handleExportPDF('download')}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-700 hover:text-purple-700 rounded-lg text-xs font-bold transition shadow-xs"
                    >
                        <DownloadIcon className="w-4 h-4 text-purple-600" />
                        Exportar PDF
                    </button>

                    <button
                        onClick={handleSaveChanges}
                        disabled={!isDirty}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm ${
                            isDirty 
                                ? 'bg-purple-600 hover:bg-purple-700 text-white animate-pulse' 
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        <SaveIcon className="w-4 h-4" />
                        Guardar Calificaciones
                    </button>
                </div>
            </header>

            {/* Selector de Retos / Pestañas de Navegación */}
            <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs flex items-center gap-1.5 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('global')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition flex-shrink-0 flex items-center gap-1.5 ${
                        activeTab === 'global'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-gray-600 hover:bg-purple-50 hover:text-purple-800'
                    }`}
                >
                    <span>📊</span>
                    <span>Vista Global (Todos los Retos)</span>
                </button>

                <div className="h-5 w-px bg-gray-300 mx-1 flex-shrink-0"></div>

                {config.retos.map(reto => {
                    const isSelected = activeTab === reto.id;
                    return (
                        <button
                            key={reto.id}
                            onClick={() => setActiveTab(reto.id)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex-shrink-0 flex items-center gap-1.5 ${
                                isSelected
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'text-gray-600 hover:bg-purple-50 hover:text-purple-800'
                            }`}
                        >
                            <span>{reto.number === 6 ? '😈' : reto.number === 8 ? '🎤' : '📌'}</span>
                            <span>{reto.shortTitle}</span>
                        </button>
                    );
                })}
            </div>

            {/* Barra de Búsqueda y Filtros */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
                <div className="flex items-center gap-3 flex-1 max-w-md">
                    <div className="relative w-full">
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="Buscar alumno por nombre o apellido..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500">Filtrar por Equipo:</span>
                    <select
                        value={filterGroup}
                        onChange={e => setFilterGroup(e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-medium focus:ring-1 focus:ring-purple-500"
                    >
                        <option value="all">Todos los Equipos ({proyectoGroups.length})</option>
                        {proyectoGroups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                        <option value="unassigned">Sin Equipo Asignado</option>
                    </select>
                </div>
            </div>

            {/* Vista 1: VISTA GLOBAL (Todos los Retos) */}
            {activeTab === 'global' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-purple-50/70 text-purple-950 font-bold border-b border-purple-200">
                                <tr>
                                    <th className="p-3 w-8 text-center">#</th>
                                    <th className="p-3 w-56">Alumno / Equipo</th>
                                    <th className="p-2 text-center" title="Reto 1: Configuración (Entrega formal)">R1: Conf.</th>
                                    <th className="p-2 text-center" title="Reto 2: Zonas geográficas (0.5 G + 0.5 I = 1.0)">R2: Zonas</th>
                                    <th className="p-2 text-center" title="Reto 3: Carta y Fichas (1.0 G + 1.0 I = 2.0)">R3: Carta</th>
                                    <th className="p-2 text-center" title="Reto 4: Entrega Intermedia (1.0 G)">R4: Interm.</th>
                                    <th className="p-2 text-center" title="Reto 5: Escandallos y Costes (1.0 G + 1.0 I = 2.0)">R5: Costes</th>
                                    <th className="p-2 text-center" title="Reto 6: Coevaluación Diabólica (+/- 1.0)">R6: Diab.</th>
                                    <th className="p-2 text-center" title="Reto 7: Entrega Final Memoria (1.0 G)">R7: Final</th>
                                    <th className="p-2 text-center bg-purple-100/60 font-bold text-purple-900" title="Subtotal Bloque Retos (70%)">
                                        Subtotal Retos (70%)
                                    </th>
                                    <th className="p-2 text-center bg-indigo-50/60 font-bold text-indigo-900" title="Reto 8: Exposición (30%)">
                                        R8: Expo (30%)
                                    </th>
                                    <th className="p-3 text-center bg-emerald-50 font-bold text-emerald-950 w-32 border-l border-emerald-200">
                                        NOTA PROVISIONAL
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredStudents.map((st, idx) => {
                                    const grp = studentGroupMap[st.id];
                                    const isCoordinator = grp?.coordinadorId === st.id;
                                    const calc = studentCalculations[st.id];
                                    const d = calc.detallesPorReto;

                                    return (
                                        <tr key={st.id} className="hover:bg-purple-50/20 transition">
                                            <td className="p-3 text-center font-mono text-gray-400 text-[11px]">{idx + 1}</td>
                                            
                                            {/* Alumno + Equipo */}
                                            <td className="p-3">
                                                <div className="flex items-center gap-2.5">
                                                    <StudentAvatar student={st} size="sm" />
                                                    <div className="truncate">
                                                        <div className="flex items-center gap-1 truncate font-semibold text-gray-900 text-xs">
                                                            <span>{formatStudentFullName(st)}</span>
                                                            {isCoordinator && (
                                                                <span className="text-amber-500 font-bold text-xs" title="Coordinador/a del equipo">👑</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-gray-500 block truncate">
                                                            {grp ? grp.name : <em className="text-gray-400">Sin Equipo</em>}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* R1: Entrega */}
                                            <td className="p-2 text-center">
                                                {d.reto1?.entregado ? (
                                                    <span className="inline-flex items-center text-emerald-600 font-bold text-xs" title={d.reto1.fecha ? `Entregado: ${d.reto1.fecha}` : 'Entregado'}>
                                                        ✓
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 font-bold text-xs">-</span>
                                                )}
                                            </td>

                                            {/* R2: Zonas */}
                                            <td className="p-2 text-center">
                                                <span className={`font-semibold ${d.reto2?.total !== null ? 'text-gray-900' : 'text-gray-300'}`}>
                                                    {d.reto2?.total !== null ? d.reto2.total.toFixed(2) : '-'}
                                                </span>
                                            </td>

                                            {/* R3: Carta */}
                                            <td className="p-2 text-center">
                                                <span className={`font-semibold ${d.reto3?.total !== null ? 'text-gray-900' : 'text-gray-300'}`}>
                                                    {d.reto3?.total !== null ? d.reto3.total.toFixed(2) : '-'}
                                                </span>
                                            </td>

                                            {/* R4: Intermedia */}
                                            <td className="p-2 text-center">
                                                <span className={`font-semibold ${d.reto4?.total !== null ? 'text-gray-900' : 'text-gray-300'}`}>
                                                    {d.reto4?.total !== null ? d.reto4.total.toFixed(2) : '-'}
                                                </span>
                                            </td>

                                            {/* R5: Escandallos */}
                                            <td className="p-2 text-center">
                                                <span className={`font-semibold ${d.reto5?.total !== null ? 'text-gray-900' : 'text-gray-300'}`}>
                                                    {d.reto5?.total !== null ? d.reto5.total.toFixed(2) : '-'}
                                                </span>
                                            </td>

                                            {/* R6: Diabólica */}
                                            <td className="p-2 text-center">
                                                <span className={`font-bold ${
                                                    calc.ajusteDiabolico > 0 ? 'text-emerald-700' : calc.ajusteDiabolico < 0 ? 'text-red-700' : 'text-gray-400'
                                                }`}>
                                                    {calc.ajusteDiabolico > 0 ? `+${calc.ajusteDiabolico.toFixed(1)}` : calc.ajusteDiabolico.toFixed(1)}
                                                </span>
                                            </td>

                                            {/* R7: Entrega Final */}
                                            <td className="p-2 text-center">
                                                <span className={`font-semibold ${d.reto7?.total !== null ? 'text-gray-900' : 'text-gray-300'}`}>
                                                    {d.reto7?.total !== null ? d.reto7.total.toFixed(2) : '-'}
                                                </span>
                                            </td>

                                            {/* Subtotal Retos (70%) */}
                                            <td className="p-2 text-center bg-purple-50/40 font-bold text-purple-950">
                                                {calc.puntosRetos > 0 ? calc.puntosRetos.toFixed(2) : '-'}
                                            </td>

                                            {/* R8: Exposición (30%) */}
                                            <td className="p-2 text-center bg-indigo-50/40">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    max="3"
                                                    placeholder="-"
                                                    value={exposicionGrades[st.id] ?? ''}
                                                    onChange={e => handleUpdateExposicion(st.id, e.target.value)}
                                                    className="w-16 p-1 text-center font-bold text-xs bg-white border border-indigo-200 rounded focus:border-indigo-600 focus:outline-none"
                                                />
                                            </td>

                                            {/* NOTA PROVISIONAL */}
                                            <td className="p-3 text-center bg-emerald-50/50 border-l border-emerald-100">
                                                <div className="flex flex-col items-center justify-center">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-black ${
                                                        calc.notaProvisionalBase10 !== null 
                                                            ? calc.notaProvisionalBase10 >= 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                                            : 'text-gray-400 font-normal'
                                                    }`}>
                                                        {calc.notaProvisionalBase10 !== null ? calc.notaProvisionalBase10.toFixed(2) : 'Sin evaluar'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 mt-0.5" title="Puntos acumulados directos hacia el 10 final">
                                                        {calc.totalPuntosObtenidos.toFixed(2)} / 10 pts
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Vista 2: MODO RETO A RETO (Enfoque específico) */}
            {activeTab !== 'global' && (() => {
                const currentReto = config.retos.find(r => r.id === activeTab);
                if (!currentReto) return null;

                const taskGrupal = currentReto.tasks.find(t => t.type === 'grupal');
                const taskInd = currentReto.tasks.find(t => t.type === 'individual');
                const taskEntrega = currentReto.tasks.find(t => t.type === 'entrega');

                return (
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-6">
                        {/* Banner del Reto Seleccionado */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                            <div>
                                <h2 className="text-lg font-bold text-purple-950 flex items-center gap-2">
                                    <span>{currentReto.number === 6 ? '😈' : currentReto.number === 8 ? '🎤' : '📌'}</span>
                                    <span>{currentReto.title}</span>
                                </h2>
                                <p className="text-xs text-purple-800 mt-0.5">{currentReto.description}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs bg-white text-purple-900 border border-purple-200 font-bold px-3 py-1 rounded-full shadow-xs">
                                    {currentReto.bloque === 'retos' ? 'Bloque Retos (70%)' : 'Bloque Exposición (30%)'}
                                </span>
                            </div>
                        </div>

                        {/* Caso Reto 1: Entrega Grupal (Sin nota numérica, solo entregado y fecha) */}
                        {currentReto.id === 'reto1' && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-sm text-gray-800">Registro de Entrega por Restaurante / Equipo</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {proyectoGroups.map(grp => {
                                        const entry = retosGroupGrades[grp.id]?.[currentReto.id] || {};
                                        const isEntregado = Boolean(entry.entregado);

                                        return (
                                            <div key={grp.id} className={`p-4 rounded-xl border transition ${isEntregado ? 'bg-emerald-50/50 border-emerald-300' : 'bg-gray-50 border-gray-200'}`}>
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                                                        <span>🍽️</span>
                                                        <span>{grp.name}</span>
                                                    </h4>
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isEntregado ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                        {isEntregado ? '✓ Entregado' : 'Pendiente'}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-4 text-xs">
                                                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={isEntregado}
                                                            onChange={e => handleUpdateGroupReto(grp.id, currentReto.id, 'entregado', e.target.checked)}
                                                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                                        />
                                                        <span>Marcar como Entregado</span>
                                                    </label>

                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-gray-500">Fecha:</span>
                                                        <input
                                                            type="date"
                                                            value={entry.fechaEntrega || ''}
                                                            onChange={e => handleUpdateGroupReto(grp.id, currentReto.id, 'fechaEntrega', e.target.value)}
                                                            className="p-1 bg-white border border-gray-300 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Caso Reto 6: Evaluación Diabólica (+/- 1.0 pto de modulación) */}
                        {currentReto.id === 'reto6' && (
                            <div className="space-y-4">
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 flex items-center justify-between gap-3">
                                    <div>
                                        <span className="font-bold">Ajuste de Coevaluación Diabólica:</span> Modula la nota individual de cada alumno según su implicación (+/- 1.0 punto).
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                                            <tr>
                                                <th className="p-3">Alumno</th>
                                                <th className="p-3">Equipo</th>
                                                <th className="p-3 text-center">Ajuste Rápido</th>
                                                <th className="p-3 text-center w-28">Puntos (+/-)</th>
                                                <th className="p-3">Motivo / Observaciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {filteredStudents.map(st => {
                                                const grp = studentGroupMap[st.id];
                                                const entry = retosStudentGrades[st.id]?.[currentReto.id] || {};
                                                const val = entry.ajusteDiabolico ?? 0;

                                                return (
                                                    <tr key={st.id} className="hover:bg-purple-50/20">
                                                        <td className="p-3 font-semibold text-gray-900">
                                                            <div className="flex items-center gap-2">
                                                                <StudentAvatar student={st} size="xs" />
                                                                <span>{formatStudentFullName(st)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-gray-500">{grp?.name || 'Sin equipo'}</td>
                                                        <td className="p-3 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                {[-1.0, -0.5, 0.0, 0.5, 1.0].map(pt => (
                                                                    <button
                                                                        key={pt}
                                                                        type="button"
                                                                        onClick={() => handleUpdateStudentReto(st.id, currentReto.id, 'ajusteDiabolico', pt)}
                                                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                                                                            val === pt 
                                                                                ? pt > 0 ? 'bg-emerald-600 text-white' : pt < 0 ? 'bg-red-600 text-white' : 'bg-gray-700 text-white'
                                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                        }`}
                                                                    >
                                                                        {pt > 0 ? `+${pt}` : pt}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                min="-1"
                                                                max="1"
                                                                value={val}
                                                                onChange={e => handleUpdateStudentReto(st.id, currentReto.id, 'ajusteDiabolico', parseFloat(e.target.value) || 0)}
                                                                className={`w-16 p-1 text-center font-bold text-xs rounded border focus:outline-none ${
                                                                    val > 0 ? 'border-emerald-300 text-emerald-800 bg-emerald-50' : val < 0 ? 'border-red-300 text-red-800 bg-red-50' : 'border-gray-300 text-gray-700'
                                                                }`}
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <input
                                                                type="text"
                                                                placeholder="Motivo del ajuste de coevaluación..."
                                                                value={entry.observaciones || ''}
                                                                onChange={e => handleUpdateStudentReto(st.id, currentReto.id, 'observaciones', e.target.value)}
                                                                className="w-full p-1 text-xs border border-gray-200 rounded focus:border-purple-500 focus:outline-none"
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

                        {/* Caso Retos Regulares (Reto 2, 3, 4, 5, 7, 8) */}
                        {currentReto.id !== 'reto1' && currentReto.id !== 'reto6' && (
                            <div className="space-y-6">
                                {/* Tareas Grupales (si el reto tiene tarea grupal) */}
                                {taskGrupal && (
                                    <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-xs text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                                                <span>👥</span>
                                                <span>Nota Grupal ({taskGrupal.name} - Máx: {taskGrupal.maxScore} ptos)</span>
                                            </h3>
                                            <span className="text-[11px] text-purple-700 font-medium">Se asigna a todos los miembros del restaurante</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {proyectoGroups.map(grp => {
                                                const groupGrade = retosGroupGrades[grp.id]?.[currentReto.id]?.notaGrupal;
                                                return (
                                                    <div key={grp.id} className="p-3 bg-white rounded-lg border border-purple-100 shadow-xs flex items-center justify-between gap-2">
                                                        <span className="font-semibold text-xs text-gray-800 truncate">{grp.name}</span>
                                                        <input
                                                            type="number"
                                                            step={taskGrupal.step || 0.1}
                                                            min="0"
                                                            max={taskGrupal.maxScore || 10}
                                                            placeholder={`0 - ${taskGrupal.maxScore}`}
                                                            value={groupGrade ?? ''}
                                                            onChange={e => {
                                                                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                                                handleUpdateGroupReto(grp.id, currentReto.id, 'notaGrupal', val);
                                                            }}
                                                            className="w-16 p-1 text-center font-bold text-xs bg-purple-50/40 border border-purple-300 rounded focus:border-purple-600 focus:outline-none"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Tabla de Calificaciones Individuales y Totales */}
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                                            <tr>
                                                <th className="p-3">Alumno</th>
                                                <th className="p-3">Equipo / Restaurante</th>
                                                {taskGrupal && <th className="p-3 text-center">Nota Grupal</th>}
                                                {taskInd && (
                                                    <th className="p-3 text-center bg-blue-50/50 text-blue-950">
                                                        {taskInd.name} (Máx: {taskInd.maxScore} ptos)
                                                    </th>
                                                )}
                                                <th className="p-3 text-center font-bold bg-purple-50 text-purple-950 w-28">
                                                    Total Reto
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {filteredStudents.map(st => {
                                                const grp = studentGroupMap[st.id];
                                                const groupEntry = grp ? retosGroupGrades[grp.id]?.[currentReto.id] : undefined;
                                                const studentEntry = retosStudentGrades[st.id]?.[currentReto.id] || {};
                                                const calc = studentCalculations[st.id];
                                                const retoDetalle = calc.detallesPorReto[currentReto.id];

                                                return (
                                                    <tr key={st.id} className="hover:bg-purple-50/20">
                                                        <td className="p-3 font-semibold text-gray-900">
                                                            <div className="flex items-center gap-2">
                                                                <StudentAvatar student={st} size="xs" />
                                                                <span>{formatStudentFullName(st)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-gray-500">{grp?.name || 'Sin equipo'}</td>
                                                        
                                                        {taskGrupal && (
                                                            <td className="p-3 text-center font-bold text-purple-900">
                                                                {groupEntry?.notaGrupal !== undefined && groupEntry?.notaGrupal !== null 
                                                                    ? Number(groupEntry.notaGrupal).toFixed(2) 
                                                                    : '-'}
                                                            </td>
                                                        )}

                                                        {taskInd && (
                                                            <td className="p-2 text-center bg-blue-50/30">
                                                                {currentReto.id === 'reto8' ? (
                                                                    <input
                                                                        type="number"
                                                                        step="0.1"
                                                                        min="0"
                                                                        max={taskInd.maxScore || 3}
                                                                        placeholder={`0 - ${taskInd.maxScore}`}
                                                                        value={exposicionGrades[st.id] ?? ''}
                                                                        onChange={e => handleUpdateExposicion(st.id, e.target.value)}
                                                                        className="w-16 p-1 text-center font-bold text-xs bg-white border border-blue-300 rounded focus:border-blue-600 focus:outline-none"
                                                                    />
                                                                ) : (
                                                                    <input
                                                                        type="number"
                                                                        step={taskInd.step || 0.1}
                                                                        min="0"
                                                                        max={taskInd.maxScore || 10}
                                                                        placeholder={`0 - ${taskInd.maxScore}`}
                                                                        value={studentEntry.notaIndividual ?? ''}
                                                                        onChange={e => {
                                                                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                                                            handleUpdateStudentReto(st.id, currentReto.id, 'notaIndividual', val);
                                                                        }}
                                                                        className="w-16 p-1 text-center font-bold text-xs bg-white border border-blue-300 rounded focus:border-blue-600 focus:outline-none"
                                                                    />
                                                                )}
                                                            </td>
                                                        )}

                                                        <td className="p-3 text-center bg-purple-50/50 font-bold text-purple-950">
                                                            {currentReto.id === 'reto8' 
                                                                ? (calc.puntosExposicion !== null ? calc.puntosExposicion.toFixed(2) : '-')
                                                                : (retoDetalle?.total !== null ? retoDetalle?.total.toFixed(2) : '-')}
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
                );
            })()}

            {/* Modal de Configuración de Puntuaciones y Ponderaciones */}
            {showConfigModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border">
                        <div className="p-5 bg-purple-950 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-base flex items-center gap-2">
                                    <SettingsIcon className="w-5 h-5 text-purple-400" />
                                    <span>Configuración de Puntuaciones y Ponderaciones</span>
                                </h3>
                                <p className="text-xs text-purple-200 mt-0.5">
                                    Ajusta las notas máximas de cada reto o los porcentajes de los bloques cuando lo necesites.
                                </p>
                            </div>
                            <button onClick={() => setShowConfigModal(false)} className="text-white hover:text-purple-300 font-bold text-xl">
                                ×
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-800">
                            {/* Bloques de Porcentaje */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50/70 rounded-xl border border-purple-200">
                                <div>
                                    <label className="font-bold block text-purple-950 mb-1">Ponderación Bloque Retos (%):</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={tempConfig.bloques.retosWeight}
                                        onChange={e => {
                                            const w = parseInt(e.target.value, 10) || 0;
                                            setTempConfig(prev => ({
                                                ...prev,
                                                bloques: {
                                                    retosWeight: w,
                                                    exposicionWeight: Math.max(0, 100 - w)
                                                }
                                            }));
                                        }}
                                        className="w-full p-2 bg-white border border-purple-300 rounded-lg font-bold text-center text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold block text-purple-950 mb-1">Ponderación Exposición (%):</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={tempConfig.bloques.exposicionWeight}
                                        onChange={e => {
                                            const w = parseInt(e.target.value, 10) || 0;
                                            setTempConfig(prev => ({
                                                ...prev,
                                                bloques: {
                                                    exposicionWeight: w,
                                                    retosWeight: Math.max(0, 100 - w)
                                                }
                                            }));
                                        }}
                                        className="w-full p-2 bg-white border border-purple-300 rounded-lg font-bold text-center text-sm"
                                    />
                                </div>
                            </div>

                            {/* Desglose de cada Reto */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-sm text-gray-800">Puntuaciones Máximas por Reto:</h4>
                                <div className="space-y-2">
                                    {tempConfig.retos.map((r, rIdx) => (
                                        <div key={r.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900">{r.title}</p>
                                                <p className="text-[11px] text-gray-500">{r.description}</p>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {r.tasks.map((task, tIdx) => {
                                                    if (task.type === 'entrega') {
                                                        return (
                                                            <span key={task.id} className="text-[11px] font-semibold text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                                                Sin nota numérica
                                                            </span>
                                                        );
                                                    }
                                                    return (
                                                        <div key={task.id} className="text-center">
                                                            <span className="block text-[10px] text-gray-500 font-semibold">{task.name}</span>
                                                            <input
                                                                type="number"
                                                                step="0.05"
                                                                min="0"
                                                                max="10"
                                                                value={task.maxScore ?? ''}
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    setTempConfig(prev => {
                                                                        const nextRetos = [...prev.retos];
                                                                        const targetReto = { ...nextRetos[rIdx] };
                                                                        const targetTasks = [...targetReto.tasks];
                                                                        targetTasks[tIdx] = { ...targetTasks[tIdx], maxScore: val };
                                                                        targetReto.tasks = targetTasks;
                                                                        nextRetos[rIdx] = targetReto;
                                                                        return { ...prev, retos: nextRetos };
                                                                    });
                                                                }}
                                                                className="w-16 p-1 text-center font-bold text-xs bg-white border border-gray-300 rounded"
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={handleResetConfigToDefault}
                                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:text-red-600 rounded-lg font-semibold text-xs"
                            >
                                Restablecer Valores Oficiales
                            </button>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowConfigModal(false)}
                                    className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold text-xs hover:bg-gray-100"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveConfigModal}
                                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-xs"
                                >
                                    Guardar Configuración
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProyectoEvaluacionView;

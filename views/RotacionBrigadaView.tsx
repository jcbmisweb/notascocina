import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
    UsersIcon, ChefHatIcon, DownloadIcon, CheckIcon, AlertTriangleIcon, 
    SearchIcon, FileTextIcon, FilterIcon, RefreshCwIcon, StarIcon,
    SparklesIcon, XIcon, SaveIcon, LockClosedIcon, RotateCcwIcon, ArrowRightLeftIcon
} from '../components/icons';
import { Student, ServiceRole, Service, PracticeGroup, StudentRoleAssignment } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface RotationRow {
    student: Student;
    group: PracticeGroup | null;
    roleCounts: Record<string, number>;
    totalServices: number;
    hasLed: boolean;
    history: { serviceName: string; date: string; trimester: string; roleName: string; isLeader: boolean }[];
}

export const RotacionBrigadaView: React.FC = () => {
    const { 
        students, 
        practiceGroups, 
        services, 
        setServices,
        serviceRoles, 
        teacherData, 
        instituteData,
        addToast 
    } = useAppContext();

    const [selectedTrimester, setSelectedTrimester] = useState<'all' | 't1' | 't2' | 't3'>('all');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudentTimeline, setSelectedStudentTimeline] = useState<string | null>(null);

    // Modal state for rotation reparto
    const [isRepartoModalOpen, setIsRepartoModalOpen] = useState(false);
    const [selectedServiceIdForReparto, setSelectedServiceIdForReparto] = useState<string>('');
    const [provisionalRoles, setProvisionalRoles] = useState<Record<string, string>>({});
    const [repartoTargetMode, setRepartoTargetMode] = useState<'service_groups' | 'all_students'>('service_groups');
    const [repartoGroupFilter, setRepartoGroupFilter] = useState<string>('all');
    const [repartoSearchTerm, setRepartoSearchTerm] = useState<string>('');

    // Target service for rotation distribution
    const serviceForReparto = useMemo(() => {
        return services.find(s => s.id === selectedServiceIdForReparto) || null;
    }, [services, selectedServiceIdForReparto]);

    // Eligible students for the chosen service
    const eligibleStudentsForReparto = useMemo(() => {
        if (!serviceForReparto) return [];
        if (repartoTargetMode === 'all_students') {
            return students;
        }

        if (serviceForReparto.type === 'agrupacion') {
            const studentIds = (serviceForReparto.agrupaciones || []).flatMap(a => a.studentIds);
            const found = students.filter(s => studentIds.includes(s.id));
            return found.length > 0 ? found : students;
        } else {
            const assignedGroupIds = [
                ...(serviceForReparto.assignedGroups?.comedor || []),
                ...(serviceForReparto.assignedGroups?.takeaway || [])
            ];
            const assignedGroups = practiceGroups.filter(g => assignedGroupIds.includes(g.id));
            const studentIds = assignedGroups.flatMap(g => g.studentIds);
            const found = students.filter(s => studentIds.includes(s.id));
            return found.length > 0 ? found : students;
        }
    }, [serviceForReparto, repartoTargetMode, students, practiceGroups]);

    // Historical counts for candidates across other services (excluding current one)
    const candidatesHistoricalStats = useMemo(() => {
        const statsMap: Record<string, { leaderCount: number; roleCounts: Record<string, number> }> = {};
        students.forEach(st => {
            const rCounts: Record<string, number> = {};
            serviceRoles.forEach(r => { rCounts[r.id] = 0; });
            statsMap[st.id] = { leaderCount: 0, roleCounts: rCounts };
        });

        services.forEach(srv => {
            if (srv.id === selectedServiceIdForReparto) return;
            (srv.studentRoles || []).forEach(sr => {
                if (statsMap[sr.studentId]) {
                    const role = serviceRoles.find(r => r.id === sr.roleId);
                    if (role) {
                        statsMap[sr.studentId].roleCounts[sr.roleId] = (statsMap[sr.studentId].roleCounts[sr.roleId] || 0) + 1;
                        if (role.type === 'leader') {
                            statsMap[sr.studentId].leaderCount += 1;
                        }
                    }
                }
            });
        });
        return statsMap;
    }, [students, serviceRoles, services, selectedServiceIdForReparto]);

    // Role assignment counts in provisional state
    const provisionalRoleCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        serviceRoles.forEach(r => { counts[r.id] = 0; });
        (Object.values(provisionalRoles) as string[]).forEach(roleId => {
            if (counts[roleId] !== undefined) {
                counts[roleId]++;
            }
        });
        return counts;
    }, [serviceRoles, provisionalRoles]);

    // Filtered students for display in modal
    const filteredRepartoStudents = useMemo(() => {
        return eligibleStudentsForReparto.filter(st => {
            const group = practiceGroups.find(g => g.studentIds.includes(st.id));
            const matchesGroup = repartoGroupFilter === 'all' || group?.id === repartoGroupFilter;
            const fullName = `${st.apellido1} ${st.apellido2} ${st.nombre}`.toLowerCase();
            const matchesSearch = fullName.includes(repartoSearchTerm.toLowerCase());
            return matchesGroup && matchesSearch;
        }).sort((a, b) => a.apellido1.localeCompare(b.apellido1));
    }, [eligibleStudentsForReparto, practiceGroups, repartoGroupFilter, repartoSearchTerm]);

    // Reparto Handlers
    const handleOpenRepartoModal = () => {
        if (services.length === 0) {
            addToast('No hay servicios creados aún. Crea un servicio primero en Gestión de Práctica.', 'warning');
            return;
        }

        const defaultService = services.find(s => !s.isLocked) || services[0];
        setSelectedServiceIdForReparto(defaultService.id);

        const initialMap: Record<string, string> = {};
        (defaultService.studentRoles || []).forEach(sr => {
            initialMap[sr.studentId] = sr.roleId;
        });
        setProvisionalRoles(initialMap);
        setRepartoTargetMode('service_groups');
        setRepartoGroupFilter('all');
        setRepartoSearchTerm('');
        setIsRepartoModalOpen(true);
    };

    const handleSelectServiceForReparto = (serviceId: string) => {
        setSelectedServiceIdForReparto(serviceId);
        const srv = services.find(s => s.id === serviceId);
        if (srv) {
            const initialMap: Record<string, string> = {};
            (srv.studentRoles || []).forEach(sr => {
                initialMap[sr.studentId] = sr.roleId;
            });
            setProvisionalRoles(initialMap);
        }
    };

    const handleGenerateReparto = () => {
        if (!serviceForReparto) return;
        if (serviceForReparto.isLocked) {
            addToast('Este servicio está bloqueado. Desbloquéalo si deseas reasignar sus puestos.', 'warning');
            return;
        }
        if (eligibleStudentsForReparto.length === 0) {
            addToast('No hay alumnos candidatos para el reparto en este servicio.', 'warning');
            return;
        }

        const leaderRoles = serviceRoles.filter(r => r.type === 'leader').sort((a, b) => {
            const aIsJefe = a.name.toLowerCase().includes('jefe');
            const bIsJefe = b.name.toLowerCase().includes('jefe');
            if (aIsJefe && !bIsJefe) return -1;
            if (!aIsJefe && bIsJefe) return 1;
            return 0;
        });

        const secondaryRoles = serviceRoles.filter(r => r.type !== 'leader');

        const shuffleStudents = (arr: Student[]): Student[] => {
            const copy = [...arr];
            for (let i = copy.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            return copy;
        };

        let availableCandidates: Student[] = shuffleStudents(eligibleStudentsForReparto);
        const newAssignments: Record<string, string> = {};

        // 1. Assign Leader Roles
        leaderRoles.forEach(lRole => {
            if (availableCandidates.length === 0) return;

            availableCandidates.sort((a, b) => {
                const countA = candidatesHistoricalStats[a.id]?.leaderCount || 0;
                const countB = candidatesHistoricalStats[b.id]?.leaderCount || 0;
                return countA - countB;
            });

            const minCount = candidatesHistoricalStats[availableCandidates[0].id]?.leaderCount || 0;
            const tiedCandidates = availableCandidates.filter(st => (candidatesHistoricalStats[st.id]?.leaderCount || 0) === minCount);

            const chosen = tiedCandidates[Math.floor(Math.random() * tiedCandidates.length)];
            newAssignments[chosen.id] = lRole.id;
            availableCandidates = availableCandidates.filter(st => st.id !== chosen.id);
        });

        // 2. Assign Secondary Roles
        if (secondaryRoles.length > 0 && availableCandidates.length > 0) {
            const sessionAllocated: Record<string, number> = {};
            secondaryRoles.forEach(r => { sessionAllocated[r.id] = 0; });

            availableCandidates = shuffleStudents(availableCandidates);

            availableCandidates.forEach(st => {
                const minAllocated = Math.min(...secondaryRoles.map(r => sessionAllocated[r.id]));
                const balancedRoles = secondaryRoles.filter(r => sessionAllocated[r.id] === minAllocated);

                const minHist = Math.min(...balancedRoles.map(r => candidatesHistoricalStats[st.id]?.roleCounts[r.id] || 0));
                const bestCandidateRoles = balancedRoles.filter(r => (candidatesHistoricalStats[st.id]?.roleCounts[r.id] || 0) === minHist);

                const chosenRole = bestCandidateRoles[Math.floor(Math.random() * bestCandidateRoles.length)];
                newAssignments[st.id] = chosenRole.id;
                sessionAllocated[chosenRole.id] += 1;
            });
        }

        setProvisionalRoles(newAssignments);
        addToast('✨ Reparto aleatorio y equitativo generado. Puedes ajustar puestos manualmente antes de guardar.', 'info');
    };

    const handleClearReparto = () => {
        setProvisionalRoles({});
        addToast('Puestos provisionales desasignados.', 'info');
    };

    const handleRoleChange = (studentId: string, roleId: string) => {
        setProvisionalRoles(prev => ({
            ...prev,
            [studentId]: roleId
        }));
    };

    const handleSaveReparto = () => {
        if (!serviceForReparto) return;
        if (serviceForReparto.isLocked) {
            addToast('Este servicio está bloqueado. Desbloquéalo antes de modificar sus puestos.', 'warning');
            return;
        }

        const updatedStudentRoles: StudentRoleAssignment[] = (Object.entries(provisionalRoles) as [string, string][])
            .filter(([_, roleId]) => Boolean(roleId))
            .map(([studentId, roleId]) => ({ studentId, roleId }));

        setServices(prev => prev.map(s => {
            if (s.id === serviceForReparto.id) {
                return { ...s, studentRoles: updatedStudentRoles };
            }
            return s;
        }));

        addToast(`Reparto de rotación guardado con éxito para "${serviceForReparto.name}".`, 'success');
        setIsRepartoModalOpen(false);
    };

    // Filtered services by trimester
    const relevantServices = useMemo(() => {
        return services.filter(s => {
            if (selectedTrimester === 'all') return true;
            return s.trimester === selectedTrimester;
        });
    }, [services, selectedTrimester]);

    // Compute rotation stats for each student
    const rotationMatrix = useMemo<Record<string, RotationRow>>(() => {
        const matrix: Record<string, RotationRow> = {};

        // Initialize for all students
        students.forEach(st => {
            const grp = practiceGroups.find(g => g.studentIds.includes(st.id)) || null;
            const initCounts: Record<string, number> = {};
            serviceRoles.forEach(r => { initCounts[r.id] = 0; });

            matrix[st.id] = {
                student: st,
                group: grp,
                roleCounts: initCounts,
                totalServices: 0,
                hasLed: false,
                history: [],
            };
        });

        // Tally from relevant services
        relevantServices.forEach(srv => {
            (srv.studentRoles || []).forEach(assignment => {
                const studentId = assignment.studentId;
                const roleId = assignment.roleId;
                if (matrix[studentId]) {
                    const role = serviceRoles.find(r => r.id === roleId);
                    if (role) {
                        matrix[studentId].roleCounts[roleId] = (matrix[studentId].roleCounts[roleId] || 0) + 1;
                        matrix[studentId].totalServices += 1;
                        if (role.type === 'leader') {
                            matrix[studentId].hasLed = true;
                        }
                        matrix[studentId].history.push({
                            serviceName: srv.name,
                            date: srv.date,
                            trimester: srv.trimester.toUpperCase(),
                            roleName: role.name,
                            isLeader: role.type === 'leader',
                        });
                    }
                }
            });
        });

        return matrix;
    }, [students, practiceGroups, relevantServices, serviceRoles]);

    // Leader roles
    const leaderRoles = useMemo(() => {
        return serviceRoles.filter(r => r.type === 'leader');
    }, [serviceRoles]);

    // Filtered student rows
    const filteredRows = useMemo(() => {
        return (Object.values(rotationMatrix) as RotationRow[])
            .filter((row: RotationRow) => {
                const matchesSearch = `${row.student.nombre} ${row.student.apellido1} ${row.student.apellido2}`
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase());
                const matchesGroup = selectedGroupId === 'all' || row.group?.id === selectedGroupId;
                return matchesSearch && matchesGroup;
            })
            .sort((a: RotationRow, b: RotationRow) => a.student.apellido1.localeCompare(b.student.apellido1));
    }, [rotationMatrix, searchTerm, selectedGroupId]);

    // KPI Summary
    const stats = useMemo(() => {
        const totalStudents = students.length;
        if (totalStudents === 0) return { totalServices: 0, leaderPercent: 0, pendingLeaders: 0 };

        let leadersCount = 0;
        (Object.values(rotationMatrix) as RotationRow[]).forEach((row: RotationRow) => {
            if (row.hasLed) leadersCount++;
        });

        const leaderPercent = totalStudents > 0 ? Math.round((leadersCount / totalStudents) * 100) : 0;
        const pendingLeaders = totalStudents - leadersCount;

        return {
            totalServices: relevantServices.length,
            leaderPercent,
            pendingLeaders,
            leadersCount,
        };
    }, [students, rotationMatrix, relevantServices]);

    // Students pending leadership
    const studentsPendingLeadership = useMemo(() => {
        return (Object.values(rotationMatrix) as RotationRow[])
            .filter((r: RotationRow) => !r.hasLed)
            .map((r: RotationRow) => r.student);
    }, [rotationMatrix]);

    // Export PDF
    const handleExportPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        const pageWidth = doc.internal.pageSize.getWidth();

        const addImageToPdf = (d: jsPDF, img: string | null | undefined, x: number, y: number, w: number, h: number) => {
            if (img && img.startsWith('data:image')) {
                try {
                    const imgType = img.substring(img.indexOf('/') + 1, img.indexOf(';'));
                    d.addImage(img, imgType.toUpperCase(), x, y, w, h);
                } catch(e) {}
            }
        };

        if (instituteData.logo) {
            addImageToPdf(doc, instituteData.logo, 14, 8, 15, 15);
        }
        if (teacherData.logo) {
            addImageToPdf(doc, teacherData.logo, pageWidth - 14 - 15, 8, 15, 15);
        }
        
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('MATRIZ DE ROTACIÓN DE BRIGADA Y PUESTOS', 34, 14);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`${instituteData.name} - ${teacherData.name}`, 34, 19);
        doc.text(`Filtro: Trimestre ${selectedTrimester.toUpperCase()} | Total Servicios: ${relevantServices.length} | Fecha: ${new Date().toLocaleDateString('es-ES')}`, 34, 24);

        const headers = ['#', 'Alumno', 'Grupo', ...serviceRoles.map(r => r.name), 'Total Servicios', '¿Lideró?'];
        const tableBody = filteredRows.map((row, idx) => [
            idx + 1,
            `${row.student.apellido1} ${row.student.apellido2}, ${row.student.nombre}`,
            row.group?.name || 'Sin grupo',
            ...serviceRoles.map(r => row.roleCounts[r.id] || 0),
            row.totalServices,
            row.hasLed ? 'SÍ' : 'PENDIENTE'
        ]);

        autoTable(doc, {
            head: [headers],
            body: tableBody,
            startY: 36,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        doc.save(`Matriz_Rotacion_Brigada_${new Date().toISOString().slice(0, 10)}.pdf`);
        addToast('Matriz de rotación descargada en PDF.', 'success');
    };

    // Export Excel
    const handleExportExcel = () => {
        const dataToExport = filteredRows.map(row => {
            const item: Record<string, any> = {
                'Alumno': `${row.student.apellido1} ${row.student.apellido2}, ${row.student.nombre}`,
                'Grupo': row.group?.name || 'Sin grupo',
            };
            serviceRoles.forEach(r => {
                item[r.name] = row.roleCounts[r.id] || 0;
            });
            item['Total Servicios Asignados'] = row.totalServices;
            item['Estado Liderazgo'] = row.hasLed ? 'Lideró' : 'Pendiente de liderar';
            return item;
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Rotación Brigada');
        XLSX.writeFile(wb, `Rotacion_Brigada_${new Date().toISOString().slice(0, 10)}.xlsx`);
        addToast('Matriz de rotación exportada a Excel.', 'success');
    };

    const activeTimelineStudent = useMemo(() => {
        if (!selectedStudentTimeline) return null;
        return rotationMatrix[selectedStudentTimeline] || null;
    }, [selectedStudentTimeline, rotationMatrix]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-amber-100 text-amber-800 rounded-xl">
                        <ChefHatIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                                Control de Brigada
                            </span>
                            <span className="text-xs text-gray-500">
                                Registro histórico de puestos y rotaciones
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
                            Matriz de Rotación de Brigada y Puestos
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Cuadrante de frecuencias para garantizar que todos los alumnos roten por todas las partidas y asuman roles de liderazgo.
                        </p>
                    </div>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                    <button
                        onClick={handleOpenRepartoModal}
                        className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                        title="Abrir asistente de reparto y rotación de puestos por servicio"
                    >
                        <SparklesIcon className="w-4 h-4 text-amber-200" />
                        Hacer Reparto de Rotación
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Excel
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="px-3.5 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Descargar PDF
                    </button>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                    <span className="text-xs text-gray-500 block font-medium">Servicios Analizados</span>
                    <span className="text-2xl font-bold text-blue-700">{stats.totalServices}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                    <span className="text-xs text-gray-500 block font-medium">Alumnos que han Liderado</span>
                    <span className="text-2xl font-bold text-emerald-700">{stats.leadersCount} / {students.length}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                    <span className="text-xs text-gray-500 block font-medium">Cobertura de Liderazgo</span>
                    <span className="text-2xl font-bold text-purple-700">{stats.leaderPercent}%</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                    <span className="text-xs text-gray-500 block font-medium">Pendientes de Liderar</span>
                    <span className={`text-2xl font-bold ${stats.pendingLeaders > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {stats.pendingLeaders}
                    </span>
                </div>
            </div>

            {/* SMART SUGGESTIONS CALLOUT */}
            {studentsPendingLeadership.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-200 text-amber-900 rounded-xl">
                            <StarIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-sm text-amber-950">
                                💡 Sugerencia de Rotación Equitativa: {studentsPendingLeadership.length} alumno{studentsPendingLeadership.length !== 1 ? 's' : ''} aún no han sido Jefes o Segundos de Cocina
                            </h3>
                            <p className="text-xs text-amber-800 mt-1">
                                Para los próximos servicios prácticos, se recomienda priorizar a los siguientes alumnos en los puestos de <b>Jefe de Cocina</b> o <b>Segundo de Cocina</b>:
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {studentsPendingLeadership.map(st => (
                                    <span 
                                        key={st.id} 
                                        className="px-2.5 py-1 bg-white text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                        {st.apellido1} {st.apellido2}, {st.nombre}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FILTERS & SEARCH */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-600">Trimestre:</label>
                        <select
                            value={selectedTrimester}
                            onChange={e => setSelectedTrimester(e.target.value as any)}
                            className="bg-gray-50 border border-gray-300 text-xs font-semibold rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">Todo el Curso</option>
                            <option value="t1">1º Trimestre</option>
                            <option value="t2">2º Trimestre</option>
                            <option value="t3">3º Trimestre</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-600">Grupo:</label>
                        <select
                            value={selectedGroupId}
                            onChange={e => setSelectedGroupId(e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-xs font-semibold rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">Todos los grupos</option>
                            {practiceGroups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="relative w-64">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <SearchIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar alumno..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg block w-full pl-9 p-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* ROTATION MATRIX TABLE */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-900 text-white uppercase text-[11px] font-bold">
                            <tr>
                                <th className="p-3 w-8 text-center">#</th>
                                <th className="p-3">Alumno</th>
                                <th className="p-3">Grupo</th>
                                {serviceRoles.map(role => (
                                    <th key={role.id} className="p-3 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-1">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: role.color }}></span>
                                            <span>{role.name}</span>
                                            {role.type === 'leader' && <span className="text-amber-400 text-[10px]" title="Puesto de Liderazgo">★</span>}
                                        </div>
                                    </th>
                                ))}
                                <th className="p-3 text-center bg-slate-800 font-extrabold">Total Servicios</th>
                                <th className="p-3 text-center">Estado Liderazgo</th>
                                <th className="p-3 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredRows.map((row, idx) => {
                                return (
                                    <tr key={row.student.id} className={`hover:bg-blue-50/40 transition ${idx % 2 !== 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                                        <td className="p-3 text-center text-gray-400 font-mono text-[11px]">
                                            {idx + 1}
                                        </td>
                                        <td className="p-3 font-semibold text-gray-900">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                                                    {row.student.nombre.charAt(0)}{row.student.apellido1.charAt(0)}
                                                </div>
                                                <span>{row.student.apellido1} {row.student.apellido2}, {row.student.nombre}</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            {row.group ? (
                                                <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${row.group.color}`}>
                                                    {row.group.name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 italic">Sin grupo</span>
                                            )}
                                        </td>

                                        {/* Dynamic Role Count Columns with heatmap styling */}
                                        {serviceRoles.map(role => {
                                            const count = row.roleCounts[role.id] || 0;
                                            return (
                                                <td key={role.id} className="p-3 text-center">
                                                    <span className={`inline-block w-7 py-1 text-center font-bold text-xs rounded-lg ${
                                                        count === 0 
                                                            ? 'text-gray-300 bg-gray-100/60' 
                                                            : count === 1 
                                                                ? 'text-emerald-800 bg-emerald-100 font-extrabold' 
                                                                : 'text-blue-800 bg-blue-100 font-extrabold ring-1 ring-blue-300'
                                                    }`}>
                                                        {count}
                                                    </span>
                                                </td>
                                            );
                                        })}

                                        {/* Total services */}
                                        <td className="p-3 text-center bg-slate-50 font-extrabold text-slate-800 text-sm">
                                            {row.totalServices}
                                        </td>

                                        {/* Leadership status */}
                                        <td className="p-3 text-center">
                                            {row.hasLed ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600" /> Ha liderado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                                                    <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-600" /> Pendiente
                                                </span>
                                            )}
                                        </td>

                                        {/* Details button */}
                                        <td className="p-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedStudentTimeline(row.student.id)}
                                                className="px-2.5 py-1 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-800 font-semibold text-xs rounded-lg transition"
                                                title="Ver historial de servicios y puestos asignados"
                                            >
                                                Ver Historial
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TIMELINE MODAL */}
            {activeTimelineStudent && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setSelectedStudentTimeline(null)}>
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b pb-3">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">
                                    Historial de Rotación: {activeTimelineStudent.student.nombre} {activeTimelineStudent.student.apellido1}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Servicios en los que ha participado y puestos asignados
                                </p>
                            </div>
                            <button onClick={() => setSelectedStudentTimeline(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
                        </div>

                        {activeTimelineStudent.history.length === 0 ? (
                            <p className="text-xs text-gray-400 py-6 text-center italic">
                                Este alumno aún no tiene puestos asignados en ningún servicio práctico.
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                {activeTimelineStudent.history.map((h, i) => (
                                    <div key={i} className="p-3 rounded-xl border border-gray-100 bg-gray-50/70 flex items-center justify-between text-xs">
                                        <div>
                                            <span className="font-bold text-gray-900 block">{h.serviceName}</span>
                                            <span className="text-[11px] text-gray-500">{h.date} &bull; {h.trimester}</span>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                                            h.isLeader ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900'
                                        }`}>
                                            {h.roleName}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end pt-3 border-t">
                            <button
                                onClick={() => setSelectedStudentTimeline(null)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-lg transition"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* REPARTO DE ROTACIÓN MODAL */}
            {isRepartoModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5" onClick={() => setIsRepartoModalOpen(false)}>
                    <div 
                        className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white flex justify-between items-center flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                                    <SparklesIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-500/30 text-amber-300 rounded">
                                            Asignación Inteligente
                                        </span>
                                        <span className="text-xs text-gray-300">
                                            Rotación y Puestos por Servicio
                                        </span>
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                                        Hacer Reparto de Rotación para Servicio
                                    </h2>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsRepartoModalOpen(false)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                                title="Cerrar modal"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body (Scrollable) */}
                        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
                            {/* Service Selector & Setup Card */}
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Seleccionar Servicio Práctico:
                                        </label>
                                        <select
                                            value={selectedServiceIdForReparto}
                                            onChange={e => handleSelectServiceForReparto(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                        >
                                            {services.map(srv => (
                                                <option key={srv.id} value={srv.id}>
                                                    [{srv.trimester.toUpperCase()}] {srv.name} &bull; {srv.date} {srv.isLocked ? '(Bloqueado)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Alcance de Alumnos a Repartir:
                                        </label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <button
                                                type="button"
                                                onClick={() => setRepartoTargetMode('service_groups')}
                                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                                                    repartoTargetMode === 'service_groups'
                                                        ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                <UsersIcon className="w-3.5 h-3.5" />
                                                Grupos del Servicio ({eligibleStudentsForReparto.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRepartoTargetMode('all_students')}
                                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                                                    repartoTargetMode === 'all_students'
                                                        ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                <UsersIcon className="w-3.5 h-3.5" />
                                                Toda la Brigada ({students.length})
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {serviceForReparto && (
                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-gray-700">Estado del servicio:</span>
                                            {serviceForReparto.isLocked ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                    <LockClosedIcon className="w-3 h-3" /> Bloqueado (solo lectura)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    <CheckIcon className="w-3 h-3" /> Abierto para edición
                                                </span>
                                            )}
                                            <span className="text-gray-400">&bull;</span>
                                            <span className="text-gray-600">Modalidad: <b className="capitalize">{serviceForReparto.type}</b></span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleClearReparto}
                                                disabled={serviceForReparto.isLocked}
                                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                            >
                                                <RotateCcwIcon className="w-3.5 h-3.5 text-gray-500" />
                                                Limpiar Puestos
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleGenerateReparto}
                                                disabled={serviceForReparto.isLocked}
                                                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                                            >
                                                <SparklesIcon className="w-4 h-4 text-amber-200" />
                                                Generar Reparto Aleatorio y Equitativo
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Live Role Capacity / Summary Badges */}
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-gray-700">Resumen de Asignación por Puestos:</span>
                                    <span className="text-xs font-bold text-slate-700">
                                        {Object.values(provisionalRoles).filter(Boolean).length} / {eligibleStudentsForReparto.length} asignados
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {serviceRoles.map(role => {
                                        const count = provisionalRoleCounts[role.id] || 0;
                                        return (
                                            <div
                                                key={role.id}
                                                className="px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 bg-gray-50/70 border-gray-200"
                                            >
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: role.color }}></span>
                                                <span className="text-gray-800">{role.name}:</span>
                                                <span className={`font-bold px-1.5 py-0.2 rounded ${
                                                    count > 0 ? 'bg-amber-100 text-amber-900 font-extrabold' : 'text-gray-400'
                                                }`}>
                                                    {count}
                                                </span>
                                                {role.type === 'leader' && <span className="text-amber-500 text-[10px]">★</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Filter & Search inside modal */}
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-gray-600">Filtrar por grupo:</label>
                                    <select
                                        value={repartoGroupFilter}
                                        onChange={e => setRepartoGroupFilter(e.target.value)}
                                        className="bg-gray-50 border border-gray-300 text-xs font-semibold rounded-lg p-1.5 text-gray-800"
                                    >
                                        <option value="all">Todos los grupos ({eligibleStudentsForReparto.length})</option>
                                        {practiceGroups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="relative w-56">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                                        <SearchIcon className="w-3.5 h-3.5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar alumno..."
                                        value={repartoSearchTerm}
                                        onChange={e => setRepartoSearchTerm(e.target.value)}
                                        className="bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg block w-full pl-8 p-1.5"
                                    />
                                </div>
                            </div>

                            {/* Students List for Manual Override */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                                    {filteredRepartoStudents.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-gray-400 italic">
                                            No se han encontrado alumnos con los filtros seleccionados.
                                        </div>
                                    ) : (
                                        filteredRepartoStudents.map(st => {
                                            const group = practiceGroups.find(g => g.studentIds.includes(st.id));
                                            const assignedRoleId = provisionalRoles[st.id] || '';
                                            const selectedRole = serviceRoles.find(r => r.id === assignedRoleId);
                                            const hist = candidatesHistoricalStats[st.id] || { leaderCount: 0, roleCounts: {} };
                                            const hasEverLed = hist.leaderCount > 0;

                                            return (
                                                <div 
                                                    key={st.id} 
                                                    className={`p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-50/30 transition ${
                                                        !assignedRoleId ? 'bg-amber-50/20' : ''
                                                    }`}
                                                >
                                                    {/* Student Info */}
                                                    <div className="flex items-center gap-3 min-w-[240px]">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-slate-200">
                                                            {st.nombre.charAt(0)}{st.apellido1.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-xs text-gray-900">
                                                                {st.apellido1} {st.apellido2}, {st.nombre}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                {group ? (
                                                                    <span className={`px-2 py-0.2 rounded text-[10px] font-semibold ${group.color}`}>
                                                                        {group.name}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] text-gray-400 italic">Sin grupo</span>
                                                                )}
                                                                <span className="text-gray-300">&bull;</span>
                                                                {hasEverLed ? (
                                                                    <span className="text-[10px] text-emerald-700 font-medium">
                                                                        Ha liderado {hist.leaderCount} vez/veces
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                                                        ★ Sin liderar (Prioritario)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Role Dropdown Selector for manual change */}
                                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                                        <div className="relative flex-1 sm:w-64">
                                                            <select
                                                                value={assignedRoleId}
                                                                onChange={e => handleRoleChange(st.id, e.target.value)}
                                                                disabled={serviceForReparto?.isLocked}
                                                                className={`w-full p-2 text-xs font-semibold rounded-lg border focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition cursor-pointer ${
                                                                    selectedRole
                                                                        ? selectedRole.type === 'leader'
                                                                            ? 'bg-amber-50/80 border-amber-300 text-amber-950 font-bold'
                                                                            : 'bg-white border-gray-300 text-gray-900'
                                                                        : 'bg-gray-50 border-gray-300 text-gray-400 italic'
                                                                }`}
                                                            >
                                                                <option value="">-- Sin Puesto Asignado --</option>
                                                                {serviceRoles.map(r => (
                                                                    <option key={r.id} value={r.id}>
                                                                        {r.type === 'leader' ? '★ ' : ''}{r.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        {selectedRole && (
                                                            <span
                                                                className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white shadow-xs"
                                                                style={{ backgroundColor: selectedRole.color }}
                                                                title={`Color distintivo: ${selectedRole.name}`}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 sm:p-5 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
                            <span className="text-xs text-gray-500 italic text-center sm:text-left">
                                Los puestos asignados se guardarán en el servicio seleccionado y se reflejarán de inmediato en la Matriz de Rotación.
                            </span>

                            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsRepartoModalOpen(false)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveReparto}
                                    disabled={serviceForReparto?.isLocked}
                                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    <SaveIcon className="w-4 h-4" />
                                    Guardar y Aplicar al Servicio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
    UsersIcon, ChefHatIcon, DownloadIcon, CheckIcon, AlertTriangleIcon, 
    SearchIcon, FileTextIcon, FilterIcon, RefreshCwIcon, StarIcon 
} from '../components/icons';
import { Student, ServiceRole, Service, PracticeGroup } from '../types';
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
        serviceRoles, 
        teacherData, 
        instituteData,
        addToast 
    } = useAppContext();

    const [selectedTrimester, setSelectedTrimester] = useState<'all' | 't1' | 't2' | 't3'>('all');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudentTimeline, setSelectedStudentTimeline] = useState<string | null>(null);

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

                <div className="flex items-center space-x-2">
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
        </div>
    );
};

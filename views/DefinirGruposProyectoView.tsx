import React, { useState, useMemo } from 'react';
import { ProyectoGroup, Student } from '../types';
import { PlusIcon, TrashIcon, SearchIcon, UsersIcon, PrinterIcon, DownloadIcon, CheckIcon } from '../components/icons';
import { useAppContext } from '../context/AppContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const groupColors = [
  'bg-red-100 border-red-300 text-red-900', 
  'bg-blue-100 border-blue-300 text-blue-900', 
  'bg-green-100 border-green-300 text-green-900', 
  'bg-yellow-100 border-yellow-300 text-yellow-900',
  'bg-indigo-100 border-indigo-300 text-indigo-900', 
  'bg-pink-100 border-pink-300 text-pink-900', 
  'bg-purple-100 border-purple-300 text-purple-900',
  'bg-teal-100 border-teal-300 text-teal-900'
];

export const DefinirGruposProyectoView: React.FC = () => {
    const { 
        students, 
        proyectoGroups, 
        setProyectoGroups, 
        teacherData, 
        instituteData, 
        addToast, 
        isStudentConvalidated 
    } = useAppContext();

    const [searchTerm, setSearchTerm] = useState('');

    // Filter active students for Proyecto (exclude convalidated in this module)
    const activeStudents = useMemo(() => {
        return students.filter(s => !isStudentConvalidated(s.id, 'proyecto'));
    }, [students, isStudentConvalidated]);

    const activeStudentsMap = useMemo(() => {
        const map: Record<string, Student> = {};
        activeStudents.forEach(s => { map[s.id] = s; });
        return map;
    }, [activeStudents]);

    // Assignments map for active students
    const studentAssignments = useMemo(() => {
        const assignments: Record<string, string | null> = {};
        activeStudents.forEach(s => { assignments[s.id] = null; });
        proyectoGroups.forEach(g => {
            g.studentIds.forEach(studentId => {
                if (activeStudentsMap[studentId]) {
                    assignments[studentId] = g.id;
                }
            });
        });
        return assignments;
    }, [proyectoGroups, activeStudents, activeStudentsMap]);

    const handleAddGroup = () => {
        const nextGroupId = (proyectoGroups.length > 0 ? Math.max(...proyectoGroups.map(g => parseInt(g.id, 10) || 0)) : 0) + 1;
        const newGroup: ProyectoGroup = {
            id: String(nextGroupId),
            name: `Restaurante / Grupo ${nextGroupId}`,
            color: groupColors[(nextGroupId - 1) % groupColors.length],
            studentIds: [],
            coordinadorId: null,
        };
        setProyectoGroups(prev => [...prev, newGroup]);
        addToast(`Grupo de Proyecto ${nextGroupId} añadido.`, 'success');
    };

    const handleDeleteGroup = (groupId: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este grupo de proyecto? Los alumnos asignados quedarán sin grupo.')) {
            setProyectoGroups(prev => prev.filter(g => g.id !== groupId));
            addToast('Grupo de proyecto eliminado.', 'info');
        }
    };

    const handleAssignStudent = (studentId: string, groupId: string | null) => {
        setProyectoGroups(prev => {
            const newGroups = prev.map(g => {
                const wasCoordinator = g.coordinadorId === studentId;
                return {
                    ...g,
                    studentIds: g.studentIds.filter(id => id !== studentId),
                    coordinadorId: wasCoordinator ? null : g.coordinadorId
                };
            });
            if (groupId) {
                const targetGroup = newGroups.find(g => g.id === groupId);
                if (targetGroup) {
                    targetGroup.studentIds.push(studentId);
                }
            }
            return newGroups;
        });
    };

    const handleSetCoordinator = (groupId: string, studentId: string | null) => {
        setProyectoGroups(prev => prev.map(g => {
            if (g.id !== groupId) return g;
            const newCoord = g.coordinadorId === studentId ? null : studentId;
            return {
                ...g,
                coordinadorId: newCoord
            };
        }));
        if (studentId) {
            const student = activeStudentsMap[studentId];
            addToast(`${student ? student.nombre : 'Alumno'} asignado como coordinador del equipo.`, 'success');
        } else {
            addToast('Coordinador deseleccionado.', 'info');
        }
    };

    const filteredStudents = useMemo(() => {
        return [...activeStudents]
            .sort((a, b) => a.apellido1.localeCompare(b.apellido1))
            .filter(student => {
                const fullName = `${student.nombre} ${student.apellido1} ${student.apellido2}`.toLowerCase();
                return fullName.includes(searchTerm.toLowerCase());
            });
    }, [activeStudents, searchTerm]);

    const studentsWithoutGroup = useMemo(() => {
        return activeStudents.filter(s => !studentAssignments[s.id]);
    }, [activeStudents, studentAssignments]);

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

    // Print & PDF Export
    const handlePrintOrExportPDF = (action: 'print' | 'download') => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Top Logos (Center logo on left, Teacher logo on right)
        if (instituteData.logo) {
            addImageToPdf(doc, instituteData.logo, 14, 10, 16, 16);
        }
        if (teacherData.logo) {
            addImageToPdf(doc, teacherData.logo, pageWidth - 14 - 16, 10, 16, 16);
        }

        // Header Title and Info (NO CIF)
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(instituteData.name || 'Centro de Formación Profesional', pageWidth / 2, 17, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        const subheader = [
            teacherData.name ? `Docente: ${teacherData.name}` : null,
            `Fecha: ${new Date().toLocaleDateString('es-ES')}`
        ].filter(Boolean).join(' | ');
        doc.text(subheader, pageWidth / 2, 23, { align: 'center' });

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(88, 28, 135); // Purple 900
        doc.text('MÓDULO: PROYECTO INTERMODULAR', pageWidth / 2, 31, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(60);
        doc.text(`Equipos de Trabajo y Restaurantes Formados (${proyectoGroups.length} Grupos | ${activeStudents.length} Alumnos)`, pageWidth / 2, 37, { align: 'center' });

        doc.setDrawColor(216, 180, 254);
        doc.setLineWidth(0.4);
        doc.line(14, 42, pageWidth - 14, 42);

        let currentY = 48;

        proyectoGroups.forEach((group, groupIdx) => {
            const members = group.studentIds
                .map(id => activeStudentsMap[id])
                .filter(Boolean) as Student[];

            members.sort((a, b) => {
                if (a.id === group.coordinadorId) return -1;
                if (b.id === group.coordinadorId) return 1;
                return a.apellido1.localeCompare(b.apellido1);
            });

            const coordinator = members.find(m => m.id === group.coordinadorId);

            // Group Card Header in PDF
            if (currentY > 240) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFillColor(243, 232, 255); // Light purple
            doc.roundedRect(14, currentY, pageWidth - 28, 12, 2, 2, 'F');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(88, 28, 135);
            doc.text(`EQUIPO ${groupIdx + 1}: ${group.name.toUpperCase()}`, 18, currentY + 8);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(70);
            const coordText = coordinator 
                ? `COORDINADOR/A: ${coordinator.apellido1} ${coordinator.apellido2}, ${coordinator.nombre}` 
                : 'COORDINADOR/A: [Sin asignar]';
            doc.text(coordText, pageWidth - 18, currentY + 8, { align: 'right' });

            currentY += 15;

            const tableRows = members.map((m, idx) => [
                idx + 1,
                `${m.apellido1} ${m.apellido2}, ${m.nombre}`,
                m.grupo || '-',
                m.id === group.coordinadorId ? '👑 COORDINADOR/A' : 'Miembro del Equipo'
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['#', 'Nombre del Alumno', 'Grupo Base', 'Función / Rol']],
                body: tableRows.length > 0 ? tableRows : [['-', 'No hay alumnos asignados a este equipo', '-', '-']],
                theme: 'striped',
                headStyles: {
                    fillColor: [107, 33, 168],
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    fontSize: 8,
                    textColor: [50, 50, 50]
                },
                alternateRowStyles: {
                    fillColor: [250, 245, 255]
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 90 },
                    2: { cellWidth: 35, halign: 'center' },
                    3: { cellWidth: 45, halign: 'center', fontStyle: 'bold' }
                },
                margin: { left: 14, right: 14 },
                didDrawCell: (data) => {
                    if (data.column.index === 3 && data.cell.raw === '👑 COORDINADOR/A') {
                        data.cell.styles.textColor = [161, 98, 7]; // Amber/gold
                    }
                }
            });

            currentY = (doc as any).lastAutoTable.finalY + 10;
        });

        if (action === 'print') {
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        } else {
            doc.save('Grupos_Proyecto_Intermodular.pdf');
            addToast('Listado de grupos descargado en PDF.', 'success');
        }
    };

    if (activeStudents.length === 0) {
        return (
            <div className="text-center p-8 bg-white rounded-lg shadow border">
                <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-700">No hay alumnos disponibles para Proyecto</h2>
                <p className="text-gray-500 mt-2">
                    Todos los alumnos están convalidados para este módulo o aún no se han importado en la sección "Alumnos".
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                        <UsersIcon className="w-8 h-8 mr-3 text-purple-600" />
                        Definir Grupos de Proyecto Intermodular
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Configura los equipos/restaurantes independientes, designa el <strong>Coordinador de cada grupo</strong> e imprime las fichas oficiales.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <button 
                        onClick={() => handlePrintOrExportPDF('print')}
                        className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 hover:text-purple-700 transition shadow-xs"
                        title="Imprime la composición de los grupos con sus coordinadores"
                    >
                        <PrinterIcon className="w-4 h-4 text-purple-600" />
                        Imprimir Grupos
                    </button>
                    <button 
                        onClick={() => handlePrintOrExportPDF('download')}
                        className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 hover:text-purple-700 transition shadow-xs"
                        title="Descargar listado en documento PDF"
                    >
                        <DownloadIcon className="w-4 h-4 text-purple-600" />
                        Exportar PDF
                    </button>
                    <button 
                        onClick={handleAddGroup} 
                        className="flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-purple-700 transition shadow-sm"
                    >
                        <PlusIcon className="w-4 h-4 mr-1" />
                        Añadir Restaurante / Equipo
                    </button>
                </div>
            </header>

            <main className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Columna Izquierda: Alumnos matriculados en Proyecto */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-[78vh]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span>Alumnos Matriculados ({activeStudents.length})</span>
                            <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                                {activeStudents.length - studentsWithoutGroup.length} asignados
                            </span>
                        </h2>
                    </div>

                    <div className="relative mb-3">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                           <SearchIcon className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full pl-9 p-2"
                            placeholder="Buscar alumno por nombre o apellido..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <ul className="space-y-2 overflow-y-auto pr-1 flex-1 divide-y divide-gray-100">
                        {filteredStudents.map((student, index) => {
                            const assignedGroupId = studentAssignments[student.id];
                            const assignedGroup = proyectoGroups.find(g => g.id === assignedGroupId);
                            const isCoordinator = assignedGroup?.coordinadorId === student.id;

                            return (
                                <li key={student.id} className="pt-2 flex items-center justify-between p-2 rounded-lg hover:bg-purple-50/40 transition">
                                    <div className="flex items-center min-w-0 pr-2">
                                        <span className="text-xs font-mono text-gray-400 w-6 flex-shrink-0">{index + 1}.</span>
                                        <img src={student.fotoUrl} alt="" className="w-8 h-8 rounded-full object-cover mr-2.5 flex-shrink-0 border" />
                                        <div className="truncate">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <p className="font-semibold text-xs text-gray-800 truncate">
                                                    {`${student.apellido1} ${student.apellido2}, ${student.nombre}`}
                                                </p>
                                                {isCoordinator && (
                                                    <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-1.5 py-0.2 rounded-md inline-flex items-center gap-1 flex-shrink-0">
                                                        👑 Coord.
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-400">{student.grupo}</p>
                                        </div>
                                    </div>
                                    <select
                                        value={assignedGroupId || ''}
                                        onChange={(e) => handleAssignStudent(student.id, e.target.value || null)}
                                        className="bg-white border border-gray-300 text-gray-800 text-xs rounded-md focus:ring-purple-500 focus:border-purple-500 block w-44 p-1.5 font-medium flex-shrink-0"
                                    >
                                        <option value="">Sin equipo</option>
                                        {proyectoGroups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Columna Derecha: Restaurantes y Equipos con Asignación de Coordinador */}
                <div className="space-y-4 h-[78vh] overflow-y-auto pr-1">
                    {studentsWithoutGroup.length > 0 && (
                        <div className="p-3.5 rounded-xl border-2 border-dashed bg-amber-50 border-amber-300 text-amber-900 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-xs flex items-center gap-1.5">
                                    <span>⚠️ Alumnos sin Equipo Asignado ({studentsWithoutGroup.length})</span>
                                </h3>
                                <p className="text-[11px] text-amber-800 mt-0.5">
                                    Asígnalos a un restaurante para que computen en las entregas grupales e individuales.
                                </p>
                            </div>
                        </div>
                    )}

                    {proyectoGroups.length === 0 ? (
                        <div className="bg-white p-8 rounded-xl border text-center text-gray-500 space-y-2">
                            <UsersIcon className="w-10 h-10 mx-auto text-purple-300" />
                            <p className="font-semibold text-sm">No hay restaurantes o grupos creados</p>
                            <p className="text-xs text-gray-400">Pulsa en "Añadir Restaurante / Equipo" para comenzar.</p>
                        </div>
                    ) : (
                        proyectoGroups.map(group => {
                            const members = group.studentIds
                                .map(id => activeStudentsMap[id])
                                .filter(Boolean) as Student[];

                            const coordinator = members.find(m => m.id === group.coordinadorId);

                            return (
                                <div key={group.id} className="p-4 rounded-xl shadow-xs border border-purple-200 bg-white space-y-3">
                                    {/* Cabecera del Grupo */}
                                    <div className="flex justify-between items-center border-b pb-2.5">
                                        <div className="flex items-center gap-2 flex-1 mr-2">
                                            <span className="w-3 h-3 rounded-full bg-purple-600 flex-shrink-0"></span>
                                            <input
                                                type="text"
                                                value={group.name}
                                                onChange={e => {
                                                    const newName = e.target.value;
                                                    setProyectoGroups(prev => prev.map(g => g.id === group.id ? { ...g, name: newName } : g));
                                                }}
                                                className="font-bold text-gray-900 text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-600 focus:outline-none px-1 flex-1"
                                                placeholder="Nombre del Restaurante / Equipo..."
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-[11px] px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-full font-bold">
                                                {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
                                            </span>
                                            <button 
                                                onClick={() => handleDeleteGroup(group.id)} 
                                                className="text-gray-400 hover:text-red-600 transition p-1"
                                                title="Eliminar restaurante"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Apartado de Coordinador */}
                                    <div className="bg-purple-50/70 p-2.5 rounded-lg border border-purple-100 flex items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">👑</span>
                                            <div>
                                                <span className="font-bold text-purple-950 block">Coordinador/a del Equipo:</span>
                                                <span className={`text-[11px] ${coordinator ? 'text-purple-800 font-semibold' : 'text-gray-400 italic'}`}>
                                                    {coordinator ? `${coordinator.nombre} ${coordinator.apellido1} ${coordinator.apellido2}` : 'Sin asignar (selecciona abajo)'}
                                                </span>
                                            </div>
                                        </div>

                                        <select
                                            value={group.coordinadorId || ''}
                                            onChange={(e) => handleSetCoordinator(group.id, e.target.value || null)}
                                            className="p-1 bg-white border border-purple-300 text-purple-900 rounded-md font-semibold text-xs focus:ring-1 focus:ring-purple-500"
                                        >
                                            <option value="">Designar coordinador...</option>
                                            {members.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {m.nombre} {m.apellido1}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Listado de Miembros del Grupo */}
                                    <ul className="text-xs text-gray-700 divide-y divide-gray-100 pt-1">
                                        {members.length === 0 ? (
                                            <li className="py-2 text-center text-gray-400 italic text-[11px]">
                                                Sin miembros asignados. Selecciona este restaurante en la lista de alumnos de la izquierda.
                                            </li>
                                        ) : (
                                            members.map(m => {
                                                const isCoordinator = group.coordinadorId === m.id;
                                                return (
                                                    <li key={m.id} className={`py-1.5 px-2 rounded-md flex items-center justify-between transition ${isCoordinator ? 'bg-amber-50/60 font-semibold text-amber-950' : 'hover:bg-gray-50'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                            <span>{`${m.apellido1} ${m.apellido2}, ${m.nombre}`}</span>
                                                        </div>

                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetCoordinator(group.id, m.id)}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                                                                    isCoordinator 
                                                                        ? 'bg-amber-500 text-white shadow-xs' 
                                                                        : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-800'
                                                                }`}
                                                                title={isCoordinator ? 'Hacer clic para deseleccionar como coordinador' : 'Asignar como coordinador/a'}
                                                            >
                                                                <span>👑</span>
                                                                <span>{isCoordinator ? 'Coordinador' : 'Hacer Coordinador'}</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleAssignStudent(m.id, null)}
                                                                className="text-gray-400 hover:text-red-500 text-xs px-1"
                                                                title="Quitar alumno de este grupo"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </li>
                                                );
                                            })
                                        )}
                                    </ul>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>
        </div>
    );
};

export default DefinirGruposProyectoView;

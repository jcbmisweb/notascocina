import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Service, ServiceEvaluation, Student, PracticeGroup, ServiceRole, TeacherData, InstituteData } from '../types';
import { SERVICE_GRADE_WEIGHTS } from '../data/constants';

const addImageToPdf = (doc: jsPDF, imageData: string, x: number, y: number, width: number, height: number) => {
    try {
        if (imageData && imageData.startsWith('data:image')) {
            const imageType = imageData.split(';')[0].split('/')[1].toUpperCase();
            if (['JPEG', 'PNG', 'JPG'].includes(imageType)) {
                doc.addImage(imageData, imageType, x, y, width, height);
            }
        }
    } catch (e) {
        console.error("Error adding image to PDF:", e);
    }
};

const drawDocumentHeaderAndFooter = (
    doc: jsPDF,
    mainTitle: string,
    subtitle: string,
    teacherData: TeacherData,
    instituteData: InstituteData
) => {
    const pageMargin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const logoSize = 13;
    const totalPages = (doc as any).internal.getNumberOfPages();

    // 1. Draw main header strictly on Page 1
    doc.setPage(1);

    // Logos on Page 1
    if (instituteData.logo) {
        addImageToPdf(doc, instituteData.logo, pageMargin, pageMargin - 3, logoSize, logoSize);
    }
    if (teacherData.logo) {
        addImageToPdf(doc, teacherData.logo, pageWidth - pageMargin - logoSize, pageMargin - 3, logoSize, logoSize);
    }

    // Top texts (Center name and Teacher/Department)
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(instituteData.name || 'Instituto de Formación Profesional', pageMargin + logoSize + 4, pageMargin + 2);
    doc.text(teacherData.name || 'Departamento de Hostelería y Cocina', pageWidth - pageMargin - logoSize - 4, pageMargin + 2, { align: 'right' });

    // Main Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(mainTitle, pageWidth / 2, pageMargin + 13, { align: 'center' });

    // Subtitle
    if (subtitle) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(subtitle, pageWidth / 2, pageMargin + 19, { align: 'center' });
    }

    // Divider line on Page 1
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(pageMargin, pageMargin + 23, pageWidth - pageMargin, pageMargin + 23);

    // 2. Compact running header on pages 2..totalPages (if multi-page)
    for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(mainTitle, pageMargin, 11);
        if (subtitle) {
            doc.setFont('helvetica', 'normal');
            doc.text(subtitle, pageWidth - pageMargin, 11, { align: 'right' });
        }
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(pageMargin, 13.5, pageWidth - pageMargin, 13.5);
    }

    // 3. Footer on all pages
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(pageMargin, pageHeight - 11, pageWidth - pageMargin, pageHeight - 11);
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`${instituteData.name || 'Instituto'} | Servicio Gastronómico`, pageMargin, pageHeight - 6.5);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 6.5, { align: 'center' });
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - pageMargin, pageHeight - 6.5, { align: 'right' });
    }
};

/**
 * PDF 1: Planificación de Puestos, Distribución y Platos del Servicio
 */
export const downloadServicePlanningPdf = (params: {
    service: Service;
    students: Student[];
    practiceGroups: PracticeGroup[];
    serviceRoles: ServiceRole[];
    teacherData: TeacherData;
    instituteData: InstituteData;
}) => {
    const { service, students, practiceGroups, serviceRoles, teacherData, instituteData } = params;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageMargin = 14;
    const pageHeight = doc.internal.pageSize.getHeight();
    const formattedDate = service.date ? new Date(service.date.replace(/-/g, '/')).toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }) : 'Fecha no especificada';
    const trimesterLabel = service.trimester ? service.trimester.toUpperCase() : 'T1';

    let currentY = 41;

    // --- Section 1: Puestos Principales de Brigada (Liderazgo) ---
    const principalRoles = (serviceRoles || []).filter(role => role.type === 'leader');
    const leaderAssignments = principalRoles.map(role => {
        const assignment = (service.studentRoles || []).find(sr => sr.roleId === role.id);
        const student = assignment ? (students || []).find(s => s.id === assignment.studentId) : null;
        return [
            role.name,
            student ? `${student.apellido1 || ''} ${student.apellido2 || ''}, ${student.nombre || ''}`.trim() : 'Sin asignar'
        ];
    });

    if (leaderAssignments.length > 0) {
        autoTable(doc, {
            head: [['Puesto de Mando / Liderazgo', 'Alumno Responsable']],
            body: leaderAssignments,
            startY: currentY,
            margin: { top: 18, bottom: 15, left: pageMargin, right: pageMargin },
            headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            styles: { fontSize: 8.5, cellPadding: 2.2 },
            columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' } },
            theme: 'grid'
        });
        currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    // --- Section 2: Cuadrante de Brigada Separado por Grupos con sus Platos Asignados ---
    if (service.type === 'agrupacion') {
        (service.agrupaciones || []).forEach((agrup, idx) => {
            const assignedStudents = (students || [])
                .filter(s => (agrup.studentIds || []).includes(s.id))
                .sort((a, b) => (a.apellido1 || '').localeCompare(b.apellido1 || ''));
            
            const studentRows = assignedStudents.map((s, sIdx) => {
                const roleId = (service.studentRoles || []).find(sr => sr.studentId === s.id)?.roleId;
                const roleName = (serviceRoles || []).find(r => r.id === roleId)?.name || 'Cocinero de partida';
                return [
                    `${sIdx + 1}`,
                    `${s.apellido1 || ''} ${s.apellido2 || ''}, ${s.nombre || ''}`.trim(),
                    roleName
                ];
            });

            if (currentY > pageHeight - 45) {
                doc.addPage();
                currentY = 20;
            }

            autoTable(doc, {
                head: [
                    [{ content: `PARTIDA / AGRUPACIÓN ${idx + 1}: ${(agrup.name || '').toUpperCase()}`, colSpan: 3, styles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 9.5 } }],
                    ['#', 'Alumno', 'Puesto / Responsabilidad']
                ],
                body: studentRows.length > 0 ? studentRows : [['-', 'Sin alumnos asignados a esta agrupación', '-']],
                startY: currentY,
                margin: { top: 18, bottom: 15, left: pageMargin, right: pageMargin },
                headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { fontStyle: 'bold' } },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                theme: 'grid'
            });
            currentY = (doc as any).lastAutoTable.finalY + 6;
        });
    } else {
        // Normal type: Por grupos de práctica asignados
        const assignedGroupIds = Array.from(new Set([
            ...(service.assignedGroups?.comedor || []),
            ...(service.assignedGroups?.takeaway || [])
        ]));

        let groupsToRender = (practiceGroups || [])
            .filter(g => assignedGroupIds.includes(g.id))
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));

        // Fallback if no assigned groups explicitly selected
        if (groupsToRender.length === 0) {
            groupsToRender = (practiceGroups || []).sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));
        }

        groupsToRender.forEach(group => {
            const isComedor = (service.assignedGroups?.comedor || []).includes(group.id);
            const isTakeaway = (service.assignedGroups?.takeaway || []).includes(group.id);
            const areaLabel = isComedor && isTakeaway ? 'Comedor y Take Away' : isComedor ? 'Comedor' : isTakeaway ? 'Take Away' : 'Cocina';

            // Alumnos del grupo con sus puestos
            const groupStudents = (students || [])
                .filter(s => (group.studentIds || []).includes(s.id))
                .sort((a, b) => (a.apellido1 || '').localeCompare(b.apellido1 || ''));

            const studentRows = groupStudents.map((s, sIdx) => {
                const roleId = (service.studentRoles || []).find(sr => sr.studentId === s.id)?.roleId;
                const roleName = (serviceRoles || []).find(r => r.id === roleId)?.name || 'Cocinero de partida';
                return [
                    `${sIdx + 1}`,
                    `${s.apellido1 || ''} ${s.apellido2 || ''}, ${s.nombre || ''}`.trim(),
                    roleName
                ];
            });

            // Platos / elaboraciones asignadas a este grupo
            const groupElaborations: { name: string; area: string }[] = [];
            (service.elaborations?.comedor || []).forEach(e => {
                if (e.responsibleGroupId === group.id) {
                    groupElaborations.push({ name: e.name, area: 'Comedor' });
                }
            });
            (service.elaborations?.takeaway || []).forEach(e => {
                if (e.responsibleGroupId === group.id) {
                    groupElaborations.push({ name: e.name, area: 'Take Away' });
                }
            });

            // Si queda poco espacio para empezar este grupo, saltar de página
            if (currentY > pageHeight - 50) {
                doc.addPage();
                currentY = 20;
            }

            // 1. Tabla de Alumnos del Grupo
            autoTable(doc, {
                head: [
                    [{ content: `${group.name.toUpperCase()}  —  Área: ${areaLabel.toUpperCase()}`, colSpan: 3, styles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold', fontSize: 9.5 } }],
                    ['#', 'Alumno', 'Puesto / Responsabilidad']
                ],
                body: studentRows.length > 0 ? studentRows : [['-', 'Sin alumnos registrados en este grupo', '-']],
                startY: currentY,
                margin: { top: 18, bottom: 15, left: pageMargin, right: pageMargin },
                headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 110, fontStyle: 'bold' }
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                theme: 'grid'
            });
            currentY = (doc as any).lastAutoTable.finalY + 1.5;

            // 2. Tabla de Platos / Elaboraciones Asignadas a este Grupo (directamente debajo)
            const dishesRows = groupElaborations.length > 0
                ? groupElaborations.map((e, eIdx) => [`${eIdx + 1}`, e.name, e.area])
                : [['-', 'Sin platos asignados específicamente a este grupo', '-']];

            autoTable(doc, {
                head: [
                    [{ content: `Platos / Elaboraciones asignadas a ${group.name}`, colSpan: 3, styles: { fillColor: [39, 174, 96], textColor: 255, fontStyle: 'bold', fontSize: 8.5 } }],
                    ['#', 'Plato / Elaboración', 'Área']
                ],
                body: dishesRows,
                startY: currentY,
                margin: { top: 18, bottom: 15, left: pageMargin, right: pageMargin },
                headStyles: { fillColor: [46, 125, 50], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    2: { cellWidth: 30, halign: 'center' }
                },
                alternateRowStyles: { fillColor: [244, 249, 245] },
                theme: 'grid'
            });
            currentY = (doc as any).lastAutoTable.finalY + 6;
        });

        // Platos sin grupo asignado (si los hubiera)
        const renderedGroupIds = new Set(groupsToRender.map(g => g.id));
        const unassignedElabs: { name: string; area: string }[] = [];
        (service.elaborations?.comedor || []).forEach(e => {
            if (!e.responsibleGroupId || !renderedGroupIds.has(e.responsibleGroupId)) {
                unassignedElabs.push({ name: e.name, area: 'Comedor' });
            }
        });
        (service.elaborations?.takeaway || []).forEach(e => {
            if (!e.responsibleGroupId || !renderedGroupIds.has(e.responsibleGroupId)) {
                unassignedElabs.push({ name: e.name, area: 'Take Away' });
            }
        });

        if (unassignedElabs.length > 0) {
            if (currentY > pageHeight - 40) {
                doc.addPage();
                currentY = 20;
            }
            autoTable(doc, {
                head: [
                    [{ content: 'Otras Elaboraciones Generales / Sin Grupo Asignado', colSpan: 3, styles: { fillColor: [120, 144, 156], textColor: 255, fontStyle: 'bold', fontSize: 8.5 } }],
                    ['#', 'Plato / Elaboración', 'Área']
                ],
                body: unassignedElabs.map((e, idx) => [`${idx + 1}`, e.name, e.area]),
                startY: currentY,
                margin: { top: 18, bottom: 15, left: pageMargin, right: pageMargin },
                headStyles: { fillColor: [90, 110, 120], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 2: { cellWidth: 30, halign: 'center' } },
                theme: 'grid'
            });
        }
    }

    // Header & Footer
    drawDocumentHeaderAndFooter(
        doc,
        `PLANIFICACIÓN DE SERVICIO: ${service.name.toUpperCase()}`,
        `Fecha: ${formattedDate} | Trimestre: ${trimesterLabel}`,
        teacherData,
        instituteData
    );

    const safeFilename = `Planificacion_${service.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${service.date}.pdf`;
    doc.save(safeFilename);
};

/**
 * PDF 2: Informe Completo de Evaluaciones y Calificaciones del Servicio
 */
export const downloadServiceEvaluationPdf = (params: {
    service: Service;
    evaluation: ServiceEvaluation;
    students: Student[];
    practiceGroups: PracticeGroup[];
    serviceRoles: ServiceRole[];
    teacherData: TeacherData;
    instituteData: InstituteData;
}) => {
    const { service, evaluation, students, practiceGroups, serviceRoles, teacherData, instituteData } = params;

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageMargin = 14;
    const formattedDate = service.date ? new Date(service.date.replace(/-/g, '/')).toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }) : 'Fecha no especificada';
    const trimesterLabel = service.trimester ? service.trimester.toUpperCase() : 'T1';

    let currentY = 44;

    // Prepare student rows with calculations
    const evaluationRows: any[] = [];

    // Determine participating students
    const participatingStudents: { student: Student; groupName: string; roleName: string; groupId: string }[] = [];

    if (service.type === 'agrupacion') {
        (service.agrupaciones || []).forEach(agrup => {
            const agrupStudents = (students || []).filter(s => (agrup.studentIds || []).includes(s.id));
            agrupStudents.forEach(st => {
                const roleId = (service.studentRoles || []).find(sr => sr.studentId === st.id)?.roleId;
                const role = (serviceRoles || []).find(r => r.id === roleId);
                participatingStudents.push({
                    student: st,
                    groupName: agrup.name || 'Agrupación',
                    roleName: role ? role.name : 'Cocinero',
                    groupId: agrup.id
                });
            });
        });
    } else {
        const assignedGroupIds = [
            ...(service.assignedGroups?.comedor || []),
            ...(service.assignedGroups?.takeaway || [])
        ];
        (practiceGroups || []).filter(g => assignedGroupIds.includes(g.id)).forEach(group => {
            const groupStudents = (students || []).filter(s => (group.studentIds || []).includes(s.id));
            groupStudents.forEach(st => {
                const roleId = (service.studentRoles || []).find(sr => sr.studentId === st.id)?.roleId;
                const role = (serviceRoles || []).find(r => r.id === roleId);
                participatingStudents.push({
                    student: st,
                    groupName: group.name || 'Grupo',
                    roleName: role ? role.name : 'Cocinero',
                    groupId: group.id
                });
            });
        });
    }

    participatingStudents.sort((a, b) => (a.student.apellido1 || '').localeCompare(b.student.apellido1 || ''));

    participatingStudents.forEach(({ student, groupName, roleName, groupId }) => {
        const indEval = evaluation?.serviceDay?.individualScores?.[student.id];
        const groupEval = evaluation?.serviceDay?.groupScores?.[groupId];

        const isPresent = indEval ? (indEval.attendance ?? true) : true;
        let groupGrade = 0;
        let hasGroupData = false;
        if (groupEval) {
            hasGroupData = (groupEval.scores || []).some(s => s !== null);
            groupGrade = (groupEval.scores || []).reduce((sum, s) => sum + (s || 0), 0);
        }

        const hasIndividualData = (indEval?.scores || []).some(s => s !== null);
        let individualGrade = (indEval?.scores || []).reduce((sum, s) => sum + (s || 0), 0);

        if (!hasIndividualData && hasGroupData) {
            individualGrade = groupGrade;
        }

        if (indEval?.halveGroupScore) {
            groupGrade = groupGrade / 2;
        }

        let finalScoreStr = '-';
        if (!isPresent) {
            finalScoreStr = 'AUSENTE';
        } else if (hasIndividualData || hasGroupData) {
            const finalScore = (individualGrade * SERVICE_GRADE_WEIGHTS.individual) + (groupGrade * SERVICE_GRADE_WEIGHTS.group);
            finalScoreStr = finalScore.toFixed(2);
        }

        evaluationRows.push([
            `${student.apellido1} ${student.apellido2}, ${student.nombre}`,
            groupName,
            roleName,
            isPresent ? 'Presente' : 'AUSENTE',
            isPresent ? (hasIndividualData ? individualGrade.toFixed(2) : (hasGroupData ? `${individualGrade.toFixed(2)} (base)` : '-')) : '-',
            isPresent ? (hasGroupData ? groupGrade.toFixed(2) : '-') : '-',
            finalScoreStr,
            indEval?.observations || '-'
        ]);
    });

    autoTable(doc, {
        head: [['Alumno', 'Partida / Grupo', 'Puesto', 'Asistencia', 'Nota Indiv. (60%)', 'Nota Grupo (40%)', 'Nota Final', 'Observaciones']],
        body: evaluationRows,
        startY: currentY,
        margin: { top: 18, bottom: 15, left: pageMargin, right: pageMargin },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            6: { fontStyle: 'bold', halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'center' },
            5: { halign: 'center' }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: 'grid'
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Pre-Service evaluations (Días previos)
    if (evaluation.preService && Object.keys(evaluation.preService).length > 0) {
        const preDays = Object.entries(evaluation.preService);
        const preServiceRows: any[] = [];

        preDays.forEach(([dateKey, dayEval]) => {
            participatingStudents.forEach(({ student, groupName }) => {
                const studentPre = dayEval.individualEvaluations?.[student.id];
                if (!studentPre) return;

                const isPresent = studentPre.attendance ?? true;
                const checklist = [
                    studentPre.hasFichas ? 'Fichas ✓' : 'Fichas ✗',
                    studentPre.hasUniforme ? 'Uniforme ✓' : 'Uniforme ✗',
                    studentPre.hasMaterial ? 'Material ✓' : 'Material ✗',
                ].join(', ');

                const scoresObj = studentPre.behaviorScores || {};
                const sumScores = Object.values(scoresObj).reduce((a: number, b: any) => a + (b || 0), 0);

                preServiceRows.push([
                    dayEval.name || dateKey,
                    `${student.apellido1} ${student.apellido2}, ${student.nombre}`,
                    groupName,
                    isPresent ? 'Presente' : 'AUSENTE',
                    isPresent ? checklist : '-',
                    isPresent ? sumScores.toFixed(2) : '-',
                    studentPre.observations || '-'
                ]);
            });
        });

        if (preServiceRows.length > 0) {
            // Check if page needs break
            if (currentY > 150) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text('Evaluación del Día Previo (Mise en Place, Higiene y Conducta)', pageMargin, currentY);
            currentY += 4;

            autoTable(doc, {
                head: [['Día Previo', 'Alumno', 'Partida / Grupo', 'Asistencia', 'Requisitos Previos', 'Puntos Conducta', 'Observaciones']],
                body: preServiceRows,
                startY: currentY,
                margin: { top: 18, bottom: 15, left: pageMargin, right: pageMargin },
                headStyles: { fillColor: [142, 68, 173], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
                styles: { fontSize: 7.5, cellPadding: 2 },
                theme: 'grid'
            });
        }
    }

    // Header & Footer
    drawDocumentHeaderAndFooter(
        doc,
        `EVALUACIÓN DEL SERVICIO: ${service.name.toUpperCase()}`,
        `Fecha: ${formattedDate} | Trimestre: ${trimesterLabel}`,
        teacherData,
        instituteData
    );

    const safeFilename = `Evaluacion_${(service.name || 'Servicio').replace(/[^a-zA-Z0-9_-]/g, '_')}_${service.date || 'fecha'}.pdf`;
    doc.save(safeFilename);
};

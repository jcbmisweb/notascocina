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
    const logoSize = 12;

    // Logos
    if (instituteData.logo) {
        addImageToPdf(doc, instituteData.logo, pageMargin, pageMargin - 3, logoSize, logoSize);
    }
    if (teacherData.logo) {
        addImageToPdf(doc, teacherData.logo, pageWidth - pageMargin - logoSize, pageMargin - 3, logoSize, logoSize);
    }

    // Top texts
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.setFont('helvetica', 'normal');
    doc.text(instituteData.name || 'Instituto de Formación Profesional', pageMargin + logoSize + 4, pageMargin + 2);
    doc.text(teacherData.name || 'Departamento de Hostelería y Cocina', pageWidth - pageMargin - logoSize - 4, pageMargin + 2, { align: 'right' });

    // Main Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(mainTitle, pageWidth / 2, pageMargin + 14, { align: 'center' });

    // Subtitle
    if (subtitle) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(subtitle, pageWidth / 2, pageMargin + 20, { align: 'center' });
    }

    // Divider
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(pageMargin, pageMargin + 24, pageWidth - pageMargin, pageMargin + 24);

    // Footer on all pages
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.line(pageMargin, pageHeight - 12, pageWidth - pageMargin, pageHeight - 12);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`${instituteData.name || 'Instituto'} | Servicio Gastronómico`, pageMargin, pageHeight - 7);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - pageMargin, pageHeight - 7, { align: 'right' });
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
    const formattedDate = new Date(service.date.replace(/-/g, '/')).toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const trimesterLabel = service.trimester ? service.trimester.toUpperCase() : 'T1';

    let currentY = 44;

    // --- Section 1: Puestos Principales de Brigada ---
    const principalRoles = serviceRoles.filter(role => role.type === 'leader');
    const leaderAssignments = principalRoles.map(role => {
        const assignment = service.studentRoles.find(sr => sr.roleId === role.id);
        const student = assignment ? students.find(s => s.id === assignment.studentId) : null;
        return [
            role.name,
            student ? `${student.apellido1} ${student.apellido2}, ${student.nombre}` : 'Sin asignar'
        ];
    });

    if (leaderAssignments.length > 0) {
        autoTable(doc, {
            head: [['Puesto de Mando / Liderazgo', 'Alumno Responsable']],
            body: leaderAssignments,
            startY: currentY,
            margin: { left: pageMargin, right: pageMargin },
            headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            styles: { fontSize: 8.5, cellPadding: 2.5 },
            theme: 'grid'
        });
        currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    // --- Section 2: Distribución y Menú / Platos ---
    if (service.type === 'agrupacion') {
        const agrupacionesRows: any[] = [];
        (service.agrupaciones || []).forEach((agrup, idx) => {
            const assignedStudents = students
                .filter(s => agrup.studentIds.includes(s.id))
                .sort((a, b) => a.apellido1.localeCompare(b.apellido1));
            
            const studentListStr = assignedStudents.map(s => {
                const roleId = service.studentRoles.find(sr => sr.studentId === s.id)?.roleId;
                const roleName = serviceRoles.find(r => r.id === roleId)?.name;
                return roleName ? `${s.apellido1}, ${s.nombre} (${roleName})` : `${s.apellido1}, ${s.nombre}`;
            }).join('\n') || 'Sin alumnos';

            agrupacionesRows.push([
                `${idx + 1}. ${agrup.name}`,
                `${assignedStudents.length} alumnos`,
                studentListStr
            ]);
        });

        autoTable(doc, {
            head: [['Partida / Elaboración', 'Nº Alumnos', 'Alumnos y Puestos Asignados']],
            body: agrupacionesRows,
            startY: currentY,
            margin: { left: pageMargin, right: pageMargin },
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            styles: { fontSize: 8.5, cellPadding: 2.5 },
            columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 25 } },
            theme: 'grid'
        });
        currentY = (doc as any).lastAutoTable.finalY + 6;
    } else {
        // Normal type: Comedor & Takeaway
        const comedorGroups = practiceGroups.filter(g => service.assignedGroups.comedor.includes(g.id)).map(g => g.name).join(', ') || 'Ninguno';
        const takeawayGroups = practiceGroups.filter(g => service.assignedGroups.takeaway.includes(g.id)).map(g => g.name).join(', ') || 'Ninguno';

        const elaborationsRows: any[] = [];
        service.elaborations.comedor.forEach((elab, i) => {
            const group = practiceGroups.find(g => g.id === elab.responsibleGroupId);
            elaborationsRows.push(['Comedor', `${i + 1}. ${elab.name}`, group ? group.name : 'Sin asignar']);
        });
        service.elaborations.takeaway.forEach((elab, i) => {
            const group = practiceGroups.find(g => g.id === elab.responsibleGroupId);
            elaborationsRows.push(['Take Away', `${i + 1}. ${elab.name}`, group ? group.name : 'Sin asignar']);
        });

        if (elaborationsRows.length > 0) {
            autoTable(doc, {
                head: [['Área de Servicio', 'Plato / Elaboración', 'Grupo Responsable']],
                body: elaborationsRows,
                startY: currentY,
                margin: { left: pageMargin, right: pageMargin },
                headStyles: { fillColor: [39, 174, 96], textColor: 255, fontStyle: 'bold', fontSize: 9 },
                styles: { fontSize: 8.5, cellPadding: 2.5 },
                theme: 'grid'
            });
            currentY = (doc as any).lastAutoTable.finalY + 6;
        }

        // Section 3: Cuadrante de alumnos por grupo y puesto
        const assignedGroupIds = [...service.assignedGroups.comedor, ...service.assignedGroups.takeaway];
        const assignedGroups = practiceGroups.filter(g => assignedGroupIds.includes(g.id)).sort((a, b) => a.name.localeCompare(b.name));

        const studentRows: any[] = [];
        assignedGroups.forEach(group => {
            const area = service.assignedGroups.comedor.includes(group.id) ? 'Comedor' : 'Take Away';
            const studentsInGroup = students.filter(s => group.studentIds.includes(s.id)).sort((a, b) => a.apellido1.localeCompare(b.apellido1));
            
            studentsInGroup.forEach(student => {
                const roleId = service.studentRoles.find(sr => sr.studentId === student.id)?.roleId;
                const roleName = serviceRoles.find(r => r.id === roleId)?.name || 'Cocinero de partida';
                studentRows.push([
                    `${student.apellido1} ${student.apellido2}, ${student.nombre}`,
                    group.name,
                    area,
                    roleName
                ]);
            });
        });

        if (studentRows.length > 0) {
            autoTable(doc, {
                head: [['Alumno', 'Grupo', 'Área', 'Puesto / Responsabilidad']],
                body: studentRows,
                startY: currentY,
                margin: { left: pageMargin, right: pageMargin },
                headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold', fontSize: 9 },
                styles: { fontSize: 8, cellPadding: 2 },
                theme: 'striped'
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
    const formattedDate = new Date(service.date.replace(/-/g, '/')).toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const trimesterLabel = service.trimester ? service.trimester.toUpperCase() : 'T1';

    let currentY = 44;

    // Prepare student rows with calculations
    const evaluationRows: any[] = [];

    // Determine participating students
    const participatingStudents: { student: Student; groupName: string; roleName: string; groupId: string }[] = [];

    if (service.type === 'agrupacion') {
        (service.agrupaciones || []).forEach(agrup => {
            const agrupStudents = students.filter(s => agrup.studentIds.includes(s.id));
            agrupStudents.forEach(st => {
                const roleId = service.studentRoles.find(sr => sr.studentId === st.id)?.roleId;
                const role = serviceRoles.find(r => r.id === roleId);
                participatingStudents.push({
                    student: st,
                    groupName: agrup.name,
                    roleName: role ? role.name : 'Cocinero',
                    groupId: agrup.id
                });
            });
        });
    } else {
        const assignedGroupIds = [...service.assignedGroups.comedor, ...service.assignedGroups.takeaway];
        practiceGroups.filter(g => assignedGroupIds.includes(g.id)).forEach(group => {
            const groupStudents = students.filter(s => group.studentIds.includes(s.id));
            groupStudents.forEach(st => {
                const roleId = service.studentRoles.find(sr => sr.studentId === st.id)?.roleId;
                const role = serviceRoles.find(r => r.id === roleId);
                participatingStudents.push({
                    student: st,
                    groupName: group.name,
                    roleName: role ? role.name : 'Cocinero',
                    groupId: group.id
                });
            });
        });
    }

    participatingStudents.sort((a, b) => a.student.apellido1.localeCompare(b.student.apellido1));

    participatingStudents.forEach(({ student, groupName, roleName, groupId }) => {
        const indEval = evaluation.serviceDay.individualScores[student.id];
        const groupEval = evaluation.serviceDay.groupScores[groupId];

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
        margin: { left: pageMargin, right: pageMargin },
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
                currentY = 34;
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
                margin: { left: pageMargin, right: pageMargin },
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

    const safeFilename = `Evaluacion_${service.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${service.date}.pdf`;
    doc.save(safeFilename);
};

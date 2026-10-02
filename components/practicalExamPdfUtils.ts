import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PracticalExamEvaluation, Student, TeacherData, InstituteData } from '../types';
import { FINAL_EXAM_SECTIONS, FINAL_EXAM_CHECKLIST } from '../data/examFinalRubric';

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

export const downloadFinalPracticalExamPdf = (params: {
    student: Student;
    evaluation: PracticalExamEvaluation;
    teacherData: TeacherData;
    instituteData: InstituteData;
    periodLabel: string;
}) => {
    const { student, evaluation, teacherData, instituteData, periodLabel } = params;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageMargin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const logoSize = 12;

    // Header logos
    if (instituteData.logo) {
        addImageToPdf(doc, instituteData.logo, pageMargin, pageMargin - 3, logoSize, logoSize);
    }
    if (teacherData.logo) {
        addImageToPdf(doc, teacherData.logo, pageWidth - pageMargin - logoSize, pageMargin - 3, logoSize, logoSize);
    }

    doc.setFontSize(8.5);
    doc.setTextColor(100);
    doc.text(instituteData.name || 'Instituto de Formación Profesional', pageMargin + logoSize + 4, pageMargin + 2);
    doc.text(teacherData.name || 'Departamento de Cocina y Restauración', pageWidth - pageMargin - logoSize - 4, pageMargin + 2, { align: 'right' });

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`EVALUACIÓN DE EXAMEN PRÁCTICO: ${periodLabel.toUpperCase()}`, pageWidth / 2, pageMargin + 13, { align: 'center' });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(pageMargin, pageMargin + 18, pageWidth - pageMargin, pageMargin + 18);

    // Meta box
    const headerData = evaluation.headerData || {};
    const examDate = headerData.fecha || '15/09/2026';
    const startTime = headerData.horaInicio || '08:15';
    const duration = headerData.duracionMin || 90;
    const endTime = headerData.horaFinal || '09:45';

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(pageMargin, pageMargin + 21, pageWidth - (pageMargin * 2), 16, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Alumno: ${student.apellido1} ${student.apellido2}, ${student.nombre}`, pageMargin + 4, pageMargin + 27);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Fecha: ${examDate}`, pageMargin + 4, pageMargin + 33);
    doc.text(`Hora inicio: ${startTime}`, pageMargin + 50, pageMargin + 33);
    doc.text(`Duración: ${duration} min`, pageMargin + 95, pageMargin + 33);
    doc.text(`Hora fin: ${endTime}`, pageMargin + 135, pageMargin + 33);

    let currentY = pageMargin + 40;

    // Build Rubric Table
    const tableBody: any[] = [];
    let totalScoreObtained = 0;

    FINAL_EXAM_SECTIONS.forEach(section => {
        // Section Header Row
        tableBody.push([
            { content: section.title, colSpan: 5, styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [30, 41, 59] } }
        ]);

        section.criteria.forEach(crit => {
            const scoreData = evaluation.scores?.[section.id]?.[crit.id];
            const scoreVal = scoreData?.score !== null && scoreData?.score !== undefined ? scoreData.score : null;
            if (scoreVal !== null) {
                totalScoreObtained += scoreVal;
            }

            tableBody.push([
                `${crit.name}\n(${crit.description})`,
                crit.type,
                `${crit.maxScore} pts`,
                scoreVal !== null ? `${scoreVal} pts` : '-',
                scoreData?.notes || ''
            ]);
        });
    });

    const finalScore10 = (totalScoreObtained / 10).toFixed(2);

    autoTable(doc, {
        head: [['SECCIÓN / CRITERIO DE EVALUACIÓN', 'TIPO', 'MÁX.', 'NOTA', 'OBSERVACIONES TÉCNICAS']],
        body: tableBody,
        startY: currentY,
        margin: { left: pageMargin, right: pageMargin },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 15, halign: 'center' },
            3: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
            4: { cellWidth: 'auto' }
        },
        theme: 'grid'
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;

    // Check if new page needed for totals and checklist
    if (currentY > pageHeight - 55) {
        doc.addPage();
        currentY = 20;
    }

    // Scores Summary Box
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(pageMargin, currentY, pageWidth - (pageMargin * 2), 16, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text(`PUNTUACIÓN TOTAL OBTENIDA: ${totalScoreObtained.toFixed(1)} / 100`, pageMargin + 6, currentY + 7);
    doc.setFontSize(12);
    doc.setTextColor(29, 78, 216);
    doc.text(`CALIFICACIÓN FINAL (ESCALA 0-10): ${finalScore10}`, pageMargin + 6, currentY + 13);

    currentY += 21;

    // Checklist Table
    const checklistBody: any[] = [];
    FINAL_EXAM_CHECKLIST.forEach(group => {
        group.items.forEach(item => {
            const isChecked = !!evaluation.checklist?.[item.id];
            checklistBody.push([
                group.title,
                item.label,
                isChecked ? '[ X ] SÍ' : '[   ] SÍ',
                !isChecked ? '[ X ] NO' : '[   ] NO'
            ]);
        });
    });

    autoTable(doc, {
        head: [['REQUISITOS OBLIGATORIOS (CHECKLIST)', 'CRITERIO ESPECÍFICO', 'CUMPLE', 'NO CUMPLE']],
        body: checklistBody,
        startY: currentY,
        margin: { left: pageMargin, right: pageMargin },
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 65, fontStyle: 'bold' },
            1: { cellWidth: 55 },
            2: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
            3: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }
        },
        theme: 'grid'
    });

    // Footer on all pages
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${i} de ${totalPages} | Ficha oficial de examen práctico`, pageMargin, pageHeight - 8);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - pageMargin, pageHeight - 8, { align: 'right' });
    }

    const safeName = `${student.apellido1}_${student.nombre}_${periodLabel}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`ExamenPractico_${safeName}.pdf`);
};

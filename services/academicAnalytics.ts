import {
    CriterioEvaluacion,
    AcademicGrades,
    StudentCalculatedGrades,
    ResultadoAprendizaje,
    InstrumentGrades,
    InstrumentoEvaluacion,
    ProyectoGroup,
    ProyectoEvaluationsState,
    CourseGrades,
    RetoGroupEntry,
    RetoStudentEntry,
} from '../types';
import { DEFAULT_PROYECTO_CONFIG, ProyectoStructureConfig } from '../data/constants';

export interface AnalyticsExtraContext {
    proyectoGroups?: ProyectoGroup[];
    proyectoEvaluations?: ProyectoEvaluationsState;
    courseGrades?: CourseGrades;
    pcInstrumentos?: Record<string, InstrumentoEvaluacion>;
    optativaInstrumentos?: Record<string, InstrumentoEvaluacion>;
    proyectoInstrumentos?: Record<string, InstrumentoEvaluacion>;
}

export interface ProyectoStudentAnalytics {
    finalGrade: number | null;
    totalPuntosObtenidos: number;
    totalPuntosEvaluados: number;
    retosCompletadosCount: number;
    phaseGrades: Record<string, number | null>;
}

export const getNumericValue = (g: any): number | null => {
    if (g === null || g === undefined || g === '') return null;
    if (typeof g === 'number') return isNaN(g) ? null : g;
    if (typeof g === 'object') {
        const normal = g.normal !== null && g.normal !== undefined ? parseFloat(String(g.normal)) : null;
        const rec1 = g.rec1 !== null && g.rec1 !== undefined ? parseFloat(String(g.rec1)) : null;
        const rec2 = g.rec2 !== null && g.rec2 !== undefined ? parseFloat(String(g.rec2)) : null;
        const validGrades = [normal, rec1, rec2].filter((v): v is number => v !== null && !isNaN(v));
        return validGrades.length > 0 ? Math.max(...validGrades) : null;
    }
    const parsed = parseFloat(String(g).replace(',', '.'));
    return isNaN(parsed) ? null : parsed;
};

const getCourseModuleRecord = (courseGrades: CourseGrades | undefined, studentId: string, keys: string[]) => {
    const studentCG = courseGrades?.[studentId];
    if (!studentCG) return null;
    for (const k of keys) {
        if (studentCG[k]) return studentCG[k] as any;
    }
    return null;
};

/**
 * Computes a student's Proyecto Intermodular Reto breakdown and normalized (0-10) grades
 * for both the curriculum activity IDs (act_proy_1..4) and reto activity IDs (proy_reto_*).
 */
export const calculateProyectoStudentAnalytics = (
    studentId: string,
    proyectoGroups: ProyectoGroup[] = [],
    proyectoEvaluations?: ProyectoEvaluationsState,
    courseGrades?: CourseGrades
): ProyectoStudentAnalytics => {
    const config: ProyectoStructureConfig = proyectoEvaluations?.customConfig || DEFAULT_PROYECTO_CONFIG;
    const retosGroupGrades = proyectoEvaluations?.retosGroupGrades || {};
    const retosStudentGrades = proyectoEvaluations?.retosStudentGrades || {};
    const exposicionGrades = proyectoEvaluations?.exposicionGrades || {};

    const grp = proyectoGroups.find(g => (g.studentIds || []).includes(studentId)) || null;
    const grpId = grp?.id;

    let puntosRetos = 0;
    let puntosMaxEvaluadosRetos = 0;
    let ajusteDiabolico = 0;
    let hasAjusteDiabolico = false;
    let retosCompletados = 0;

    // Accumulators per curriculum phase (act_proy_1..4)
    let p1Obt = 0, p1Max = 0; // Reto 2 & Reto 3 (Análisis / Diseño)
    let p2Obt = 0, p2Max = 0; // Reto 5 (Planificación / Costes)
    let p3Obt = 0, p3Max = 0; // Reto 4 & Reto 7 (Ejecución / Seguimiento)

    const phaseGrades: Record<string, number | null> = {};

    const normalizeRatio = (obt: number, max: number): number | null => {
        if (max <= 0) return null;
        return parseFloat(Math.min(10, Math.max(0, (obt / max) * 10)).toFixed(2));
    };

    config.retos.forEach(reto => {
        const groupEntry: RetoGroupEntry = grpId ? (retosGroupGrades[grpId]?.[reto.id] || {}) : {};
        const studentEntry: RetoStudentEntry = retosStudentGrades[studentId]?.[reto.id] || {};

        if (reto.id === 'reto1') {
            if (groupEntry.entregado) retosCompletados++;
            return;
        }

        if (reto.id === 'reto6') {
            if (typeof studentEntry.ajusteDiabolico === 'number' && !isNaN(studentEntry.ajusteDiabolico)) {
                ajusteDiabolico = studentEntry.ajusteDiabolico;
                hasAjusteDiabolico = true;
                retosCompletados++;
                // Map +/-1 into 0-10 centered at 5 -> 5 + val*5 (only if explicitly queried)
                phaseGrades['proy_reto_6_coeval'] = parseFloat(Math.min(10, Math.max(0, 5 + ajusteDiabolico * 5)).toFixed(2));
            }
            return;
        }

        if (reto.id === 'reto8') {
            return;
        }

        const taskGrupal = reto.tasks.find(t => t.type === 'grupal');
        const taskInd = reto.tasks.find(t => t.type === 'individual');

        let retoObt = 0;
        let retoMax = 0;
        let hasAny = false;

        if (taskGrupal && taskGrupal.maxScore && typeof groupEntry.notaGrupal === 'number' && !isNaN(groupEntry.notaGrupal)) {
            const val = Math.min(taskGrupal.maxScore, Math.max(0, groupEntry.notaGrupal));
            retoObt += val;
            retoMax += taskGrupal.maxScore;
            hasAny = true;

            const normG = normalizeRatio(val, taskGrupal.maxScore);
            if (reto.id === 'reto2') phaseGrades['proy_reto_2_g'] = normG;
            if (reto.id === 'reto3') phaseGrades['proy_reto_3_g'] = normG;
            if (reto.id === 'reto4') phaseGrades['proy_reto_4_g'] = normG;
        }

        if (taskInd && taskInd.maxScore && typeof studentEntry.notaIndividual === 'number' && !isNaN(studentEntry.notaIndividual)) {
            const val = Math.min(taskInd.maxScore, Math.max(0, studentEntry.notaIndividual));
            retoObt += val;
            retoMax += taskInd.maxScore;
            hasAny = true;

            const normI = normalizeRatio(val, taskInd.maxScore);
            if (reto.id === 'reto2') phaseGrades['proy_reto_2_i'] = normI;
            if (reto.id === 'reto3') phaseGrades['proy_reto_3_i'] = normI;
        }

        if (hasAny) {
            retosCompletados++;
            puntosRetos += retoObt;
            puntosMaxEvaluadosRetos += retoMax;

            if (reto.id === 'reto5') {
                phaseGrades['proy_reto_5'] = normalizeRatio(retoObt, retoMax);
                p2Obt += retoObt;
                p2Max += retoMax;
            } else if (reto.id === 'reto2' || reto.id === 'reto3') {
                p1Obt += retoObt;
                p1Max += retoMax;
            } else if (reto.id === 'reto4' || reto.id === 'reto7') {
                p3Obt += retoObt;
                p3Max += retoMax;
            }
        }
    });

    const rawExpo = exposicionGrades[studentId];
    const maxExpo = config.retos.find(r => r.id === 'reto8')?.tasks.find(t => t.id === 'individual')?.maxScore ?? 3.0;
    const puntosExpo = typeof rawExpo === 'number' && !isNaN(rawExpo) ? Math.min(maxExpo, Math.max(0, rawExpo)) : null;

    if (puntosExpo !== null) {
        retosCompletados++;
        phaseGrades['proy_reto_6_defensa'] = normalizeRatio(puntosExpo, maxExpo);
        phaseGrades['act_proy_4'] = normalizeRatio(puntosExpo, maxExpo);
    } else {
        phaseGrades['act_proy_4'] = null;
    }

    phaseGrades['act_proy_1'] = normalizeRatio(p1Obt, p1Max);
    phaseGrades['act_proy_2'] = normalizeRatio(p2Obt, p2Max);

    let actProy3 = normalizeRatio(p3Obt, p3Max);
    if (actProy3 !== null && hasAjusteDiabolico) {
        actProy3 = parseFloat(Math.min(10, Math.max(0, actProy3 + ajusteDiabolico)).toFixed(2));
    }
    phaseGrades['act_proy_3'] = actProy3;

    const totalObtenido = Math.max(0, Math.min(10, puntosRetos + ajusteDiabolico + (puntosExpo ?? 0)));
    const totalEvaluado = Math.min(10, puntosMaxEvaluadosRetos + (puntosExpo !== null ? maxExpo : 0));

    let finalGrade: number | null = null;
    if (totalEvaluado > 0 || retosCompletados > 0) {
        finalGrade = parseFloat(totalObtenido.toFixed(2));
    } else {
        // Fallback to legacy studentEvaluations or courseGrades
        const legacyEval = proyectoEvaluations?.studentEvaluations?.[studentId];
        if (legacyEval && typeof legacyEval.finalGrade === 'number') {
            finalGrade = legacyEval.finalGrade;
        } else {
            const cg = getCourseModuleRecord(courseGrades, studentId, ['proyecto', 'Proyecto', 'Proyecto Intermodular', 'intermodular']);
            if (cg) {
                if (typeof cg.rec === 'number') finalGrade = cg.rec;
                else if (typeof cg.final === 'number') finalGrade = cg.final;
                else {
                    const vals = [cg.t1, cg.t2, cg.t3].filter((v): v is number => typeof v === 'number' && !isNaN(v));
                    if (vals.length > 0) finalGrade = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
                }
            }
        }

        // If a legacy/manual final grade exists without per-reto details, populate phaseGrades with it
        if (finalGrade !== null) {
            phaseGrades['act_proy_1'] = phaseGrades['act_proy_1'] ?? finalGrade;
            phaseGrades['act_proy_2'] = phaseGrades['act_proy_2'] ?? finalGrade;
            phaseGrades['act_proy_3'] = phaseGrades['act_proy_3'] ?? finalGrade;
            phaseGrades['act_proy_4'] = phaseGrades['act_proy_4'] ?? finalGrade;
        }
    }

    return {
        finalGrade,
        totalPuntosObtenidos: parseFloat(totalObtenido.toFixed(2)),
        totalPuntosEvaluados: parseFloat(totalEvaluado.toFixed(2)),
        retosCompletadosCount: retosCompletados,
        phaseGrades,
    };
};

/**
 * Gets the grade for a student for a specific evaluation activity.
 * Checks direct instrumentGrades first across ALL modules, then falls back to
 * academicGrades/calculatedGrades (PC), courseGrades (Optativa), or proyectoEvaluations (Proyecto).
 */
const getGradeForActivity = (
    activityId: string,
    studentId: string,
    module: 'pc' | 'optativa' | 'proyecto',
    academicGrades: AcademicGrades,
    instrumentGrades: InstrumentGrades,
    calculatedGrades: Record<string, StudentCalculatedGrades>,
    extra?: AnalyticsExtraContext
): number | null => {
    // 1. Direct grade entered via Instrumentos / ModalNotasExamenesTeoricos / EvaluacionInstrumentos
    const directGrade = getNumericValue(instrumentGrades?.[studentId]?.[activityId]);
    if (directGrade !== null) {
        return directGrade;
    }

    if (module === 'optativa') {
        // Fallback to courseGrades if optativa was entered manually in GestionAcademica / ModuleDashboard
        const cg = getCourseModuleRecord(extra?.courseGrades, studentId, ['optativa', 'Optativa', 'optativo', 'Optativo', 'Cocina Sostenible']);
        if (cg) {
            if (activityId === 'act_opt_1' || activityId === 'act_opt_2') {
                const v = getNumericValue(cg.t1);
                if (v !== null) return v;
            } else if (activityId === 'act_opt_3') {
                const v = getNumericValue(cg.t2);
                if (v !== null) return v;
            } else if (activityId === 'act_opt_4') {
                const v = getNumericValue(cg.t3) ?? getNumericValue(cg.t2);
                if (v !== null) return v;
            }
            const fallbackFinal = getNumericValue(cg.rec) ?? getNumericValue(cg.final);
            if (fallbackFinal !== null) return fallbackFinal;
        }
        return null;
    }

    if (module === 'proyecto') {
        const proyAnalytics = calculateProyectoStudentAnalytics(
            studentId,
            extra?.proyectoGroups,
            extra?.proyectoEvaluations,
            extra?.courseGrades
        );
        if (proyAnalytics.phaseGrades[activityId] !== undefined && proyAnalytics.phaseGrades[activityId] !== null) {
            return proyAnalytics.phaseGrades[activityId]!;
        }
        return null;
    }

    // --- PC Module Logic ---
    const studentAcademic = academicGrades?.[studentId];
    const studentCalculated = calculatedGrades?.[studentId];

    // Mapping of BOTH current underscore IDs (data/pc-data.ts) and legacy hyphen IDs
    const activityGradeMap: Record<string, () => number | null> = {
        // Exams (check direct academicGrades manualGrades; also allow t3 or t2.examen2 for Examen 4)
        'act_ex1': () => getNumericValue(studentAcademic?.t1?.manualGrades?.examen1),
        'act-1': () => getNumericValue(studentAcademic?.t1?.manualGrades?.examen1),

        'act_ex2': () => getNumericValue(studentAcademic?.t1?.manualGrades?.examen2),
        'act-2': () => getNumericValue(studentAcademic?.t1?.manualGrades?.examen2),

        'act_ex3': () => getNumericValue(studentAcademic?.t2?.manualGrades?.examen1),
        'act-8': () => getNumericValue(studentAcademic?.t2?.manualGrades?.examen1),

        'act_ex4': () =>
            getNumericValue(studentAcademic?.t3?.manualGrades?.examen1) ??
            getNumericValue(studentAcademic?.t2?.manualGrades?.examen2),
        'act-9': () =>
            getNumericValue(studentAcademic?.t2?.manualGrades?.examen2) ??
            getNumericValue(studentAcademic?.t3?.manualGrades?.examen1),

        // Services
        'act_sv1': () => studentCalculated?.serviceAverages?.t1 ?? null,
        'act-6': () => studentCalculated?.serviceAverages?.t1 ?? null,

        'act_sv2': () => studentCalculated?.serviceAverages?.t2 ?? null,
        'act-13': () => studentCalculated?.serviceAverages?.t2 ?? null,

        'act_sv3': () => studentCalculated?.serviceAverages?.t3 ?? null,

        // Practical Exams
        'act_ep1': () => studentCalculated?.practicalExams?.t1 ?? null,
        'act-7': () => studentCalculated?.practicalExams?.t1 ?? null,

        'act_ep2': () => studentCalculated?.practicalExams?.t2 ?? null,
        'act-14': () => studentCalculated?.practicalExams?.t2 ?? null,

        'act_ep3': () => studentCalculated?.practicalExams?.t3 ?? null,
    };

    const gradeFn = activityGradeMap[activityId];
    if (gradeFn) {
        const mapped = gradeFn();
        if (mapped !== null) return mapped;
    }

    // Dynamic fallback via pcInstrumentos for custom/renamed activities
    if (extra?.pcInstrumentos) {
        for (const inst of Object.values(extra.pcInstrumentos)) {
            const activities = inst.activities || [];
            const idxInInst = activities.findIndex(a => a.id === activityId);
            if (idxInInst !== -1) {
                const act = activities[idxInInst];
                const instName = (inst.nombre || '').toLowerCase();
                if (instName.includes('servicio')) {
                    return studentCalculated?.serviceAverages?.[act.trimester] ?? null;
                }
                if (instName.includes('práctico') || instName.includes('practico')) {
                    return studentCalculated?.practicalExams?.[act.trimester] ?? null;
                }
                if (instName.includes('examen')) {
                    const sameTrim = activities.filter(a => a.trimester === act.trimester);
                    const idxTrim = sameTrim.findIndex(a => a.id === activityId);
                    const key = idxTrim === 0 ? 'examen1' : 'examen2';
                    return getNumericValue(studentAcademic?.[act.trimester]?.manualGrades?.[key]);
                }
            }
        }
    }

    return null;
};

/**
 * Calculates the final grade for an evaluation criterion by averaging the grades of its associated activities.
 */
export const calculateCriterioGrade = (
    criterio: CriterioEvaluacion,
    studentId: string,
    module: 'pc' | 'optativa' | 'proyecto',
    academicGrades: AcademicGrades,
    instrumentGrades: InstrumentGrades,
    calculatedGrades: Record<string, StudentCalculatedGrades>,
    extra?: AnalyticsExtraContext
): number | null => {
    if (!criterio.asociaciones || criterio.asociaciones.length === 0) {
        return null;
    }

    const associatedActivities = Array.from(new Set(criterio.asociaciones.flatMap(asoc => asoc.activityIds || [])));
    if (associatedActivities.length === 0) {
        return null;
    }

    const grades = associatedActivities
        .map(actId => getGradeForActivity(actId, studentId, module, academicGrades, instrumentGrades, calculatedGrades, extra))
        .filter((g): g is number => g !== null && !isNaN(g));

    if (grades.length === 0) {
        return null;
    }

    const sum = grades.reduce((acc, grade) => acc + grade, 0);
    return sum / grades.length;
};

/**
 * Calculates the final weighted grade for a Learning Outcome (RA) based on the grades of its criteria.
 */
export const calculateRAGrade = (
    ra: ResultadoAprendizaje,
    studentId: string,
    module: 'pc' | 'optativa' | 'proyecto',
    criteriosEvaluacion: Record<string, CriterioEvaluacion>,
    academicGrades: AcademicGrades,
    instrumentGrades: InstrumentGrades,
    calculatedGrades: Record<string, StudentCalculatedGrades>,
    extra?: AnalyticsExtraContext
): { grade: number | null; ponderacionTotal: number; maxPonderacion: number } => {
    let weightedSum = 0;
    let ponderacionTotalEvaluada = 0;
    let maxPonderacion = 0;

    (ra.criteriosEvaluacion || []).forEach(criterioId => {
        const criterio = criteriosEvaluacion[criterioId];
        if (criterio) {
            const weight = criterio.ponderacion || 0;
            maxPonderacion += weight;
            const criterioGrade = calculateCriterioGrade(
                criterio,
                studentId,
                module,
                academicGrades,
                instrumentGrades,
                calculatedGrades,
                extra
            );

            if (criterioGrade !== null) {
                weightedSum += criterioGrade * (weight / 100);
                ponderacionTotalEvaluada += weight;
            }
        }
    });

    if (ponderacionTotalEvaluada === 0) {
        return { grade: null, ponderacionTotal: 0, maxPonderacion };
    }

    const finalGrade = weightedSum / (ponderacionTotalEvaluada / 100);
    return {
        grade: finalGrade,
        ponderacionTotal: parseFloat(ponderacionTotalEvaluada.toFixed(1)),
        maxPonderacion: parseFloat(maxPonderacion.toFixed(1)),
    };
};
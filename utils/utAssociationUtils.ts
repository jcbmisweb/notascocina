import { UnidadTrabajo, CriterioEvaluacion, ResultadoAprendizaje } from '../types';

/**
 * Normaliza el nombre de una Unidad de Trabajo o Criterio eliminando prefijos
 * ("UT:", "UT :-", "Bloque 1:", "Tema 1:"), acentos, signos de puntuación y espacios extras.
 */
export function normalizeUTText(text: string): string {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
        .replace(/^ut\s*:\s*-?\s*/i, '') // Elimina prefijo "UT: - " o "UT:"
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ') // Elimina puntuación
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extrae el número ordinal o identificador de Bloque / Tema / Fase / UT / RA.
 * Soporta múltiples formatos: "opt_ut1", "ut_1", "ut-1", "ut1", "Bloque 1", "Tema 2", "Fase 3",
 * números romanos ("Bloque I", "Tema II"), y "R.A.1", ignorando marcas de tiempo (timestamp IDs).
 */
export function extractUTNumber(str: string): number | null {
    if (!str) return null;

    // Si contiene un timestamp tipo ut_1763065854751, limpiarlo para extraer si hay texto adicional
    if (/ut_[0-9]{10,}/i.test(str)) {
        const cleaned = str.replace(/ut_[0-9]{10,}/gi, '').trim();
        if (!cleaned) return null;
        str = cleaned;
    }
    
    // Coincidencias con opt_ut1, pc_ut2, proy_ut3, ut_1, ut-1, ut1, etc.
    const idMatch = str.match(/(?:opt|pc|proy|ut)?[_.\-]?ut[_.\-]?([0-9]{1,2})\b/i);
    if (idMatch) return parseInt(idMatch[1], 10);

    // Coincidencias con bloque 1, tema 1, fase 1, ut 1, unidad 1 (con :, -, _, ., etc.)
    const textMatch = str.match(/(?:bloque|tema|fase|unidad|ut)\s*[:#_.\-]*\s*([0-9]{1,2})\b/i);
    if (textMatch) return parseInt(textMatch[1], 10);

    // Coincidencias con números romanos: Bloque I, Tema II, Fase III, Bloque IV...
    const romanMatch = str.match(/(?:bloque|tema|fase|unidad|ut)\s*[:#_.\-]*\s*(X|IX|VIII|VII|VI|V|IV|III|II|I)\b/i);
    if (romanMatch) {
        const romanMap: Record<string, number> = {
            'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
            'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10
        };
        const val = romanMap[romanMatch[1].toUpperCase()];
        if (val) return val;
    }

    // Coincidencia con R.A.1, RA 1, RA-1, RA1, etc.
    const raMatch = str.match(/(?:r\.?a\.?|ra)\s*[:#_.\-]*\s*([0-9]{1,2})\b/i);
    if (raMatch) return parseInt(raMatch[1], 10);

    // Coincidencia con criterio tipo crit1a, pc_crit2b, opt_crit3c, proy_1a, proy_2a
    const critMatch = str.match(/(?:crit|criterio|proy|opt|pc)[_.\-]?([0-9]{1,2})[a-z]?\b/i);
    if (critMatch) return parseInt(critMatch[1], 10);

    // Búsqueda de un solo dígito del 1 al 9 aislado
    const directDigitMatch = str.match(/(?:^|[^0-9])([1-9]|10)(?:[^0-9]|$)/);
    if (directDigitMatch) return parseInt(directDigitMatch[1], 10);

    return null;
}

/**
 * Palabras clave esenciales para identificar bloques/temas temáticos comunes en hostelería y cocina
 */
const THEMATIC_KEYWORDS: { [num: number]: string[] } = {
    1: ['sostenibilidad', 'biodiversidad', 'procesos productivos', 'organizacion', 'empresa', 'sector'],
    2: ['desperdicio', 'residuo', 'territoriales', 'soluciones', 'costes'],
    3: ['avanzadas', 'tecnicas culinarias', 'cocinas del mundo', 'planificar', 'intervencion'],
    4: ['innovacion', 'pureza', 'sencillez', 'frescura', 'creativa', 'autor', 'supervisar'],
    5: ['necesidades especiales', 'decoracion', 'comunicar'],
    6: ['elaboracion', 'platos']
};

/**
 * Encuentra en un diccionario de Unidades de Trabajo aquella que corresponde a un ID o referencia dada.
 */
export function findMatchingUT(
    asocUtId: string, 
    unidadesTrabajo: Record<string, UnidadTrabajo>
): UnidadTrabajo | undefined {
    if (!asocUtId || !unidadesTrabajo) return undefined;

    // 1. Coincidencia directa por clave/ID
    if (unidadesTrabajo[asocUtId]) {
        return unidadesTrabajo[asocUtId];
    }

    const utList = Object.values(unidadesTrabajo);
    const directIdMatch = utList.find(u => u.id === asocUtId);
    if (directIdMatch) return directIdMatch;

    // 2. Coincidencia por número de bloque / tema / fase / ordinal
    const targetNum = extractUTNumber(asocUtId);
    if (targetNum !== null) {
        const matchByNum = utList.find(u => {
            const uNum = extractUTNumber(u.nombre) ?? extractUTNumber(u.id);
            return uNum === targetNum;
        });
        if (matchByNum) return matchByNum;
    }

    // 3. Coincidencia por normalización de texto o palabras clave
    const normalizedTarget = normalizeUTText(asocUtId);
    for (const ut of utList) {
        const normUT = normalizeUTText(ut.nombre);
        if (normalizedTarget && (normUT.includes(normalizedTarget) || normalizedTarget.includes(normUT))) {
            return ut;
        }

        // Si asocUtId contiene palabras clave temáticas de este UT
        if (targetNum && THEMATIC_KEYWORDS[targetNum]) {
            const keywords = THEMATIC_KEYWORDS[targetNum];
            if (keywords.some(kw => normUT.includes(kw))) {
                return ut;
            }
        }
    }

    return undefined;
}

/**
 * Determina si un Criterio de Evaluación está asociado a una Unidad de Trabajo específica.
 * Soporta:
 * - Coincidencia exacta por ID en asociaciones
 * - Coincidencia difusa por nombre o número de bloque de la UT en la asociación
 * - Correspondencia curricular automática directa entre el RA del criterio y la Unidad de Trabajo (Bloque / Tema)
 */
export function isCriterioAssociatedWithUT(
    criterio: CriterioEvaluacion,
    ut: UnidadTrabajo,
    allUTs: Record<string, UnidadTrabajo>,
    resultadosAprendizaje?: Record<string, ResultadoAprendizaje>
): boolean {
    if (!criterio || !ut) return false;

    const utNum = extractUTNumber(ut.nombre) ?? extractUTNumber(ut.id);
    const normUT = normalizeUTText(ut.nombre);

    // 1. Revisar el array de asociaciones explícitas del criterio
    const asociaciones = criterio.asociaciones || [];
    for (const asoc of asociaciones) {
        // Coincidencia directa de ID
        if (asoc.utId === ut.id) return true;

        // Búsqueda inteligente de la UT asociada
        const resolvedUT = findMatchingUT(asoc.utId, allUTs);
        if (resolvedUT && resolvedUT.id === ut.id) return true;

        // Comprobación de número de bloque/tema referenciado en la asociación
        const asocNum = extractUTNumber(asoc.utId);
        if (asocNum !== null && utNum !== null && asocNum === utNum) {
            return true;
        }

        // Comprobación de texto normalizado
        if (asoc.utId) {
            const normAsoc = normalizeUTText(asoc.utId);
            if (normAsoc && (normUT.includes(normAsoc) || normAsoc.includes(normUT))) {
                return true;
            }
        }
    }

    // La correspondencia sólo debe basarse en las asociaciones explícitas (asociaciones array).
    // Se han eliminado las correspondencias automáticas (por coincidencia de RA o número de Criterio)
    // porque forzaban la asociación de forma permanente e impedían al usuario desvincular criterios en la interfaz.

    return false;
}

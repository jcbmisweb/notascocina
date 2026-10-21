
export const PRE_SERVICE_BEHAVIOR_ITEMS = [
    { id: 'respects_rules', label: 'Respeta las normas y no interrumpe.' },
    { id: 'is_kind', label: 'Es amable y trata bien a los compañeros.' },
    { id: 'clean_uniform', label: 'Trae limpio el uniforme.' },
    { id: 'is_participative', label: 'Se muestra participativo e interesado.' },
    { id: 'brings_material', label: 'Trae el material de trabajo (Fichas técnicas, etc.).' },
];

export const BEHAVIOR_RATING_MAP: { symbol: string, value: number, label: string, color: string, selectedColor: string }[] = [
    { symbol: '++', value: 2, label: 'Muy Bien', color: 'bg-green-100 text-green-800', selectedColor: 'bg-green-500 text-white ring-2 ring-green-700' },
    { symbol: '+', value: 1, label: 'Bien', color: 'bg-blue-100 text-blue-800', selectedColor: 'bg-blue-500 text-white ring-2 ring-blue-700' },
    { symbol: '-', value: 0, label: 'Casi Nunca', color: 'bg-red-100 text-red-800', selectedColor: 'bg-red-500 text-white ring-2 ring-red-700' },
];

export const GROUP_EVALUATION_ITEMS = [
    { id: 'planning', label: 'Planifica y organiza la mise en place', maxScore: 1.00 },
    { id: 'ingredient_handling', label: 'Selecciona, manipula y conserva ingredientes', maxScore: 1.50 },
    { id: 'timing_control', label: 'Controla los tiempos de cocción', maxScore: 1.00 },
    { id: 'hygiene_safety', label: 'Mantiene normas de higiene y seguridad', maxScore: 1.50 },
    { id: 'coordination', label: 'Coordina el trabajo con compañeros', maxScore: 1.00 },
    { id: 'error_identification', label: 'Identifica errores y propone soluciones', maxScore: 1.00 },
    { id: 'teamwork', label: 'Trabajo en equipo y actitud activa', maxScore: 1.00 },
    { id: 'waste_management', label: 'Gestiona ingredientes sobrantes (minimiza desperdicio)', maxScore: 2.00 },
];

export const INDIVIDUAL_EVALUATION_ITEMS = [
    { id: 'machinery_startup', label: 'Puesta en marcha de maquinaria', maxScore: 0.50 },
    { id: 'mise_en_place', label: 'Realización de mise-en-place', maxScore: 1.00 },
    { id: 'read_recipes', label: 'Interpretación de fichas técnicas', maxScore: 1.50 },
    { id: 'required_material', label: 'Asistencia con material requerido', maxScore: 1.00 },
    { id: 'task_execution', label: 'Ejecución de tareas y técnicas', maxScore: 1.00 },
    { id: 'clean_work', label: 'Trabajo limpio y ordenado', maxScore: 1.00 },
    { id: 'teamwork_attitude', label: 'Trabajo en equipo y actitud activa', maxScore: 1.50 },
    { id: 'conservation_techniques', label: 'Aplicación de técnicas de conservación', maxScore: 0.50 },
    { id: 'equipment_cleaning', label: 'Limpieza y mantenimiento de equipos', maxScore: 1.00 },
    { id: 'personal_hygiene', label: 'Higiene personal y uniforme', maxScore: 1.00 },
];

// Centralized weights for service grade calculations
export const SERVICE_GRADE_WEIGHTS = {
    individual: 0.6,
    group: 0.4,
};


// --- New Constants for Practical Exams ---

export const SCORE_LEVELS = [
    { label: 'Excelente', value: 10, color: 'bg-green-500', hoverColor: 'bg-green-600' },
    { label: 'Notable', value: 8, color: 'bg-blue-500', hoverColor: 'bg-blue-600' },
    { label: 'Aprobado', value: 5, color: 'bg-yellow-500', hoverColor: 'bg-yellow-600' },
    { label: 'Insuficiente', value: 2, color: 'bg-red-500', hoverColor: 'bg-red-600' },
];

export const PRACTICAL_EXAM_RUBRIC = [
    {
        id: 'ra1',
        name: 'R.A.1 – Organización de procesos',
        weight: 0.20, // 20%
        criteria: [
            { id: 'c1_1', name: 'Planificación y mise en place' },
            { id: 'c1_2', name: 'Orden, limpieza y conservación' },
        ],
    },
    {
        id: 'ra2',
        name: 'R.A.2 – Técnicas culinarias tradicionales y avanzadas',
        weight: 0.30, // 30%
        criteria: [
            { id: 'c2_1', name: 'Aplicación de técnicas básicas' },
            { id: 'c2_2', name: 'Aplicación de técnicas avanzadas' },
            { id: 'c2_3', name: 'Evaluación del resultado final' },
        ],
    },
    {
        id: 'ra3',
        name: 'R.A.3 – Elaboración a partir de materias primas',
        weight: 0.30, // 30%
        criteria: [
            { id: 'c3_1', name: 'Creatividad y propuestas' },
            { id: 'c3_2', name: 'Aprovechamiento de recursos' },
            { id: 'c3_3', name: 'Organización y ejecución' },
        ],
    },
    {
        id: 'ra4',
        name: 'R.A.4 – Necesidades alimenticias específicas',
        weight: 0.20, // 20%
        criteria: [
            { id: 'c4_1', name: 'Identificación y selección de alimentos' },
            { id: 'c4_2', name: 'Prevención de contaminación cruzada' },
            { id: 'c4_3', name: 'Resultado final y justificación' },
        ],
    },
];

// --- New Constants for Academic Management ---

export const COURSE_MODULES: { name: string; trimesters: number }[] = [
    { name: 'Ofertas gastronómicas', trimesters: 2 },
    { name: 'Optativa', trimesters: 2 },
    { name: 'Postres en restauración', trimesters: 2 },
    { name: 'Itinerario personal para la Empleabilidad II', trimesters: 2 },
    { name: 'Proyecto', trimesters: 3 },
    { name: 'Sostenibilidad aplicada al sistema productivo', trimesters: 2 },
];


export const ACADEMIC_EVALUATION_STRUCTURE = {
  periods: [
    {
      key: "t1",
      name: "1º Trimestre",
      instruments: [
        { name: "Examen 1", type: "manual", key: "examen1", weight: 0.125 }, // 12.5% del curso (25% del trimestre)
        { name: "Examen 2", type: "manual", key: "examen2", weight: 0.125 }, // 12.5% del curso (25% del trimestre)
        { name: "Servicios", type: "calculated", key: "servicios", weight: 0.15 }, // 15% del curso (30% del trimestre)
        { name: "Ex. Práctico", type: "calculated", key: "exPracticoT1", weight: 0.10 }, // 10% del curso (20% del trimestre)
      ]
    },
    {
      key: "t2",
      name: "2º Trimestre",
      instruments: [
        { name: "Examen 1", type: "manual", key: "examen1", weight: 0.125 }, // 12.5% del curso (25% del trimestre)
        { name: "Examen 2", type: "manual", key: "examen2", weight: 0.125 }, // 12.5% del curso (25% del trimestre)
        { name: "Servicios", type: "calculated", key: "servicios", weight: 0.15 }, // 15% del curso (30% del trimestre)
        { name: "Ex. Práctico", type: "calculated", key: "exPracticoT2", weight: 0.10 }, // 10% del curso (20% del trimestre)
      ]
    },
    {
      key: "rec",
      name: "Recuperación",
      instruments: [
        { name: "Examen REC", type: "manual", key: "examenRec", weight: 0.50 },
        { name: "Ex. Práctico REC", type: "calculated", key: "exPracticoRec", weight: 0.50 },
      ]
    }
  ]
};

// --- Configuración de los 8 Retos del Módulo de Proyecto Intermodular ---

export interface RetoTaskConfig {
    id: 'grupal' | 'individual' | 'entrega' | 'diabolica';
    name: string;
    type: 'grupal' | 'individual' | 'entrega';
    maxScore?: number;
    minScore?: number;
    step?: number;
    description?: string;
}

export interface RetoConfig {
    id: string; // 'reto1' ... 'reto8'
    number: number;
    title: string;
    shortTitle: string;
    description: string;
    bloque: 'retos' | 'exposicion';
    tasks: RetoTaskConfig[];
}

export interface ProyectoStructureConfig {
    bloques: {
        retosWeight: number; // 70% (7 puntos)
        exposicionWeight: number; // 30% (3 puntos)
    };
    retos: RetoConfig[];
}

export const DEFAULT_PROYECTO_CONFIG: ProyectoStructureConfig = {
    bloques: {
        retosWeight: 70,
        exposicionWeight: 30,
    },
    retos: [
        {
            id: 'reto1',
            number: 1,
            title: 'Reto 1: Configuración de los proyectos',
            shortTitle: 'R1: Configuración',
            description: 'Tarea Grupal: No tiene nota numérica, solo registro formal de que se ha entregado y fecha.',
            bloque: 'retos',
            tasks: [
                {
                    id: 'entrega',
                    name: 'Entrega de Configuración',
                    type: 'entrega',
                    description: 'Registro de entrega y fecha (sin nota numérica)'
                }
            ]
        },
        {
            id: 'reto2',
            number: 2,
            title: 'Reto 2: Zonas geográficas asignadas',
            shortTitle: 'R2: Zonas Geográficas',
            description: 'Definición de zonas geográficas para la propuesta gastronómica (1.0 pto total: 0.5 grupal + 0.5 individual).',
            bloque: 'retos',
            tasks: [
                { id: 'grupal', name: 'Tarea Grupal', type: 'grupal', maxScore: 0.5, step: 0.05 },
                { id: 'individual', name: 'Tarea Individual', type: 'individual', maxScore: 0.5, step: 0.05 }
            ]
        },
        {
            id: 'reto3',
            number: 3,
            title: 'Reto 3: Diseño de la Carta Sostenible y Fichas Culinarias',
            shortTitle: 'R3: Carta y Fichas',
            description: 'Diseño integral de la carta sostenible y fichas culinarias (2.0 ptos total: 1.0 grupal + 1.0 individual).',
            bloque: 'retos',
            tasks: [
                { id: 'grupal', name: 'Tarea Grupal', type: 'grupal', maxScore: 1.0, step: 0.1 },
                { id: 'individual', name: 'Tarea Individual', type: 'individual', maxScore: 1.0, step: 0.1 }
            ]
        },
        {
            id: 'reto4',
            number: 4,
            title: 'Reto 4: Entrega Intermedia del proyecto',
            shortTitle: 'R4: Entrega Intermedia',
            description: 'Memoria y estado de avance intermedio del proyecto (1.0 pto grupal).',
            bloque: 'retos',
            tasks: [
                { id: 'grupal', name: 'Tarea Grupal', type: 'grupal', maxScore: 1.0, step: 0.1 }
            ]
        },
        {
            id: 'reto5',
            number: 5,
            title: 'Reto 5: Escandallos, Justificación Gastronómica y Análisis de Costes',
            shortTitle: 'R5: Escandallos y Costes',
            description: 'Cálculo de costes, escandallos y viabilidad económica (2.0 ptos total: 1.0 grupal + 1.0 individual).',
            bloque: 'retos',
            tasks: [
                { id: 'grupal', name: 'Tarea Grupal', type: 'grupal', maxScore: 1.0, step: 0.1 },
                { id: 'individual', name: 'Tarea Individual', type: 'individual', maxScore: 1.0, step: 0.1 }
            ]
        },
        {
            id: 'reto6',
            number: 6,
            title: 'Reto 6: Evaluación Diabólica (Coevaluación)',
            shortTitle: 'R6: Coevaluación Diabólica',
            description: 'Valoración cruzada individual entre compañeros de equipo (hasta +/- 1 punto de ajuste).',
            bloque: 'retos',
            tasks: [
                { id: 'diabolica', name: 'Ajuste Individual Coevaluación', type: 'individual', minScore: -1.0, maxScore: 1.0, step: 0.1, description: 'Hasta +/- 1 punto' }
            ]
        },
        {
            id: 'reto7',
            number: 7,
            title: 'Reto 7: Entrega Final del proyecto',
            shortTitle: 'R7: Entrega Final Memoria',
            description: 'Entrega definitiva y completa de la memoria del proyecto (1.0 pto grupal).',
            bloque: 'retos',
            tasks: [
                { id: 'grupal', name: 'Tarea Grupal (Memoria Final)', type: 'grupal', maxScore: 1.0, step: 0.1 }
            ]
        },
        {
            id: 'reto8',
            number: 8,
            title: 'Reto 8: Exposición de proyecto',
            shortTitle: 'R8: Exposición (30%)',
            description: 'Defensa oral y exposición individual del proyecto (3.0 ptos individuales = 30% de la nota final).',
            bloque: 'exposicion',
            tasks: [
                { id: 'individual', name: 'Nota Individual Exposición', type: 'individual', maxScore: 3.0, step: 0.1 }
            ]
        }
    ]
};
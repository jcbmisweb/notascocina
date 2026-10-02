export interface FinalExamCriterion {
    id: string;
    sectionId: string;
    name: string;
    type: 'Objetivo' | 'Subjetivo';
    maxScore: number;
    description: string;
}

export interface FinalExamSection {
    id: string;
    title: string;
    type: 'Objetivo' | 'Subjetivo';
    totalMaxScore: number;
    criteria: FinalExamCriterion[];
}

export const FINAL_EXAM_SECTIONS: FinalExamSection[] = [
    {
        id: 'sec1',
        title: 'I. PREPARACIÓN - CRITERIOS OBJETIVOS',
        type: 'Objetivo',
        totalMaxScore: 19,
        criteria: [
            {
                id: 'prep_obj_higiene_personal',
                sectionId: 'sec1',
                name: 'Higiene Personal',
                description: 'Manos, no probar con dedos, malos hábitos, uniforme limpio y correcto',
                type: 'Objetivo',
                maxScore: 6
            },
            {
                id: 'prep_obj_higiene_partida',
                sectionId: 'sec1',
                name: 'Higiene de Partida',
                description: 'Suelo, nevera, tabla de cortar, mesa de trabajo, fogón',
                type: 'Objetivo',
                maxScore: 4
            },
            {
                id: 'prep_obj_desperdicios',
                sectionId: 'sec1',
                name: 'Desperdicios',
                description: 'Gestión y manipulación de materias primas. Aprovechamiento y mermas',
                type: 'Objetivo',
                maxScore: 4
            },
            {
                id: 'prep_obj_tiempo_servicio',
                sectionId: 'sec1',
                name: 'Tiempo de Servicio',
                description: 'Cumplimiento del horario. Más de 15 min de retraso = 0 pts',
                type: 'Objetivo',
                maxScore: 4
            },
            {
                id: 'prep_obj_temperatura_servicio',
                sectionId: 'sec1',
                name: 'Temperatura de Servicio',
                description: 'La adecuada a la naturaleza del plato',
                type: 'Objetivo',
                maxScore: 1
            }
        ]
    },
    {
        id: 'sec2',
        title: 'II. PREPARACIÓN - CRITERIOS SUBJETIVOS',
        type: 'Subjetivo',
        totalMaxScore: 21,
        criteria: [
            {
                id: 'prep_subj_eficiencia_destrezas',
                sectionId: 'sec2',
                name: 'Eficiencia y Destrezas Demostradas',
                description: 'Habilidad/precisión en cortes y preelaboraciones, variedad de técnicas',
                type: 'Subjetivo',
                maxScore: 15
            },
            {
                id: 'prep_subj_organizacion_planning',
                sectionId: 'sec2',
                name: 'Organización y Planning',
                description: 'Capacidad de planificación, secuencia lógica y orden en la comanda',
                type: 'Subjetivo',
                maxScore: 6
            }
        ]
    },
    {
        id: 'sec3',
        title: 'III. PRESENTACIÓN - CRITERIOS OBJETIVOS',
        type: 'Objetivo',
        totalMaxScore: 10,
        criteria: [
            {
                id: 'pres_obj_cortes',
                sectionId: 'sec3',
                name: 'Cortes',
                description: 'Apropiados, limpios, iguales y elegantes',
                type: 'Objetivo',
                maxScore: 3
            },
            {
                id: 'pres_obj_equilibrio_proporcional',
                sectionId: 'sec3',
                name: 'Equilibrio Proporcional',
                description: 'Correcto tamaño de las guarniciones y del género principal',
                type: 'Objetivo',
                maxScore: 6
            },
            {
                id: 'pres_obj_salseo',
                sectionId: 'sec3',
                name: 'Salseo',
                description: 'Trazados limpios en el salseo, sin manchas, napa y brillo',
                type: 'Objetivo',
                maxScore: 1
            }
        ]
    },
    {
        id: 'sec4',
        title: 'IV. PRESENTACIÓN Y DEGUSTACIÓN - CRITERIOS SUBJETIVOS',
        type: 'Subjetivo',
        totalMaxScore: 50,
        criteria: [
            {
                id: 'pres_subj_colores_brillo_volumen',
                sectionId: 'sec4',
                name: 'Colores, Brillo, Volumen y Distribución Espacial',
                description: 'Estética y armonía visual',
                type: 'Subjetivo',
                maxScore: 5
            },
            {
                id: 'pres_subj_estilo_creatividad',
                sectionId: 'sec4',
                name: 'Estilo y Creatividad',
                description: 'Presentación original, profesional y sello personal',
                type: 'Subjetivo',
                maxScore: 6
            },
            {
                id: 'pres_subj_textura_temperatura',
                sectionId: 'sec4',
                name: 'Textura y Temperatura en Boca',
                description: 'Puntos de cocción óptimos y textura idónea',
                type: 'Subjetivo',
                maxScore: 14
            },
            {
                id: 'pres_subj_armonia_gustos',
                sectionId: 'sec4',
                name: 'Armonía de Gustos',
                description: 'Equilibrio de sabores y combinación organoléptica',
                type: 'Subjetivo',
                maxScore: 15
            },
            {
                id: 'pres_subj_sabor',
                sectionId: 'sec4',
                name: 'Sabor',
                description: 'Potencia, sazón e identidad gastronómica global',
                type: 'Subjetivo',
                maxScore: 10
            }
        ]
    }
];

export interface ChecklistGroup {
    id: string;
    title: string;
    items: { id: string; label: string }[];
}

export const FINAL_EXAM_CHECKLIST: ChecklistGroup[] = [
    {
        id: 'chk_metodos',
        title: '3 Métodos de Cocinado',
        items: [
            { id: 'metodo_mismo_genero_2', label: '2 mismo género' },
            { id: 'metodo_otro_1', label: '1 otro' }
        ]
    },
    {
        id: 'chk_salsa_guarniciones',
        title: 'Salsa + 2 Guarniciones en plato principal',
        items: [
            { id: 'salsa_realizada', label: 'Salsa realizada' },
            { id: 'dos_guarniciones', label: '2 Guarniciones' }
        ]
    },
    {
        id: 'chk_ingrediente',
        title: 'Ingrediente Obligatorio del Curso',
        items: [
            { id: 'ingrediente_fijado', label: 'Ingrediente fijado' }
        ]
    }
];

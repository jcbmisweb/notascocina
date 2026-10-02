export interface HelpStep {
    number: number;
    title: string;
    description: string;
}

export interface FAQItem {
    id: string;
    category: 'examenes' | 'servicios' | 'alumnos' | 'calificaciones' | 'general';
    question: string;
    answer: string;
    relatedView?: string;
    tips?: string[];
}

export interface ViewHelpGuide {
    viewKey: string;
    title: string;
    subtitle: string;
    purpose: string;
    whereToPutThings: string[];
    steps: HelpStep[];
    faqs: FAQItem[];
    troubleshooting: { problem: string; solution: string }[];
}

export const VIEW_HELP_GUIDES: Record<string, ViewHelpGuide> = {
    'pc-instrumentos': {
        viewKey: 'pc-instrumentos',
        title: 'Instrumentos de Evaluación y Exámenes Teóricos',
        subtitle: 'Módulo Productos Culinarios',
        purpose: 'Aquí es donde se ponen las notas de Exámenes Teóricos, Trabajos Escritos y cualquier otra actividad evaluable que no sea servicio de restaurante.',
        whereToPutThings: [
            'Para poner notas de un examen: haz clic sobre el instrumento (ejemplo: "Examen") para desplegarlo.',
            'Verás la tabla con todos los alumnos y las columnas de cada actividad (ej. "Examen 1 (T1)").',
            'Escribe la nota directamente en la casilla (de 0 a 10). Se guarda automáticamente.',
            'Puedes rellenar "Nota", "Rec 1" y "Rec 2". El sistema toma automáticamente la nota más alta.'
        ],
        steps: [
            { number: 1, title: 'Desplegar el Instrumento', description: 'Localiza el instrumento que deseas evaluar (ej. "Examen" o "Trabajos") y haz clic sobre él para abrir la tabla de calificaciones.' },
            { number: 2, title: 'Comprobar el Candado', description: 'En la cabecera de la columna verás un candado. Si está verde (abierto 🔓), puedes escribir libremente. Si estuviera rojo (cerrado 🔒), simplemente pulsa sobre el candado para desbloquearlo.' },
            { number: 3, title: 'Introducir Notas', description: 'Escribe las notas de cada alumno. Si tienes las notas en una hoja de Excel, puedes copiarlas y pegarlas directamente con Ctrl+V sobre la primera celda.' },
            { number: 4, title: 'Recuperaciones', description: 'Usa las columnas Rec 1 y Rec 2 para registrar segundas oportunidades. La columna "Final" seleccionará la calificación superior.' }
        ],
        faqs: [
            {
                id: 'inst-1',
                category: 'examenes',
                question: '¿Dónde se ponen las notas de los exámenes teóricos o escritos?',
                answer: 'En esta misma pantalla (Instrumentos). Busca el instrumento llamado "Examen", haz clic en él para desplegar el desglose y escribe las calificaciones en las columnas de cada examen (Examen 1, Examen 2, etc.).'
            },
            {
                id: 'inst-2',
                category: 'examenes',
                question: '¿Por qué no me deja escribir en las casillas o están bloqueadas?',
                answer: 'Ocurre cuando la columna tiene el candado cerrado (icono rojo 🔒). Para poder escribir, haz clic en el candado situado en la cabecera de la columna correspondiente para ponerlo en verde (abierto 🔓). También dispones de un botón rápido "Abrir todos los candados".'
            },
            {
                id: 'inst-3',
                category: 'examenes',
                question: '¿Por qué algunos instrumentos dicen "Nota Calculada"?',
                answer: 'Instrumentos como "Servicios" o "Exámenes Prácticos" calculan sus notas automáticamente desde sus propios módulos especializados y no se editan a mano aquí.'
            }
        ],
        troubleshooting: [
            { problem: 'No puedo teclear notas en una columna.', solution: 'El candado de esa columna está cerrado. Pulsa el icono del candado en la cabecera para abrirlo (🔓).' },
            { problem: 'Copio notas de Excel pero no se pegan bien.', solution: 'Asegúrate de seleccionar la primera celda del primer alumno y pulsa Ctrl+V. Los números deben estar entre 0 y 10.' }
        ]
    },
    'optativa-instrumentos': {
        viewKey: 'optativa-instrumentos',
        title: 'Instrumentos de Evaluación - Optativa',
        subtitle: 'Cocina Sostenible',
        purpose: 'Calificación de actividades, tareas y exámenes del módulo optativo.',
        whereToPutThings: [
            'Despliega el instrumento haciendo clic sobre su tarjeta.',
            'Introduce notas en las columnas abiertas (verde 🔓).'
        ],
        steps: [
            { number: 1, title: 'Seleccionar Instrumento', description: 'Haz clic en el instrumento que quieras calificar.' },
            { number: 2, title: 'Escribir Calificaciones', description: 'Rellena notas ordinarias y recuperaciones.' }
        ],
        faqs: [
            {
                id: 'opt-inst-1',
                category: 'examenes',
                question: '¿Cómo se registran las recuperaciones?',
                answer: 'En las columnas Rec 1 y Rec 2 de cada actividad evaluable.'
            }
        ],
        troubleshooting: [
            { problem: 'No puedo escribir.', solution: 'Comprueba que el candado de la columna esté en verde (abierto).' }
        ]
    },
    'proyecto-instrumentos': {
        viewKey: 'proyecto-instrumentos',
        title: 'Instrumentos de Evaluación - Proyecto Intermodular',
        subtitle: 'Gestión de Entregas y Fases del Proyecto',
        purpose: 'Evaluación de las memorias, defensas y entregas del proyecto.',
        whereToPutThings: [
            'Despliega las fases o instrumentos del proyecto para calificar a los alumnos.'
        ],
        steps: [
            { number: 1, title: 'Abrir Instrumento', description: 'Haz clic sobre el instrumento para ver la matriz de alumnos.' },
            { number: 2, title: 'Calificar', description: 'Asegúrate de que los candados estén en verde y pon las notas.' }
        ],
        faqs: [],
        troubleshooting: []
    },
    'pc-calificaciones': {
        viewKey: 'pc-calificaciones',
        title: 'Resumen y Control de Servicios y Prácticas',
        subtitle: 'Módulo Productos Culinarios',
        purpose: 'Supervisión integral de las 3 patas del bloque práctico: Servicios de cocina, Días Previos y Prácticas Diarias (Semanal).',
        whereToPutThings: [
            'Pestaña 1 (Servicio): Consulta las notas de servicios reales y las columnas de media trimestral (Media Serv. T1, T2, T3).',
            'Pestaña 2 (Día Previo): Evalúa asistencia, actitud, higiene y trabajo previo al servicio.',
            'Pestaña 3 (Semanal / Prácticas Diarias): Crea y califica las prácticas de taller diarias entre semana.'
        ],
        steps: [
            { number: 1, title: 'Comprender la Media Trimestral', description: 'La nota de "Media Serv. T1/T2/T3" promedia exactamente las 3 partes: Servicios + Días Previos + Prácticas Semanales.' },
            { number: 2, title: 'Añadir Práctica Semanal', description: 'Ve a la Pestaña 3 y pulsa "+ Nueva Práctica de Taller" para registrar el trabajo diario.' },
            { number: 3, title: 'Eliminar Prácticas', description: 'Si necesitas borrar una práctica semanal, usa el botón "Eliminar" en rojo. El sistema te pedirá confirmación dos veces para tu seguridad.' }
        ],
        faqs: [
            {
                id: 'cal-1',
                category: 'servicios',
                question: '¿Cómo se obtiene la nota final de servicios de cada trimestre?',
                answer: 'Se calcula haciendo la media aritmética de: 1) Los servicios gastronómicos realizados, 2) Las evaluaciones del día previo de esos servicios, y 3) Las prácticas diarias de taller del trimestre.'
            },
            {
                id: 'cal-2',
                category: 'servicios',
                question: '¿Dónde se reflejan las observaciones que pongo en una práctica o servicio?',
                answer: 'Todas las observaciones y anotaciones individuales se vinculan automáticamente a la Ficha del Alumno, visibles en su historial cronológico.'
            },
            {
                id: 'cal-3',
                category: 'servicios',
                question: '¿Por qué no me dejaba borrar una práctica de taller?',
                answer: 'Ahora cuenta con doble confirmación de seguridad y un botón directo tanto en el listado lateral como en la cabecera de la práctica activa.'
            }
        ],
        troubleshooting: [
            { problem: 'Un alumno no tiene nota en un servicio.', solution: 'Comprueba si en la Gestión Práctica se le marcó como Ausente (AUS) o si su partida fue calificada.' }
        ]
    },
    'pc-gestion-practica': {
        viewKey: 'pc-gestion-practica',
        title: 'Gestión Práctica de Servicios de Restaurante',
        subtitle: 'Planificación de Menús, Brigadas y Calificación',
        purpose: 'Configurar el menú de cada servicio, asignar alumnos a puestos y partidas (Entrantes, Carnes, Pescados, Postres), y poner notas grupales e individuales.',
        whereToPutThings: [
            'Pestaña "Planificación": Define fecha, menú, fichas técnicas y asigna a cada alumno su puesto o partida.',
            'Pestaña "Evaluación": Califica a cada alumno o partida durante el servicio en tiempo real.',
            'Botón "PDF Puestos y Platos": Descarga e imprime el cuadrante con el menú, platos por área y el reparto de puestos de la brigada.',
            'Botón "PDF Evaluaciones": Descarga el acta con las calificaciones individuales, grupales, notas finales y observaciones del servicio.'
        ],
        steps: [
            { number: 1, title: 'Crear o Seleccionar Servicio', description: 'Crea un nuevo servicio gastronómico con su fecha y nombre.' },
            { number: 2, title: 'Organizar Partidas', description: 'Arrastra o asigna a los alumnos a sus puestos de cocina.' },
            { number: 3, title: 'Descargar Cuadrante PDF', description: 'Usa el botón "PDF Puestos y Platos" para imprimir la hoja de servicio para el taller.' },
            { number: 4, title: 'Evaluar Servicio y Descargar Acta', description: 'Pasa a la pestaña Evaluación, califica a los alumnos y pulsa "PDF Evaluaciones" para guardar el acta.' }
        ],
        faqs: [
            {
                id: 'gp-1',
                category: 'servicios',
                question: '¿Cómo influye la nota del grupo en el alumno?',
                answer: 'La nota del servicio combina la evaluación del puesto/partida grupal (40%) y el desempeño individual del estudiante (60%).'
            },
            {
                id: 'gp-2',
                category: 'servicios',
                question: '¿Cómo descargo los puestos de alumnos y los platos de un servicio?',
                answer: 'En la cabecera del servicio activo, pulsa el botón azul "PDF Puestos y Platos". Te generará un documento en PDF listo para imprimir con la distribución de áreas, platos asignados y los puestos de cada alumno.'
            },
            {
                id: 'gp-3',
                category: 'servicios',
                question: '¿Cómo descargo las calificaciones y evaluaciones del servicio en PDF?',
                answer: 'En la cabecera del servicio, pulsa el botón morado "PDF Evaluaciones". Se descargará un PDF horizontal con el listado de alumnos, asistencia, nota individual (60%), nota grupal (40%), nota final ponderada y las observaciones introducidas.'
            }
        ],
        troubleshooting: [
            { problem: 'No veo a un alumno en el servicio.', solution: 'Verifica en la pestaña Planificación que esté asignado a una partida o grupo de cocina.' }
        ]
    },
    'alumnos': {
        viewKey: 'alumnos',
        title: 'Gestión de Alumnos y Ficha del Estudiante',
        subtitle: 'Listado, Expediente y Seguimiento',
        purpose: 'Administrar los datos de matrícula, fotos, contactos de tutores y consultar el historial completo de notas, conducta y anotaciones de cada alumno.',
        whereToPutThings: [
            'Botón "Ver Ficha" (o clic en el alumno): Abre la ficha individual detallada.',
            'Botón "Añadir Alumno": Registra a un nuevo alumno manualmente.',
            'Botón "Importar": Carga el listado oficial de alumnos desde un archivo Excel.'
        ],
        steps: [
            { number: 1, title: 'Entrar a la Ficha', description: 'Haz clic en cualquier alumno de la tabla para abrir su expediente completo.' },
            { number: 2, title: 'Historial Unificado', description: 'En la pestaña "Historial y Conducta" verás todas las anotaciones de Servicios, Días Previos, Taller y Salidas ordenadas por fecha.' },
            { number: 3, title: 'Subir Fotografía', description: 'En la ficha, pulsa sobre el avatar para cargar la foto del alumno.' }
        ],
        faqs: [
            {
                id: 'alum-1',
                category: 'alumnos',
                question: '¿Dónde puedo ver todas las anotaciones y conductas que le he puesto a un alumno?',
                answer: 'Entra a Alumnos, abre la ficha del alumno que quieras y navega a la sección de "Historial". Ahí aparecen todas las observaciones de servicios, prácticas de taller e incidencias.'
            },
            {
                id: 'alum-2',
                category: 'alumnos',
                question: '¿Cómo calculo la nota final completa del alumno?',
                answer: 'En la parte superior de la ficha del alumno dispones del desglose completo de notas teóricas, prácticas de servicio y la ponderación global configurada.'
            }
        ],
        troubleshooting: [
            { problem: 'No se ven las notas en la ficha.', solution: 'Asegúrate de haber introducido calificaciones en los respectivos módulos (Instrumentos o Servicios).' }
        ]
    },
    'gestion-academica': {
        viewKey: 'gestion-academica',
        title: 'Gestión Académica y Calificaciones Oficiales',
        subtitle: 'Matriz Curricular y Notas Oficiales',
        purpose: 'Consultar la ponderación oficial por Resultados de Aprendizaje (RAs) y Criterios de Evaluación para emitir actas y boletines de notas.',
        whereToPutThings: [
            'Filtra por módulo (PC, Optativa, Proyecto) y trimestre.',
            'Revisa el cumplimiento de criterios mínimos y notas ponderadas.'
        ],
        steps: [
            { number: 1, title: 'Seleccionar Módulo', description: 'Elige el módulo educativo que deseas revisar.' },
            { number: 2, title: 'Exportar Actas', description: 'Usa los botones de PDF o Excel para generar los informes oficiales del centro.' }
        ],
        faqs: [
            {
                id: 'ga-1',
                category: 'calificaciones',
                question: '¿Cómo se relacionan los RAs con los exámenes y servicios?',
                answer: 'Cada instrumento de evaluación y cada servicio tiene asociados uno o varios Criterios de Evaluación que alimentan los Resultados de Aprendizaje.'
            }
        ],
        troubleshooting: [
            { problem: 'La nota final aparece vacía o guión (-).', solution: 'Verifica que hayas evaluado todos los instrumentos requeridos para ese trimestre.' }
        ]
    },
    'pc-examenes-practicos': {
        viewKey: 'pc-examenes-practicos',
        title: 'Exámenes Prácticos de Cocina',
        subtitle: 'Evaluación Técnica en Taller',
        purpose: 'Evaluar en directo las pruebas prácticas de cocina mediante rúbricas (técnica, higiene, punto de cocción, emplatado, orden).',
        whereToPutThings: [
            'Selecciona el alumno a la izquierda.',
            'Marca las puntuaciones en cada uno de los ítems de la rúbrica.',
            'Usa el "Modo Foco" si estás en tablet o móvil para evaluar sin distracciones.'
        ],
        steps: [
            { number: 1, title: 'Elegir Periodo', description: 'Selecciona 1T, 2T, 3T o Recuperación.' },
            { number: 2, title: 'Calificar Rúbrica', description: 'Puntúa cada bloque técnico del examen.' }
        ],
        faqs: [],
        troubleshooting: []
    },
    'pc-exam-scheduler': {
        viewKey: 'pc-exam-scheduler',
        title: 'Planificador de Exámenes Prácticos Escalonados',
        subtitle: 'Turnos y Horarios de Cocina',
        purpose: 'Calcular automáticamente los turnos de entrada escalonada de los alumnos a los puestos de trabajo del taller de cocina.',
        whereToPutThings: [
            'Introduce la hora de inicio, puestos disponibles y duración de la prueba.',
            'Imprime la hoja de turnos para el tablón de anuncios.'
        ],
        steps: [
            { number: 1, title: 'Configurar Tiempos', description: 'Define duración de la prueba e intervalo de desfase entre alumnos.' },
            { number: 2, title: 'Generar e Imprimir', description: 'Genera el cuadrante horario para los estudiantes.' }
        ],
        faqs: [],
        troubleshooting: []
    },
    'pc-salidas-entradas': {
        viewKey: 'pc-salidas-entradas',
        title: 'Registro de Salidas y Entradas',
        subtitle: 'Control de Presencia en Taller',
        purpose: 'Registrar salidas del aula o taller (aseo, almacén, enfermería, etc.) con cronómetro de tiempo transcurrido.',
        whereToPutThings: [
            'Selecciona el alumno y el motivo de salida.',
            'Pulsa "Registrar Salida". Al regresar, pulsa "Registrar Entrada".'
        ],
        steps: [
            { number: 1, title: 'Registrar Salida', description: 'Elige el alumno y el motivo. El temporizador comenzará a contar.' },
            { number: 2, title: 'Finalizar', description: 'Pulsa el botón de regreso para cerrar el registro.' }
        ],
        faqs: [],
        troubleshooting: []
    },
    'gestion-app': {
        viewKey: 'gestion-app',
        title: 'Gestión de la Aplicación y Datos',
        subtitle: 'Configuración, Respaldo y Usuarios',
        purpose: 'Administrar la configuración del centro educativo, nombres de profesores, sincronización con Firebase y copias de seguridad de datos.',
        whereToPutThings: [
            'Datos del Centro: Nombre del instituto y profesor para las cabeceras de PDF.',
            'Copia de Seguridad: Exportar o restaurar todos los datos de la app en formato JSON.'
        ],
        steps: [
            { number: 1, title: 'Datos Docentes', description: 'Rellena el nombre del profesor y del centro para que salgan en los informes oficiales.' },
            { number: 2, title: 'Respaldo', description: 'Descarga periódicamente una copia de seguridad JSON desde esta pantalla.' }
        ],
        faqs: [],
        troubleshooting: []
    },
    'dashboard': {
        viewKey: 'dashboard',
        title: 'Panel de Control Principal (Dashboard)',
        subtitle: 'Visión General del Curso',
        purpose: 'Acceso directo a todos los módulos docentes, resumen de estadísticas del grupo y accesos rápidos.',
        whereToPutThings: [
            'Usa las tarjetas de navegación para entrar a los módulos PC, Optativa o Proyecto.',
            'Consulta métricas generales de alumnos matriculados y evaluaciones activas.'
        ],
        steps: [
            { number: 1, title: 'Elegir Módulo', description: 'Haz clic en el módulo deseado para acceder a su currículo e instrumentos.' },
            { number: 2, title: 'Ayuda Contextual', description: 'En cualquier momento puedes pulsar la bombilla 💡 superior para resolver dudas de la pantalla activa.' }
        ],
        faqs: [],
        troubleshooting: []
    }
};

export const ALL_GENERAL_FAQS: FAQItem[] = [
    {
        id: 'faq-gen-1',
        category: 'examenes',
        question: '¿Dónde pongo las notas de los exámenes teóricos o escritos?',
        answer: 'En el menú lateral, abre el módulo correspondiente (ej: Módulo PC) y entra en "Instrumentos". Despliega el instrumento llamado "Examen" y verás la tabla de alumnos con las columnas de cada examen (Examen 1, Examen 2, etc.) listas para escribir la nota.',
        tips: ['Recuerda que si un candado está en rojo (cerrado 🔒), solo tienes que hacer clic sobre él para abrirlo (verde 🔓) y escribir.']
    },
    {
        id: 'faq-gen-2',
        category: 'examenes',
        question: '¿Por qué no me dejaba escribir en una casilla de notas?',
        answer: 'Porque la columna tenía el candado cerrado para proteger los datos. En la cabecera de la columna de notas hay un icono de candado: verde = abierto (puedes editar), rojo = cerrado (bloqueado). Haz clic en el candado para desbloquear la columna y listo.',
        tips: ['Los candados ahora vienen abiertos por defecto para evitar bloqueos innecesarios.']
    },
    {
        id: 'faq-gen-3',
        category: 'servicios',
        question: '¿Cómo se calcula la nota que sale en el bloque de Servicios (Media Serv. T1, T2, T3)?',
        answer: 'Es la media aritmética entre las tres fuentes prácticas evaluadas durante el trimestre: 1) Notas de los Servicios gastronómicos de restaurante, 2) Evaluaciones del Día Previo de esos servicios (actitud, higiene, mise en place), y 3) Notas de las Prácticas Diarias de taller semanales.',
        tips: ['Si de alguna de las tres fuentes no hay datos registrados en ese trimestre, el sistema promedia las existentes.']
    },
    {
        id: 'faq-gen-4',
        category: 'servicios',
        question: '¿Dónde puedo ver todas las anotaciones y conductas que le pongo a un alumno en el taller?',
        answer: 'En la sección "Alumnos", haz clic en "Ver Ficha" del estudiante que desees. En su ficha individual, la sección de historial cronológico recoge automáticamente todas las observaciones y notas de conducta de Servicios, Días Previos, Taller Semanal y Salidas del aula.',
        tips: ['Aparecen ordenadas por fecha reciente para que tengas un expediente disciplinar y de progreso impecable.']
    },
    {
        id: 'faq-gen-5',
        category: 'servicios',
        question: '¿Cómo elimino una práctica de taller si me equivoqué o se canceló?',
        answer: 'Entra en "Resumen Servicios", ve a la pestaña 3 "Semanal / Prácticas Diarias" y pulsa el botón "Eliminar" en rojo. El sistema te preguntará dos veces para confirmar que estás seguro y eliminarla sin riesgo de error accidental.',
        tips: ['El botón de eliminar está disponible tanto en la lista de la izquierda como en la cabecera de la práctica activa.']
    },
    {
        id: 'faq-gen-6',
        category: 'general',
        question: '¿Mis datos se guardan solos o tengo que darle a algún botón?',
        answer: 'La aplicación guarda automáticamente cualquier cambio en la base de datos de la nube en tiempo real (verás el distintivo "Nube Conectada" en la barra superior). No hace falta pulsar "Guardar".',
        tips: ['Si en algún momento no tienes conexión, la app guardará los cambios en tu navegador y los subirá en cuanto vuelva la red.']
    },
    {
        id: 'faq-gen-7',
        category: 'alumnos',
        question: '¿Cómo puedo importar la lista completa de alumnos desde un Excel?',
        answer: 'Entra en "Alumnos" y haz clic en el botón superior "Importar". Puedes subir un archivo Excel (.xlsx) o CSV con las columnas de Nombre, Apellidos, NRE y Grupo para cargar toda la clase en un segundo.',
        tips: ['La aplicación detecta automáticamente las cabeceras habituales de las plataformas educativas.']
    },
    {
        id: 'faq-gen-8',
        category: 'calificaciones',
        question: '¿Dónde se configuran las ponderaciones de los exámenes y los servicios?',
        answer: 'En el módulo deseado, entra en "Instrumentos" y haz clic en "Editar Ponderaciones". Ahí puedes ajustar el porcentaje de cada instrumento (por ejemplo: Exámenes 30%, Servicios 50%, Trabajos 20%). El total debe sumar 100%.',
        tips: ['El sistema te indicará con colores si la suma actual es menor, igual o superior al 100%.']
    }
];

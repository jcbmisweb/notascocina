import { ResultadoAprendizaje, CriterioEvaluacion, UnidadTrabajo, InstrumentoEvaluacion } from '../types';

export const proyectoResultadosAprendizaje: Record<string, ResultadoAprendizaje> = {
  "proy_ra1": { id: "proy_ra1", nombre: "R.A.1. Analizar y caracterizar las empresas del sector según su estructura organizativa y la naturaleza de sus productos o servicios.", descripcion: "", competencias: [], criteriosEvaluacion: ["proy_1a", "proy_1b", "proy_1c", "proy_1d", "proy_1e", "proy_1f", "proy_1g", "proy_1h", "proy_1i"], ponderacion: 11 },
  "proy_ra2": { id: "proy_ra2", nombre: "R.A.2. Proponer soluciones viables a las necesidades del sector, considerando costes y desarrollando un proyecto básico.", descripcion: "", competencias: [], criteriosEvaluacion: ["proy_2a", "proy_2b", "proy_2c", "proy_2d", "proy_2e", "proy_2f", "proy_2g", "proy_2h", "proy_2i", "proy_2j", "proy_2k"], ponderacion: 13 },
  "proy_ra3": { id: "proy_ra3", nombre: "R.A.3. Planificar la ejecución de las actividades derivadas de la solución propuesta, definiendo un plan de intervención y su documentación asociada.", descripcion: "", competencias: [], criteriosEvaluacion: ["proy_3a", "proy_3b", "proy_3c", "proy_3d", "proy_3e", "proy_3f", "proy_3g", "proy_3h", "proy_3i", "proy_3j"], ponderacion: 10 },
  "proy_ra4": { id: "proy_ra4", nombre: "R.A.4. Supervisar la ejecución de las actividades, asegurando el cumplimiento del plan establecido.", descripcion: "", competencias: [], criteriosEvaluacion: ["proy_4a", "proy_4b", "proy_4c", "proy_4d", "proy_4e", "proy_4f", "proy_4g"], ponderacion: 22 },
  "proy_ra5": { id: "proy_ra5", nombre: "R.A.5. Comunicar información de forma clara, ordenada y estructurada, tanto interna como externamente.", descripcion: "", competencias: [], criteriosEvaluacion: ["proy_5a", "proy_5b", "proy_5c", "proy_5d", "proy_5e"], ponderacion: 40 },
  "proy_ra6": { id: "proy_ra6", nombre: "PRODUCTOS CULINARIOS - RA1. Organiza los procesos productivos y de servicio en cocina, interpretando información oral o escrita.", descripcion: "", competencias: [], criteriosEvaluacion: ["proy_6a"], ponderacion: 1 },
  "proy_ra7": { id: "proy_ra7", nombre: "PRODUCTOS CULINARIOS - RA3. Elabora productos culinarios a partir de un conjunto de materias primas, evaluando alternativas creativas y funcionales.", descripcion: "", competencias: [], criteriosEvaluacion: ["proy_7a"], ponderacion: 1 },
  "proy_ra8": { id: "proy_ra8", nombre: "POSTRES EN RESTAURACIÓN - RA7. Presenta postres emplatados a partir de elaboraciones de pastelería y repostería, integrando criterios estéticos y funcionales.", descripcion: "", competencias: [], criteriosEvaluacion: ["proy_8a"], ponderacion: 1 },
  "proy_ra9": { id: "proy_ra9", nombre: "OFERTAS GASTRONÓMICAS - RA4. Calcula el coste global de la oferta gastronómica, analizando y ponderando todas las variables que lo componen.", descripcion: "", competencias: [], criteriosEvaluacion: ["proy_9a"], ponderacion: 1 }
};

export const proyectoCriteriosEvaluacion: Record<string, CriterioEvaluacion> = {
  // RA1 - 11% total
  "proy_1a": { id: "proy_1a", descripcion: "a) Se han identificado los modelos de negocio.", indicadores: [], ponderacion: 27.28, raId: "proy_ra1", asociaciones: [{ id: "asoc_p1a", utId: "proy_ut1", activityIds: ["act_proy_1"] }] },
  "proy_1b": { id: "proy_1b", descripcion: "b) Se ha descrito la estructura organizativa.", indicadores: [], ponderacion: 9.09, raId: "proy_ra1", asociaciones: [{ id: "asoc_p1b", utId: "proy_ut1", activityIds: ["act_proy_1"] }] },
  "proy_1c": { id: "proy_1c", descripcion: "c) Se han definido las funciones.", indicadores: [], ponderacion: 9.09, raId: "proy_ra1", asociaciones: [{ id: "asoc_p1c", utId: "proy_ut1", activityIds: ["act_proy_1"] }] },
  "proy_1d": { id: "proy_1d", descripcion: "d) Se ha especificado el rol y las responsabilidades.", indicadores: [], ponderacion: 9.09, raId: "proy_ra1", asociaciones: [{ id: "asoc_p1d", utId: "proy_ut1", activityIds: ["act_proy_1"] }] },
  "proy_1e": { id: "proy_1e", descripcion: "e) Se ha evaluado el volumen de negocio.", indicadores: [], ponderacion: 9.09, raId: "proy_ra1", asociaciones: [{ id: "asoc_p1e", utId: "proy_ut1", activityIds: ["act_proy_1"] }] },
  "proy_1f": { id: "proy_1f", descripcion: "f) Se ha diseñado una estrategia adecuada.", indicadores: [], ponderacion: 9.09, raId: "proy_ra1", asociaciones: [{ id: "asoc_p1f", utId: "proy_ut1", activityIds: ["act_proy_1"] }] },
  "proy_1g": { id: "proy_1g", descripcion: "g) Se ha valorado la dotación necesaria de recursos.", indicadores: [], ponderacion: 9.09, raId: "proy_ra1", asociaciones: [{ id: "asoc_p1g", utId: "proy_ut1", activityIds: ["act_proy_1"] }] },
  "proy_1h": { id: "proy_1h", descripcion: "h) Se ha implementado un sistema de calidad.", indicadores: [], ponderacion: 9.09, raId: "proy_ra1", asociaciones: [{ id: "asoc_p1h", utId: "proy_ut1", activityIds: ["act_proy_1"] }] },
  "proy_1i": { id: "proy_1i", descripcion: "i) Se ha establecido la relación entre los elementos.", indicadores: [], ponderacion: 9.09, raId: "proy_ra1", asociaciones: [{ id: "asoc_p1i", utId: "proy_ut1", activityIds: ["act_proy_1"] }] },

  // RA2 - 13% total
  "proy_2a": { id: "proy_2a", descripcion: "a) Se han detectado y priorizado las necesidades.", indicadores: [], ponderacion: 23.08, raId: "proy_ra2", asociaciones: [{ id: "asoc_p2a", utId: "proy_ut2", activityIds: ["act_proy_1"] }] },
  "proy_2b": { id: "proy_2b", descripcion: "b) Se han generado, en equipo, propuestas.", indicadores: [], ponderacion: 7.69, raId: "proy_ra2", asociaciones: [{ id: "asoc_p2b", utId: "proy_ut2", activityIds: ["act_proy_1"] }] },
  "proy_2c": { id: "proy_2c", descripcion: "c) Se ha recopilado información relevante.", indicadores: [], ponderacion: 7.69, raId: "proy_ra2", asociaciones: [{ id: "asoc_p2c", utId: "proy_ut2", activityIds: ["act_proy_1"] }] },
  "proy_2d": { id: "proy_2d", descripcion: "d) Se han incorporado elementos viables.", indicadores: [], ponderacion: 7.69, raId: "proy_ra2", asociaciones: [{ id: "asoc_p2d", utId: "proy_ut2", activityIds: ["act_proy_1"] }] },
  "proy_2e": { id: "proy_2e", descripcion: "e) Se ha realizado un análisis de viabilidad.", indicadores: [], ponderacion: 7.69, raId: "proy_ra2", asociaciones: [{ id: "asoc_p2e", utId: "proy_ut2", activityIds: ["act_proy_1"] }] },
  "proy_2f": { id: "proy_2f", descripcion: "f) Se han definido las partes esenciales del proyecto.", indicadores: [], ponderacion: 7.69, raId: "proy_ra2", asociaciones: [{ id: "asoc_p2f", utId: "proy_ut2", activityIds: ["act_proy_1"] }] },
  "proy_2g": { id: "proy_2g", descripcion: "g) Se ha estimado la dotación de recursos.", indicadores: [], ponderacion: 7.69, raId: "proy_ra2", asociaciones: [{ id: "asoc_p2g", utId: "proy_ut2", activityIds: ["act_proy_1"] }] },
  "proy_2h": { id: "proy_2h", descripcion: "h) Se ha elaborado un presupuesto.", indicadores: [], ponderacion: 7.69, raId: "proy_ra2", asociaciones: [{ id: "asoc_p2h", utId: "proy_ut2", activityIds: ["act_proy_1"] }] },
  "proy_2i": { id: "proy_2i", descripcion: "i) Se ha redactado la documentación.", indicadores: [], ponderacion: 7.69, raId: "proy_ra2", asociaciones: [{ id: "asoc_p2i", utId: "proy_ut2", activityIds: ["act_proy_1"] }] },
  "proy_2j": { id: "proy_2j", descripcion: "j) Se han considerado los aspectos legales y de normativa.", indicadores: [], ponderacion: 7.69, raId: "proy_ra2", asociaciones: [{ id: "asoc_p2j", utId: "proy_ut2", activityIds: ["act_proy_1"] }] },
  "proy_2k": { id: "proy_2k", descripcion: "k) Se ha presentado públicamente el proyecto básico.", indicadores: [], ponderacion: 7.71, raId: "proy_ra2", asociaciones: [{ id: "asoc_p2k", utId: "proy_ut2", activityIds: ["act_proy_1"] }] },

  // RA3 - 10% total
  "proy_3a": { id: "proy_3a", descripcion: "a) Se ha establecido una cronología.", indicadores: [], ponderacion: 10, raId: "proy_ra3", asociaciones: [{ id: "asoc_p3a", utId: "proy_ut3", activityIds: ["act_proy_2"] }] },
  "proy_3b": { id: "proy_3b", descripcion: "b) Se han asignado los recursos y la logística.", indicadores: [], ponderacion: 10, raId: "proy_ra3", asociaciones: [{ id: "asoc_p3b", utId: "proy_ut3", activityIds: ["act_proy_2"] }] },
  "proy_3c": { id: "proy_3c", descripcion: "c) Se han identificado los permisos necesarios.", indicadores: [], ponderacion: 10, raId: "proy_ra3", asociaciones: [{ id: "asoc_p3c", utId: "proy_ut3", activityIds: ["act_proy_2"] }] },
  "proy_3d": { id: "proy_3d", descripcion: "d) Se han detectado las actividades críticas.", indicadores: [], ponderacion: 10, raId: "proy_ra3", asociaciones: [{ id: "asoc_p3d", utId: "proy_ut3", activityIds: ["act_proy_2"] }] },
  "proy_3e": { id: "proy_3e", descripcion: "e) Se ha integrado el plan de prevención de riesgos.", indicadores: [], ponderacion: 10, raId: "proy_ra3", asociaciones: [{ id: "asoc_p3e", utId: "proy_ut3", activityIds: ["act_proy_2"] }] },
  "proy_3f": { id: "proy_3f", descripcion: "f) Se han asignado recursos humanos y materiales.", indicadores: [], ponderacion: 10, raId: "proy_ra3", asociaciones: [{ id: "asoc_p3f", utId: "proy_ut3", activityIds: ["act_proy_2"] }] },
  "proy_3g": { id: "proy_3g", descripcion: "g) Se han contemplado posibles contingencias.", indicadores: [], ponderacion: 10, raId: "proy_ra3", asociaciones: [{ id: "asoc_p3g", utId: "proy_ut3", activityIds: ["act_proy_2"] }] },
  "proy_3h": { id: "proy_3h", descripcion: "h) Se han diseñado medidas correctivas.", indicadores: [], ponderacion: 10, raId: "proy_ra3", asociaciones: [{ id: "asoc_p3h", utId: "proy_ut3", activityIds: ["act_proy_2"] }] },
  "proy_3i": { id: "proy_3i", descripcion: "i) Se ha elaborado toda la documentación inicial.", indicadores: [], ponderacion: 10, raId: "proy_ra3", asociaciones: [{ id: "asoc_p3i", utId: "proy_ut3", activityIds: ["act_proy_2"] }] },
  "proy_3j": { id: "proy_3j", descripcion: "j) Se ha elaborado toda la documentación de soporte.", indicadores: [], ponderacion: 10, raId: "proy_ra3", asociaciones: [{ id: "asoc_p3j", utId: "proy_ut3", activityIds: ["act_proy_2"] }] },

  // RA4 - 22% total
  "proy_4a": { id: "proy_4a", descripcion: "a) Se ha definido un procedimiento claro.", indicadores: [], ponderacion: 9.09, raId: "proy_ra4", asociaciones: [{ id: "asoc_p4a", utId: "proy_ut4", activityIds: ["act_proy_3"] }] },
  "proy_4b": { id: "proy_4b", descripcion: "b) Se ha verificado que los resultados cumplen el plan.", indicadores: [], ponderacion: 9.09, raId: "proy_ra4", asociaciones: [{ id: "asoc_p4b", utId: "proy_ut4", activityIds: ["act_proy_3"] }] },
  "proy_4c": { id: "proy_4c", descripcion: "c) Se han detectado desviaciones respecto al plan.", indicadores: [], ponderacion: 4.55, raId: "proy_ra4", asociaciones: [{ id: "asoc_p4c", utId: "proy_ut4", activityIds: ["act_proy_3"] }] },
  "proy_4d": { id: "proy_4d", descripcion: "d) Se ha comunicado oportunamente.", indicadores: [], ponderacion: 4.55, raId: "proy_ra4", asociaciones: [{ id: "asoc_p4d", utId: "proy_ut4", activityIds: ["act_proy_3"] }] },
  "proy_4e": { id: "proy_4e", descripcion: "e) Se han implementado y documentado medidas.", indicadores: [], ponderacion: 4.55, raId: "proy_ra4", asociaciones: [{ id: "asoc_p4e", utId: "proy_ut4", activityIds: ["act_proy_3"] }] },
  "proy_4f": { id: "proy_4f", descripcion: "f) Se ha generado la documentación final de seguimiento.", indicadores: [], ponderacion: 59.08, raId: "proy_ra4", asociaciones: [{ id: "asoc_p4f", utId: "proy_ut4", activityIds: ["act_proy_3"] }] },
  "proy_4g": { id: "proy_4g", descripcion: "g) Se ha evaluado globalmente el resultado.", indicadores: [], ponderacion: 9.09, raId: "proy_ra4", asociaciones: [{ id: "asoc_p4g", utId: "proy_ut4", activityIds: ["act_proy_3"] }] },

  // RA5 - 40% total
  "proy_5a": { id: "proy_5a", descripcion: "a) Se ha mantenido una actitud metódica y estructurada.", indicadores: [], ponderacion: 20, raId: "proy_ra5", asociaciones: [{ id: "asoc_p5a", utId: "proy_ut5", activityIds: ["act_proy_4"] }] },
  "proy_5b": { id: "proy_5b", descripcion: "b) Se ha facilitado comunicación verbal fluida.", indicadores: [], ponderacion: 25, raId: "proy_ra5", asociaciones: [{ id: "asoc_p5b", utId: "proy_ut5", activityIds: ["act_proy_4"] }] },
  "proy_5c": { id: "proy_5c", descripcion: "c) Se ha facilitado comunicación escrita estructurada.", indicadores: [], ponderacion: 20, raId: "proy_ra5", asociaciones: [{ id: "asoc_p5c", utId: "proy_ut5", activityIds: ["act_proy_4"] }] },
  "proy_5d": { id: "proy_5d", descripcion: "d) Se han utilizado herramientas de apoyo a la comunicación.", indicadores: [], ponderacion: 20, raId: "proy_ra5", asociaciones: [{ id: "asoc_p5d", utId: "proy_ut5", activityIds: ["act_proy_4"] }] },
  "proy_5e": { id: "proy_5e", descripcion: "e) Se ha realizado la defensa pública con eficacia.", indicadores: [], ponderacion: 15, raId: "proy_ra5", asociaciones: [{ id: "asoc_p5e", utId: "proy_ut5", activityIds: ["act_proy_4"] }] },

  // RA6 (1%)
  "proy_6a": { id: "proy_6a", descripcion: "a) Identifica y gestiona de forma integral los recursos disponibles.", indicadores: [], ponderacion: 100, raId: "proy_ra6", asociaciones: [{ id: "asoc_p6a", utId: "proy_ut1", activityIds: ["act_proy_1"] }] },
  
  // RA7 (1%)
  "proy_7a": { id: "proy_7a", descripcion: "a) Elabora productos de forma creativa y funcional.", indicadores: [], ponderacion: 100, raId: "proy_ra7", asociaciones: [{ id: "asoc_p7a", utId: "proy_ut2", activityIds: ["act_proy_1"] }] },

  // RA8 (1%)
  "proy_8a": { id: "proy_8a", descripcion: "a) Aplica criterios estéticos y decorativos acordes a las características.", indicadores: [], ponderacion: 100, raId: "proy_ra8", asociaciones: [{ id: "asoc_p8a", utId: "proy_ut2", activityIds: ["act_proy_1"] }] },

  // RA9 (1%)
  "proy_9a": { id: "proy_9a", descripcion: "a) Calcula costes asociados a cada elaboración de cocina y/o repostería.", indicadores: [], ponderacion: 100, raId: "proy_ra9", asociaciones: [{ id: "asoc_p9a", utId: "proy_ut3", activityIds: ["act_proy_2"] }] }
};

export const proyectoUnidadesTrabajo: Record<string, UnidadTrabajo> = {
  "proy_ut1": { id: "proy_ut1", nombre: "Fase 1: Análisis y conceptualización", descripcion: "" },
  "proy_ut2": { id: "proy_ut2", nombre: "Fase 2: Diseño y viabilidad", descripcion: "" },
  "proy_ut3": { id: "proy_ut3", nombre: "Fase 3: Planificación", descripcion: "" },
  "proy_ut4": { id: "proy_ut4", nombre: "Fase 4: Ejecución y supervisión", descripcion: "" },
  "proy_ut5": { id: "proy_ut5", nombre: "Fase 5: Documentación y Defensa", descripcion: "" }
};

export const proyectoInstrumentosEvaluacion: Record<string, InstrumentoEvaluacion> = {
  "proy_inst1": { id: "proy_inst1", nombre: "Memoria del Proyecto", descripcion: "Documento escrito final", activities: [{ id: "act_proy_1", name: "Entrega Memoria", trimester: "t3" }, { id: "act_proy_2", name: "Anexos y Planificación", trimester: "t3" }] },
  "proy_inst2": { id: "proy_inst2", nombre: "Presentación y Defensa", descripcion: "Exposición oral ante tribunal", activities: [{ id: "act_proy_4", name: "Defensa Oral", trimester: "t3" }] },
  "proy_inst3": { id: "proy_inst3", nombre: "Seguimiento", descripcion: "Evaluación continua del tutor", activities: [{ id: "act_proy_3", name: "Control de Seguimiento", trimester: "t3" }] }
};

import { ResultadoAprendizaje, CriterioEvaluacion, UnidadTrabajo, InstrumentoEvaluacion } from '../types';

export const optativaResultadosAprendizaje: Record<string, ResultadoAprendizaje> = {
  "opt_ra1": {
    id: "opt_ra1",
    nombre: "R.A.1. Trabajar con ingredientes que respeten la sostenibilidad y biodiversidad en la cocina.",
    descripcion: "",
    competencias: [],
    criteriosEvaluacion: ["opt_crit1a", "opt_crit1b", "opt_crit1c"],
    ponderacion: 25
  },
  "opt_ra2": {
    id: "opt_ra2",
    nombre: "R.A.2. Reducir el desperdicio y residuo alimentario con técnicas y estrategias de nueva tendencia en cocina sostenible.",
    descripcion: "",
    competencias: [],
    criteriosEvaluacion: ["opt_crit2a", "opt_crit2b", "opt_crit2c", "opt_crit2d", "opt_crit2e"],
    ponderacion: 25
  },
  "opt_ra3": {
    id: "opt_ra3",
    nombre: "R.A.3. Elaborar productos culinarios, seleccionando y aplicando técnicas avanzadas en cocina sostenibles.",
    descripcion: "",
    competencias: [],
    criteriosEvaluacion: ["opt_crit3a", "opt_crit3b", "opt_crit3c", "opt_crit3d", "opt_crit3e", "opt_crit3f"],
    ponderacion: 25
  },
  "opt_ra4": {
    id: "opt_ra4",
    nombre: "R.A.4. Integrar maquinaria innovadora y técnicas sostenibles en la cocina, aplicando los principios de pureza, sencillez y frescura alimentaria.",
    descripcion: "",
    competencias: [],
    criteriosEvaluacion: ["opt_crit4a", "opt_crit4b", "opt_crit4c", "opt_crit4d", "opt_crit4e", "opt_crit4f", "opt_crit4g"],
    ponderacion: 25
  }
};

export const optativaCriteriosEvaluacion: Record<string, CriterioEvaluacion> = {
  "opt_crit1a": { id: "opt_crit1a", descripcion: "a) Se han explicado y aplicado prácticas culinarias que promuevan el bienestar animal y la biodiversidad.", indicadores: [], ponderacion: 9, raId: "opt_ra1", asociaciones: [{ id: "asoc_opt_1a", utId: "opt_ut1", activityIds: ["act_opt_1"] }] },
  "opt_crit1b": { id: "opt_crit1b", descripcion: "b) Se han evaluado los impactos de diferentes prácticas de ganadería y pesca en el bienestar animal y la biodiversidad.", indicadores: [], ponderacion: 8, raId: "opt_ra1", asociaciones: [{ id: "asoc_opt_1b", utId: "opt_ut1", activityIds: ["act_opt_1"] }] },
  "opt_crit1c": { id: "opt_crit1c", descripcion: "c) Se han desarrollado elaboraciones que integren ingredientes respetuosos con la biodiversidad.", indicadores: [], ponderacion: 8, raId: "opt_ra1", asociaciones: [{ id: "asoc_opt_1c", utId: "opt_ut1", activityIds: ["act_opt_1"] }] },

  "opt_crit2a": { id: "opt_crit2a", descripcion: "a) Se han identificado y aplicado técnicas para reducir el desperdicio alimentario en la cocina.", indicadores: [], ponderacion: 5, raId: "opt_ra2", asociaciones: [{ id: "asoc_opt_2a", utId: "opt_ut2", activityIds: ["act_opt_2"] }] },
  "opt_crit2b": { id: "opt_crit2b", descripcion: "b) Se han implementado estrategias eficaces para el manejo y reciclaje de residuos.", indicadores: [], ponderacion: 5, raId: "opt_ra2", asociaciones: [{ id: "asoc_opt_2b", utId: "opt_ut2", activityIds: ["act_opt_2"] }] },
  "opt_crit2c": { id: "opt_crit2c", descripcion: "c) Se ha equilibrado el uso de proteínas vegetales y animales en la planificación de menús.", indicadores: [], ponderacion: 5, raId: "opt_ra2", asociaciones: [{ id: "asoc_opt_2c", utId: "opt_ut2", activityIds: ["act_opt_2"] }] },
  "opt_crit2d": { id: "opt_crit2d", descripcion: "d) Se han promovido prácticas de seguridad alimentaria y dietas saludables.", indicadores: [], ponderacion: 5, raId: "opt_ra2", asociaciones: [{ id: "asoc_opt_2d", utId: "opt_ut2", activityIds: ["act_opt_2"] }] },
  "opt_crit2e": { id: "opt_crit2e", descripcion: "e) Se ha demostrado el conocimiento y la aplicación de la temporada y proximidad en la selección de ingredientes.", indicadores: [], ponderacion: 5, raId: "opt_ra2", asociaciones: [{ id: "asoc_opt_2e", utId: "opt_ut2", activityIds: ["act_opt_2"] }] },

  "opt_crit3a": { id: "opt_crit3a", descripcion: "a) Se han identificado las diferentes técnicas culinarias avanzadas encaminadas a la cocina sostenible: fermentados, cocina al vacío, brasas, liofilización, infusión, etc.", indicadores: [], ponderacion: 5, raId: "opt_ra3", asociaciones: [{ id: "asoc_opt_3a", utId: "opt_ut3", activityIds: ["act_opt_3"] }] },
  "opt_crit3b": { id: "opt_crit3b", descripcion: "b) Se ha relacionado cada técnica con las características del producto final.", indicadores: [], ponderacion: 4, raId: "opt_ra3", asociaciones: [{ id: "asoc_opt_3b", utId: "opt_ut3", activityIds: ["act_opt_3"] }] },
  "opt_crit3c": { id: "opt_crit3c", descripcion: "c) Se ha valorado la importancia de estas técnicas culinarias avanzadas en los distintos ámbitos productivos.", indicadores: [], ponderacion: 4, raId: "opt_ra3", asociaciones: [{ id: "asoc_opt_3c", utId: "opt_ut3", activityIds: ["act_opt_3"] }] },
  "opt_crit3d": { id: "opt_crit3d", descripcion: "d) Se han realizado y verificado las tareas de organización y secuenciación de las técnicas avanzadas de cocina sostenible.", indicadores: [], ponderacion: 4, raId: "opt_ra3", asociaciones: [{ id: "asoc_opt_3d", utId: "opt_ut3", activityIds: ["act_opt_3"] }] },
  "opt_crit3e": { id: "opt_crit3e", descripcion: "e) Se han desarrollado los procedimientos intermedios y finales de conservación teniendo en cuenta las necesidades de los productos obtenidos y su uso posterior.", indicadores: [], ponderacion: 4, raId: "opt_ra3", asociaciones: [{ id: "asoc_opt_3e", utId: "opt_ut3", activityIds: ["act_opt_3"] }] },
  "opt_crit3f": { id: "opt_crit3f", descripcion: "f) Se han realizado todas las operaciones teniendo en cuenta la normativa higiénico-sanitaria, de seguridad laboral y de protección ambiental.", indicadores: [], ponderacion: 4, raId: "opt_ra3", asociaciones: [{ id: "asoc_opt_3f", utId: "opt_ut3", activityIds: ["act_opt_3"] }] },

  "opt_crit4a": { id: "opt_crit4a", descripcion: "a) Se ha identificado y descrito el funcionamiento y aplicaciones de maquinaria innovadora como: Occo, Rotavapor, Girovap, liofilizadores, deshidratadores, termocirculadores e impresoras 3D, en el contexto de la cocina sostenible.", indicadores: [], ponderacion: 4, raId: "opt_ra4", asociaciones: [{ id: "asoc_opt_4a", utId: "opt_ut4", activityIds: ["act_opt_4"] }] },
  "opt_crit4b": { id: "opt_crit4b", descripcion: "b) Se han aplicado correctamente estas tecnologías en la elaboración de recetas que reflejen los principios de pureza, sencillez y frescura, demostrando comprensión de su impacto en la calidad y sostenibilidad de los productos.", indicadores: [], ponderacion: 4, raId: "opt_ra4", asociaciones: [{ id: "asoc_opt_4b", utId: "opt_ut4", activityIds: ["act_opt_4"] }] },
  "opt_crit4c": { id: "opt_crit4c", descripcion: "c) Se ha analizado el impacto de estas tecnologías en la eficiencia energética y la reducción de residuos, destacando su contribución a la sostenibilidad en la cocina.", indicadores: [], ponderacion: 3, raId: "opt_ra4", asociaciones: [{ id: "asoc_opt_4c", utId: "opt_ut4", activityIds: ["act_opt_4"] }] },
  "opt_crit4d": { id: "opt_crit4d", descripcion: "d) Se han desarrollado y evaluado elaboraciones sostenibles utilizando maquinaria innovadora, garantizando que se mantengan los estándares de pureza, sencillez y frescura, y ajustando las técnicas según sea necesario para mejorar los resultados.", indicadores: [], ponderacion: 3, raId: "opt_ra4", asociaciones: [{ id: "asoc_opt_4d", utId: "opt_ut4", activityIds: ["act_opt_4"] }] },
  "opt_crit4e": { id: "opt_crit4e", descripcion: "e) Se han promovido prácticas culinarias que apoyen a pequeños agricultores, pescadores y productores locales, y que contribuyan a una comunidad culinaria global con conciencia social.", indicadores: [], ponderacion: 4, raId: "opt_ra4", asociaciones: [{ id: "asoc_opt_4e", utId: "opt_ut4", activityIds: ["act_opt_4"] }] },
  "opt_crit4f": { id: "opt_crit4f", descripcion: "f) Se han implementado protocolos de higiene y seguridad en el uso de estas tecnologías, asegurando el cumplimiento de la normativa higiénico-sanitaria y de seguridad laboral.", indicadores: [], ponderacion: 4, raId: "opt_ra4", asociaciones: [{ id: "asoc_opt_4f", utId: "opt_ut4", activityIds: ["act_opt_4"] }] },
  "opt_crit4g": { id: "opt_crit4g", descripcion: "g) Se ha participado en talleres y demostraciones prácticas, aplicando las técnicas aprendidas y evaluando su efectividad en la creación de platos sostenibles y de alta calidad.", indicadores: [], ponderacion: 3, raId: "opt_ra4", asociaciones: [{ id: "asoc_opt_4g", utId: "opt_ut4", activityIds: ["act_opt_4"] }] }
};

export const optativaUnidadesTrabajo: Record<string, UnidadTrabajo> = {
  "opt_ut1": { id: "opt_ut1", nombre: "Bloque 1: Sostenibilidad y biodiversidad en la cocina.", descripcion: "" },
  "opt_ut2": { id: "opt_ut2", nombre: "Bloque 2: Técnicas y estrategias para reducir el desperdicio alimentario en la nueva cocina sostenible.", descripcion: "" },
  "opt_ut3": { id: "opt_ut3", nombre: "Bloque 3: Técnicas culinarias avanzadas en cocina sostenible.", descripcion: "" },
  "opt_ut4": { id: "opt_ut4", nombre: "Bloque 4: Innovación y sostenibilidad en la cocina: pureza, sencillez y frescura.", descripcion: "" }
};

export const optativaInstrumentosEvaluacion: Record<string, InstrumentoEvaluacion> = {
  "opt_inst1": { id: "opt_inst1", nombre: "Exámenes", descripcion: "Pruebas escritas o prácticas", activities: [{ id: "act_opt_1", name: "EX-Bloque 1", trimester: "t1" }, { id: "act_opt_2", name: "EX-Bloque 2", trimester: "t1" }, { id: "act_opt_3", name: "EX-Bloque 3", trimester: "t2" }, { id: "act_opt_4", name: "EX-Bloque 4", trimester: "t3" }] }
};

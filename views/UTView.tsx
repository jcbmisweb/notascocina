import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { UnidadTrabajo, CriterioEvaluacion, ResultadoAprendizaje, InstrumentoEvaluacion, AsociacionCriterio } from '../types';
import { PlusIcon, PencilIcon, TrashIcon, SaveIcon, XIcon, BookOpenIcon, ChevronDownIcon, ChevronRightIcon, PrinterIcon, CheckIcon } from '../components/icons';
import { isCriterioAssociatedWithUT, findMatchingUT, extractUTNumber } from '../utils/utAssociationUtils';

interface UTFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: UnidadTrabajo) => void;
    initialData: UnidadTrabajo;
}

const UTFormModal: React.FC<UTFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState(initialData);

    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);

    if (!isOpen) return null;
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                    <h3 className="text-xl font-bold text-gray-800">{initialData.id.startsWith('ut_') ? 'Nueva Unidad de Trabajo' : 'Editar Unidad de Trabajo'}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XIcon className="w-6 h-6 text-gray-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nombre</label>
                        <input type="text" value={formData.nombre} onChange={e => setFormData(p => ({ ...p, nombre: e.target.value }))} required className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Descripción</label>
                        <textarea value={formData.descripcion} onChange={e => setFormData(p => ({ ...p, descripcion: e.target.value }))} rows={3} className="mt-1 w-full p-2 border rounded-md"></textarea>
                    </div>
                     <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 font-semibold flex items-center"><SaveIcon className="w-5 h-5 mr-2" />Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface GestionarCriteriosUTModalProps {
    isOpen: boolean;
    onClose: () => void;
    ut: UnidadTrabajo;
    allUTs: Record<string, UnidadTrabajo>;
    resultadosAprendizaje: Record<string, ResultadoAprendizaje>;
    criteriosEvaluacion: Record<string, CriterioEvaluacion>;
    onSaveAssociations: (updatedCriterios: CriterioEvaluacion[]) => void;
}

const GestionarCriteriosUTModal: React.FC<GestionarCriteriosUTModalProps> = ({
    isOpen,
    onClose,
    ut,
    allUTs,
    resultadosAprendizaje,
    criteriosEvaluacion,
    onSaveAssociations
}) => {
    // Mapa inicial de criterios seleccionados para esta UT
    const [selectedCritIds, setSelectedCritIds] = useState<Set<string>>(() => {
        const initialSet = new Set<string>();
        (Object.values(criteriosEvaluacion) as CriterioEvaluacion[]).forEach((c: CriterioEvaluacion) => {
            if (isCriterioAssociatedWithUT(c, ut, allUTs, resultadosAprendizaje)) {
                initialSet.add(c.id);
            }
        });
        return initialSet;
    });

    useEffect(() => {
        const set = new Set<string>();
        (Object.values(criteriosEvaluacion) as CriterioEvaluacion[]).forEach((c: CriterioEvaluacion) => {
            if (isCriterioAssociatedWithUT(c, ut, allUTs, resultadosAprendizaje)) {
                set.add(c.id);
            }
        });
        setSelectedCritIds(set);
    }, [ut, criteriosEvaluacion, allUTs, resultadosAprendizaje]);

    if (!isOpen) return null;

    const toggleCriterio = (critId: string) => {
        setSelectedCritIds(prev => {
            const next = new Set(prev);
            if (next.has(critId)) {
                next.delete(critId);
            } else {
                next.add(critId);
            }
            return next;
        });
    };

    const handleSave = () => {
        const updatedList: CriterioEvaluacion[] = [];
        const allCritList = Object.values(criteriosEvaluacion) as CriterioEvaluacion[];

        allCritList.forEach((crit: CriterioEvaluacion) => {
            const isCurrentlySelected = selectedCritIds.has(crit.id);
            const wasAssociated = isCriterioAssociatedWithUT(crit, ut, allUTs, resultadosAprendizaje);

            if (isCurrentlySelected && !wasAssociated) {
                // Añadir asociación
                const newAsoc: AsociacionCriterio = {
                    id: `asoc_${crit.id}_${Date.now()}`,
                    utId: ut.id,
                    activityIds: []
                };
                updatedList.push({
                    ...crit,
                    asociaciones: [...(crit.asociaciones || []), newAsoc]
                });
            } else if (!isCurrentlySelected && wasAssociated) {
                // Eliminar asociación
                const filtered = (crit.asociaciones || []).filter(a => {
                    if (a.utId === ut.id) return false;
                    const res = findMatchingUT(a.utId, allUTs);
                    if (res && res.id === ut.id) return false;
                    return true;
                });
                updatedList.push({
                    ...crit,
                    asociaciones: filtered
                });
            }
        });

        onSaveAssociations(updatedList);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-3 border-b">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Criterios Asociados a la Unidad</h3>
                        <p className="text-sm font-medium text-purple-700">{ut.nombre}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XIcon className="w-6 h-6 text-gray-600" /></button>
                </div>

                <p className="text-xs text-gray-600 mb-3">
                    Marca o desmarca los Criterios de Evaluación que se desarrollan en esta Unidad de Trabajo. Los cambios se sincronizarán inmediatamente con la sección de RAs y Criterios.
                </p>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {(Object.values(resultadosAprendizaje) as ResultadoAprendizaje[]).map((ra: ResultadoAprendizaje) => {
                        const critIdsForRA = ra.criteriosEvaluacion || [];
                        if (critIdsForRA.length === 0) return null;

                        return (
                            <div key={ra.id} className="border rounded-lg p-3 bg-gray-50">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-200 mb-2">
                                    <h4 className="font-bold text-sm text-gray-800">{ra.nombre}</h4>
                                    <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                        RA: {ra.ponderacion || 0}%
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {critIdsForRA.map(critId => {
                                        const crit = criteriosEvaluacion[critId];
                                        if (!crit) return null;
                                        const isChecked = selectedCritIds.has(crit.id);

                                        return (
                                            <label
                                                key={crit.id}
                                                className={`flex items-start p-2 rounded cursor-pointer transition ${
                                                    isChecked ? 'bg-purple-50 border border-purple-200' : 'bg-white hover:bg-gray-100 border border-transparent'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleCriterio(crit.id)}
                                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                />
                                                <div className="ml-3 flex-1">
                                                    <p className="text-sm font-medium text-gray-800">{crit.descripcion}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-semibold">
                                                            {crit.ponderacion || 0}%
                                                        </span>
                                                        {crit.asociaciones && crit.asociaciones.length > 0 && (
                                                            <span className="text-xs text-gray-500">
                                                                (Asociado en {crit.asociaciones.length} {crit.asociaciones.length === 1 ? 'UT' : 'UTs'})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-between items-center pt-4 border-t mt-4">
                    <span className="text-xs text-gray-500 font-medium">
                        {selectedCritIds.size} criterio(s) seleccionado(s)
                    </span>
                    <div className="flex space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold text-sm">
                            Cancelar
                        </button>
                        <button type="button" onClick={handleSave} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-semibold text-sm flex items-center">
                            <SaveIcon className="w-4 h-4 mr-1.5" /> Guardar Asociaciones
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface AsociacionesSummaryProps { 
    ut: UnidadTrabajo;
    allUTs: Record<string, UnidadTrabajo>;
    resultadosAprendizaje: Record<string, ResultadoAprendizaje>;
    criteriosEvaluacion: Record<string, CriterioEvaluacion>;
    instrumentosEvaluacion: Record<string, InstrumentoEvaluacion>;
    onOpenManageCriteria: () => void;
}

const AsociacionesSummary: React.FC<AsociacionesSummaryProps> = ({ 
    ut, 
    allUTs, 
    resultadosAprendizaje, 
    criteriosEvaluacion, 
    instrumentosEvaluacion,
    onOpenManageCriteria
}) => {

    const structuredData = useMemo(() => {
        const grouped: Record<string, { ra: ResultadoAprendizaje; criterios: { criterio: CriterioEvaluacion; instrumentos: string[] }[] }> = {};
        
        const allCriterios = Object.values(criteriosEvaluacion || {}) as CriterioEvaluacion[];
        
        // Emparejamiento robusto: ID exacto, nombre/tema/bloque coincidente o asignación curricular directa
        const criteriaForThisUT = allCriterios.filter(c => 
            isCriterioAssociatedWithUT(c, ut, allUTs, resultadosAprendizaje)
        );

        criteriaForThisUT.forEach(crit => {
            let raId = crit.raId;
            if (!raId) {
                const foundRA = (Object.values(resultadosAprendizaje || {}) as ResultadoAprendizaje[]).find((ra: ResultadoAprendizaje) => (ra.criteriosEvaluacion || []).includes(crit.id));
                if (foundRA) {
                    raId = foundRA.id;
                }
            }
            
            if (!raId) return;

            if (!grouped[raId]) {
                const ra = resultadosAprendizaje[raId];
                if (ra) {
                    grouped[raId] = { ra, criterios: [] };
                }
            }
            
            if (grouped[raId]) {
                // Buscar la asociación que corresponde a esta UT
                const asociacionForThisUT = (crit.asociaciones || []).find(a => 
                    a.utId === ut.id || findMatchingUT(a.utId, allUTs)?.id === ut.id || (extractUTNumber(a.utId) !== null && extractUTNumber(a.utId) === extractUTNumber(ut.nombre))
                );

                const instrumentos: string[] = [];
                
                if (asociacionForThisUT && asociacionForThisUT.activityIds && asociacionForThisUT.activityIds.length > 0) {
                    asociacionForThisUT.activityIds.forEach(actId => {
                        for (const inst of Object.values(instrumentosEvaluacion || {}) as InstrumentoEvaluacion[]) {
                            const activity = (inst.activities || []).find(a => a.id === actId);
                            if (activity) {
                                const label = `${inst.nombre}: ${activity.name} (${(activity.trimester || '').toUpperCase()})`;
                                if (!instrumentos.includes(label)) instrumentos.push(label);
                                break;
                            }
                        }
                    });
                }

                // Fallback: si no encontró en la asociación directa pero el criterio tiene otras actividades asociadas
                if (instrumentos.length === 0 && crit.asociaciones && crit.asociaciones.length > 0) {
                    crit.asociaciones.forEach(asoc => {
                        (asoc.activityIds || []).forEach(actId => {
                            for (const inst of Object.values(instrumentosEvaluacion || {}) as InstrumentoEvaluacion[]) {
                                const activity = (inst.activities || []).find(a => a.id === actId);
                                if (activity) {
                                    const label = `${inst.nombre}: ${activity.name} (${(activity.trimester || '').toUpperCase()})`;
                                    if (!instrumentos.includes(label)) instrumentos.push(label);
                                    break;
                                }
                            }
                        });
                    });
                }

                grouped[raId].criterios.push({ criterio: crit, instrumentos });
            }
        });
        
        return Object.values(grouped).sort((a, b) => a.ra.nombre.localeCompare(b.ra.nombre));
    }, [ut, allUTs, criteriosEvaluacion, resultadosAprendizaje, instrumentosEvaluacion]);
    
    if (structuredData.length === 0) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <p className="text-sm text-amber-800 font-medium">Esta UT aún no tiene criterios de evaluación asociados en el sistema.</p>
                <p className="text-xs text-amber-600 mt-1">Puedes vincular automáticamente los criterios correspondientes pulsando en el botón a continuación:</p>
                <button
                    onClick={onOpenManageCriteria}
                    className="mt-3 inline-flex items-center text-xs font-semibold px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                >
                    <PlusIcon className="w-3.5 h-3.5 mr-1" /> Vincular Criterios a esta UT
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {structuredData.reduce((total, item) => total + item.criterios.length, 0)} Criterio(s) vinculados a esta UT
                </span>
                <button
                    onClick={onOpenManageCriteria}
                    className="text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded transition flex items-center"
                >
                    <PencilIcon className="w-3.5 h-3.5 mr-1" /> Gestionar Criterios
                </button>
            </div>

            {structuredData.map(({ ra, criterios }) => (
                <div key={ra.id} className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-base text-blue-800">{ra.nombre}</p>
                        <span className="text-xs bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-full">
                            Ponderación RA: {ra.ponderacion || 0}%
                        </span>
                    </div>
                    <ul className="mt-2 space-y-2.5">
                        {criterios.map(({ criterio, instrumentos }) => (
                            <li key={criterio.id} className="pl-3 border-l-2 border-blue-400 bg-white p-2.5 rounded shadow-2xs">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-semibold text-gray-800 text-sm">{criterio.descripcion}</p>
                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold whitespace-nowrap">
                                        {criterio.ponderacion || 0}%
                                    </span>
                                </div>
                                {instrumentos.length > 0 ? (
                                    <div className="mt-2 pt-1 border-t border-gray-100">
                                        <p className="text-xs font-bold text-gray-500 mb-1">Instrumentos y Actividades de Evaluación:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {instrumentos.map((inst, index) => (
                                                <span key={index} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                                                    {inst}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic mt-1">Sin actividades de evaluación vinculadas</p>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};

interface UTViewProps {
    module: 'pc' | 'optativa' | 'proyecto';
}

const UTView: React.FC<UTViewProps> = ({ module }) => {
    const context = useAppContext();
    const { addToast } = context;

    const [
        unidadesTrabajo,
        resultadosAprendizaje,
        criteriosEvaluacion,
        instrumentosEvaluacion,
        handleSaveUT,
        handleDeleteUT,
        handleSaveCriterio,
        handleSaveMultipleCriterios
    ] = useMemo(() => {
        if (module === 'optativa') return [
            context.optativaUnidadesTrabajo, context.optativaResultadosAprendizaje, context.optativaCriteriosEvaluacion, context.optativaInstrumentosEvaluacion,
            context.handleSaveOptativaUT, context.handleDeleteOptativaUT, context.handleSaveOptativaCriterio, context.handleSaveMultipleOptativaCriterios
        ];
        if (module === 'proyecto') return [
            context.proyectoUnidadesTrabajo, context.proyectoResultadosAprendizaje, context.proyectoCriteriosEvaluacion, context.proyectoInstrumentosEvaluacion,
            context.handleSaveProyectoUT, context.handleDeleteProyectoUT, context.handleSaveProyectoCriterio, context.handleSaveMultipleProyectoCriterios
        ];
        return [ // default PC
            context.pcUnidadesTrabajo, context.pcResultadosAprendizaje, context.pcCriteriosEvaluacion, context.pcInstrumentosEvaluacion,
            context.handleSavePCUT, context.handleDeletePCUT, context.handleSavePCCriterio, context.handleSaveMultiplePCCriterios
        ];
    }, [module, context]);

    const [modalState, setModalState] = useState<{ isOpen: boolean; data: UnidadTrabajo | null }>({ isOpen: false, data: null });
    const [manageCriteriaUT, setManageCriteriaUT] = useState<UnidadTrabajo | null>(null);
    const [expandedUTs, setExpandedUTs] = useState<Set<string>>(new Set());

    const handleOpenModal = (data: UnidadTrabajo | null) => {
        setModalState({ isOpen: true, data: data || { id: `ut_${Date.now()}`, nombre: '', descripcion: '' } });
    };

    const handleCloseModal = () => setModalState({ isOpen: false, data: null });
    
    const toggleExpand = (utId: string) => {
        setExpandedUTs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(utId)) newSet.delete(utId);
            else newSet.add(utId);
            return newSet;
        });
    };

    const handleExpandAll = () => {
        const allIds = new Set(Object.keys(unidadesTrabajo || {}));
        setExpandedUTs(allIds);
    };

    const handleCollapseAll = () => {
        setExpandedUTs(new Set());
    };

    const handleSaveAssociationsFromModal = (updatedCriterios: CriterioEvaluacion[]) => {
        if (handleSaveMultipleCriterios) {
            handleSaveMultipleCriterios(updatedCriterios);
        } else {
            updatedCriterios.forEach(c => {
                handleSaveCriterio(c, c.raId);
            });
            addToast(`Asociaciones actualizadas para la unidad de trabajo.`, 'success');
        }
    };
    
    const utList = Object.values(unidadesTrabajo || {});
    const allExpanded = utList.length > 0 && expandedUTs.size === utList.length;

    return (
        <div>
            <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                        <BookOpenIcon className="w-8 h-8 mr-3 text-purple-500"/>
                        Unidades de Trabajo (UT)
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Define las unidades didácticas y visualiza los Resultados de Aprendizaje y Criterios asociados automáticamente.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    {utList.length > 0 && (
                        <button
                            type="button"
                            onClick={allExpanded ? handleCollapseAll : handleExpandAll}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition"
                        >
                            {allExpanded ? 'Colapsar todas' : 'Expandir todas'}
                        </button>
                    )}
                    <button onClick={() => handleOpenModal(null)} className="flex items-center bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition">
                        <PlusIcon className="w-5 h-5 mr-1" /> Nueva UT
                    </button>
                </div>
            </header>

            <div className="space-y-4">
                {Object.values(unidadesTrabajo || {}).map((ut: UnidadTrabajo) => {
                    const isExpanded = expandedUTs.has(ut.id);
                    
                    // Cuenta los criterios asociados a esta UT
                    const countAssociated = (Object.values(criteriosEvaluacion || {}) as CriterioEvaluacion[]).filter((c: CriterioEvaluacion) => 
                        isCriterioAssociatedWithUT(c, ut, unidadesTrabajo, resultadosAprendizaje)
                    ).length;

                    return (
                        <div key={ut.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center p-4">
                                <button onClick={() => toggleExpand(ut.id)} className="p-1 rounded-full hover:bg-gray-100">
                                    {isExpanded ? <ChevronDownIcon className="w-5 h-5 text-gray-600"/> : <ChevronRightIcon className="w-5 h-5 text-gray-600"/>}
                                </button>
                                <div className="flex-1 ml-3 cursor-pointer" onClick={() => toggleExpand(ut.id)}>
                                    <div className="flex items-center flex-wrap gap-2">
                                        <h3 className="font-bold text-lg text-gray-800">{ut.nombre}</h3>
                                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                                            countAssociated > 0 
                                                ? 'bg-purple-100 text-purple-800' 
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {countAssociated} {countAssociated === 1 ? 'criterio asociado' : 'criterios asociados'}
                                        </span>
                                    </div>
                                    {ut.descripcion && <p className="text-sm text-gray-600 mt-0.5">{ut.descripcion}</p>}
                                </div>
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => setManageCriteriaUT(ut)}
                                        className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold px-2.5 py-1.5 rounded-md flex items-center mr-1"
                                        title="Gestionar Criterios Asociados"
                                    >
                                        <PencilIcon className="w-3.5 h-3.5 mr-1" />
                                        Criterios
                                    </button>
                                    <button onClick={() => handleOpenModal(ut)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full" title="Editar Nombre/Descripción">
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteUT(ut.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full" title="Eliminar UT">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            {isExpanded && (
                                <div className="mt-1 pt-3 border-t p-4 bg-gray-50/50">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Planificación Académica Asociada</h4>
                                    <AsociacionesSummary 
                                        ut={ut}
                                        allUTs={unidadesTrabajo} 
                                        resultadosAprendizaje={resultadosAprendizaje} 
                                        criteriosEvaluacion={criteriosEvaluacion} 
                                        instrumentosEvaluacion={instrumentosEvaluacion}
                                        onOpenManageCriteria={() => setManageCriteriaUT(ut)}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {modalState.isOpen && (
                <UTFormModal 
                    isOpen={modalState.isOpen} 
                    onClose={handleCloseModal} 
                    onSave={handleSaveUT} 
                    initialData={modalState.data!} 
                />
            )}

            {manageCriteriaUT && (
                <GestionarCriteriosUTModal
                    isOpen={Boolean(manageCriteriaUT)}
                    onClose={() => setManageCriteriaUT(null)}
                    ut={manageCriteriaUT}
                    allUTs={unidadesTrabajo}
                    resultadosAprendizaje={resultadosAprendizaje}
                    criteriosEvaluacion={criteriosEvaluacion}
                    onSaveAssociations={handleSaveAssociationsFromModal}
                />
            )}
        </div>
    );
};

export default UTView;

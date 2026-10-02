import React, { useState } from 'react';
import { ALL_GENERAL_FAQS, VIEW_HELP_GUIDES, FAQItem } from '../data/helpGuideData';
import { LightbulbIcon, HelpCircleIcon, SearchIcon, ChevronDownIcon, LockOpenIcon, LockClosedIcon } from '../components/icons';

interface AyudaFaqViewProps {
    onNavigate?: (view: string) => void;
}

const AyudaFaqView: React.FC<AyudaFaqViewProps> = ({ onNavigate }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('todos');
    const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

    const categories = [
        { id: 'todos', label: 'Todas las preguntas' },
        { id: 'examenes', label: '📝 Exámenes y Notas Teóricas' },
        { id: 'servicios', label: '🍽️ Servicios y Prácticas' },
        { id: 'alumnos', label: '👨‍🎓 Alumnos y Fichas' },
        { id: 'calificaciones', label: '📊 Calificaciones y Ponderaciones' },
        { id: 'general', label: '⚙️ General y Guardado' },
    ];

    const filteredFaqs = ALL_GENERAL_FAQS.filter(faq => {
        const matchesCategory = selectedCategory === 'todos' || faq.category === selectedCategory;
        if (!matchesCategory) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q);
    });

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-12">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white rounded-2xl p-6 sm:p-8 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold text-yellow-300">
                            <LightbulbIcon className="w-4 h-4 text-yellow-300" />
                            <span>Centro de Ayuda y Guía Docente</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Preguntas Frecuentes y Soluciones</h1>
                        <p className="text-sm text-blue-100 max-w-2xl leading-relaxed">
                            Resuelve al instante cualquier duda sobre cómo introducir notas de exámenes teóricos, cómo funcionan los candados, el cálculo del bloque práctico o la ficha de los alumnos.
                        </p>
                    </div>
                    <div className="flex-shrink-0 bg-white/10 p-4 rounded-2xl border border-white/20 text-center">
                        <span className="block text-2xl font-bold">100%</span>
                        <span className="text-[11px] text-blue-200">Guardado en la Nube</span>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mt-6 relative">
                    <SearchIcon className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar solución: 'candado', 'dónde pongo notas', 'servicio', 'historial alumno'..."
                        className="w-full pl-12 pr-4 py-3 bg-white text-gray-900 rounded-xl shadow-md text-sm focus:outline-none focus:ring-4 focus:ring-blue-400/40"
                    />
                </div>
            </div>

            {/* Quick Solution Card: The Lock (Candado) Explained */}
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-200 text-amber-900 rounded-xl">
                        <LockOpenIcon className="w-6 h-6 text-green-700" />
                    </div>
                    <div className="space-y-2 flex-1 text-xs">
                        <h3 className="font-bold text-sm text-amber-900">
                            💡 Punto clave: ¿Dónde poner las notas de exámenes y cómo funcionan los candados?
                        </h3>
                        <p className="text-amber-900 leading-relaxed">
                            Las notas de <b>exámenes teóricos o escritos</b> se introducen en el menú <b>Módulo PC &rarr; Instrumentos</b> desplegando el instrumento "Examen". 
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="bg-white p-3 rounded-lg border border-amber-200 flex items-center gap-3">
                                <LockOpenIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                                <div>
                                    <span className="font-bold text-green-800 block">Candado Verde (Abierto):</span>
                                    <span className="text-gray-600">Puedes escribir y modificar las notas libremente.</span>
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-amber-200 flex items-center gap-3">
                                <LockClosedIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
                                <div>
                                    <span className="font-bold text-red-800 block">Candado Rojo (Cerrado):</span>
                                    <span className="text-gray-600">Protegido. Haz clic sobre él para abrirlo y escribir.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                            selectedCategory === cat.id
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* FAQ Accordion List */}
            <div className="space-y-3">
                {filteredFaqs.map(faq => {
                    const isExpanded = expandedFaqId === faq.id;
                    return (
                        <div 
                            key={faq.id} 
                            className={`border rounded-xl transition bg-white shadow-xs overflow-hidden ${
                                isExpanded ? 'border-blue-400 ring-2 ring-blue-500/10' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <button
                                onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                                className="w-full p-4 sm:p-5 text-left flex justify-between items-start gap-4"
                            >
                                <div className="flex items-start gap-3">
                                    <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0 mt-0.5">
                                        <HelpCircleIcon className="w-4 h-4" />
                                    </span>
                                    <span className="font-bold text-sm text-gray-800 leading-snug">{faq.question}</span>
                                </div>
                                <ChevronDownIcon className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5 transform transition-transform ${isExpanded ? 'rotate-180 text-blue-600' : ''}`} />
                            </button>

                            {isExpanded && (
                                <div className="px-5 pb-5 pt-1 text-xs text-gray-600 border-t border-gray-100 space-y-3 leading-relaxed">
                                    <p className="text-gray-700 text-sm">{faq.answer}</p>
                                    {faq.tips && faq.tips.length > 0 && (
                                        <div className="bg-blue-50/80 border border-blue-200/80 rounded-lg p-3 text-blue-900 font-medium">
                                            💡 <b>Consejo práctico:</b> {faq.tips[0]}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredFaqs.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <p className="text-gray-500 text-sm">No hay preguntas que coincidan con los criterios de búsqueda.</p>
                        <button
                            onClick={() => { setSearchQuery(''); setSelectedCategory('todos'); }}
                            className="mt-3 text-xs font-semibold text-blue-600 hover:underline"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                )}
            </div>

            {/* Quick Navigation to Screens */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-gray-800 uppercase tracking-wider">
                    🧭 Accesos Rápidos a las Pantallas Clave
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <button
                        onClick={() => onNavigate?.('pc-instrumentos')}
                        className="p-3 border border-gray-200 rounded-xl text-left hover:border-blue-400 hover:bg-blue-50/50 transition group"
                    >
                        <div className="font-bold text-xs text-gray-900 group-hover:text-blue-700">1. Instrumentos (Exámenes Teóricos)</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">Poner notas de exámenes escritos y tareas</div>
                    </button>
                    <button
                        onClick={() => onNavigate?.('pc-calificaciones')}
                        className="p-3 border border-gray-200 rounded-xl text-left hover:border-blue-400 hover:bg-blue-50/50 transition group"
                    >
                        <div className="font-bold text-xs text-gray-900 group-hover:text-blue-700">2. Resumen Servicios y Prácticas</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">Medias trimestrales, días previos y taller</div>
                    </button>
                    <button
                        onClick={() => onNavigate?.('alumnos')}
                        className="p-3 border border-gray-200 rounded-xl text-left hover:border-blue-400 hover:bg-blue-50/50 transition group"
                    >
                        <div className="font-bold text-xs text-gray-900 group-hover:text-blue-700">3. Ficha del Alumno</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">Historial unificado de notas y conductas</div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AyudaFaqView;

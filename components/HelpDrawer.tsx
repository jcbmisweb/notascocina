import React, { useState } from 'react';
import { VIEW_HELP_GUIDES, ALL_GENERAL_FAQS, FAQItem } from '../data/helpGuideData';
import { LightbulbIcon, HelpCircleIcon, SearchIcon, LockOpenIcon, ChevronDownIcon } from './icons';

interface HelpDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    activeView: string;
    onNavigateToFaq?: () => void;
}

export const HelpDrawer: React.FC<HelpDrawerProps> = ({ isOpen, onClose, activeView, onNavigateToFaq }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'current' | 'all-faqs'>('current');
    const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

    if (!isOpen) return null;

    const currentGuide = VIEW_HELP_GUIDES[activeView] || VIEW_HELP_GUIDES['dashboard'];

    // Filter FAQs
    const filteredFaqs = ALL_GENERAL_FAQS.filter(faq => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q);
    });

    return (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
                onClick={onClose} 
            />

            {/* Slide-over panel */}
            <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-5 flex items-center justify-between shadow-md">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <LightbulbIcon className="w-6 h-6 text-yellow-300 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">Guía y Ayuda Rápida</h2>
                            <p className="text-xs text-blue-100 mt-0.5">¿Dónde se pone cada cosa y cómo funciona?</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
                        title="Cerrar ayuda"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-semibold">
                    <button
                        onClick={() => setActiveTab('current')}
                        className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 border-b-2 transition ${
                            activeTab === 'current'
                                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <LightbulbIcon className="w-4 h-4 text-amber-500" />
                        <span>Esta Pantalla</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('all-faqs')}
                        className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 border-b-2 transition ${
                            activeTab === 'all-faqs'
                                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <HelpCircleIcon className="w-4 h-4 text-blue-500" />
                        <span>Preguntas Típicas & FAQ</span>
                    </button>
                </div>

                {/* Content body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm text-gray-700">
                    {activeTab === 'current' ? (
                        <>
                            {/* Current view card */}
                            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full inline-block mb-1">
                                    Pantalla actual
                                </span>
                                <h3 className="font-bold text-gray-900 text-base">{currentGuide.title}</h3>
                                {currentGuide.subtitle && <p className="text-xs text-blue-800 font-medium">{currentGuide.subtitle}</p>}
                                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{currentGuide.purpose}</p>
                            </div>

                            {/* Where to put things */}
                            <div>
                                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-2.5">
                                    <span>📍</span> ¿Dónde se ponen las cosas aquí?
                                </h4>
                                <ul className="space-y-2">
                                    {currentGuide.whereToPutThings.map((tip, i) => (
                                        <li key={i} className="flex items-start gap-2 bg-amber-50/50 border border-amber-200/60 rounded-lg p-2.5 text-xs text-amber-950">
                                            <span className="text-amber-600 font-bold mt-0.5">•</span>
                                            <span className="leading-relaxed">{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Recommended Steps */}
                            {currentGuide.steps && currentGuide.steps.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-2.5">
                                        <span>📝</span> Pasos recomendados
                                    </h4>
                                    <div className="space-y-2.5">
                                        {currentGuide.steps.map(step => (
                                            <div key={step.number} className="flex gap-3 bg-white border border-gray-200 rounded-lg p-3 shadow-xs">
                                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                                    {step.number}
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold text-xs text-gray-800">{step.title}</h5>
                                                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Specific FAQs for this page */}
                            {currentGuide.faqs && currentGuide.faqs.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-2.5">
                                        <span>❓</span> Dudas frecuentes en esta página
                                    </h4>
                                    <div className="space-y-2">
                                        {currentGuide.faqs.map(faq => {
                                            const isExpanded = expandedFaqId === faq.id;
                                            return (
                                                <div key={faq.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                                                    <button
                                                        onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                                                        className="w-full p-3 text-left flex justify-between items-center text-xs font-semibold text-gray-800 hover:bg-gray-50 transition"
                                                    >
                                                        <span>{faq.question}</span>
                                                        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180 text-blue-600' : ''}`} />
                                                    </button>
                                                    {isExpanded && (
                                                        <div className="px-3 pb-3 pt-1 text-xs text-gray-600 bg-gray-50/50 border-t border-gray-100 leading-relaxed">
                                                            {faq.answer}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Troubleshooting */}
                            {currentGuide.troubleshooting && currentGuide.troubleshooting.length > 0 && (
                                <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 space-y-2">
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                                        <span>🚨</span> Si te ocurre esto, haz esto:
                                    </h4>
                                    {currentGuide.troubleshooting.map((t, idx) => (
                                        <div key={idx} className="text-xs">
                                            <p className="font-semibold text-rose-900">• {t.problem}</p>
                                            <p className="text-gray-700 pl-3 mt-0.5 leading-relaxed">{t.solution}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Search bar */}
                            <div className="relative">
                                <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Buscar dudas: exámenes, candados, servicios, alumnos..."
                                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            {/* General FAQs list */}
                            <div className="space-y-3">
                                {filteredFaqs.map(faq => {
                                    const isExpanded = expandedFaqId === faq.id;
                                    return (
                                        <div key={faq.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                                            <button
                                                onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                                                className="w-full p-3.5 text-left flex justify-between items-start gap-2 text-xs font-bold text-gray-800 hover:bg-gray-50 transition"
                                            >
                                                <span>{faq.question}</span>
                                                <ChevronDownIcon className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5 transform transition-transform ${isExpanded ? 'rotate-180 text-blue-600' : ''}`} />
                                            </button>
                                            {isExpanded && (
                                                <div className="px-3.5 pb-3.5 pt-1 text-xs text-gray-600 bg-gray-50 border-t border-gray-100 space-y-2 leading-relaxed">
                                                    <p>{faq.answer}</p>
                                                    {faq.tips && faq.tips.length > 0 && (
                                                        <div className="bg-blue-50 text-blue-900 p-2 rounded-md font-medium text-[11px]">
                                                            💡 <b>Consejo:</b> {faq.tips[0]}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {filteredFaqs.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-xs">
                                        No se encontraron preguntas con "{searchQuery}". Prueba con otras palabras o navega por los módulos.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer with full guide link */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs">
                    <span className="text-gray-500">¿Quieres la guía completa?</span>
                    {onNavigateToFaq && (
                        <button
                            onClick={() => {
                                onClose();
                                onNavigateToFaq();
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1.5"
                        >
                            <span>Centro de Ayuda FAQ</span>
                            <span>→</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

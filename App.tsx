
import React, { useState, Suspense, lazy } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ToastContainer } from './components/Toast';
import LoginPage from './pages/LoginPage';

// Lazy load views for better performance and code splitting
const Header = lazy(() => import('./components/Header'));
const Sidebar = lazy(() => import('./components/Sidebar'));
const DashboardView = lazy(() => import('./views/DashboardView'));
const AlumnosView = lazy(() => import('./views/AlumnosView'));
const DefinirGruposView = lazy(() => import('./views/DefinirGruposView'));
const GestionPracticaView = lazy(() => import('./views/GestionPracticaView'));
const ExamenesPracticosView = lazy(() => import('./views/ExamenesPracticosView'));
const NotasServicioView = lazy(() => import('./views/NotasServicioView'));
const RegistroSalidasEntradasView = lazy(() => import('./views/RegistroSalidasEntradasView'));
const GestionAppView = lazy(() => import('./views/GestionAppView'));
const GestionAcademicaView = lazy(() => import('./views/GestionAcademicaView'));
const RAView = lazy(() => import('./views/RAView'));
const UTView = lazy(() => import('./views/UTView'));
const InstrumentosView = lazy(() => import('./views/InstrumentosView'));
const ModuleDashboardView = lazy(() => import('./views/ModuleDashboardView'));
const ExamSchedulerView = lazy(() => import('./views/ExamSchedulerView'));
const CoevaluacionDiabolicaView = lazy(() => import('./views/CoevaluacionDiabolicaView'));
const DefinirGruposProyectoView = lazy(() => import('./views/DefinirGruposProyectoView'));
const RotacionBrigadaView = lazy(() => import('./views/RotacionBrigadaView').then(m => ({ default: m.RotacionBrigadaView })));
const ProyectoEvaluacionView = lazy(() => import('./views/ProyectoEvaluacionView').then(m => ({ default: m.ProyectoEvaluacionView })));
const AyudaFaqView = lazy(() => import('./views/AyudaFaqView'));
const HelpDrawer = lazy(() => import('./components/HelpDrawer').then(m => ({ default: m.HelpDrawer })));
import { LightbulbIcon } from './components/icons';
import { OfflineStatusBanner } from './components/OfflineStatusBanner';
import { ErrorBoundary } from './components/ErrorBoundary';


const AppContent: React.FC = () => {
    // --- VIEW & NAVIGATION STATE ---
    const [activeView, setActiveView] = useState('dashboard');
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [initialServiceId, setInitialServiceId] = useState<string | null>(null);
    const [initialServiceTab, setInitialServiceTab] = useState<'planning' | 'evaluation' | null>(null);
    const [isFocusMode, setIsFocusMode] = useState(false);
    
    const { toasts, user, loading } = useAppContext();
    
    if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>;
    if (!user) return <LoginPage />;
    
    // --- NAVIGATION HELPERS ---
    const handleNavigateToService = (serviceId: string, tab: 'planning' | 'evaluation' | null = 'planning') => {
        setInitialServiceId(serviceId);
        setInitialServiceTab(tab);
        setActiveView('pc-gestion-practica');
    };
    
    const clearInitialServiceContext = () => {
        setInitialServiceId(null);
        setInitialServiceTab(null);
    }

    // --- VIEW ROUTER ---
    const renderView = () => {
        switch (activeView) {
            case 'dashboard':
                return <DashboardView onNavigate={setActiveView} onNavigateToService={handleNavigateToService} />;
            case 'alumnos':
                return <AlumnosView />;
            case 'gestion-academica':
                return <GestionAcademicaView />;
            
            // Módulo PC
            case 'pc-resumen':
                return <ModuleDashboardView module="pc" onNavigate={setActiveView} />;
            case 'pc-ra':
                return <RAView module="pc" />;
            case 'pc-ut':
                return <UTView module="pc" />;
            case 'pc-instrumentos':
                return <InstrumentosView module="pc" />;
            case 'pc-calificaciones':
                return <NotasServicioView onNavigateToService={handleNavigateToService} />;
            case 'pc-salidas-entradas':
                return <RegistroSalidasEntradasView />;
				
            case 'pc-definir-grupos':
                return <DefinirGruposView />;
            case 'pc-gestion-practica':
                return <GestionPracticaView 
                    initialServiceId={initialServiceId}
                    initialServiceTab={initialServiceTab}
                    clearInitialServiceContext={clearInitialServiceContext}
                />;
            case 'pc-rotacion-brigada':
                return <RotacionBrigadaView />;
            case 'pc-examenes-practicos':
                return <ExamenesPracticosView isFocusMode={isFocusMode} setIsFocusMode={setIsFocusMode} />;
            case 'pc-exam-scheduler':
                return <ExamSchedulerView />;

            // Módulo Optativa
            case 'optativa-resumen':
                return <ModuleDashboardView module="optativa" onNavigate={setActiveView} />;
            case 'optativa-ra':
                return <RAView module="optativa" />;
            case 'optativa-ut':
                return <UTView module="optativa" />;
            case 'optativa-instrumentos':
                return <InstrumentosView module="optativa" />;

            // Módulo Proyecto
            case 'proyecto-resumen':
                return <ModuleDashboardView module="proyecto" onNavigate={setActiveView} />;
            case 'proyecto-ra':
                return <RAView module="proyecto" />;
            case 'proyecto-ut':
                return <UTView module="proyecto" />;
            case 'proyecto-instrumentos':
                return <InstrumentosView module="proyecto" />;
            case 'proyecto-grupos':
                return <DefinirGruposProyectoView />;
            case 'proyecto-evaluacion':
                return <ProyectoEvaluacionView />;
            case 'proyecto-coevaluacion':
                return <CoevaluacionDiabolicaView />;

            case 'gestion-app':
                return <GestionAppView />;
            case 'ayuda-faq':
                return <AyudaFaqView onNavigate={setActiveView} />;
            default:
                return <DashboardView onNavigate={setActiveView} />;
        }
    };
    
    const LoadingFallback = () => <div className="flex-1 p-6 sm:p-8 flex items-center justify-center"><p>Cargando vista...</p></div>;
    
    const mainContentClass = isFocusMode && activeView === 'pc-examenes-practicos'
      ? 'w-full h-screen overflow-hidden'
      : 'flex-1 p-6 sm:p-8 overflow-y-auto bg-gray-50';

    return (
        <div className="flex h-screen bg-gray-100 font-sans relative">
             <ToastContainer toasts={toasts} />
             <Suspense fallback={<div></div>}>
                {!(isFocusMode && activeView === 'pc-examenes-practicos') && <Sidebar activeView={activeView} setActiveView={setActiveView} />}
             </Suspense>
            <div className="flex-1 flex flex-col overflow-hidden">
                 <OfflineStatusBanner />
                 <Suspense fallback={<div></div>}>
                    {!(isFocusMode && activeView === 'pc-examenes-practicos') && (
                        <Header activeView={activeView} onOpenHelp={() => setIsHelpOpen(true)} />
                    )}
                 </Suspense>
                <main className={mainContentClass}>
                    <ErrorBoundary fallbackTitle="Error al cargar la sección seleccionada">
                        <Suspense fallback={<LoadingFallback />}>
                            {renderView()}
                        </Suspense>
                    </ErrorBoundary>
                </main>
            </div>

            {/* Quick Floating Help Lightbulb Button */}
            {!(isFocusMode && activeView === 'pc-examenes-practicos') && (
                <button
                    onClick={() => setIsHelpOpen(true)}
                    className="fixed bottom-5 right-5 z-40 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white p-3 sm:px-4 sm:py-2.5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2 border-2 border-white/60 active:scale-95"
                    title="💡 Guía rápida y preguntas frecuentes de esta pantalla"
                >
                    <LightbulbIcon className="w-5 h-5 text-yellow-200 animate-pulse" />
                    <span className="hidden sm:inline text-xs font-bold tracking-wide">¿Dudas con esta pantalla?</span>
                </button>
            )}

            {/* Contextual Help Drawer */}
            <Suspense fallback={null}>
                <HelpDrawer
                    isOpen={isHelpOpen}
                    onClose={() => setIsHelpOpen(false)}
                    activeView={activeView}
                    onNavigateToFaq={() => setActiveView('ayuda-faq')}
                />
            </Suspense>
        </div>
    );
};


const App: React.FC = () => {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
};


export default App;
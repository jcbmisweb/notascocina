
import React, { useState } from 'react';
import { 
    UsersIcon, 
    GroupIcon,
    ClipboardListIcon,
    CalendarPlusIcon,
    ClipboardCheckIcon,
    SettingsIcon,
    PencilIcon,
    RefreshCwIcon,
    ChefHatIcon,
    ClipboardListIcon as GestionAcademicaIcon
} from '../components/icons';
import FileUpload from '../components/FileUpload';
import { useAppContext } from '../context/AppContext';
import StatCard from '../components/StatCard';
import ActionCard from '../components/ActionCard';
import { ModalNotasExamenesTeoricos } from '../components/ModalNotasExamenesTeoricos';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  onNavigateToService?: (serviceId: string, tab?: 'planning' | 'evaluation' | null) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onNavigateToService }) => {
    const { students, practiceGroups, services, handleFileUpload: contextHandleFileUpload, teacherData } = useAppContext();
    const [loading, setLoading] = useState(false);
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);

    const handleFileUpload = async (file: File) => {
        setLoading(true);
        await contextHandleFileUpload(file);
        setLoading(false);
    }
    
    if (students.length === 0) {
        return (
            <div className="bg-white p-8 rounded-xl shadow-md text-center">
                <h1 className="text-3xl font-bold text-gray-800">¡Bienvenido a TeacherDash!</h1>
                <p className="text-gray-500 mt-2 mb-6">Para comenzar, importa la lista de tus alumnos desde un archivo Excel.</p>
                <div className="max-w-xl mx-auto">
                    <FileUpload onFileUpload={handleFileUpload} disabled={loading} />
                    {loading && <p className="text-center mt-4 text-blue-500">Procesando archivo...</p>}
                </div>
                <p className="text-sm text-gray-400 mt-6">
                    ¿Necesitas restaurar datos? Ve a <button onClick={() => onNavigate('gestion-app')} className="text-blue-500 hover:underline font-semibold">Gestión App</button> para usar una copia de seguridad.
                </p>
                <footer className="mt-12 text-center text-sm text-gray-500">
                    <p>Desarrollado por {teacherData.name}</p>
                    <p><a href={`mailto:${teacherData.email}`} className="hover:underline">{teacherData.email}</a></p>
                </footer>
            </div>
        )
    }
    
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Bienvenido, {teacherData.name.split(' ')[0]}</h1>
                <p className="text-gray-500 mt-1">Aquí tienes un resumen rápido de tu espacio de trabajo.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <StatCard icon={UsersIcon} title="Total Alumnos" value={students.length} color="#3b82f6" />
                <StatCard icon={GroupIcon} title="Grupos de Práctica" value={practiceGroups.length} color="#10b981" />
                <StatCard icon={RefreshCwIcon} title="Rotación Brigada" value="Equitativa" color="#059669" />
                <StatCard icon={ClipboardListIcon} title="Servicios Planificados" value={services.length} color="#f59e0b" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Acciones Rápidas</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ActionCard icon={PencilIcon} title="Exámenes Teóricos" description="Poner notas teóricas rápidamente" onClick={() => setIsExamModalOpen(true)} color="#2563eb" />
                        <ActionCard icon={RefreshCwIcon} title="Rotación Brigada" description="Matriz equitativa y sugerencias" onClick={() => onNavigate('pc-rotacion-brigada')} color="#059669" />
                        <ActionCard icon={ChefHatIcon} title="Modo Tablet / Examen" description="Evaluación en directo y cronómetro" onClick={() => onNavigate('pc-examenes-practicos')} color="#dc2626" />
                        <ActionCard icon={CalendarPlusIcon} title="Planificar Servicios" description="Organiza las clases prácticas" onClick={() => onNavigate('pc-gestion-practica')} color="#f59e0b" />
                        <ActionCard icon={GestionAcademicaIcon} title="Gestión Académica" description="Centraliza todas las notas" onClick={() => onNavigate('gestion-academica')} color="#8b5cf6" />
                        <ActionCard icon={UsersIcon} title="Evaluación Proyecto" description="Notas grupales e individuales" onClick={() => onNavigate('proyecto-evaluacion')} color="#7c3aed" />
                        <ActionCard icon={UsersIcon} title="Gestionar Alumnos" description="Visualiza y edita las fichas" onClick={() => onNavigate('alumnos')} color="#3b82f6" />
                        <ActionCard icon={SettingsIcon} title="Ajustes y Backups" description="Configura y guarda tus datos" onClick={() => onNavigate('gestion-app')} color="#6b7280" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-gray-800">Servicios Planificados</h2>
                        <button
                            onClick={() => onNavigate('pc-gestion-practica')}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                        >
                            Ver todos ({services.length}) &rarr;
                        </button>
                    </div>
                    {services.length === 0 ? (
                        <div className="text-center py-10 my-auto">
                            <p className="text-gray-500 mb-3">No hay servicios planificados todavía.</p>
                            <button
                                onClick={() => onNavigate('pc-gestion-practica')}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition"
                            >
                                Planificar Primer Servicio
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
                            {[...services]
                                .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())
                                .slice(0, 5)
                                .map(service => {
                                    const formattedDate = service.date
                                        ? new Date(service.date.replace(/-/g, '/')).toLocaleDateString('es-ES', {
                                            day: '2-digit', month: 'short', year: 'numeric'
                                        })
                                        : 'Sin fecha';
                                    const elabCount = ((service.elaborations?.comedor || []).length) + ((service.elaborations?.takeaway || []).length);
                                    return (
                                        <div
                                            key={service.id}
                                            onClick={() => {
                                                if (onNavigateToService) {
                                                    onNavigateToService(service.id, 'planning');
                                                } else {
                                                    onNavigate('pc-gestion-practica');
                                                }
                                            }}
                                            className="p-3.5 border border-gray-100 rounded-lg hover:border-blue-200 hover:bg-blue-50/50 transition cursor-pointer flex items-center justify-between group"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="flex items-center space-x-2">
                                                    <h3 className="font-semibold text-gray-800 text-sm truncate group-hover:text-blue-600">
                                                        {service.name}
                                                    </h3>
                                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                                        {service.trimester?.toUpperCase() || 'T1'}
                                                    </span>
                                                    {service.isLocked && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                                            Bloqueado
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5 flex items-center space-x-2">
                                                    <span>📅 {formattedDate}</span>
                                                    <span>•</span>
                                                    <span>{service.type === 'agrupacion' ? `${service.agrupaciones?.length || 0} agrupaciones` : `${(service.assignedGroups?.comedor?.length || 0) + (service.assignedGroups?.takeaway?.length || 0)} grupos`}</span>
                                                    <span>•</span>
                                                    <span>{elabCount} platos</span>
                                                </p>
                                            </div>
                                            <span className="text-blue-600 text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
                                                Abrir &rarr;
                                            </span>
                                        </div>
                                    );
                                })}
                            {services.length > 5 && (
                                <button
                                    onClick={() => onNavigate('pc-gestion-practica')}
                                    className="w-full text-center py-2 text-xs font-medium text-gray-500 hover:text-blue-600 transition"
                                >
                                    Ver {services.length - 5} servicios más en Planificación Práctica
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <footer className="mt-12 text-center text-sm text-gray-500">
                 <p>Desarrollado por {teacherData.name}</p>
                 <p><a href={`mailto:${teacherData.email}`} className="hover:underline">{teacherData.email}</a></p>
            </footer>

            <ModalNotasExamenesTeoricos
                isOpen={isExamModalOpen}
                onClose={() => setIsExamModalOpen(false)}
                module="pc"
            />
        </div>
    );
};

export default DashboardView;
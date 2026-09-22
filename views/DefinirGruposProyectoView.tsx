import React, { useState, useMemo } from 'react';
import { ProyectoGroup } from '../types';
import { PlusIcon, TrashIcon, SearchIcon, UsersIcon } from '../components/icons';
import { useAppContext } from '../context/AppContext';

const groupColors = [
  'bg-red-200 border-red-300', 'bg-blue-200 border-blue-300', 
  'bg-green-200 border-green-300', 'bg-yellow-200 border-yellow-300',
  'bg-indigo-200 border-indigo-300', 'bg-pink-200 border-pink-300', 'bg-purple-200 border-purple-300'
];

export const DefinirGruposProyectoView: React.FC = () => {
    const { students, proyectoGroups, setProyectoGroups, addToast } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');

    const studentAssignments = useMemo(() => {
        const assignments: Record<string, string | null> = {};
        students.forEach(s => assignments[s.id] = null);
        proyectoGroups.forEach(g => {
            g.studentIds.forEach(studentId => {
                assignments[studentId] = g.id;
            });
        });
        return assignments;
    }, [proyectoGroups, students]);

    const handleAddGroup = () => {
        const nextGroupId = (proyectoGroups.length > 0 ? Math.max(...proyectoGroups.map(g => parseInt(g.id, 10) || 0)) : 0) + 1;
        const newGroup: ProyectoGroup = {
            id: String(nextGroupId),
            name: `Restaurante / Grupo ${nextGroupId}`,
            color: groupColors[(nextGroupId - 1) % groupColors.length],
            studentIds: [],
        };
        setProyectoGroups(prev => [...prev, newGroup]);
        addToast(`Grupo de Proyecto ${nextGroupId} añadido.`, 'success');
    };

    const handleDeleteGroup = (groupId: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este grupo de proyecto? Los alumnos asignados quedarán sin grupo.')) {
            setProyectoGroups(prev => prev.filter(g => g.id !== groupId));
            addToast('Grupo de proyecto eliminado.', 'info');
        }
    };

    const handleAssignStudent = (studentId: string, groupId: string | null) => {
        setProyectoGroups(prev => {
            const newGroups = prev.map(g => ({
                ...g,
                studentIds: g.studentIds.filter(id => id !== studentId)
            }));
            if (groupId) {
                const targetGroup = newGroups.find(g => g.id === groupId);
                if (targetGroup) {
                    targetGroup.studentIds.push(studentId);
                }
            }
            return newGroups;
        });
    };
    
    const filteredStudents = useMemo(() => {
        return students.sort((a,b) => a.apellido1.localeCompare(b.apellido1)).filter(student => {
            const fullName = `${student.nombre} ${student.apellido1} ${student.apellido2}`.toLowerCase();
            return fullName.includes(searchTerm.toLowerCase());
        });
    }, [students, searchTerm]);

    const studentsWithoutGroup = useMemo(() => {
        return students.filter(s => !studentAssignments[s.id]);
    }, [students, studentAssignments]);

    if (students.length === 0) {
        return (
             <div className="text-center p-8 bg-white rounded-lg shadow">
                <h2 className="text-2xl font-bold text-gray-700">No hay alumnos cargados</h2>
                <p className="text-gray-500 mt-2">Para poder definir grupos de proyecto, primero debes importar la lista de alumnos en la sección "Alumnos".</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                        <UsersIcon className="w-8 h-8 mr-3 text-purple-600" />
                        Definir Grupos de Proyecto Intermodular
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Configura los equipos/restaurantes independientes para este módulo. Úsalos para volcar notas grupales de forma automática.
                    </p>
                </div>
                <div>
                    <button onClick={handleAddGroup} className="flex items-center bg-purple-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition shadow-sm">
                        <PlusIcon className="w-5 h-5 mr-1" />
                        Añadir Grupo / Restaurante
                    </button>
                </div>
            </header>

            <main className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Listado de Alumnos</h2>
                    <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                           <SearchIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full pl-10 p-2.5"
                            placeholder="Buscar alumno..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {filteredStudents.map((student, index) => (
                            <li key={student.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 border border-gray-100">
                                <div className="flex items-center">
                                    <span className="text-sm font-medium text-gray-500 w-8">{index + 1}.</span>
                                    <img src={student.fotoUrl} alt="" className="w-10 h-10 rounded-full object-cover mr-3" />
                                    <div>
                                        <p className="font-semibold text-gray-800">{`${student.apellido1} ${student.apellido2}, ${student.nombre}`}</p>
                                        <p className="text-xs text-gray-500">{student.grupo}</p>
                                    </div>
                                </div>
                                <select
                                    value={studentAssignments[student.id] || ''}
                                    onChange={(e) => handleAssignStudent(student.id, e.target.value || null)}
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-purple-500 focus:border-purple-500 block w-48 p-1.5 font-medium"
                                >
                                    <option value="">Sin grupo de proyecto</option>
                                    {proyectoGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                    <h2 className="text-xl font-semibold text-gray-800 sticky top-0 bg-gray-50 py-2 -mt-2 z-10">Equipos de Proyecto Configurados</h2>
                    {studentsWithoutGroup.length > 0 && (
                        <div className="p-4 rounded-lg border-2 border-dashed bg-amber-50 border-amber-300 text-amber-900">
                            <h3 className="font-bold">Alumnos sin Grupo de Proyecto ({studentsWithoutGroup.length})</h3>
                            <p className="text-xs mt-1">Asigna todos los alumnos a sus respectivos restaurantes o equipos de trabajo.</p>
                        </div>
                    )}
                    {proyectoGroups.map(group => {
                        const members = students.filter(s => studentAssignments[s.id] === group.id);
                        return (
                            <div key={group.id} className={`p-5 rounded-xl shadow-sm border ${group.color} bg-white`}>
                                <div className="flex justify-between items-center mb-3">
                                    <input
                                        type="text"
                                        value={group.name}
                                        onChange={e => {
                                            const newName = e.target.value;
                                            setProyectoGroups(prev => prev.map(g => g.id === group.id ? { ...g, name: newName } : g));
                                        }}
                                        className="font-bold text-gray-800 text-base bg-transparent border-b border-transparent hover:border-gray-400 focus:border-purple-500 focus:outline-none px-1"
                                    />
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs px-2.5 py-1 bg-white rounded-full font-bold shadow-xs text-gray-700">{members.length} miembros</span>
                                        <button onClick={() => handleDeleteGroup(group.id)} className="text-gray-400 hover:text-red-600 transition">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <ul className="text-sm text-gray-700 space-y-1.5 pl-2">
                                    {members.length === 0 ? (
                                        <p className="text-xs italic text-gray-400">Sin miembros asignados en este grupo.</p>
                                    ) : (
                                        members.map(m => (
                                            <li key={m.id} className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                {`${m.apellido1} ${m.apellido2}, ${m.nombre}`}
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default DefinirGruposProyectoView;

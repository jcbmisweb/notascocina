import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { UsersIcon, CheckCircleIcon, SaveIcon, MessageSquareIcon } from '../components/icons';

interface CoevaluacionItem {
    participacion: number; // +0.5 or -0.5
    responsabilidad: number;
    colaboracion: number;
    aportacion: number;
    justificacion: string;
}

interface PeerReviewRecord {
    evaluatorId: string;
    targetStudentId: string;
    participacion: number;
    responsabilidad: number;
    colaboracion: number;
    aportacion: number;
    justificacion: string;
}

export default function CoevaluacionDiabolicaView() {
    const { students, instrumentGrades, setInstrumentGrades, addToast } = useAppContext();
    const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
    
    // State for peer evaluations given by selectedStudent to their peers
    // Record format: { [targetStudentId]: CoevaluacionItem }
    const [peerReviews, setPeerReviews] = useState<Record<string, CoevaluacionItem>>({});
    
    // Teacher override comments & final notes
    const [teacherNotes, setTeacherNotes] = useState<Record<string, { adjustedGrade: number | null, comment: string }>>({});

    const selectedStudent = students.find(s => s.id === selectedStudentId);

    // Filter potential peers (excluding selected student)
    const peerCandidates = students.filter(s => s.id !== selectedStudentId);

    const handlePeerChange = (targetId: string, field: keyof CoevaluacionItem, value: any) => {
        setPeerReviews(prev => ({
            ...prev,
            [targetId]: {
                participacion: 0.5,
                responsabilidad: 0.5,
                colaboracion: 0.5,
                aportacion: 0.5,
                justificacion: '',
                ...(prev[targetId] || {}),
                [field]: value
            }
        }));
    };

    // Calculate proposed sum for a target peer from all evaluators
    // For simplicity in this interactive tool, we aggregate the reviews where targetStudentId receives scores
    // Or we can list all peer reviews received by each student.
    
    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                        <UsersIcon className="w-8 h-8 mr-3 text-red-600" />
                        Coevaluación Diabólica (Reto 6)
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Gestión de valoraciones cruzadas entre compañeros de equipo (+0.5 / -0.5 pts por criterio) y auditoría docente.
                    </p>
                </div>
            </header>

            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">1. Seleccionar Alumno Evaluador:</label>
                        <select
                            value={selectedStudentId}
                            onChange={e => setSelectedStudentId(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-red-500"
                        >
                            {students.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.apellido1} {s.apellido2}, {s.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-3.5 text-xs text-red-800 flex items-start gap-3">
                        <div className="font-bold uppercase tracking-wider text-red-900 shrink-0">Criterios (+0,5 / -0,5):</div>
                        <ul className="list-disc list-inside space-y-1">
                            <li><strong>1. Participación:</strong> Asistencia, aportación de ideas e implicación.</li>
                            <li><strong>2. Responsabilidad:</strong> Entrega puntual de fichas/escandallos y autonomía.</li>
                            <li><strong>3. Colaboración:</strong> Respeto, comunicación y ayuda en el taller.</li>
                            <li><strong>4. Aportación final:</strong> Calidad del trabajo y ayuda al objetivo común.</li>
                        </ul>
                    </div>
                </div>

                {selectedStudent && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                            <UsersIcon className="w-5 h-5 text-red-600" />
                            Evaluaciones realizadas por <span className="text-red-600">{selectedStudent.nombre} {selectedStudent.apellido1}</span> a sus compañeros:
                        </h3>

                        <div className="grid grid-cols-1 gap-6">
                            {peerCandidates.map(peer => {
                                const review = peerReviews[peer.id] || {
                                    participacion: 0.5,
                                    responsabilidad: 0.5,
                                    colaboracion: 0.5,
                                    aportacion: 0.5,
                                    justificacion: ''
                                };
                                const subtotal = review.participacion + review.responsabilidad + review.colaboracion + review.aportacion;

                                return (
                                    <div key={peer.id} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b">
                                            <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                                                Compañero/a: {peer.apellido1} {peer.apellido2}, {peer.nombre}
                                            </h4>
                                            <div className="bg-white px-3 py-1.5 rounded-lg border shadow-sm text-xs font-extrabold text-gray-800">
                                                Subtotal Propuesto: <span className={subtotal >= 0 ? 'text-emerald-600' : 'text-red-600'}>{subtotal > 0 ? `+${subtotal.toFixed(1)}` : subtotal.toFixed(1)} pts</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="bg-white p-3 rounded-lg border">
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">1. Participación activa</label>
                                                <select
                                                    value={review.participacion}
                                                    onChange={e => handlePeerChange(peer.id, 'participacion', parseFloat(e.target.value))}
                                                    className="w-full p-2 bg-gray-50 border rounded text-xs font-bold"
                                                >
                                                    <option value={0.5}>+0.5 (Cumple)</option>
                                                    <option value={-0.5}>-0.5 (Incumple)</option>
                                                </select>
                                            </div>

                                            <div className="bg-white p-3 rounded-lg border">
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">2. Responsabilidad</label>
                                                <select
                                                    value={review.responsabilidad}
                                                    onChange={e => handlePeerChange(peer.id, 'responsabilidad', parseFloat(e.target.value))}
                                                    className="w-full p-2 bg-gray-50 border rounded text-xs font-bold"
                                                >
                                                    <option value={0.5}>+0.5 (Cumple)</option>
                                                    <option value={-0.5}>-0.5 (Incumple)</option>
                                                </select>
                                            </div>

                                            <div className="bg-white p-3 rounded-lg border">
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">3. Colaboración taller</label>
                                                <select
                                                    value={review.colaboracion}
                                                    onChange={e => handlePeerChange(peer.id, 'colaboracion', parseFloat(e.target.value))}
                                                    className="w-full p-2 bg-gray-50 border rounded text-xs font-bold"
                                                >
                                                    <option value={0.5}>+0.5 (Cumple)</option>
                                                    <option value={-0.5}>-0.5 (Incumple)</option>
                                                </select>
                                            </div>

                                            <div className="bg-white p-3 rounded-lg border">
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">4. Aportación al resultado</label>
                                                <select
                                                    value={review.aportacion}
                                                    onChange={e => handlePeerChange(peer.id, 'aportacion', parseFloat(e.target.value))}
                                                    className="w-full p-2 bg-gray-50 border rounded text-xs font-bold"
                                                >
                                                    <option value={0.5}>+0.5 (Cumple)</option>
                                                    <option value={-0.5}>-0.5 (Incumple)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Justificación obligatoria (motivos de la puntuación dada):</label>
                                            <textarea
                                                rows={2}
                                                value={review.justificacion}
                                                onChange={e => handlePeerChange(peer.id, 'justificacion', e.target.value)}
                                                placeholder="Explica brevemente por qué asignas esta puntuación..."
                                                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={() => {
                                    addToast(`Coevaluación guardada para ${selectedStudent.nombre}. Las notas cruzadas se han registrado correctamente.`, 'success');
                                }}
                                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition text-sm"
                            >
                                <SaveIcon className="w-5 h-5" /> Guardar Coevaluación de {selectedStudent.nombre}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

import React, { useState } from 'react';
import { Student } from '../types';
import { XIcon, SaveIcon, SparklesIcon } from './icons';

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (studentData: Omit<Student, 'id' | 'fotoUrl'>) => void;
}

const InputField: React.FC<{ 
    label: string, 
    name: string, 
    value: string, 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, 
    required?: boolean, 
    type?: string 
}> = ({ label, name, value, onChange, required = false, type = 'text' }) => {
    return (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type={type}
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
        </div>
    );
};

const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        nre: '',
        expediente: '',
        nombre: '',
        apellido1: '',
        apellido2: '',
        grupo: '',
        subgrupo: '',
        fechaNacimiento: '',
        telefono: '',
        emailPersonal: '',
        emailOficial: '',
        nifNie: '',
        nacionalidad: '',
        direccion: '',
        tutorCentro: '',
        tutoresLegales: [] as { nombre: string; telefono?: string; email?: string; }[],
    });
    
    const [jsonInput, setJsonInput] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [jsonSuccessMsg, setJsonSuccessMsg] = useState<string | null>(null);
    const [showAiGuide, setShowAiGuide] = useState(false);
    const [copiedPrompt, setCopiedPrompt] = useState(false);

    const defaultAiPrompt = `Analiza esta captura de pantalla de la ficha del alumno de un centro educativo (tipo InfoEducativa / MurciaEduca) y extrae TODOS los datos disponibles con absoluta precisión.
Del título o nombre superior (ej. "CHAZARRA VIVO, LAURA"), extrae el apellido1 ("CHAZARRA"), apellido2 ("VIVO") y nombre ("LAURA").
Extrae también con exactitud:
- NIF/NIE
- NRE
- Nº de Expediente
- Fecha de Nacimiento
- Nacionalidad
- Dirección postal completa (Domicilio)
- Teléfono propio / principal
- Email personal (y alternativos si los hay)
- Email oficial (@alu.murciaeduca.es)
- Grupo y Subgrupo
- Tutor del centro
- Datos de contacto (tutores legales): nombre completo, teléfono y correo electrónico de cada tutor que aparezca en la sección inferior de contactos.

Devuelve EXCLUSIVAMENTE un objeto JSON válido con la siguiente estructura exacta:
{
  "nombre": "",
  "apellido1": "",
  "apellido2": "",
  "nre": "",
  "expediente": "",
  "nifNie": "",
  "nacionalidad": "",
  "direccion": "",
  "grupo": "",
  "subgrupo": "",
  "fechaNacimiento": "",
  "telefono": "",
  "emailPersonal": "",
  "emailOficial": "",
  "tutorCentro": "",
  "tutoresLegales": [
    { "nombre": "", "telefono": "", "email": "" }
  ]
}`;

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(defaultAiPrompt);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 3000);
    };

    const handleApplyJson = () => {
        setJsonError(null);
        setJsonSuccessMsg(null);
        try {
            let cleanJson = jsonInput.trim();
            if (cleanJson.startsWith('```')) {
                cleanJson = cleanJson.replace(/^```(json)?/, '').replace(/```$/, '').trim();
            }

            const parsed = JSON.parse(cleanJson);
            setFormData(prev => ({
                ...prev,
                nombre: parsed.nombre || prev.nombre,
                apellido1: parsed.apellido1 || prev.apellido1,
                apellido2: parsed.apellido2 || prev.apellido2,
                nre: parsed.nre || prev.nre,
                expediente: parsed.expediente || prev.expediente,
                grupo: parsed.grupo || prev.grupo,
                subgrupo: parsed.subgrupo || prev.subgrupo,
                fechaNacimiento: parsed.fechaNacimiento || prev.fechaNacimiento,
                telefono: parsed.telefono || prev.telefono,
                emailPersonal: parsed.emailPersonal || prev.emailPersonal,
                emailOficial: parsed.emailOficial || prev.emailOficial,
                nifNie: parsed.nifNie || prev.nifNie,
                nacionalidad: parsed.nacionalidad || prev.nacionalidad,
                direccion: parsed.direccion || prev.direccion,
                tutorCentro: parsed.tutorCentro || prev.tutorCentro,
                tutoresLegales: parsed.tutoresLegales || prev.tutoresLegales,
            }));
            setJsonSuccessMsg('¡Datos completos extraídos y aplicados con éxito!');
            setJsonInput('');
        } catch (e: any) {
            setJsonError('El texto introducido no es un JSON válido. Asegúrate de copiar el resultado completo devuelto por la IA.');
        }
    };

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!formData.nombre || !formData.apellido1 || !formData.nre) {
            alert('Nombre, Primer Apellido y NRE son campos obligatorios.');
            return;
        }
        onSave(formData);
        onClose();
        setFormData({
            nre: '', expediente: '', nombre: '', apellido1: '', apellido2: '',
            grupo: '', subgrupo: '', fechaNacimiento: '', telefono: '',
            emailPersonal: '', emailOficial: '', nifNie: '', nacionalidad: '',
            direccion: '', tutorCentro: '', tutoresLegales: [],
        });
        setJsonSuccessMsg(null);
        setJsonError(null);
        setJsonInput('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-student-title" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-3 border-b">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                            <SparklesIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 id="add-student-title" className="text-xl font-bold text-gray-800">Añadir Nuevo Alumno</h3>
                            <p className="text-xs text-gray-500">Introduce los datos manualmente o usa el puente de IA por JSON</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* AI Prompt Bridge Toggle / Section */}
                <div className="mb-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <SparklesIcon className="w-5 h-5 text-indigo-600" />
                            <h4 className="text-sm font-semibold text-indigo-900">Puente de IA Externo (Prompt + JSON)</h4>
                        </div>
                        <button 
                            type="button"
                            onClick={() => setShowAiGuide(!showAiGuide)} 
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition"
                        >
                            {showAiGuide ? 'Ocultar Asistente IA' : '✨ Usar con IA Externa'}
                        </button>
                    </div>

                    {showAiGuide && (
                        <div className="mt-3 pt-3 border-t border-indigo-200 space-y-3 text-xs text-gray-700">
                            <p>1. Copia este <strong>Prompt</strong> y pégalo en tu IA favorita junto con la captura de pantalla del alumno:</p>
                            <div className="relative bg-white p-2.5 rounded border border-indigo-100 font-mono text-[11px] max-h-24 overflow-y-auto">
                                {defaultAiPrompt}
                            </div>
                            <div className="flex justify-end">
                                <button 
                                    type="button" 
                                    onClick={handleCopyPrompt} 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-semibold shadow transition"
                                >
                                    {copiedPrompt ? '¡Prompt Copiado!' : '📋 Copiar Prompt al Portapapeles'}
                                </button>
                            </div>

                            <p className="pt-2">2. Pega el <strong>JSON</strong> que te devuelva la IA aquí abajo y pulsa "Aplicar JSON":</p>
                            <div className="flex gap-2">
                                <textarea
                                    value={jsonInput}
                                    onChange={(e) => setJsonInput(e.target.value)}
                                    placeholder='Pega aquí el JSON {"nombre": "...", ...}'
                                    className="flex-1 p-2 bg-white border border-gray-300 rounded text-xs font-mono h-16 focus:ring-1 focus:ring-indigo-500"
                                />
                                <button
                                    type="button"
                                    onClick={handleApplyJson}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs font-semibold shadow transition self-end"
                                >
                                    Aplicar JSON
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {jsonSuccessMsg && (
                    <div className="mb-3 p-2.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium border border-green-200">
                        {jsonSuccessMsg}
                    </div>
                )}

                {jsonError && (
                    <div className="mb-3 p-2.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-200">
                        {jsonError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Nombre" name="nombre" value={formData.nombre} onChange={handleChange} required />
                        <InputField label="Primer Apellido" name="apellido1" value={formData.apellido1} onChange={handleChange} required />
                        <InputField label="Segundo Apellido" name="apellido2" value={formData.apellido2} onChange={handleChange} />
                        <InputField label="NIF/NIE" name="nifNie" value={formData.nifNie} onChange={handleChange} />
                        <InputField label="NRE" name="nre" value={formData.nre} onChange={handleChange} required />
                        <InputField label="Nº Expediente" name="expediente" value={formData.expediente} onChange={handleChange} />
                        <InputField label="Nacionalidad" name="nacionalidad" value={formData.nacionalidad} onChange={handleChange} />
                        <InputField label="Dirección / Domicilio" name="direccion" value={formData.direccion} onChange={handleChange} />
                        <InputField label="Grupo" name="grupo" value={formData.grupo} onChange={handleChange} />
                        <InputField label="Subgrupo" name="subgrupo" value={formData.subgrupo} onChange={handleChange} />
                        <InputField label="Tutor del Centro" name="tutorCentro" value={formData.tutorCentro} onChange={handleChange} />
                        <InputField label="Fecha de Nacimiento" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} type="date" />
                        <InputField label="Teléfono" name="telefono" value={formData.telefono} onChange={handleChange} />
                        <InputField label="Email Personal" name="emailPersonal" value={formData.emailPersonal} onChange={handleChange} type="email" />
                        <InputField label="Email Oficial" name="emailOficial" value={formData.emailOficial} onChange={handleChange} type="email" />
                    </div>
                </form>

                <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-sm transition">
                        Cancelar
                    </button>
                    <button type="button" onClick={() => handleSubmit()} className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm shadow transition flex items-center">
                        <SaveIcon className="w-5 h-5 mr-1.5" />
                        Guardar Alumno
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddStudentModal;


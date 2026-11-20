import React, { useState, useMemo } from 'react';
import { Student, ResultadoAprendizaje } from '../types';
import StudentTable, { StudentWithModuleSummary, ModuleSummaryItem } from '../components/StudentTable';
import FileUpload from '../components/FileUpload';
import FichaAlumno from './FichaAlumno';
import AddStudentModal from '../components/AddStudentModal';
import { SearchIcon, UserPlusIcon } from '../components/icons';
import { useAppContext } from '../context/AppContext';
import {
  calculateRAGrade,
  calculateProyectoStudentAnalytics,
  getNumericValue,
  AnalyticsExtraContext,
} from '../services/academicAnalytics';
import {
  calculateStudentPeriodAverages,
  calculateModularGrades,
  calculateStudentPcGradeComplete,
} from '../services/gradeCalculator';

const AlumnosView: React.FC = () => {
  const {
    students,
    setStudents,
    pcResultadosAprendizaje,
    pcCriteriosEvaluacion,
    pcInstrumentosEvaluacion,
    optativaResultadosAprendizaje,
    optativaCriteriosEvaluacion,
    optativaInstrumentosEvaluacion,
    proyectoResultadosAprendizaje,
    proyectoCriteriosEvaluacion,
    proyectoInstrumentosEvaluacion,
    proyectoGroups,
    proyectoEvaluations,
    courseGrades,
    academicGrades,
    instrumentGrades,
    calculatedStudentGrades,
    femConfigs,
    pcFemSettings,
    isStudentConvalidated,
    handleFileUpload: contextHandleFileUpload,
    addToast,
    handleUpdateStudent,
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [initialFichaTab, setInitialFichaTab] = useState<string>('general');
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    await contextHandleFileUpload(file);
    setLoading(false);
  };

  const studentsWithModules = useMemo<StudentWithModuleSummary[]>(() => {
    const analyticsExtra: AnalyticsExtraContext = {
      proyectoGroups,
      proyectoEvaluations,
      courseGrades,
      pcInstrumentos: pcInstrumentosEvaluacion,
      optativaInstrumentos: optativaInstrumentosEvaluacion,
      proyectoInstrumentos: proyectoInstrumentosEvaluacion,
    };

    const pcRAs = Object.values(pcResultadosAprendizaje || {}) as ResultadoAprendizaje[];
    const optRAs = Object.values(optativaResultadosAprendizaje || {}) as ResultadoAprendizaje[];
    const proyRAs = Object.values(proyectoResultadosAprendizaje || {}) as ResultadoAprendizaje[];

    const computeRAStats = (
      ras: ResultadoAprendizaje[],
      studentId: string,
      mod: 'pc' | 'optativa' | 'proyecto',
      criterios: any
    ) => {
      let evaluatedCount = 0;
      const grades: number[] = [];
      ras.forEach(ra => {
        const { grade } = calculateRAGrade(
          ra,
          studentId,
          mod,
          criterios,
          academicGrades,
          instrumentGrades,
          calculatedStudentGrades,
          analyticsExtra
        );
        if (grade !== null && !isNaN(grade)) {
          evaluatedCount++;
          grades.push(grade);
        }
      });
      const raAverage =
        grades.length > 0
          ? parseFloat((grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2))
          : null;
      return {
        raEvaluatedCount: evaluatedCount,
        raTotalCount: ras.length,
        raAverage,
      };
    };

    return students.map(student => {
      // 1. Productos Culinarios (PC)
      const pcConvalidated = isStudentConvalidated(student.id, 'pc');
      const periodAverages = calculateStudentPeriodAverages(
        academicGrades[student.id],
        calculatedStudentGrades[student.id],
        student.id,
        instrumentGrades,
        pcInstrumentosEvaluacion
      );
      const pcComplete = calculateStudentPcGradeComplete(
        periodAverages,
        femConfigs[student.id],
        pcFemSettings
      );
      const pcRAStats = computeRAStats(pcRAs, student.id, 'pc', pcCriteriosEvaluacion);

      const pcSummary: ModuleSummaryItem = {
        moduleKey: 'pc',
        label: 'Productos Culinarios',
        isConvalidated: pcConvalidated,
        finalGrade: pcComplete.finalGrade,
        ...pcRAStats,
        details: [
          { label: 'T1', value: periodAverages.t1 !== null && periodAverages.t1 !== undefined ? periodAverages.t1.toFixed(2) : '-' },
          { label: 'T2', value: periodAverages.t2 !== null && periodAverages.t2 !== undefined ? periodAverages.t2.toFixed(2) : '-' },
          ...(periodAverages.rec !== null && periodAverages.rec !== undefined
            ? [{ label: 'REC', value: periodAverages.rec.toFixed(2) }]
            : []),
        ],
      };

      // 2. Optativa (Cocina Sostenible)
      const optConvalidated = isStudentConvalidated(student.id, 'optativa');
      const optMod = calculateModularGrades(
        student.id,
        instrumentGrades,
        optativaInstrumentosEvaluacion,
        calculatedStudentGrades[student.id]
      );
      const optManual =
        courseGrades[student.id]?.['Optativa'] ||
        courseGrades[student.id]?.['optativa'] ||
        courseGrades[student.id]?.['Optativo'] ||
        courseGrades[student.id]?.['optativo'] ||
        {};
      const optT1 = optMod.t1 ?? getNumericValue(optManual.t1);
      const optT2 = optMod.t2 ?? getNumericValue(optManual.t2);
      const optRec = getNumericValue(optManual.rec);
      const optValid = [optT1, optT2].filter((v): v is number => v !== null && !isNaN(v));
      const optComputedFinal =
        optRec !== null
          ? optRec
          : optMod.final !== null
            ? parseFloat(optMod.final.toFixed(2))
            : optValid.length > 0
              ? parseFloat((optValid.reduce((a, b) => a + b, 0) / optValid.length).toFixed(2))
              : getNumericValue((optManual as any).final);
      const optRAStats = computeRAStats(optRAs, student.id, 'optativa', optativaCriteriosEvaluacion);

      const optSummary: ModuleSummaryItem = {
        moduleKey: 'optativa',
        label: 'Optativa',
        isConvalidated: optConvalidated,
        finalGrade: optComputedFinal,
        ...optRAStats,
        details: [
          { label: 'T1', value: optT1 !== null ? optT1.toFixed(2) : '-' },
          { label: 'T2', value: optT2 !== null ? optT2.toFixed(2) : '-' },
          ...(optRec !== null ? [{ label: 'REC', value: optRec.toFixed(2) }] : []),
        ],
      };

      // 3. Proyecto Intermodular
      const proyConvalidated = isStudentConvalidated(student.id, 'proyecto');
      const proyAnalytics = calculateProyectoStudentAnalytics(
        student.id,
        proyectoGroups,
        proyectoEvaluations,
        courseGrades
      );
      const totalRetos = proyectoEvaluations?.customConfig?.retos?.length || 8;
      const proyGroup = proyectoGroups.find(g => (g.studentIds || []).includes(student.id));
      const proyRAStats = computeRAStats(proyRAs, student.id, 'proyecto', proyectoCriteriosEvaluacion);

      const proySummary: ModuleSummaryItem = {
        moduleKey: 'proyecto',
        label: 'Proyecto Intermodular',
        isConvalidated: proyConvalidated,
        finalGrade: proyAnalytics.finalGrade,
        ...proyRAStats,
        details: [
          { label: 'Retos', value: `${proyAnalytics.retosCompletadosCount}/${totalRetos}` },
          ...(proyGroup ? [{ label: 'Equipo', value: proyGroup.name }] : []),
        ],
      };

      return {
        ...student,
        modulesSummary: {
          pc: pcSummary,
          optativa: optSummary,
          proyecto: proySummary,
        },
      };
    });
  }, [
    students,
    pcResultadosAprendizaje,
    pcCriteriosEvaluacion,
    pcInstrumentosEvaluacion,
    optativaResultadosAprendizaje,
    optativaCriteriosEvaluacion,
    optativaInstrumentosEvaluacion,
    proyectoResultadosAprendizaje,
    proyectoCriteriosEvaluacion,
    proyectoInstrumentosEvaluacion,
    proyectoGroups,
    proyectoEvaluations,
    courseGrades,
    academicGrades,
    instrumentGrades,
    calculatedStudentGrades,
    femConfigs,
    pcFemSettings,
    isStudentConvalidated,
  ]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm) {
      return studentsWithModules;
    }
    const term = searchTerm.toLowerCase();
    return studentsWithModules.filter(student => {
      const fullName = `${student.nombre || ''} ${student.apellido1 || ''} ${student.apellido2 || ''}`.toLowerCase();
      return (
        fullName.includes(term) ||
        (student.nre || '').toLowerCase().includes(term) ||
        (student.grupo || '').toLowerCase().includes(term)
      );
    });
  }, [studentsWithModules, searchTerm]);

  const handleViewStudent = (student: Student, tab: string = 'general') => {
    setInitialFichaTab(tab);
    setSelectedStudent(student);
  };

  const handleBackToList = () => {
    setSelectedStudent(null);
  };

  const handleUpdatePhoto = (studentId: string, photoUrl: string) => {
    setStudents(prev => prev.map(s => (s.id === studentId ? { ...s, fotoUrl: photoUrl } : s)));
    if (selectedStudent?.id === studentId) {
      setSelectedStudent(prev => (prev ? { ...prev, fotoUrl: photoUrl } : null));
    }
    addToast('Foto del alumno actualizada.', 'success');
  };

  const handleSaveNewStudent = (newStudentData: Omit<Student, 'id' | 'fotoUrl'>) => {
    const newStudent: Student = {
      ...newStudentData,
      id: `${newStudentData.nre}-${Date.now()}`,
      fotoUrl: `https://picsum.photos/seed/${newStudentData.nre || Date.now()}/200`,
    };
    setStudents(prev => [...prev, newStudent].sort((a, b) => a.apellido1.localeCompare(b.apellido1)));
    addToast('Alumno añadido con éxito.', 'success');
  };

  const handleSaveStudent = (updatedStudent: Student) => {
    handleUpdateStudent(updatedStudent);
    setSelectedStudent(updatedStudent);
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar al alumno "${studentName}"?`)) {
      if (
        window.confirm(
          `⚠️ ADVERTENCIA: Esta acción eliminará permanentemente al alumno "${studentName}" y todos sus datos asociados. ¿Confirmas la eliminación definitiva?`
        )
      ) {
        setStudents(prev => prev.filter(s => s.id !== studentId));
        if (selectedStudent?.id === studentId) {
          setSelectedStudent(null);
        }
        addToast(`Alumno "${studentName}" eliminado correctamente.`, 'success');
      }
    }
  };

  if (selectedStudent) {
    return (
      <FichaAlumno
        student={selectedStudent}
        initialTab={initialFichaTab}
        onBack={handleBackToList}
        onUpdatePhoto={handleUpdatePhoto}
        onUpdateStudent={handleSaveStudent}
      />
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard de Clase</h1>
        <p className="text-gray-500 mt-1">
          Visualiza el rendimiento de tus alumnos en los tres módulos y accede al detalle de sus RAs dentro de cada ficha.
        </p>
      </header>

      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-grow sm:flex-grow-0 sm:w-72">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <SearchIcon className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
            placeholder="Buscar por nombre, NRE, grupo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center bg-green-500 text-white px-3 py-2 rounded-lg font-semibold hover:bg-green-600 transition text-sm"
          >
            <UserPlusIcon className="w-5 h-5 mr-1" />
            Nuevo Alumno
          </button>
        </div>
      </div>

      {students.length === 0 && (
        <div className="mt-8">
          <h3 className="text-center text-xl font-semibold text-gray-600 mb-4">No hay datos de alumnos.</h3>
          <p className="text-center text-gray-500 mb-6">
            Sube un archivo Excel para empezar a gestionar a tus estudiantes.
          </p>
          <div className="max-w-xl mx-auto">
            <FileUpload onFileUpload={handleFileUpload} disabled={loading} />
            {loading && <p className="text-center mt-4 text-blue-500">Procesando archivo...</p>}
          </div>
        </div>
      )}

      {students.length > 0 && filteredStudents.length === 0 && (
        <div className="text-center py-10">
          <p className="text-lg text-gray-600">No se encontraron alumnos con el criterio de búsqueda.</p>
        </div>
      )}

      {students.length > 0 && filteredStudents.length > 0 && (
        <StudentTable
          students={filteredStudents}
          onViewStudent={handleViewStudent}
          onDeleteStudent={handleDeleteStudent}
        />
      )}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveNewStudent}
      />
    </div>
  );
};

export default AlumnosView;
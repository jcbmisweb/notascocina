import React from 'react';
import { Student } from '../types';
import { TrashIcon } from './icons';
import StudentAvatar, { formatStudentFullName } from './StudentAvatar';

export interface ModuleSummaryItem {
  moduleKey: 'pc' | 'optativa' | 'proyecto';
  label: string;
  isConvalidated: boolean;
  finalGrade: number | null;
  raEvaluatedCount: number;
  raTotalCount: number;
  raAverage: number | null;
  details: { label: string; value: string }[];
}

export type StudentWithModuleSummary = Student & {
  modulesSummary: {
    pc: ModuleSummaryItem;
    optativa: ModuleSummaryItem;
    proyecto: ModuleSummaryItem;
  };
};

interface StudentTableProps {
  students: StudentWithModuleSummary[];
  onViewStudent: (student: Student, tab?: string) => void;
  onDeleteStudent: (studentId: string, studentName: string) => void;
}

const MODULE_STYLES: Record<
  'pc' | 'optativa' | 'proyecto',
  { accent: string; border: string; badgeBg: string; titleColor: string }
> = {
  pc: {
    accent: 'border-l-blue-500',
    border: 'border-blue-100',
    badgeBg: 'bg-blue-50 text-blue-700',
    titleColor: 'text-blue-900',
  },
  optativa: {
    accent: 'border-l-emerald-500',
    border: 'border-emerald-100',
    badgeBg: 'bg-emerald-50 text-emerald-700',
    titleColor: 'text-emerald-900',
  },
  proyecto: {
    accent: 'border-l-purple-500',
    border: 'border-purple-100',
    badgeBg: 'bg-purple-50 text-purple-700',
    titleColor: 'text-purple-900',
  },
};

const renderGradeCell = (mod: ModuleSummaryItem) => {
  if (mod.isConvalidated) {
    return (
      <span className="inline-block px-2 py-0.5 text-[11px] font-bold rounded bg-green-100 text-green-700">
        CONVAL.
      </span>
    );
  }
  if (mod.finalGrade === null || mod.finalGrade === undefined || isNaN(mod.finalGrade)) {
    return <span className="text-gray-400 font-medium">-</span>;
  }
  const colorClass = mod.finalGrade < 5 ? 'text-red-600' : 'text-green-600';
  return <span className={`font-bold ${colorClass}`}>{mod.finalGrade.toFixed(2)}</span>;
};

const StudentTable: React.FC<StudentTableProps> = ({
  students,
  onViewStudent,
  onDeleteStudent,
}) => {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-500">
          <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Alumno</th>
              <th scope="col" className="px-4 py-3">NRE</th>
              <th scope="col" className="px-4 py-3">Grupo</th>
              <th scope="col" className="px-3 py-3 text-center">Prod. Culinarios</th>
              <th scope="col" className="px-3 py-3 text-center">Optativa</th>
              <th scope="col" className="px-3 py-3 text-center">Proyecto</th>
              <th scope="col" className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => {
              const { modulesSummary, ...studentData } = student;
              const fullName = formatStudentFullName(studentData);
              const isEven = index % 2 === 0;
              const trBg = isEven ? 'bg-white' : 'bg-gray-50';
              const tdBg = isEven ? 'bg-gray-50/70' : 'bg-gray-100/70';

              const moduleList: ModuleSummaryItem[] = [
                modulesSummary.pc,
                modulesSummary.optativa,
                modulesSummary.proyecto,
              ];

              return (
                <React.Fragment key={student.id}>
                  <tr className={`${trBg} border-t hover:bg-blue-50/60 transition`}>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <StudentAvatar student={studentData} size="md" />
                        <span className="font-semibold text-gray-900">{fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{studentData.nre}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{studentData.grupo}</td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {renderGradeCell(modulesSummary.pc)}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {renderGradeCell(modulesSummary.optativa)}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {renderGradeCell(modulesSummary.proyecto)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => onViewStudent(studentData, 'general')}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          Ver Ficha
                        </button>
                        <button
                          onClick={() => onViewStudent(studentData, 'ra')}
                          className="font-semibold text-indigo-600 hover:underline text-xs"
                          title="Ver barras de RA de los tres módulos dentro de la ficha"
                        >
                          Ver RAs
                        </button>
                        <button
                          onClick={() => onDeleteStudent(studentData.id, fullName)}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition flex items-center"
                          title="Eliminar alumno"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr className={`${trBg} border-b`}>
                    <td colSpan={7} className={`px-4 py-3 ${tdBg}`}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {moduleList.map(mod => {
                          const style = MODULE_STYLES[mod.moduleKey];
                          return (
                            <div
                              key={mod.moduleKey}
                              onClick={() => onViewStudent(studentData, 'ra')}
                              className={`bg-white rounded-md border ${style.border} border-l-4 ${style.accent} px-3 py-2 cursor-pointer hover:shadow-xs transition flex flex-col justify-between gap-1`}
                              title="Haz clic para ver el detalle de RAs en la ficha del alumno"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-xs font-bold ${style.titleColor}`}>
                                  {mod.label}
                                </span>
                                {mod.isConvalidated ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">
                                    CONVALIDADO
                                  </span>
                                ) : (
                                  <span
                                    className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                                      mod.finalGrade === null
                                        ? 'bg-gray-100 text-gray-500'
                                        : mod.finalGrade < 5
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-green-100 text-green-700'
                                    }`}
                                  >
                                    Nota: {mod.finalGrade !== null ? mod.finalGrade.toFixed(2) : '-'}
                                  </span>
                                )}
                              </div>

                              {!mod.isConvalidated && (
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600">
                                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                                    {mod.details.map(d => (
                                      <span key={d.label}>
                                        <span className="text-gray-400">{d.label}:</span>{' '}
                                        <span className="font-semibold text-gray-700">{d.value}</span>
                                      </span>
                                    ))}
                                  </div>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${style.badgeBg}`}>
                                    RAs: {mod.raEvaluatedCount}/{mod.raTotalCount}
                                    {mod.raAverage !== null ? ` · Med ${mod.raAverage.toFixed(1)}` : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentTable;
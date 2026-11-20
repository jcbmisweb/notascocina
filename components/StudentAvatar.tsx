import React, { useState, useEffect } from 'react';
import { Student } from '../types';

export type StudentAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface StudentAvatarProps {
  student?: Partial<Pick<Student, 'nombre' | 'apellido1' | 'apellido2' | 'fotoUrl'>> | null;
  size?: StudentAvatarSize;
  className?: string;
}

const SIZE_CLASSES: Record<StudentAvatarSize, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-14 h-14 text-lg',
};

export const formatStudentFullName = (
  student?: Partial<Pick<Student, 'nombre' | 'apellido1' | 'apellido2'>> | null
): string => {
  if (!student) return 'Alumno';
  const surnames = `${student.apellido1 || ''} ${student.apellido2 || ''}`.trim();
  const name = (student.nombre || '').trim();
  if (surnames && name) return `${surnames}, ${name}`;
  return surnames || name || 'Alumno';
};

export const getStudentInitials = (
  student?: Partial<Pick<Student, 'nombre' | 'apellido1'>> | null
): string => {
  if (!student) return '?';
  const a = (student.apellido1 || '').trim().charAt(0);
  const n = (student.nombre || '').trim().charAt(0);
  return (n + a).toUpperCase() || '?';
};

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  student,
  size = 'sm',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [student?.fotoUrl]);

  const sizeClass = SIZE_CLASSES[size];
  const hasPhoto = Boolean(student?.fotoUrl && student.fotoUrl.trim() !== '' && !imgError);
  const fullName = formatStudentFullName(student);

  if (hasPhoto) {
    return (
      <img
        src={student!.fotoUrl}
        alt={`Foto de ${fullName}`}
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 border border-gray-200 bg-gray-100 ${className}`}
      />
    );
  }

  return (
    <div
      title={fullName}
      className={`${sizeClass} rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center flex-shrink-0 border border-indigo-200 select-none ${className}`}
    >
      {getStudentInitials(student)}
    </div>
  );
};

export default StudentAvatar;

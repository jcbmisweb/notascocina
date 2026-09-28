
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
    Student, PracticeGroup, Service, ServiceEvaluation, ServiceRole, EntryExitRecord, 
    AcademicGrades, CourseGrades, PracticalExamEvaluation, TeacherData, InstituteData, Toast, ToastType, StudentCalculatedGrades, TrimesterDates,
    ResultadoAprendizaje, CriterioEvaluacion, InstrumentoEvaluacion, Profesor, UnidadTrabajo, InstrumentGrades,
    FemConfigs, PcFemSettings, WorkshopPractice,
} from '../types';
import { parseFile } from '../services/csvParser';
import { auth, signInWithGoogle, logout } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';

import { pcResultadosAprendizaje as mockRA, pcCriteriosEvaluacion as mockCriterios, pcUnidadesTrabajo as mockUTs, pcInstrumentosEvaluacion as mockInstrumentos } from '../data/pc-data';
import { profesores as mockProfesores } from '../data/profesores-data';

import { optativaResultadosAprendizaje as optativaResultadosAprendizajeData, optativaCriteriosEvaluacion as optativaCriteriosEvaluacionData, optativaUnidadesTrabajo as optativaUnidadesTrabajoData, optativaInstrumentosEvaluacion as optativaInstrumentosEvaluacionData } from '../data/optativa-data';
import { proyectoResultadosAprendizaje as proyectoResultadosAprendizajeData, proyectoCriteriosEvaluacion as proyectoCriteriosEvaluacionData, proyectoUnidadesTrabajo as proyectoUnidadesTrabajoData, proyectoInstrumentosEvaluacion as proyectoInstrumentosEvaluacionData } from '../data/proyecto-data';

import { SERVICE_GRADE_WEIGHTS } from '../data/constants';


enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error';

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}


const setDocWithTimeout = (docRef: any, data: any, timeoutMs: number = 8000): Promise<void> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error("Timeout: Firebase no responde (Posible bloqueo de red o datos invalidos)."));
        }, timeoutMs);
        setDoc(docRef, data)
            .then(() => {
                clearTimeout(timer);
                resolve();
            })
            .catch((err: any) => {
                clearTimeout(timer);
                reject(err);
            });
    });
};

// --- Custom Hook for Local Storage with Offline Firestore Sync ---
function useSyncedState<T>(key: string, initialValue: T, user: User | null, setSyncStatus?: (status: SyncStatus) => void): [T, (val: T | ((curr: T) => T)) => void, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === 'undefined') {
          return initialValue;
      }
      const parsedItem = JSON.parse(item);
      if (parsedItem === null && initialValue !== null) {
          return initialValue;
      }
      if (key === 'services' && Array.isArray(parsedItem)) {
          return parsedItem.map((s: any) => ({
              ...s,
              type: s.type || 'normal'
          })) as unknown as T;
      }
      // Auto-reparación preventiva para criterios sin asociaciones o estructuras curriculares vacías
      if (key.includes('criteriosEvaluacion') && parsedItem && typeof parsedItem === 'object' && !Array.isArray(parsedItem)) {
          if (Object.keys(parsedItem).length === 0) return initialValue;
          const defaults = initialValue as unknown as Record<string, CriterioEvaluacion>;
          if (defaults && typeof defaults === 'object') {
              const healed: Record<string, CriterioEvaluacion> = { ...parsedItem };
              let changed = false;
              Object.keys(defaults).forEach(critId => {
                  if (!healed[critId]) {
                      healed[critId] = defaults[critId];
                      changed = true;
                  } else {
                      const itemCrit = healed[critId];
                      const defCrit = defaults[critId];
                      if (!itemCrit.asociaciones || itemCrit.asociaciones.length === 0) {
                          healed[critId] = { ...itemCrit, asociaciones: defCrit.asociaciones, raId: itemCrit.raId || defCrit.raId };
                          changed = true;
                      }
                  }
              });
              if (changed) {
                  try { window.localStorage.setItem(key, JSON.stringify(healed)); } catch(e) {}
                  return healed as unknown as T;
              }
          }
      }
      if ((key.includes('unidadesTrabajo') || key.includes('resultadosAprendizaje') || key.includes('instrumentosEvaluacion')) && 
          parsedItem && typeof parsedItem === 'object' && !Array.isArray(parsedItem) && Object.keys(parsedItem).length === 0) {
          return initialValue;
      }
      return parsedItem;
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  const setSyncedValue = (newValue: T | ((curr: T) => T)) => {
    setValue(prev => {
      const valueToStore = newValue instanceof Function ? newValue(prev) : newValue;
      
      let sanitizedValue = valueToStore;
      try {
          // Firebase rechaza valores "undefined". Pasarlo por JSON lo limpia.
          sanitizedValue = JSON.parse(JSON.stringify(valueToStore));
      } catch (e) {
          console.error("Error sanitizando datos para Firebase:", e);
      }

      try {
        window.localStorage.setItem(key, JSON.stringify(sanitizedValue));
      } catch (error) {
        console.error(error);
      }
      
      if (user) {
        if (setSyncStatus) setSyncStatus('syncing');
        try {
          setDocWithTimeout(doc(db, 'users', user.uid, 'data', key), {
            data: sanitizedValue,
            updatedAt: serverTimestamp()
          })
          .then(() => {
            if (setSyncStatus) setSyncStatus('synced');
          })
          .catch(err => {
            console.error(`Error setting doc for key ${key}:`, err);
            if (setSyncStatus) setSyncStatus('error');
          });
        } catch (syncErr) {
          console.error(`Error síncrono al iniciar setDoc para clave ${key}:`, syncErr);
          if (setSyncStatus) setSyncStatus('error');
        }
      }
      return valueToStore;
    });
  };

  return [value, setSyncedValue, setValue];
}

// Removed testConnection diagnostic function


// --- Custom Hook for Local Storage ---
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === 'undefined') {
          return initialValue;
      }
      const parsedItem = JSON.parse(item);

      if (parsedItem === null && initialValue !== null) {
          return initialValue;
      }

      // Si es una clave académica y está vacía en localStorage, garantizar los datos iniciales
      const isAcademicKey = key.includes('resultadosAprendizaje') || 
                            key.includes('criteriosEvaluacion') || 
                            key.includes('unidadesTrabajo') || 
                            key.includes('instrumentosEvaluacion');
      if (isAcademicKey && parsedItem && typeof parsedItem === 'object' && !Array.isArray(parsedItem) && Object.keys(parsedItem).length === 0) {
          if (initialValue && typeof initialValue === 'object' && Object.keys(initialValue as any).length > 0) {
              return initialValue;
          }
      }
      
      if (key === 'services' && Array.isArray(parsedItem)) {
          return parsedItem.map((s: any) => ({
              ...s,
              type: s.type || 'normal'
          })) as T;
      }

      return parsedItem;
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  };

  return [storedValue, setValue];
}

const defaultTrimesterDates: TrimesterDates = {
  t1: { start: '2025-09-01', end: '2025-12-22' },
  t2: { start: '2026-01-08', end: '2026-04-11' },
};


// --- App Context Definition ---
interface AppContextType {
    students: Student[];
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
    practiceGroups: PracticeGroup[];
    setPracticeGroups: React.Dispatch<React.SetStateAction<PracticeGroup[]>>;
    proyectoGroups: ProyectoGroup[];
    setProyectoGroups: React.Dispatch<React.SetStateAction<ProyectoGroup[]>>;
    services: Service[];
    setServices: React.Dispatch<React.SetStateAction<Service[]>>;
    workshopPractices: WorkshopPractice[];
    setWorkshopPractices: React.Dispatch<React.SetStateAction<WorkshopPractice[]>>;
    serviceEvaluations: ServiceEvaluation[];
    setServiceEvaluations: React.Dispatch<React.SetStateAction<ServiceEvaluation[]>>;
    serviceRoles: ServiceRole[];
    setServiceRoles: React.Dispatch<React.SetStateAction<ServiceRole[]>>;
    entryExitRecords: EntryExitRecord[];
    setEntryExitRecords: React.Dispatch<React.SetStateAction<EntryExitRecord[]>>;
    academicGrades: AcademicGrades;
    setAcademicGrades: React.Dispatch<React.SetStateAction<AcademicGrades>>;
    instrumentGrades: InstrumentGrades;
    setInstrumentGrades: React.Dispatch<React.SetStateAction<InstrumentGrades>>;
    courseGrades: CourseGrades;
    setCourseGrades: React.Dispatch<React.SetStateAction<CourseGrades>>;
    practicalExamEvaluations: PracticalExamEvaluation[];
    setPracticalExamEvaluations: React.Dispatch<React.SetStateAction<PracticalExamEvaluation[]>>;
    teacherData: TeacherData;
    setTeacherData: React.Dispatch<React.SetStateAction<TeacherData>>;
    instituteData: InstituteData;
    setInstituteData: React.Dispatch<React.SetStateAction<InstituteData>>;
    trimesterDates: TrimesterDates;
    setTrimesterDates: React.Dispatch<React.SetStateAction<TrimesterDates>>;
    
    // Module Data: PC
    pcResultadosAprendizaje: Record<string, ResultadoAprendizaje>;
    setPcResultadosAprendizaje: React.Dispatch<React.SetStateAction<Record<string, ResultadoAprendizaje>>>;
    pcCriteriosEvaluacion: Record<string, CriterioEvaluacion>;
    setPcCriteriosEvaluacion: React.Dispatch<React.SetStateAction<Record<string, CriterioEvaluacion>>>;
    pcInstrumentosEvaluacion: Record<string, InstrumentoEvaluacion>;
    setPcInstrumentosEvaluacion: React.Dispatch<React.SetStateAction<Record<string, InstrumentoEvaluacion>>>;
    pcUnidadesTrabajo: Record<string, UnidadTrabajo>;
    setPcUnidadesTrabajo: React.Dispatch<React.SetStateAction<Record<string, UnidadTrabajo>>>;

    // Module Data: Optativa
    optativaResultadosAprendizaje: Record<string, ResultadoAprendizaje>;
    setOptativaResultadosAprendizaje: React.Dispatch<React.SetStateAction<Record<string, ResultadoAprendizaje>>>;
    optativaCriteriosEvaluacion: Record<string, CriterioEvaluacion>;
    setOptativaCriteriosEvaluacion: React.Dispatch<React.SetStateAction<Record<string, CriterioEvaluacion>>>;
    optativaInstrumentosEvaluacion: Record<string, InstrumentoEvaluacion>;
    setOptativaInstrumentosEvaluacion: React.Dispatch<React.SetStateAction<Record<string, InstrumentoEvaluacion>>>;
    optativaUnidadesTrabajo: Record<string, UnidadTrabajo>;
    setOptativaUnidadesTrabajo: React.Dispatch<React.SetStateAction<Record<string, UnidadTrabajo>>>;

    // Module Data: Proyecto
    proyectoResultadosAprendizaje: Record<string, ResultadoAprendizaje>;
    setProyectoResultadosAprendizaje: React.Dispatch<React.SetStateAction<Record<string, ResultadoAprendizaje>>>;
    proyectoCriteriosEvaluacion: Record<string, CriterioEvaluacion>;
    setProyectoCriteriosEvaluacion: React.Dispatch<React.SetStateAction<Record<string, CriterioEvaluacion>>>;
    proyectoInstrumentosEvaluacion: Record<string, InstrumentoEvaluacion>;
    setProyectoInstrumentosEvaluacion: React.Dispatch<React.SetStateAction<Record<string, InstrumentoEvaluacion>>>;
    proyectoUnidadesTrabajo: Record<string, UnidadTrabajo>;
    setProyectoUnidadesTrabajo: React.Dispatch<React.SetStateAction<Record<string, UnidadTrabajo>>>;
    
    profesores: Profesor[];
    setProfesores: React.Dispatch<React.SetStateAction<Profesor[]>>;

    toasts: Toast[];
    addToast: (message: string, type?: ToastType) => void;
    
    handleFileUpload: (file: File) => Promise<void>;
    handleUpdateStudent: (student: Student) => void;

    handleCreateService: (trimester: 't1' | 't2' | 't3', type: 'normal' | 'agrupacion') => string;
    handleCreateServiceCustom: (trimester: 't1' | 't2' | 't3', type: 'normal' | 'agrupacion') => string;
    handleSaveServiceAndEvaluation: (service: Service, evaluation: ServiceEvaluation) => void;
    handleDeleteService: (serviceId: string) => void;
    onDeleteRole: (roleId: string) => void;

    handleSaveEntryExitRecord: (record: Omit<EntryExitRecord, 'id' | 'studentId'>, studentIds: string[]) => void;
    handleDeleteEntryExitRecord: (recordId: string) => void;
    handleSavePracticalExam: (evaluation: PracticalExamEvaluation) => void;
    
    // CRUD for PC
    handleSavePCRA: (ra: ResultadoAprendizaje) => void;
    handleDeletePCRA: (raId: string) => void;
    handleSavePCCriterio: (criterio: CriterioEvaluacion, parentRaId?: string) => void;
    handleSaveMultiplePCCriterios: (criterios: CriterioEvaluacion[]) => void;
    handleDeletePCCriterio: (criterioId: string, parentRaId: string) => void;
    handleSavePCUT: (ut: UnidadTrabajo) => void;
    handleDeletePCUT: (utId: string) => void;
    handleDeletePCInstrumento: (instrumentoId: string) => void;

    // CRUD for Optativa
    handleSaveOptativaRA: (ra: ResultadoAprendizaje) => void;
    handleDeleteOptativaRA: (raId: string) => void;
    handleSaveOptativaCriterio: (criterio: CriterioEvaluacion, parentRaId?: string) => void;
    handleSaveMultipleOptativaCriterios: (criterios: CriterioEvaluacion[]) => void;
    handleDeleteOptativaCriterio: (criterioId: string, parentRaId: string) => void;
    handleSaveOptativaUT: (ut: UnidadTrabajo) => void;
    handleDeleteOptativaUT: (utId: string) => void;
    handleDeleteOptativaInstrumento: (instrumentoId: string) => void;

    // CRUD for Proyecto
    handleSaveProyectoRA: (ra: ResultadoAprendizaje) => void;
    handleDeleteProyectoRA: (raId: string) => void;
    handleSaveProyectoCriterio: (criterio: CriterioEvaluacion, parentRaId?: string) => void;
    handleSaveMultipleProyectoCriterios: (criterios: CriterioEvaluacion[]) => void;
    handleDeleteProyectoCriterio: (criterioId: string, parentRaId: string) => void;
    handleSaveProyectoUT: (ut: UnidadTrabajo) => void;
    handleDeleteProyectoUT: (utId: string) => void;
    handleDeleteProyectoInstrumento: (instrumentoId: string) => void;

    handleResetModuleCurricularData: (moduleKey: 'pc' | 'optativa' | 'proyecto') => Promise<void>;
    handleResetApp: () => void;
    
    femConfigs: FemConfigs;
    setFemConfigs: React.Dispatch<React.SetStateAction<FemConfigs>>;
    pcFemSettings: PcFemSettings;
    setPcFemSettings: React.Dispatch<React.SetStateAction<PcFemSettings>>;

    // Auth
    user: User | null;
    loading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    
    calculatedStudentGrades: Record<string, StudentCalculatedGrades>;
    syncStatus: SyncStatus;
    triggerManualSync: (isManual?: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Auth (Placed first so it can be passed to useSyncedState hooks)
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    // Basic Data States with Sync
    const [students, setStudents, setStudentsRaw] = useSyncedState<Student[]>('students', [], user, setSyncStatus);
    const [practiceGroups, setPracticeGroups, setPracticeGroupsRaw] = useSyncedState<PracticeGroup[]>('practiceGroups', [], user, setSyncStatus);
    const [proyectoGroups, setProyectoGroups, setProyectoGroupsRaw] = useSyncedState<ProyectoGroup[]>('proyectoGroups', [], user, setSyncStatus);
    const [services, setServices, setServicesRaw] = useSyncedState<Service[]>('services', [], user, setSyncStatus);
    const [workshopPractices, setWorkshopPractices, setWorkshopPracticesRaw] = useSyncedState<WorkshopPractice[]>('workshopPractices', [], user, setSyncStatus);
    const [serviceEvaluations, setServiceEvaluations, setServiceEvaluationsRaw] = useSyncedState<ServiceEvaluation[]>('serviceEvaluations', [], user, setSyncStatus);
    const [serviceRoles, setServiceRoles, setServiceRolesRaw] = useSyncedState<ServiceRole[]>('serviceRoles', [
        { id: 'role1', name: 'Jefe de Cocina', color: '#ef4444', type: 'leader' },
        { id: 'role2', name: 'Segundo de Cocina', color: '#f97316', type: 'leader' },
        { id: 'role3', name: 'Jefe de Partida', color: '#84cc16', type: 'secondary' },
        { id: 'role4', name: 'Cocinero', color: '#22c55e', type: 'secondary' },
        { id: 'role5', name: 'Ayudante', color: '#3b82f6', type: 'secondary' },
    ], user, setSyncStatus);
    const [entryExitRecords, setEntryExitRecords, setEntryExitRecordsRaw] = useSyncedState<EntryExitRecord[]>('entryExitRecords', [], user, setSyncStatus);

    // Academic Grades States
    const [academicGrades, setAcademicGrades, setAcademicGradesRaw] = useSyncedState<AcademicGrades>('academicGrades', {}, user, setSyncStatus);
    const [instrumentGrades, setInstrumentGrades, setInstrumentGradesRaw] = useSyncedState<InstrumentGrades>('instrumentGrades', {}, user, setSyncStatus);
    const [courseGrades, setCourseGrades, setCourseGradesRaw] = useSyncedState<CourseGrades>('courseGrades', {}, user, setSyncStatus);
    const [practicalExamEvaluations, setPracticalExamEvaluations, setPracticalExamEvaluationsRaw] = useSyncedState<PracticalExamEvaluation[]>('practicalExamEvaluations', [], user, setSyncStatus);
    const [femConfigs, setFemConfigs, setFemConfigsRaw] = useSyncedState<FemConfigs>('femConfigs', {}, user, setSyncStatus);
    const [pcFemSettings, setPcFemSettings, setPcFemSettingsRaw] = useSyncedState<PcFemSettings>('pcFemSettings', { pcWeight: 80, femWeight: 20, recEvaluates100Percent: true }, user, setSyncStatus);
    
    // App Config States
    const [teacherData, setTeacherData, setTeacherDataRaw] = useSyncedState<TeacherData>('teacher-app-data', { name: 'Juan Codina Barranco', email: 'juan.codina@murciaeduca.es', logo: null }, user, setSyncStatus);
    const [instituteData, setInstituteData, setInstituteDataRaw] = useSyncedState<InstituteData>('institute-app-data', { name: 'CIFP Hostelería y Turismo de Cartagena', address: 'Calle Muralla del Mar, 3, 30202 Cartagena, Murcia', cif: 'Q1234567A', logo: null }, user, setSyncStatus);
    const [trimesterDates, setTrimesterDates, setTrimesterDatesRaw] = useSyncedState<TrimesterDates>('trimester-dates', defaultTrimesterDates, user, setSyncStatus);
    
    // PC Module Data
    const [pcResultadosAprendizaje, setPcResultadosAprendizaje, setPcResultadosAprendizajeRaw] = useSyncedState<Record<string, ResultadoAprendizaje>>('pc-resultadosAprendizaje', mockRA, user, setSyncStatus);
    const [pcCriteriosEvaluacion, setPcCriteriosEvaluacion, setPcCriteriosEvaluacionRaw] = useSyncedState<Record<string, CriterioEvaluacion>>('pc-criteriosEvaluacion', mockCriterios, user, setSyncStatus);
    const [pcInstrumentosEvaluacion, setPcInstrumentosEvaluacion, setPcInstrumentosEvaluacionRaw] = useSyncedState<Record<string, InstrumentoEvaluacion>>('pc-instrumentosEvaluacion', mockInstrumentos, user, setSyncStatus);
    const [pcUnidadesTrabajo, setPcUnidadesTrabajo, setPcUnidadesTrabajoRaw] = useSyncedState<Record<string, UnidadTrabajo>>('pc-unidadesTrabajo', mockUTs, user, setSyncStatus);

    // Optativa Module Data
    const [optativaResultadosAprendizaje, setOptativaResultadosAprendizaje, setOptativaResultadosAprendizajeRaw] = useSyncedState<Record<string, ResultadoAprendizaje>>('optativa-resultadosAprendizaje', optativaResultadosAprendizajeData, user, setSyncStatus);
    const [optativaCriteriosEvaluacion, setOptativaCriteriosEvaluacion, setOptativaCriteriosEvaluacionRaw] = useSyncedState<Record<string, CriterioEvaluacion>>('optativa-criteriosEvaluacion', optativaCriteriosEvaluacionData, user, setSyncStatus);
    const [optativaInstrumentosEvaluacion, setOptativaInstrumentosEvaluacion, setOptativaInstrumentosEvaluacionRaw] = useSyncedState<Record<string, InstrumentoEvaluacion>>('optativa-instrumentosEvaluacion', optativaInstrumentosEvaluacionData, user, setSyncStatus);
    const [optativaUnidadesTrabajo, setOptativaUnidadesTrabajo, setOptativaUnidadesTrabajoRaw] = useSyncedState<Record<string, UnidadTrabajo>>('optativa-unidadesTrabajo', optativaUnidadesTrabajoData, user, setSyncStatus);

    // Proyecto Module Data
    const [proyectoResultadosAprendizaje, setProyectoResultadosAprendizaje, setProyectoResultadosAprendizajeRaw] = useSyncedState<Record<string, ResultadoAprendizaje>>('proyecto-resultadosAprendizaje', proyectoResultadosAprendizajeData, user, setSyncStatus);
    const [proyectoCriteriosEvaluacion, setProyectoCriteriosEvaluacion, setProyectoCriteriosEvaluacionRaw] = useSyncedState<Record<string, CriterioEvaluacion>>('proyecto-criteriosEvaluacion', proyectoCriteriosEvaluacionData, user, setSyncStatus);
    const [proyectoInstrumentosEvaluacion, setProyectoInstrumentosEvaluacion, setProyectoInstrumentosEvaluacionRaw] = useSyncedState<Record<string, InstrumentoEvaluacion>>('proyecto-instrumentosEvaluacion', proyectoInstrumentosEvaluacionData, user, setSyncStatus);
    const [proyectoUnidadesTrabajo, setProyectoUnidadesTrabajo, setProyectoUnidadesTrabajoRaw] = useSyncedState<Record<string, UnidadTrabajo>>('proyecto-unidadesTrabajo', proyectoUnidadesTrabajoData, user, setSyncStatus);

    const [profesores, setProfesores, setProfesoresRaw] = useSyncedState<Profesor[]>('profesores', mockProfesores, user, setSyncStatus);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const triggerManualSync = async (isManual = false) => {
        if (!user) {
            setSyncStatus('offline');
            return;
        }
        
        setSyncStatus('syncing');
        console.info("[Firebase Sync] Iniciando sincronización de datos para el usuario:", { uid: user.uid, email: user.email });
        
        try {
            if (isManual) {
                addToast("Refrescando y sincronizando con la nube...", "info");
            } else {
                addToast("Sincronizando datos con la base de datos remota...", "info");
            }
            
            await setDocWithTimeout(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email || '',
                updatedAt: serverTimestamp()
            });

            const dataPath = `users/${user.uid}/data`;
            let querySnapshot;
            try {
                querySnapshot = await getDocs(collection(db, 'users', user.uid, 'data'));
            } catch (err) {
                console.error("[Firebase Sync] Error obteniendo colección de datos:", err);
                setSyncStatus('error');
                handleFirestoreError(err, OperationType.GET, dataPath);
                return;
            }

            console.info("[Firebase Sync] Documentos remotos encontrados en Firestore:", querySnapshot.size);

            const firestoreData: Record<string, any> = {};
            querySnapshot.forEach(docSnap => {
                const docData = docSnap.data();
                if (docData && docData.data !== undefined) {
                    firestoreData[docSnap.id] = docData.data;
                }
            });

            // Check for locally restored keys from backup file that should override firebase remote state
            let pendingRestoreKeys: string[] = [];
            try {
                const pending = window.localStorage.getItem('backup_restore_pending');
                if (pending) {
                    pendingRestoreKeys = JSON.parse(pending);
                }
            } catch (err) {
                console.error("Error reading backup_restore_pending:", err);
            }

            const syncConfigs = [
                { key: 'students', current: students, rawSetter: setStudentsRaw },
                { key: 'practiceGroups', current: practiceGroups, rawSetter: setPracticeGroupsRaw },
                { key: 'services', current: services, rawSetter: setServicesRaw },
                { key: 'workshopPractices', current: workshopPractices, rawSetter: setWorkshopPracticesRaw },
                { key: 'serviceEvaluations', current: serviceEvaluations, rawSetter: setServiceEvaluationsRaw },
                { key: 'serviceRoles', current: serviceRoles, rawSetter: setServiceRolesRaw },
                { key: 'entryExitRecords', current: entryExitRecords, rawSetter: setEntryExitRecordsRaw },
                { key: 'academicGrades', current: academicGrades, rawSetter: setAcademicGradesRaw },
                { key: 'instrumentGrades', current: instrumentGrades, rawSetter: setInstrumentGradesRaw },
                { key: 'courseGrades', current: courseGrades, rawSetter: setCourseGradesRaw },
                { key: 'practicalExamEvaluations', current: practicalExamEvaluations, rawSetter: setPracticalExamEvaluationsRaw },
                { key: 'femConfigs', current: femConfigs, rawSetter: setFemConfigsRaw },
                { key: 'pcFemSettings', current: pcFemSettings, rawSetter: setPcFemSettingsRaw },
                { key: 'teacher-app-data', current: teacherData, rawSetter: setTeacherDataRaw },
                { key: 'institute-app-data', current: instituteData, rawSetter: setInstituteDataRaw },
                { key: 'trimester-dates', current: trimesterDates, rawSetter: setTrimesterDatesRaw },
                { key: 'profesores', current: profesores, rawSetter: setProfesoresRaw },
                { key: 'pc-resultadosAprendizaje', current: pcResultadosAprendizaje, rawSetter: setPcResultadosAprendizajeRaw },
                { key: 'pc-criteriosEvaluacion', current: pcCriteriosEvaluacion, rawSetter: setPcCriteriosEvaluacionRaw },
                { key: 'pc-instrumentosEvaluacion', current: pcInstrumentosEvaluacion, rawSetter: setPcInstrumentosEvaluacionRaw },
                { key: 'pc-unidadesTrabajo', current: pcUnidadesTrabajo, rawSetter: setPcUnidadesTrabajoRaw },
                { key: 'optativa-resultadosAprendizaje', current: optativaResultadosAprendizaje, rawSetter: setOptativaResultadosAprendizajeRaw },
                { key: 'optativa-criteriosEvaluacion', current: optativaCriteriosEvaluacion, rawSetter: setOptativaCriteriosEvaluacionRaw },
                { key: 'optativa-instrumentosEvaluacion', current: optativaInstrumentosEvaluacion, rawSetter: setOptativaInstrumentosEvaluacionRaw },
                { key: 'optativa-unidadesTrabajo', current: optativaUnidadesTrabajo, rawSetter: setOptativaUnidadesTrabajoRaw },
                { key: 'proyecto-resultadosAprendizaje', current: proyectoResultadosAprendizaje, rawSetter: setProyectoResultadosAprendizajeRaw },
                { key: 'proyecto-criteriosEvaluacion', current: proyectoCriteriosEvaluacion, rawSetter: setProyectoCriteriosEvaluacionRaw },
                { key: 'proyecto-instrumentosEvaluacion', current: proyectoInstrumentosEvaluacion, rawSetter: setProyectoInstrumentosEvaluacionRaw },
                { key: 'proyecto-unidadesTrabajo', current: proyectoUnidadesTrabajo, rawSetter: setProyectoUnidadesTrabajoRaw },
            ];

            const writePromises: Promise<void>[] = [];

            for (const config of syncConfigs) {
                const isRestoredKey = pendingRestoreKeys.includes(config.key);
                const remoteData = firestoreData[config.key];

                if (isRestoredKey) {
                    // Force upload the locally restored value from backup
                    let localValue = config.current;
                    try {
                        const stored = window.localStorage.getItem(config.key);
                        if (stored) {
                            localValue = JSON.parse(stored);
                        }
                    } catch (e) {
                        console.error(`Error reading local storage for force upload of ${config.key}:`, e);
                    }

                    console.info(`[Firebase Sync] Sobrescribiendo Firestore con copia de seguridad local restaurada para "${config.key}"...`);
                    config.rawSetter(localValue);

                    const docRef = doc(db, 'users', user.uid, 'data', config.key);
                    const writePromise = setDocWithTimeout(docRef, {
                        data: localValue,
                        updatedAt: serverTimestamp()
                    }).catch(err => {
                        console.error(`[Firebase Sync] Error restaurando clave "${config.key}" en Firestore:`, err);
                    });
                    writePromises.push(writePromise);
                } else if (remoteData !== undefined) {
                    // Si es una clave académica y vino un objeto vacío de Firestore, restaurar los datos por defecto del currículo
                    const isAcademicKey = config.key.includes('resultadosAprendizaje') || 
                                          config.key.includes('criteriosEvaluacion') || 
                                          config.key.includes('unidadesTrabajo') || 
                                          config.key.includes('instrumentosEvaluacion');
                    const isRemoteEmptyAcademic = isAcademicKey && remoteData && typeof remoteData === 'object' && !Array.isArray(remoteData) && Object.keys(remoteData).length === 0;

                    let finalData = remoteData;
                    if (isRemoteEmptyAcademic) {
                        if (config.key === 'optativa-resultadosAprendizaje') finalData = optativaResultadosAprendizajeData;
                        else if (config.key === 'optativa-criteriosEvaluacion') finalData = optativaCriteriosEvaluacionData;
                        else if (config.key === 'optativa-unidadesTrabajo') finalData = optativaUnidadesTrabajoData;
                        else if (config.key === 'optativa-instrumentosEvaluacion') finalData = optativaInstrumentosEvaluacionData;
                        else if (config.key === 'pc-resultadosAprendizaje') finalData = mockRA;
                        else if (config.key === 'pc-criteriosEvaluacion') finalData = mockCriterios;
                        else if (config.key === 'pc-unidadesTrabajo') finalData = mockUTs;
                        else if (config.key === 'pc-instrumentosEvaluacion') finalData = mockInstrumentos;
                        else if (config.key === 'proyecto-resultadosAprendizaje') finalData = proyectoResultadosAprendizajeData;
                        else if (config.key === 'proyecto-criteriosEvaluacion') finalData = proyectoCriteriosEvaluacionData;
                        else if (config.key === 'proyecto-unidadesTrabajo') finalData = proyectoUnidadesTrabajoData;
                        else if (config.key === 'proyecto-instrumentosEvaluacion') finalData = proyectoInstrumentosEvaluacionData;

                        const docRef = doc(db, 'users', user.uid, 'data', config.key);
                        writePromises.push(setDocWithTimeout(docRef, { data: finalData, updatedAt: serverTimestamp() }));
                    } else if (config.key.includes('criteriosEvaluacion') && finalData && typeof finalData === 'object' && !Array.isArray(finalData)) {
                        let defaults: Record<string, CriterioEvaluacion> | null = null;
                        if (config.key === 'optativa-criteriosEvaluacion') defaults = optativaCriteriosEvaluacionData;
                        else if (config.key === 'pc-criteriosEvaluacion') defaults = mockCriterios;
                        else if (config.key === 'proyecto-criteriosEvaluacion') defaults = proyectoCriteriosEvaluacionData;

                        if (defaults) {
                            let healCount = 0;
                            const healedObj: Record<string, CriterioEvaluacion> = { ...finalData };
                            Object.keys(defaults).forEach(critId => {
                                if (!healedObj[critId]) {
                                    healedObj[critId] = defaults![critId];
                                    healCount++;
                                } else {
                                    const currentCrit = healedObj[critId];
                                    const defCrit = defaults![critId];
                                    if (!currentCrit.asociaciones || currentCrit.asociaciones.length === 0) {
                                        healedObj[critId] = {
                                            ...currentCrit,
                                            asociaciones: defCrit.asociaciones,
                                            raId: currentCrit.raId || defCrit.raId
                                        };
                                        healCount++;
                                    }
                                }
                            });
                            if (healCount > 0) {
                                console.info(`[Firebase Sync] Auto-reparados ${healCount} criterios para "${config.key}" vinculando asociaciones curriculares oficiales.`);
                                finalData = healedObj;
                                const docRef = doc(db, 'users', user.uid, 'data', config.key);
                                writePromises.push(setDocWithTimeout(docRef, { data: finalData, updatedAt: serverTimestamp() }));
                            }
                        }
                    }

                    const len = Array.isArray(finalData) ? `${finalData.length} elementos` : (finalData && typeof finalData === 'object' ? `${Object.keys(finalData).length} claves` : 'valor');
                    console.info(`[Firebase Sync] Restaurando desde Firestore la clave "${config.key}":`, len);
                    config.rawSetter(finalData);
                    try {
                        window.localStorage.setItem(config.key, JSON.stringify(finalData));
                    } catch (e) {
                        console.error(`[Firebase Sync] Error escribiendo localStorage para "${config.key}":`, e);
                    }
                } else {
                    const countLocal = Array.isArray(config.current) ? config.current.length : (config.current && typeof config.current === 'object' ? Object.keys(config.current).length : 0);
                    if (countLocal > 0) {
                        console.info(`[Firebase Sync] Subiendo datos locales a Firestore para la clave "${config.key}" (${countLocal} elementos/claves encontrados)...`);
                    } else {
                        console.info(`[Firebase Sync] Clave vacía "${config.key}" en local, inicializando en base de datos remota...`);
                    }
                    const docRef = doc(db, 'users', user.uid, 'data', config.key);
                    let sanitizedCurrent = config.current;
                    try {
                        sanitizedCurrent = JSON.parse(JSON.stringify(config.current));
                    } catch(e) {}
                    const writePromise = setDocWithTimeout(docRef, {
                        data: sanitizedCurrent,
                        updatedAt: serverTimestamp()
                    }).catch(err => {
                        console.error(`[Firebase Sync] Error al escribir clave "${config.key}" en Firestore:`, err);
                        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/data/${config.key}`);
                    });
                    writePromises.push(writePromise);
                }
            }

            if (writePromises.length > 0) {
                console.info(`[Firebase Sync] Sincronizando ${writePromises.length} colecciones pendientes de forma simultánea...`);
                await Promise.all(writePromises);
            }

            // Clean the pending restore keys once we have force pushed them
            if (pendingRestoreKeys.length > 0) {
                try {
                    window.localStorage.removeItem('backup_restore_pending');
                } catch (e) {
                    console.error(e);
                }
            }

            console.info("[Firebase Sync] ¡Sincronización con base de datos completada satisfactoriamente!");
            setSyncStatus('synced');
            if (isManual) {
                addToast("Sincronización completada. Datos actualizados desde la nube.", "success");
            } else {
                addToast("Sincronización finalizada correctamente", "success");
            }
        } catch (error) {
            console.error("[Firebase Sync] Fallo definitivo de sincronización:", error);
            setSyncStatus('error');
            addToast("Fallo al actualizar la sincronización con base de datos", "error");
        }
    };

    // Auto-sync on Auth State Change
    useEffect(() => {
        if (user) {
            triggerManualSync(false);
        } else {
            setSyncStatus('offline');
        }
    }, [user]);

    const addToast = (message: string, type: ToastType = 'info') => {
        const id = new Date().getTime().toString();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id)), 3000);
    };

    const calculatedStudentGrades = useMemo(() => {
        const studentGrades: Record<string, StudentCalculatedGrades> = {};
    
        students.forEach(student => {
            studentGrades[student.id] = {
                serviceAverages: { t1: null, t2: null, t3: null },
                practicalExams: { t1: null, t2: null, t3: null, rec: null }
            };
    
            const studentPracticeGroup = practiceGroups.find(pg => pg.studentIds.includes(student.id));
    
            (['t1', 't2', 't3'] as const).forEach(trimester => {
                const servicesInTrimester = services.filter(s => s.trimester === trimester);
    
                const serviceScoresForTrimester: number[] = [];
                servicesInTrimester.forEach(service => {
                    const evaluation = serviceEvaluations.find(e => e.serviceId === service.id);
                    if (!evaluation) return;
    
                    const individualEval = evaluation.serviceDay.individualScores?.[student.id];
                    
                    let studentParticipated = false;
                    let groupEvalSourceId: string | undefined = undefined;

                    // DEFINE EVALUATION UNIT BY SERVICE TYPE
                    if (service.type === 'normal' && studentPracticeGroup) {
                        studentParticipated = (service.assignedGroups.comedor || []).includes(studentPracticeGroup.id) || 
                                           (service.assignedGroups.takeaway || []).includes(studentPracticeGroup.id);
                        groupEvalSourceId = studentPracticeGroup.id;
                    } else if (service.type === 'agrupacion') {
                        const studentAgrupacion = (service.agrupaciones || []).find(a => a.studentIds.includes(student.id));
                        if (studentAgrupacion) {
                            studentParticipated = true;
                            groupEvalSourceId = studentAgrupacion.id;
                        }
                    }
                    
                    if (!studentParticipated) return;

                    // Attendance check (Defaults to TRUE/Present)
                    const isPresent = individualEval ? (individualEval.attendance ?? true) : true;
                    if (!isPresent) return;
    
                    // 1. Group / Agrupacion Grade
                    let groupGrade = 0;
                    let hasGroupData = false;
                    if (groupEvalSourceId) {
                        const groupEval = evaluation.serviceDay.groupScores[groupEvalSourceId];
                        if (groupEval) {
                            hasGroupData = groupEval.scores?.some(s => s !== null);
                            groupGrade = (groupEval.scores || []).reduce((sum, score) => sum + (score || 0), 0);
                        }
                    }

                    // 2. Individual Grade
                    const hasIndividualData = individualEval?.scores?.some(s => s !== null);
                    let individualGrade = (individualEval?.scores || []).reduce((sum, score) => sum + (score || 0), 0);
                    
                    if (!hasIndividualData && !hasGroupData) return;

                    if (!hasIndividualData && hasGroupData) {
                        individualGrade = groupGrade;
                    }

                    if (individualEval?.halveGroupScore) {
                        groupGrade /= 2;
                    }
    
                    const finalServiceScore = (individualGrade * SERVICE_GRADE_WEIGHTS.individual) + (groupGrade * SERVICE_GRADE_WEIGHTS.group);
                    serviceScoresForTrimester.push(finalServiceScore);
                });

                // Pre-Service scores for trimester
                const preServiceScoresForTrimester: number[] = [];
                servicesInTrimester.forEach(service => {
                    const evaluation = serviceEvaluations.find(e => e.serviceId === service.id);
                    if (!evaluation || !evaluation.preService) return;
                    Object.values(evaluation.preService).forEach((preDay: any) => {
                        const studentPreEval = preDay.individualEvaluations?.[student.id];
                        if (!studentPreEval || studentPreEval.attendance === false) return;
                        const scoresObj = studentPreEval.behaviorScores || {};
                        const sumScores = Object.values(scoresObj).reduce((a: number, b: any) => a + (b || 0), 0);
                        if (sumScores > 0 || Object.keys(scoresObj).length > 0) {
                            preServiceScoresForTrimester.push(sumScores);
                        }
                    });
                });

                // Workshop Practice scores for trimester
                const workshopScoresForTrimester: number[] = [];
                workshopPractices.filter(wp => wp.trimester === trimester).forEach(wp => {
                    const studentWpEval = wp.evaluations[student.id];
                    if (!studentWpEval || studentWpEval.attendance === false) return;
                    const scoresArr = studentWpEval.scores || [];
                    const sumScores = scoresArr.reduce((a: number, b: any) => a + (b || 0), 0);
                    if (scoresArr.some(s => s !== null)) {
                        workshopScoresForTrimester.push(sumScores);
                    }
                });

                const componentAverages: number[] = [];
                if (serviceScoresForTrimester.length > 0) {
                    componentAverages.push(serviceScoresForTrimester.reduce((a, b) => a + b, 0) / serviceScoresForTrimester.length);
                }
                if (preServiceScoresForTrimester.length > 0) {
                    componentAverages.push(preServiceScoresForTrimester.reduce((a, b) => a + b, 0) / preServiceScoresForTrimester.length);
                }
                if (workshopScoresForTrimester.length > 0) {
                    componentAverages.push(workshopScoresForTrimester.reduce((a, b) => a + b, 0) / workshopScoresForTrimester.length);
                }

                if (componentAverages.length > 0) {
                    const trimesterAverage = componentAverages.reduce((a, b) => a + b, 0) / componentAverages.length;
                    studentGrades[student.id].serviceAverages[trimester] = parseFloat(trimesterAverage.toFixed(2));
                }
            });
    
            (['t1', 't2', 't3', 'rec'] as const).forEach(period => {
                const exam = practicalExamEvaluations.find(e => e.studentId === student.id && e.examPeriod === period);
                studentGrades[student.id].practicalExams[period] = exam?.finalScore ?? null;
            });
        });
    
        return studentGrades;
    }, [students, services, serviceEvaluations, workshopPractices, practicalExamEvaluations, practiceGroups]);
    
    // --- CRUD Handlers ---
    const createCRUDHandlers = (
        setRAs: React.Dispatch<React.SetStateAction<Record<string, ResultadoAprendizaje>>>,
        setCriterios: React.Dispatch<React.SetStateAction<Record<string, CriterioEvaluacion>>>,
        setUTs: React.Dispatch<React.SetStateAction<Record<string, UnidadTrabajo>>>,
        setInstrumentos: React.Dispatch<React.SetStateAction<Record<string, InstrumentoEvaluacion>>>
    ) => ({
        handleSaveRA: (ra: ResultadoAprendizaje) => { setRAs(prev => ({...prev, [ra.id]: ra})); addToast(`RA '${ra.nombre}' guardado.`, 'success'); },
        handleDeleteRA: (raId: string) => {
            setRAs(prev => {
                const newRAs = {...prev};
                const raToDelete = newRAs[raId];
                if(raToDelete) {
                    setCriterios(prevCriterios => {
                        const newCriterios = {...prevCriterios};
                        raToDelete.criteriosEvaluacion.forEach(critId => delete newCriterios[critId]);
                        return newCriterios;
                    });
                }
                delete newRAs[raId];
                return newRAs;
            });
            addToast('RA y sus criterios eliminados.', 'info');
        },
        handleSaveCriterio: (criterio: CriterioEvaluacion, parentRaId?: string) => {
            const actualRaId = parentRaId || criterio.raId;
            const criterioToSave = { ...criterio, ...(actualRaId ? { raId: actualRaId } : {}) };
            setCriterios(prev => ({ ...prev, [criterio.id]: criterioToSave }));
            if (actualRaId) {
                setRAs(prev => {
                    const parentRA = prev[actualRaId];
                    if (parentRA && !parentRA.criteriosEvaluacion.includes(criterio.id)) {
                        return { ...prev, [actualRaId]: { ...parentRA, criteriosEvaluacion: [...parentRA.criteriosEvaluacion, criterio.id] } };
                    }
                    return prev;
                });
            }
            addToast(`Criterio guardado.`, 'success');
        },
        handleSaveMultipleCriterios: (criteriosList: CriterioEvaluacion[]) => {
            setCriterios(prev => {
                const next = { ...prev };
                criteriosList.forEach(c => {
                    const actualRaId = c.raId;
                    next[c.id] = { ...c, ...(actualRaId ? { raId: actualRaId } : {}) };
                });
                return next;
            });
            setRAs(prev => {
                let changed = false;
                const next = { ...prev };
                criteriosList.forEach(c => {
                    const actualRaId = c.raId;
                    if (actualRaId && next[actualRaId] && !next[actualRaId].criteriosEvaluacion.includes(c.id)) {
                        next[actualRaId] = {
                            ...next[actualRaId],
                            criteriosEvaluacion: [...next[actualRaId].criteriosEvaluacion, c.id]
                        };
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
            addToast(`${criteriosList.length} criterios actualizados con éxito.`, 'success');
        },
        handleDeleteCriterio: (criterioId: string, parentRaId: string) => {
            setCriterios(prev => { const newCriterios = {...prev}; delete newCriterios[criterioId]; return newCriterios; });
            setRAs(prev => {
                const parentRA = prev[parentRaId];
                if (parentRA) return { ...prev, [parentRaId]: { ...parentRA, criteriosEvaluacion: parentRA.criteriosEvaluacion.filter(id => id !== criterioId) } };
                return prev;
            });
            addToast('Criterio eliminado.', 'info');
        },
        handleSaveUT: (ut: UnidadTrabajo) => { setUTs(prev => ({ ...prev, [ut.id]: ut })); addToast(`Unidad de Trabajo '${ut.nombre}' guardada.`, 'success'); },
        handleDeleteUT: (utId: string) => {
            if(window.confirm('¿Seguro que quieres eliminar esta Unidad de Trabajo?')) {
                setUTs(prev => { const newUTs = { ...prev }; delete newUTs[utId]; return newUTs; });
                setCriterios(prev => {
                    const newCriterios = { ...prev };
                    (Object.values(newCriterios) as CriterioEvaluacion[]).forEach(c => {
                        if (c.asociaciones) c.asociaciones = c.asociaciones.filter(a => a.utId !== utId);
                    });
                    return newCriterios;
                });
                addToast('Unidad de Trabajo eliminada.', 'info');
            }
        },
        handleDeleteInstrumento: (instrumentoId: string) => {
            if (!window.confirm("¿Seguro que quieres eliminar este instrumento?")) return;
            setInstrumentos(prev => { const newInst = { ...prev }; delete newInst[instrumentoId]; return newInst; });
            addToast('Instrumento eliminado.', 'info');
        }
    });

    const pcCRUD = createCRUDHandlers(setPcResultadosAprendizaje, setPcCriteriosEvaluacion, setPcUnidadesTrabajo, setPcInstrumentosEvaluacion);
    const optativaCRUD = createCRUDHandlers(setOptativaResultadosAprendizaje, setOptativaCriteriosEvaluacion, setOptativaUnidadesTrabajo, setOptativaInstrumentosEvaluacion);
    const proyectoCRUD = createCRUDHandlers(setProyectoResultadosAprendizaje, setProyectoCriteriosEvaluacion, setProyectoUnidadesTrabajo, setProyectoInstrumentosEvaluacion);

    // --- Other Handlers ---
    const handleFileUpload = async (file: File) => {
        const { data, error } = await parseFile(file);
        if (error) {
            addToast(error, 'error');
        } else {
            setStudents(data);
            addToast(`${data.length} alumnos importados con éxito.`, 'success');
        }
    };
    const handleUpdateStudent = (updatedStudent: Student) => {
        setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
        addToast('Ficha del alumno actualizada.', 'success');
    };

    const handleCreateServiceCustom = (trimester: 't1' | 't2' | 't3', type: 'normal' | 'agrupacion' = 'normal'): string => {
        const newServiceId = `service-${Date.now()}`;
        const newService: Service = {
            id: newServiceId,
            name: `Nuevo Servicio ${new Date().toLocaleDateString('es-ES')}`,
            date: new Date().toISOString().split('T')[0],
            trimester,
            isLocked: false,
            type: type,
            assignedGroups: { comedor: [], takeaway: [] },
            elaborations: { comedor: [], takeaway: [] },
            studentRoles: [],
            agrupaciones: type === 'agrupacion' ? [] : undefined,
        };
        const newEvaluation: ServiceEvaluation = {
            id: `eval-${newServiceId}`,
            serviceId: newServiceId,
            preService: {},
            serviceDay: { groupScores: {}, individualScores: {} },
        };
        
        setServices(prev => [...prev, newService]);
        setServiceEvaluations(prev => [...prev, newEvaluation]);
        addToast('Nuevo servicio creado.', 'success');
        return newServiceId;
    };

    const handleSaveServiceAndEvaluation = (service: Service, evaluation: ServiceEvaluation) => {
        setServices(prev => prev.map(s => s.id === service.id ? service : s));
        setServiceEvaluations(prev => prev.map(e => e.id === evaluation.id ? evaluation : e));
        addToast(`Servicio '${service.name}' guardado.`, 'success');
    };
    const handleDeleteService = (serviceId: string) => {
        setServices(prev => prev.filter(s => s.id !== serviceId));
        setServiceEvaluations(prev => prev.filter(e => e.serviceId !== serviceId));
        addToast('Servicio eliminado.', 'info');
    };
    const onDeleteRole = (roleId: string) => {
        setServiceRoles(prev => prev.filter(r => r.id !== roleId));
        setServices(prevServices => prevServices.map(s => ({
            ...s,
            studentRoles: s.studentRoles.filter(sr => sr.roleId !== roleId)
        })));
        addToast('Rol eliminado.', 'info');
    };
    const handleSaveEntryExitRecord = (record: Omit<EntryExitRecord, 'id' | 'studentId'>, studentIds: string[]) => {
        const newRecords: EntryExitRecord[] = studentIds.map(studentId => ({
            ...record,
            id: `rec-${studentId}-${Date.now()}`,
            studentId,
        }));
        setEntryExitRecords(prev => [...prev, ...newRecords]);
        addToast(`Registro de ${record.type} guardado para ${studentIds.length} alumno(s).`, 'success');
    };

    const handleDeleteEntryExitRecord = (recordId: string) => {
        setEntryExitRecords(prev => prev.filter(r => r.id !== recordId));
        addToast('Registro eliminado.', 'info');
    };

    const handleSavePracticalExam = (evaluation: PracticalExamEvaluation) => {
        setPracticalExamEvaluations(prev => {
            const index = prev.findIndex(e => e.id === evaluation.id);
            if (index > -1) {
                const newEvals = [...prev];
                newEvals[index] = evaluation;
                return newEvals;
            }
            return [...prev, evaluation];
        });
        addToast(`Examen práctico guardado.`, 'success');
    };
    
    const handleResetApp = async () => {
        const keysToRemove = [
            'students', 'practiceGroups', 'services', 'serviceEvaluations', 'serviceRoles', 'entryExitRecords', 
            'academicGrades', 'instrumentGrades', 'courseGrades', 'practicalExamEvaluations', 'teacher-app-data', 'institute-app-data', 
            'trimester-dates', 'femConfigs', 'pcFemSettings',
            'pc-resultadosAprendizaje', 'pc-criteriosEvaluacion', 'pc-instrumentosEvaluacion', 'pc-unidadesTrabajo',
            'optativa-resultadosAprendizaje', 'optativa-criteriosEvaluacion', 'optativa-instrumentosEvaluacion', 'optativa-unidadesTrabajo',
            'proyecto-resultadosAprendizaje', 'proyecto-criteriosEvaluacion', 'proyecto-instrumentosEvaluacion', 'proyecto-unidadesTrabajo',
            'profesores'
        ];
        
        if (user) {
            try {
                addToast('Eliminando datos remotos de la base de datos...', 'info');
                const batchPromises = keysToRemove.map(key => {
                    let emptyVal: any = [];
                    if ([
                        'academicGrades', 'instrumentGrades', 'courseGrades', 'femConfigs'
                    ].includes(key)) {
                        emptyVal = {};
                    } else if (key === 'optativa-resultadosAprendizaje') {
                        emptyVal = optativaResultadosAprendizajeData;
                    } else if (key === 'optativa-criteriosEvaluacion') {
                        emptyVal = optativaCriteriosEvaluacionData;
                    } else if (key === 'optativa-unidadesTrabajo') {
                        emptyVal = optativaUnidadesTrabajoData;
                    } else if (key === 'optativa-instrumentosEvaluacion') {
                        emptyVal = optativaInstrumentosEvaluacionData;
                    } else if (key === 'pc-resultadosAprendizaje') {
                        emptyVal = mockRA;
                    } else if (key === 'pc-criteriosEvaluacion') {
                        emptyVal = mockCriterios;
                    } else if (key === 'pc-unidadesTrabajo') {
                        emptyVal = mockUTs;
                    } else if (key === 'pc-instrumentosEvaluacion') {
                        emptyVal = mockInstrumentos;
                    } else if (key === 'proyecto-resultadosAprendizaje') {
                        emptyVal = proyectoResultadosAprendizajeData;
                    } else if (key === 'proyecto-criteriosEvaluacion') {
                        emptyVal = proyectoCriteriosEvaluacionData;
                    } else if (key === 'proyecto-unidadesTrabajo') {
                        emptyVal = proyectoUnidadesTrabajoData;
                    } else if (key === 'proyecto-instrumentosEvaluacion') {
                        emptyVal = proyectoInstrumentosEvaluacionData;
                    } else if (key === 'profesores') {
                        emptyVal = mockProfesores;
                    } else if (key === 'pcFemSettings') {
                        emptyVal = { pcWeight: 80, femWeight: 20, recEvaluates100Percent: true };
                    } else if (key === 'teacher-app-data') {
                        emptyVal = { name: 'Juan Codina Barranco', email: 'juan.codina@murciaeduca.es', logo: null };
                    } else if (key === 'institute-app-data') {
                        emptyVal = { name: 'CIFP Hostelería y Turismo de Cartagena', address: 'Calle Muralla del Mar, 3, 30202 Cartagena, Murcia', cif: 'Q1234567A', logo: null };
                    } else if (key === 'trimester-dates') {
                        emptyVal = { t1: { start: '', end: '' }, t2: { start: '', end: '' } };
                    } else if (key === 'serviceRoles') {
                        emptyVal = [
                            { id: '1', name: 'Líder de Cocina', color: '#3b82f6', type: 'leader' },
                            { id: '2', name: 'Líder de Sala', color: '#10b981', type: 'leader' },
                            { id: '3', name: 'Ayudante de Cocina', color: '#f59e0b', type: 'secondary' },
                            { id: '4', name: 'Ayudante de Sala', color: '#ef4444', type: 'secondary' }
                        ];
                    }
                    return setDocWithTimeout(doc(db, 'users', user.uid, 'data', key), {
                        data: emptyVal,
                        updatedAt: serverTimestamp()
                    });
                });
                await Promise.all(batchPromises);
            } catch (err) {
                console.error("Error clearing remote data:", err);
            }
        }

        keysToRemove.forEach(key => {
            if (key === 'optativa-resultadosAprendizaje') {
                window.localStorage.setItem(key, JSON.stringify(optativaResultadosAprendizajeData));
            } else if (key === 'optativa-criteriosEvaluacion') {
                window.localStorage.setItem(key, JSON.stringify(optativaCriteriosEvaluacionData));
            } else if (key === 'optativa-unidadesTrabajo') {
                window.localStorage.setItem(key, JSON.stringify(optativaUnidadesTrabajoData));
            } else if (key === 'optativa-instrumentosEvaluacion') {
                window.localStorage.setItem(key, JSON.stringify(optativaInstrumentosEvaluacionData));
            } else if (key === 'pc-resultadosAprendizaje') {
                window.localStorage.setItem(key, JSON.stringify(mockRA));
            } else if (key === 'pc-criteriosEvaluacion') {
                window.localStorage.setItem(key, JSON.stringify(mockCriterios));
            } else if (key === 'pc-unidadesTrabajo') {
                window.localStorage.setItem(key, JSON.stringify(mockUTs));
            } else if (key === 'pc-instrumentosEvaluacion') {
                window.localStorage.setItem(key, JSON.stringify(mockInstrumentos));
            } else if (key === 'proyecto-resultadosAprendizaje') {
                window.localStorage.setItem(key, JSON.stringify(proyectoResultadosAprendizajeData));
            } else if (key === 'proyecto-criteriosEvaluacion') {
                window.localStorage.setItem(key, JSON.stringify(proyectoCriteriosEvaluacionData));
            } else if (key === 'proyecto-unidadesTrabajo') {
                window.localStorage.setItem(key, JSON.stringify(proyectoUnidadesTrabajoData));
            } else if (key === 'proyecto-instrumentosEvaluacion') {
                window.localStorage.setItem(key, JSON.stringify(proyectoInstrumentosEvaluacionData));
            } else if (key === 'profesores') {
                window.localStorage.setItem(key, JSON.stringify(mockProfesores));
            } else {
                window.localStorage.removeItem(key);
            }
        });
        
        addToast('Aplicación reseteada. Recargando...', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    const handleResetModuleCurricularData = async (moduleKey: 'pc' | 'optativa' | 'proyecto') => {
        let configs: { key: string; data: any; rawSetter: (val: any) => void }[] = [];
        let modTitle = '';

        if (moduleKey === 'optativa') {
            modTitle = 'Optativa: Cocina Sostenible';
            configs = [
                { key: 'optativa-resultadosAprendizaje', data: optativaResultadosAprendizajeData, rawSetter: setOptativaResultadosAprendizajeRaw },
                { key: 'optativa-criteriosEvaluacion', data: optativaCriteriosEvaluacionData, rawSetter: setOptativaCriteriosEvaluacionRaw },
                { key: 'optativa-unidadesTrabajo', data: optativaUnidadesTrabajoData, rawSetter: setOptativaUnidadesTrabajoRaw },
                { key: 'optativa-instrumentosEvaluacion', data: optativaInstrumentosEvaluacionData, rawSetter: setOptativaInstrumentosEvaluacionRaw },
            ];
        } else if (moduleKey === 'pc') {
            modTitle = 'Productos Culinarios';
            configs = [
                { key: 'pc-resultadosAprendizaje', data: mockRA, rawSetter: setPcResultadosAprendizajeRaw },
                { key: 'pc-criteriosEvaluacion', data: mockCriterios, rawSetter: setPcCriteriosEvaluacionRaw },
                { key: 'pc-unidadesTrabajo', data: mockUTs, rawSetter: setPcUnidadesTrabajoRaw },
                { key: 'pc-instrumentosEvaluacion', data: mockInstrumentos, rawSetter: setPcInstrumentosEvaluacionRaw },
            ];
        } else {
            modTitle = 'Proyecto Intermodular';
            configs = [
                { key: 'proyecto-resultadosAprendizaje', data: proyectoResultadosAprendizajeData, rawSetter: setProyectoResultadosAprendizajeRaw },
                { key: 'proyecto-criteriosEvaluacion', data: proyectoCriteriosEvaluacionData, rawSetter: setProyectoCriteriosEvaluacionRaw },
                { key: 'proyecto-unidadesTrabajo', data: proyectoUnidadesTrabajoData, rawSetter: setProyectoUnidadesTrabajoRaw },
                { key: 'proyecto-instrumentosEvaluacion', data: proyectoInstrumentosEvaluacionData, rawSetter: setProyectoInstrumentosEvaluacionRaw },
            ];
        }

        // 1. Aplicar en estado local y localStorage inmediatamente
        for (const item of configs) {
            item.rawSetter(item.data);
            try {
                window.localStorage.setItem(item.key, JSON.stringify(item.data));
            } catch (e) {
                console.error(`Error guardando ${item.key} en localStorage:`, e);
            }
        }

        // 2. Si el usuario está autenticado, sincronizar de inmediato en Firestore
        if (user) {
            setSyncStatus('syncing');
            try {
                const promises = configs.map(item => {
                    let sanitizedData = item.data;
                    try {
                        sanitizedData = JSON.parse(JSON.stringify(item.data));
                    } catch(e) {}
                    return setDocWithTimeout(doc(db, 'users', user.uid, 'data', item.key), {
                        data: sanitizedData,
                        updatedAt: serverTimestamp()
                    });
                });
                await Promise.all(promises);
                setSyncStatus('synced');
                addToast(`Currículo oficial de ${modTitle} restablecido y sincronizado con la nube.`, 'success');
            } catch (err) {
                console.error(`Error sincronizando restablecimiento para ${moduleKey} en Firestore:`, err);
                setSyncStatus('error');
                addToast(`Currículo restablecido localmente, pero ocurrió un error al sincronizar con la nube.`, 'error');
            }
        } else {
            addToast(`Currículo oficial de ${modTitle} restablecido localmente.`, 'success');
        }
    };

    const value: AppContextType = {
        students, setStudents, practiceGroups, setPracticeGroups, proyectoGroups, setProyectoGroups, services, setServices, workshopPractices, setWorkshopPractices, serviceEvaluations, setServiceEvaluations, serviceRoles, setServiceRoles, entryExitRecords, setEntryExitRecords, academicGrades, setAcademicGrades, instrumentGrades, setInstrumentGrades, courseGrades, setCourseGrades, practicalExamEvaluations, setPracticalExamEvaluations, teacherData, setTeacherData, instituteData, setInstituteData, trimesterDates, setTrimesterDates,
        femConfigs, setFemConfigs, pcFemSettings, setPcFemSettings,
        
        pcResultadosAprendizaje, setPcResultadosAprendizaje, pcCriteriosEvaluacion, setPcCriteriosEvaluacion, pcInstrumentosEvaluacion, setPcInstrumentosEvaluacion, pcUnidadesTrabajo, setPcUnidadesTrabajo,
        optativaResultadosAprendizaje, setOptativaResultadosAprendizaje, optativaCriteriosEvaluacion, setOptativaCriteriosEvaluacion, optativaInstrumentosEvaluacion, setOptativaInstrumentosEvaluacion, optativaUnidadesTrabajo, setOptativaUnidadesTrabajo,
        proyectoResultadosAprendizaje, setProyectoResultadosAprendizaje, proyectoCriteriosEvaluacion, setProyectoCriteriosEvaluacion, proyectoInstrumentosEvaluacion, setProyectoInstrumentosEvaluacion, proyectoUnidadesTrabajo, setProyectoUnidadesTrabajo,
        
        profesores, setProfesores,
        toasts, addToast,
        handleFileUpload, handleUpdateStudent,
        handleCreateService: handleCreateServiceCustom, 
        handleCreateServiceCustom,
        handleSaveServiceAndEvaluation, handleDeleteService, onDeleteRole, handleSaveEntryExitRecord, handleDeleteEntryExitRecord, handleSavePracticalExam,
        
        handleSavePCRA: pcCRUD.handleSaveRA, handleDeletePCRA: pcCRUD.handleDeleteRA, handleSavePCCriterio: pcCRUD.handleSaveCriterio, handleSaveMultiplePCCriterios: pcCRUD.handleSaveMultipleCriterios, handleDeletePCCriterio: pcCRUD.handleDeleteCriterio, handleSavePCUT: pcCRUD.handleSaveUT, handleDeletePCUT: pcCRUD.handleDeleteUT, handleDeletePCInstrumento: pcCRUD.handleDeleteInstrumento,
        handleSaveOptativaRA: optativaCRUD.handleSaveRA, handleDeleteOptativaRA: optativaCRUD.handleDeleteRA, handleSaveOptativaCriterio: optativaCRUD.handleSaveCriterio, handleSaveMultipleOptativaCriterios: optativaCRUD.handleSaveMultipleCriterios, handleDeleteOptativaCriterio: optativaCRUD.handleDeleteCriterio, handleSaveOptativaUT: optativaCRUD.handleSaveUT, handleDeleteOptativaUT: optativaCRUD.handleDeleteUT, handleDeleteOptativaInstrumento: optativaCRUD.handleDeleteInstrumento,
        handleSaveProyectoRA: proyectoCRUD.handleSaveRA, handleDeleteProyectoRA: proyectoCRUD.handleDeleteRA, handleSaveProyectoCriterio: proyectoCRUD.handleSaveCriterio, handleSaveMultipleProyectoCriterios: proyectoCRUD.handleSaveMultipleCriterios, handleDeleteProyectoCriterio: proyectoCRUD.handleDeleteCriterio, handleSaveProyectoUT: proyectoCRUD.handleSaveUT, handleDeleteProyectoUT: proyectoCRUD.handleDeleteUT, handleDeleteProyectoInstrumento: proyectoCRUD.handleDeleteInstrumento,

        handleResetModuleCurricularData,
        handleResetApp,
        
        user,
        loading,
        signIn: signInWithGoogle,
        signOut: logout,

        calculatedStudentGrades,
        syncStatus,
        triggerManualSync
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

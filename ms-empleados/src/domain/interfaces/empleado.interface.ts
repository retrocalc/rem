import { AsigProf, SistPrevisional, SistSalud } from '../types/empleado.types';

export interface Profesion {
  titulo: string;
  institucion: string;
  fecha_titulacion: string; // YYYY-MM-DD
}

export interface DatosPersonales {
  rut: string;           // Formato validado: 12345678-9
  nombre: string;
  email?: string;        // Opcional inicialmente
  asig_prof?: AsigProf;    // Asignación profesional (No_Aplica, Sin_Asig_Prof, Con_Asig_Prof)
  sist_previsional?: SistPrevisional; // Sistema previsional (DIPRECA, AFP, INP, No_Aplica)
  sist_salud?: SistSalud;   // Sistema de salud (DIPRECA, ISAPRE, FONASA, No_Aplica)
  profesion?: Profesion; // Opcional
}

export interface Empleado {
  datos_personales: DatosPersonales;
}

export interface SistemaEmpleadosData {
  empleados: Record<string, Empleado>; // Clave: código empleado (0001, 0002, etc.)
  metadata: {
    ultima_actualizacion: string;
    version_esquema: string;
    total_empleados: number;
  };
}
// Interfaces para datos embebidos
export interface ProfesionData {
  titulo: string;
  institucion: string;
  fecha_titulacion: string; // YYYY-MM-DD
}

// Detalles de reglas calculadas
export interface ReglaCalculada {
  valor: number;
  formula?: string;
  descripcion?: string;
}

export type DetallesReglas = {
  [key: string]: ReglaCalculada;
};

export interface DatosPersonalesData {
  rut: string;
  nombre: string;
  email?: string;
  asig_prof?: string;    // Asignación profesional (No_Aplica, Sin_Asig_Prof, Con_Asig_Prof, etc.)
  sist_previsional?: string; // Sistema previsional (AFP, INP, etc.)
  sist_salud?: string;   // Sistema de salud (FONASA, ISAPRE, etc.)
  profesion?: ProfesionData;
}

export interface EmpleadoData {
  id: string;
  datos_personales: DatosPersonalesData;
}

export interface ContratoDataBase {
  id: string;
  empleadoId: string;
  estado: 'activo' | 'inactivo' | 'terminado';
  tipo: 'honorarios' | 'contrata' | 'planta';
}

export interface ContratoHonorariosData extends ContratoDataBase {
  tipo: 'honorarios';
  monto_bruto: number;
}

export interface ContratoContrataData extends ContratoDataBase {
  tipo: 'contrata';
  grado?: string;
  cargo?: string;
  cantidad_bienios?: number;
  sueldo_base?: number;
}

export interface ContratoPlantaData extends ContratoDataBase {
  tipo: 'planta';
  grado?: string;
  cargo?: string;
  cantidad_bienios?: number;
  sueldo_base?: number;
}

export type ContratoData = ContratoHonorariosData | ContratoContrataData | ContratoPlantaData;

// Cálculo para honorarios
export interface CalculoHonorarios {
  id: string;
  contratoId: string;
  empleadoId: string;
  mes_proceso: string; // Formato: "YYYY-MM"
  monto_bruto: number;
  porcentaje_retencion: number;
  monto_retencion: number;
  liquido_pagar: number;
  creado_en: string; // ISO timestamp
  tipo_contrato: 'honorarios';
  estado: 'pendiente' | 'procesado' | 'pagado' | 'anulado';
  empleado_data?: EmpleadoData;
  contrato_data?: ContratoHonorariosData;
  detalles?: DetallesReglas;
}

// Cálculo para contrata
export interface CalculoContrata {
  id: string;
  contratoId: string;
  empleadoId: string;
  mes_proceso: string; // Formato: "YYYY-MM"
  sueldo_base: number;
  cantidad_bienios: number;
  monto_bienios: number;
  liquido_pagar: number;
  creado_en: string; // ISO timestamp
  tipo_contrato: 'contrata';
  estado: 'pendiente' | 'procesado' | 'pagado' | 'anulado';
  empleado_data?: EmpleadoData;
  contrato_data?: ContratoContrataData;
  detalles?: DetallesReglas;
}

// Cálculo para planta
export interface CalculoPlanta {
  id: string;
  contratoId: string;
  empleadoId: string;
  mes_proceso: string; // Formato: "YYYY-MM"
  sueldo_base: number;
  cantidad_bienios: number;
  monto_bienios: number;
  liquido_pagar: number;
  creado_en: string; // ISO timestamp
  tipo_contrato: 'planta';
  estado: 'pendiente' | 'procesado' | 'pagado' | 'anulado';
  empleado_data?: EmpleadoData;
  contrato_data?: ContratoPlantaData;
  detalles?: DetallesReglas;
}

// Unión discriminada de todos los tipos de cálculo
export type CalculoRemuneracion = CalculoHonorarios | CalculoContrata | CalculoPlanta;

export interface ParametrosControl {
  institucion: string;
  mes_anio_proceso: string;
  porcentaje_retencion_honorarios: number;
}

export interface ContratoHonorarios {
  id: string;
  empleadoId: string;
  monto_bruto: number;
  estado: 'activo' | 'inactivo' | 'terminado';
  tipo: 'honorarios';
}

export interface ContratoContrata {
  id: string;
  empleadoId: string;
  grado: string;
  cargo?: string;
  cantidad_bienios: number;
  estado: 'activo' | 'inactivo' | 'terminado';
  tipo: 'contrata';
}

export interface ContratoPlanta {
  id: string;
  empleadoId: string;
  grado: string;
  cargo?: string;
  cantidad_bienios: number;
  estado: 'activo' | 'inactivo' | 'terminado';
  tipo: 'planta';
}

export type Contrato = ContratoHonorarios | ContratoContrata | ContratoPlanta;

export interface Empleado {
  id: string;
  nombre_completo: string;
  rut: string;
}

export interface SistemaCalculosData {
  honorarios: { [id: string]: CalculoHonorarios };
  contrata: { [id: string]: CalculoContrata };
  planta: { [id: string]: CalculoPlanta };
  metadata: {
    ultima_actualizacion: string;
    version_esquema: string;
    total_calculos: number;
  };
}
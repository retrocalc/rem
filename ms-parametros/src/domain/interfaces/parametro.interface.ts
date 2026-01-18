export interface ParametrosControl {
  institucion: string;
  mes_anio_proceso: string; // Formato: YYYY-MM
  porcentaje_retencion_honorarios: number; // Ej: 0.10 para 10%
}

export interface Institucion {
  nombre: string;
  acronimo: string;
  rut: string;
  direccion: string;
}

export interface SistemaParametrosData {
  parametros: ParametrosControl;
  instituciones?: {
    [key: string]: Institucion;
  };
  metadata: {
    ultima_actualizacion: string;
    version_esquema: string;
  };
}
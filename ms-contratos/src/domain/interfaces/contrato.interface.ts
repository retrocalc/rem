// Tipos de contrato soportados
export type TipoContrato = 'honorarios' | 'contrata' | 'planta';

// Contrato base con campos comunes
export interface ContratoBase {
  id: string;                   // UUID
  empleadoId: string;           // ID del empleado (formato 0001, 0002, etc.)
  numero_contrato: string;
  fecha_contrato: string;       // YYYY-MM-DD
  tipo: TipoContrato;
  inicio: string;               // YYYY-MM-DD
  termino: string;              // YYYY-MM-DD (puede ser vacío para contratos vigentes)
  creado_en: string;            // ISO timestamp
  actualizado_en: string;       // ISO timestamp
  estado: 'activo' | 'inactivo' | 'terminado';
  cargo?: string;               // Cargo o puesto del empleado
}

// Contrato de honorarios - pago fijo mensual
export interface ContratoHonorarios extends ContratoBase {
  tipo: 'honorarios';
  monto_bruto: number;          // Monto fijo mensual (antes sueldo_base)
}

// Contrato de contrata - cálculo basado en grado y bienios
export interface ContratoContrata extends ContratoBase {
  tipo: 'contrata';
  grado: string;                // Grado escalafonario (ej: "Grado_4")
  escalafon?: string;           // Tipo de escalafón (ej: "Directivo")
  cantidad_bienios: number;     // Cantidad de bienios acumulados
  sueldo_base?: number;         // Opcional: puede calcularse o almacenarse
}

// Contrato de planta - similar a contrata pero con reglas propias
export interface ContratoPlanta extends ContratoBase {
  tipo: 'planta';
  grado: string;                // Grado escalafonario
  escalafon?: string;           // Tipo de escalafón (ej: "Oficiales Penitenciarios")
  cantidad_bienios: number;     // Cantidad de bienios acumulados
  sueldo_base?: number;         // Opcional: puede calcularse o almacenarse
}

// Unión discriminada de todos los tipos de contrato
export type Contrato = ContratoHonorarios | ContratoContrata | ContratoPlanta;

// Helper type para extraer tipo específico
export type ContratoPorTipo<T extends TipoContrato> = 
  T extends 'honorarios' ? ContratoHonorarios :
  T extends 'contrata' ? ContratoContrata :
  T extends 'planta' ? ContratoPlanta :
  never;

// Estructura del archivo JSON (separada por tipo)
export interface SistemaContratosData {
  honorarios: { [key: string]: ContratoHonorarios };
  contrata: { [key: string]: ContratoContrata };
  planta: { [key: string]: ContratoPlanta };
  metadata: {
    ultima_actualizacion: string;
    version_esquema: string;
    total_contratos: number;
  };
}
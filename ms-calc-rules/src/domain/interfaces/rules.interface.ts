// Interfaz para los atributos de afectación de un concepto
export interface AfectosConcepto {
  imponible?: boolean;
  tributable?: boolean;
  [key: string]: any; // Otros atributos posibles
}

// Interfaz para una regla de cálculo individual
export interface ConceptoRegla {
  formula: string;
  glosa: string;
  afectos?: AfectosConcepto;
  vigencia_desde: string; // Formato YYYY-MM o YYYY-MM-DD
  vigencia_hasta: string; // Formato YYYY-MM o YYYY-MM-DD, vacío significa vigente indefinidamente
  imprimir_liq_si_0?: boolean; // Mostrar en liquidación incluso si el valor es cero
}

// Interfaz para las reglas de cálculo organizadas por categoría
export interface RulesDefinition {
  [categoria: string]: {
    [nombreConcepto: string]: ConceptoRegla;
  };
}



// Interfaz para los atributos de entrada del contrato
export interface ContratoAttributes {
  institucion?: string;
  grado?: string;
  cantidad_bienios?: number;
  cargo?: string;
  asig_prof?: string;    // Asignación profesional del empleado
  sist_previsional?: string; // Sistema previsional del empleado
  sist_salud?: string;   // Sistema de salud del empleado
  [key: string]: any; // Otros atributos posibles
}

// Interfaz para el detalle de un concepto calculado
export interface DetalleConcepto {
  valor: number;
  formula?: string;
  glosa?: string;
  afectos?: AfectosConcepto;
  categoria?: string;
  vigencia_desde?: string;
  vigencia_hasta?: string;
  imprimir_liq_si_0?: boolean; // Mostrar en liquidación incluso si el valor es cero
}

// Interfaz para el resultado del cálculo
export interface CalculoResult {
  sueldo_base: number;
  bienios: number;
  total: number;
  detalles?: {
    [nombreConcepto: string]: DetalleConcepto;
  };
}

// Interfaz para el repositorio de reglas
export interface RulesRepository {
  cargarRules(institucion?: string): Promise<RulesDefinition>;
  cargarRulesCrudo(institucion?: string): Promise<any>;
  guardarRules(rules: any, institucion?: string): Promise<void>;
  cargarArchivoExterno(nombreArchivo: string, institucion?: string): Promise<any>;
}
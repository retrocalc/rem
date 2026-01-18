// DTOs para empleados con información combinada

export interface ProfesionDTO {
  titulo: string;
  institucion: string;
  fecha_titulacion: string;
}

export interface EmpleadoBasicoDTO {
  id: string;
  rut: string;
  nombre: string;
  email?: string;
  profesion?: ProfesionDTO;
}

export interface ContratoResumenDTO {
  id: string;
  tipo: 'honorarios' | 'contrata' | 'planta';
  escalafon?: string;
  grado?: string;
  estado: 'activo' | 'inactivo' | 'terminado';
  inicio: string;
  termino?: string;
  cargo?: string;
}

export interface EmpleadoCompletoDTO extends EmpleadoBasicoDTO {
  contrato?: ContratoResumenDTO;
  tieneContrato: boolean;
}

export interface EmpleadoFiltrosDTO {
  tiposContrato: Array<'honorarios' | 'contrata' | 'planta'>;
  escalafones: string[];
  estados: Array<'activo' | 'inactivo' | 'terminado'>;
}

export interface PaginacionDTO {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

export interface EmpleadosPaginadosDTO {
  empleados: EmpleadoCompletoDTO[];
  paginacion: PaginacionDTO;
  filtros: EmpleadoFiltrosDTO;
}

// Para búsqueda y filtrado
export interface FiltroEmpleadosDTO {
  tipoContrato?: 'honorarios' | 'contrata' | 'planta' | 'todos';
  escalafon?: string;
  estado?: 'activo' | 'inactivo' | 'terminado';
  search?: string;
  page?: number;
  limit?: number;
}
// DTOs para comandos y transacciones

export interface CrearEmpleadoDTO {
  datos_personales: {
    rut: string;
    nombre: string;
    email?: string;
    profesion?: {
      titulo: string;
      institucion: string;
      fecha_titulacion: string;
    };
  };
}

export interface CrearContratoDTO {
  tipo: 'honorarios' | 'contrata' | 'planta';
  escalafon?: string;
  grado?: string;
  inicio: string;
  termino?: string;
  estado: 'activo' | 'inactivo' | 'terminado';
  salario_base: number;
}

export interface CrearEmpleadoCompletoDTO {
  empleado: CrearEmpleadoDTO;
  contrato: CrearContratoDTO;
}

export interface ActualizarEmpleadoDTO {
  datos_personales?: {
    rut?: string;
    nombre?: string;
    email?: string;
    profesion?: {
      titulo: string;
      institucion: string;
      fecha_titulacion: string;
    };
  };
}

export interface ActualizarContratoDTO {
  tipo?: 'honorarios' | 'contrata' | 'planta';
  escalafon?: string;
  grado?: string;
  inicio?: string;
  termino?: string;
  estado?: 'activo' | 'inactivo' | 'terminado';
  salario_base?: number;
}

export interface ActualizarEmpleadoCompletoDTO {
  empleado?: ActualizarEmpleadoDTO;
  contrato?: ActualizarContratoDTO;
}

export interface TransaccionResultadoDTO {
  exito: boolean;
  transaccionId: string;
  pasos: Array<{
    servicio: string;
    operacion: string;
    exito: boolean;
    mensaje?: string;
    error?: string;
    timestamp: string;
  }>;
  empleadoId?: string;
  contratoId?: string;
  errores?: Array<{
    servicio: string;
    error: string;
    timestamp: string;
  }>;
  timestamp: string;
}

export interface SagaStep {
  servicio: string;
  operacion: 'CREATE' | 'UPDATE' | 'DELETE' | 'COMPENSATE';
  endpoint: string;
  datos?: any;
  compensacion?: {
    endpoint: string;
    datos?: any;
  };
}
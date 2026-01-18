import { TipoContrato } from '../../domain/interfaces/contrato.interface';

export class CrearContratoDTO {
  constructor(
    public readonly empleadoId: string,
    public readonly numero_contrato: string,
    public readonly fecha_contrato: string, // YYYY-MM-DD
    public readonly tipo: TipoContrato,
    public readonly sueldo_base: number,
    public readonly inicio: string,          // YYYY-MM-DD
    public readonly termino: string,         // YYYY-MM-DD (vacío para contratos vigentes)
    public readonly cargo?: string,
    public readonly grado?: string,
    public readonly cantidad_bienios?: number,
    public readonly escalafon?: string
  ) {}

  static fromJSON(data: any): CrearContratoDTO {
    return new CrearContratoDTO(
      data.empleadoId,
      data.numero_contrato,
      data.fecha_contrato,
      data.tipo,
      data.sueldo_base,
      data.inicio,
      data.termino || '',
      data.cargo,
      data.grado,
      data.cantidad_bienios,
      data.escalafon
    );
  }

  validar(): string[] {
    const errores: string[] = [];

    if (!this.empleadoId || typeof this.empleadoId !== 'string') {
      errores.push('ID de empleado es requerido');
    } else if (!/^\d{4}$/.test(this.empleadoId)) {
      errores.push('ID de empleado debe tener formato de 4 dígitos (0001, 0002, etc.)');
    }

    if (!this.numero_contrato || typeof this.numero_contrato !== 'string' || this.numero_contrato.trim().length === 0) {
      errores.push('Número de contrato es requerido');
    }

    if (!this.fecha_contrato || typeof this.fecha_contrato !== 'string') {
      errores.push('Fecha de contrato es requerida');
    } else {
      const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!fechaRegex.test(this.fecha_contrato)) {
        errores.push('Fecha de contrato debe tener formato YYYY-MM-DD');
      } else {
        const fecha = new Date(this.fecha_contrato);
        if (isNaN(fecha.getTime())) {
          errores.push('Fecha de contrato inválida');
        }
      }
    }

    // Validación de tipo (ya es TipoContrato, pero verificamos valor)
    const tiposValidos: TipoContrato[] = ['honorarios', 'contrata', 'planta'] as TipoContrato[];
    if (!this.tipo || !tiposValidos.includes(this.tipo)) {
      errores.push('Tipo de contrato debe ser uno de: honorarios, contrata, planta');
    }

    // Validación condicional según tipo
    if (this.tipo === 'honorarios') {
      if (typeof this.sueldo_base !== 'number' || this.sueldo_base <= 0) {
        errores.push('Para contratos de honorarios, sueldo base debe ser un número positivo');
      }
      if (this.grado !== undefined) {
        errores.push('El campo grado no debe estar presente para contratos de honorarios');
      }
      if (this.cantidad_bienios !== undefined) {
        errores.push('El campo cantidad_bienios no debe estar presente para contratos de honorarios');
      }
      if (this.escalafon !== undefined) {
        errores.push('El campo escalafon no debe estar presente para contratos de honorarios');
      }
    } else if (this.tipo === 'contrata' || this.tipo === 'planta') {
      // sueldo_base puede ser opcional (se calcula)
      if (this.sueldo_base !== undefined && (typeof this.sueldo_base !== 'number' || this.sueldo_base < 0)) {
        errores.push('Sueldo base debe ser un número no negativo o estar vacío');
      }
      if (!this.grado || typeof this.grado !== 'string' || this.grado.trim().length === 0) {
        errores.push('El campo grado es requerido para contratos de contrata/planta');
      }
      if (this.cantidad_bienios === undefined || typeof this.cantidad_bienios !== 'number' || this.cantidad_bienios < 0) {
        errores.push('El campo cantidad_bienios es requerido y debe ser un número no negativo para contratos de contrata/planta');
      }
      if (this.escalafon !== undefined && typeof this.escalafon !== 'string') {
        errores.push('El campo escalafon debe ser una cadena de texto si está presente');
      }
    }

    if (!this.inicio || typeof this.inicio !== 'string') {
      errores.push('Fecha de inicio es requerida');
    } else {
      const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!fechaRegex.test(this.inicio)) {
        errores.push('Fecha de inicio debe tener formato YYYY-MM-DD');
      } else {
        const fecha = new Date(this.inicio);
        if (isNaN(fecha.getTime())) {
          errores.push('Fecha de inicio inválida');
        }
      }
    }

    // Validar fecha de término (puede ser vacía)
    if (this.termino && typeof this.termino === 'string' && this.termino.trim().length > 0) {
      const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!fechaRegex.test(this.termino)) {
        errores.push('Fecha de término debe tener formato YYYY-MM-DD o estar vacía');
      } else {
        const fecha = new Date(this.termino);
        if (isNaN(fecha.getTime())) {
          errores.push('Fecha de término inválida');
        }
      }
    }

    // Validar cargo (opcional)
    if (this.cargo !== undefined && typeof this.cargo !== 'string') {
      errores.push('El campo cargo debe ser una cadena de texto si está presente');
    }

    return errores;
  }
}
export class ActualizarParametrosDTO {
  constructor(
    public readonly mes_anio_proceso: string,
    public readonly porcentaje_retencion_honorarios?: number,
    public readonly institucion?: string
  ) {}

  static fromJSON(data: any): ActualizarParametrosDTO {
    return new ActualizarParametrosDTO(
      data.mes_anio_proceso,
      data.porcentaje_retencion_honorarios,
      data.institucion
    );
  }

  validar(): string[] {
    const errores: string[] = [];

    if (!this.mes_anio_proceso || typeof this.mes_anio_proceso !== 'string') {
      errores.push('Mes año proceso es requerido');
    } else {
      const regex = /^\d{4}-\d{2}$/;
      if (!regex.test(this.mes_anio_proceso)) {
        errores.push('Mes año proceso debe tener formato YYYY-MM');
      } else {
        const [year, month] = this.mes_anio_proceso.split('-').map(Number);
        if (month < 1 || month > 12) {
          errores.push('Mes debe estar entre 01 y 12');
        }
        const date = new Date(year, month - 1, 1);
        if (date.getFullYear() !== year || date.getMonth() + 1 !== month) {
          errores.push('Fecha inválida');
        }
      }
    }

    if (this.institucion && typeof this.institucion !== 'string') {
      errores.push('Institución debe ser un string');
    }

    return errores;
  }
}
import { isValidAsigProf, isValidSistPrevisional, isValidSistSalud } from '../../domain/types/empleado.types';

export interface ProfesionDTO {
  titulo: string;
  institucion: string;
  fecha_titulacion: string; // YYYY-MM-DD
}

export class CrearEmpleadoDTO {
  constructor(
    public readonly rut: string,
    public readonly nombre: string,
    public readonly email?: string,
    public readonly asig_prof?: string,
    public readonly sist_previsional?: string,
    public readonly sist_salud?: string,
    public readonly profesion?: ProfesionDTO
  ) {}

  static fromJSON(data: any): CrearEmpleadoDTO {
    return new CrearEmpleadoDTO(
      data.rut,
      data.nombre,
      data.email,
      data.asig_prof,
      data.sist_previsional,
      data.sist_salud,
      data.profesion
    );
  }

  validar(): string[] {
    const errores: string[] = [];

    if (!this.rut || typeof this.rut !== 'string') {
      errores.push('RUT es requerido');
    }

    if (!this.nombre || typeof this.nombre !== 'string' || this.nombre.trim().length === 0) {
      errores.push('Nombre es requerido');
    }

    if (this.email && typeof this.email !== 'string') {
      errores.push('Email debe ser una cadena válida');
    }

    if (this.asig_prof) {
      if (typeof this.asig_prof !== 'string') {
        errores.push('Asignación profesional debe ser una cadena válida');
      } else if (!isValidAsigProf(this.asig_prof)) {
        errores.push(`Asignación profesional inválida. Valores permitidos: ${['Con_Asig_Prof', 'Sin_Asig_Prof', 'No_Aplica'].join(', ')}`);
      }
    }

    if (this.sist_previsional) {
      if (typeof this.sist_previsional !== 'string') {
        errores.push('Sistema previsional debe ser una cadena válida');
      } else if (!isValidSistPrevisional(this.sist_previsional)) {
        errores.push(`Sistema previsional inválido. Valores permitidos: ${['DIPRECA', 'AFP', 'INP', 'No_Aplica'].join(', ')}`);
      }
    }

    if (this.sist_salud) {
      if (typeof this.sist_salud !== 'string') {
        errores.push('Sistema de salud debe ser una cadena válida');
      } else if (!isValidSistSalud(this.sist_salud)) {
        errores.push(`Sistema de salud inválido. Valores permitidos: ${['DIPRECA', 'ISAPRE', 'FONASA', 'No_Aplica'].join(', ')}`);
      }
    }

    if (this.profesion) {
      if (!this.profesion.titulo || typeof this.profesion.titulo !== 'string' || this.profesion.titulo.trim().length === 0) {
        errores.push('Título de profesión es requerido');
      }
      if (!this.profesion.institucion || typeof this.profesion.institucion !== 'string' || this.profesion.institucion.trim().length === 0) {
        errores.push('Institución de profesión es requerida');
      }
      if (!this.profesion.fecha_titulacion || typeof this.profesion.fecha_titulacion !== 'string') {
        errores.push('Fecha de titulación es requerida');
      } else {
        const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!fechaRegex.test(this.profesion.fecha_titulacion)) {
          errores.push('Fecha de titulación debe tener formato YYYY-MM-DD');
        } else {
          const fecha = new Date(this.profesion.fecha_titulacion);
          if (isNaN(fecha.getTime())) {
            errores.push('Fecha de titulación inválida');
          }
        }
      }
    }

    return errores;
  }
}
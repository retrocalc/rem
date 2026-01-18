import { RUT } from '../value-objects/rut.vo';
import { Email } from '../value-objects/email.vo';
import { AsigProf, SistPrevisional, SistSalud } from '../types/empleado.types';

export class Empleado {
  constructor(
    public readonly id: string,
    private datosPersonales: {
      rut: RUT;
      nombre: string;
      email?: Email;
      asigProf?: AsigProf;
      sistPrevisional?: SistPrevisional;
      sistSalud?: SistSalud;
      profesion?: {
        titulo: string;
        institucion: string;
        fechaTitulacion: Date;
      };
    }
  ) {}

  public actualizarDatosPersonales(datos: {
    nombre?: string;
    email?: Email;
    asigProf?: AsigProf;
    sistPrevisional?: SistPrevisional;
    sistSalud?: SistSalud;
    profesion?: {
      titulo: string;
      institucion: string;
      fechaTitulacion: Date;
    };
  }): void {
    if (datos.nombre) {
      this.datosPersonales.nombre = datos.nombre;
    }
    if (datos.email !== undefined) {
      this.datosPersonales.email = datos.email;
    }
    if (datos.asigProf !== undefined) {
      this.datosPersonales.asigProf = datos.asigProf;
    }
    if (datos.sistPrevisional !== undefined) {
      this.datosPersonales.sistPrevisional = datos.sistPrevisional;
    }
    if (datos.sistSalud !== undefined) {
      this.datosPersonales.sistSalud = datos.sistSalud;
    }
    if (datos.profesion !== undefined) {
      this.datosPersonales.profesion = datos.profesion;
    }
  }

  public get rut(): RUT {
    return this.datosPersonales.rut;
  }

  public get nombre(): string {
    return this.datosPersonales.nombre;
  }

  public get email(): Email | undefined {
    return this.datosPersonales.email;
  }

  public get profesion(): { titulo: string; institucion: string; fechaTitulacion: Date } | undefined {
    return this.datosPersonales.profesion;
  }

  public get asigProf(): AsigProf | undefined {
    return this.datosPersonales.asigProf;
  }

  public get sistPrevisional(): SistPrevisional | undefined {
    return this.datosPersonales.sistPrevisional;
  }

  public get sistSalud(): SistSalud | undefined {
    return this.datosPersonales.sistSalud;
  }

  public toJSON() {
    return {
      id: this.id,
      datos_personales: {
        rut: this.rut.toString(),
        nombre: this.nombre,
        email: this.email?.toString(),
        asig_prof: this.asigProf,
        sist_previsional: this.sistPrevisional,
        sist_salud: this.sistSalud,
        profesion: this.profesion ? {
          titulo: this.profesion.titulo,
          institucion: this.profesion.institucion,
          fecha_titulacion: this.profesion.fechaTitulacion.toISOString().split('T')[0]
        } : undefined
      }
    };
  }
}
import { IEmpleadoRepository } from '../../domain/interfaces/repository.interface';
import { Empleado } from '../../domain/entities/empleado.entity';
import { RUT } from '../../domain/value-objects/rut.vo';
import { Email } from '../../domain/value-objects/email.vo';
import { CrearEmpleadoDTO } from '../dto/crear-empleado.dto';
import { EmpleadoNotFoundException } from '../../domain/exceptions/empleado-not-found.exception';
import { AsigProf, SistPrevisional, SistSalud } from '../../domain/types/empleado.types';


export class EmpleadoService {
  constructor(private repository: IEmpleadoRepository) {}

  async inicializar(): Promise<void> {
    await (this.repository as any).inicializar?.();
  }

  async refrescar(): Promise<void> {
    await this.repository.refrescar();
  }

  async crearEmpleado(dto: CrearEmpleadoDTO): Promise<Empleado> {
    const errores = dto.validar();
    if (errores.length > 0) {
      throw new Error(`Error de validación: ${errores.join(', ')}`);
    }

    // Verificar que no exista empleado con mismo RUT
    const rut = new RUT(dto.rut);
    const empleadoExistente = await this.repository.encontrarPorRUT(rut.toString());
    if (empleadoExistente) {
      throw new Error(`Ya existe un empleado con RUT ${dto.rut}`);
    }

    // Generar nuevo ID
    const id = await this.repository.generarNuevoIdEmpleado();

    // Crear objetos de valor
    const rutVO = new RUT(dto.rut);
    const emailVO = dto.email ? new Email(dto.email) : undefined;

    // Convertir profesión DTO a objeto
    let profesionVO;
    if (dto.profesion) {
      profesionVO = {
        titulo: dto.profesion.titulo,
        institucion: dto.profesion.institucion,
        fechaTitulacion: new Date(dto.profesion.fecha_titulacion)
      };
    }

    // Crear entidad Empleado
    const empleado = new Empleado(id, {
      rut: rutVO,
      nombre: dto.nombre,
      email: emailVO,
      asigProf: dto.asig_prof as AsigProf,
      sistPrevisional: dto.sist_previsional as SistPrevisional,
      sistSalud: dto.sist_salud as SistSalud,
      profesion: profesionVO
    });

    // Guardar en repositorio
    await this.repository.guardar(id, empleado.toJSON() as any);

    return empleado;
  }

  async obtenerEmpleadoPorId(id: string): Promise<Empleado> {
    const empleadoData = await this.repository.encontrarPorId(id);
    if (!empleadoData) {
      throw new EmpleadoNotFoundException(id);
    }

    return this.mapToEntity(id, empleadoData);
  }

  async obtenerEmpleadoPorRUT(rut: string): Promise<Empleado> {
    const empleadoData = await this.repository.encontrarPorRUT(rut);
    if (!empleadoData) {
      throw new EmpleadoNotFoundException(`RUT: ${rut}`);
    }

    // Encontrar el ID del empleado
    const empleadosMap = await this.repository.listarTodos();
    for (const [id, emp] of empleadosMap.entries()) {
      if (emp.datos_personales.rut === rut) {
        return this.mapToEntity(id, emp);
      }
    }

    throw new EmpleadoNotFoundException(`RUT: ${rut}`);
  }

  async listarEmpleados(): Promise<Empleado[]> {
    const empleadosMap = await this.repository.listarTodos();
    const empleados: Empleado[] = [];

    for (const [id, empleadoData] of empleadosMap.entries()) {
      empleados.push(this.mapToEntity(id, empleadoData));
    }

    return empleados;
  }

  async actualizarEmpleado(id: string, dto: Partial<CrearEmpleadoDTO>): Promise<Empleado> {
    const empleadoExistente = await this.repository.encontrarPorId(id);
    if (!empleadoExistente) {
      throw new EmpleadoNotFoundException(id);
    }

    // Validar RUT si se está actualizando
    if (dto.rut) {
      const rut = new RUT(dto.rut);
      const empleadoConMismoRUT = await this.repository.encontrarPorRUT(rut.toString());
      if (empleadoConMismoRUT && empleadoConMismoRUT !== empleadoExistente) {
        throw new Error(`Ya existe otro empleado con RUT ${dto.rut}`);
      }
    }

    // Obtener datos actuales
    const empleadoEntity = this.mapToEntity(id, empleadoExistente);

    // Actualizar datos personales
    const datosActualizados: any = {};
    if (dto.nombre) datosActualizados.nombre = dto.nombre;
    if (dto.email !== undefined) {
      datosActualizados.email = dto.email ? new Email(dto.email) : undefined;
    }
    if (dto.asig_prof !== undefined) datosActualizados.asigProf = dto.asig_prof as AsigProf;
    if (dto.sist_previsional !== undefined) datosActualizados.sistPrevisional = dto.sist_previsional as SistPrevisional;
    if (dto.sist_salud !== undefined) datosActualizados.sistSalud = dto.sist_salud as SistSalud;
    if (dto.profesion !== undefined) {
      if (dto.profesion) {
        datosActualizados.profesion = {
          titulo: dto.profesion.titulo,
          institucion: dto.profesion.institucion,
          fechaTitulacion: new Date(dto.profesion.fecha_titulacion)
        };
      } else {
        datosActualizados.profesion = undefined;
      }
    }

    empleadoEntity.actualizarDatosPersonales(datosActualizados);

    // Si se actualiza RUT, necesitamos crear nueva entidad (inmutable)
    let empleadoActualizado = empleadoEntity;
    if (dto.rut) {
      empleadoActualizado = new Empleado(id, {
        rut: new RUT(dto.rut),
        nombre: dto.nombre || empleadoExistente.datos_personales.nombre,
        email: dto.email ? new Email(dto.email) : 
               (empleadoExistente.datos_personales.email ? new Email(empleadoExistente.datos_personales.email) : undefined),
         asigProf: dto.asig_prof !== undefined ? dto.asig_prof as AsigProf : empleadoExistente.datos_personales.asig_prof as AsigProf,
         sistPrevisional: dto.sist_previsional !== undefined ? dto.sist_previsional as SistPrevisional : empleadoExistente.datos_personales.sist_previsional as SistPrevisional,
         sistSalud: dto.sist_salud !== undefined ? dto.sist_salud as SistSalud : empleadoExistente.datos_personales.sist_salud as SistSalud,
        profesion: datosActualizados.profesion
      });
    }

    // Guardar cambios
    await this.repository.guardar(id, empleadoActualizado.toJSON() as any);

    return empleadoActualizado;
  }

  async eliminarEmpleado(id: string): Promise<boolean> {
    const empleadoExistente = await this.repository.encontrarPorId(id);
    if (!empleadoExistente) {
      throw new EmpleadoNotFoundException(id);
    }

    return await this.repository.eliminar(id);
  }

  private mapToEntity(id: string, empleadoData: any): Empleado {
    const rut = new RUT(empleadoData.datos_personales.rut);
    const email = empleadoData.datos_personales.email ? 
                  new Email(empleadoData.datos_personales.email) : undefined;

    let profesion;
    if (empleadoData.datos_personales.profesion && empleadoData.datos_personales.profesion.titulo) {
      profesion = {
        titulo: empleadoData.datos_personales.profesion.titulo,
        institucion: empleadoData.datos_personales.profesion.institucion,
        fechaTitulacion: new Date(empleadoData.datos_personales.profesion.fecha_titulacion)
      };
    }

    return new Empleado(id, {
      rut,
      nombre: empleadoData.datos_personales.nombre,
      email,
      asigProf: empleadoData.datos_personales.asig_prof as AsigProf,
      sistPrevisional: empleadoData.datos_personales.sist_previsional as SistPrevisional,
      sistSalud: empleadoData.datos_personales.sist_salud as SistSalud,
      profesion
    });
  }
}
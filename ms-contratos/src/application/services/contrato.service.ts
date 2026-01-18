// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { IContratoRepository } from '../../domain/interfaces/repository.interface';
import { ContratoEntity } from '../../domain/entities/contrato.entity';
import { CrearContratoDTO } from '../dto/crear-contrato.dto';
import { ContratoNotFoundException } from '../../domain/exceptions/contrato-not-found.exception';
import { TipoContrato, Contrato } from '../../domain/interfaces/contrato.interface';

export class ContratoService {
  constructor(private repository: IContratoRepository) {}

  async inicializar(): Promise<void> {
    await (this.repository as any).inicializar?.();
  }

  async crearContrato(dto: CrearContratoDTO): Promise<ContratoEntity> {
    const errores = dto.validar();
    if (errores.length > 0) {
      throw new Error(`Error de validación: ${errores.join(', ')}`);
    }

    // Verificar que no exista contrato con mismo número
    const contratoExistente = await this.repository.encontrarPorNumeroContrato(dto.numero_contrato);
    if (contratoExistente) {
      throw new Error(`Ya existe un contrato con número ${dto.numero_contrato}`);
    }

    // Convertir fechas string a Date
    const fechaContrato = new Date(dto.fecha_contrato);
    const inicio = new Date(dto.inicio);
    const termino = dto.termino && dto.termino !== '' ? new Date(dto.termino) : null;

    // Crear entidad Contrato
    const contrato = ContratoEntity.crear(
      dto.empleadoId,
      dto.numero_contrato,
      fechaContrato,
      dto.tipo,
      dto.sueldo_base,
      inicio,
      termino,
      'activo', // estado por defecto
      dto.cargo,
      dto.grado,
      dto.cantidad_bienios,
      dto.escalafon
    );

    // Guardar en repositorio
    await this.repository.guardar(contrato.id, contrato.toJSON());

    return contrato;
  }

  async obtenerContratoPorId(id: string): Promise<ContratoEntity> {
    const contratoData = await this.repository.encontrarPorId(id);
    if (!contratoData) {
      throw new ContratoNotFoundException(id);
    }

    return this.mapToEntity(id, contratoData);
  }

  async obtenerContratosPorEmpleadoId(empleadoId: string): Promise<ContratoEntity[]> {
    const contratosData = await this.repository.encontrarPorEmpleadoId(empleadoId);
    return contratosData.map(contratoData => 
      this.mapToEntity(contratoData.id, contratoData)
    );
  }

  async listarContratos(): Promise<ContratoEntity[]> {
    const contratosMap = await this.repository.listarTodos();
    const contratos: ContratoEntity[] = [];

    for (const [id, contratoData] of contratosMap.entries()) {
      contratos.push(this.mapToEntity(id, contratoData));
    }

    return contratos;
  }

  async actualizarContrato(id: string, dto: Partial<CrearContratoDTO>): Promise<ContratoEntity> {
    const contratoExistente = await this.repository.encontrarPorId(id);
    if (!contratoExistente) {
      throw new ContratoNotFoundException(id);
    }

    // Validar número de contrato si se está actualizando
    if (dto.numero_contrato) {
      const contratoConMismoNumero = await this.repository.encontrarPorNumeroContrato(dto.numero_contrato);
      if (contratoConMismoNumero && contratoConMismoNumero.id !== id) {
        throw new Error(`Ya existe otro contrato con número ${dto.numero_contrato}`);
      }
    }

    // Obtener entidad actual
    const contratoEntity = this.mapToEntity(id, contratoExistente);

    // Preparar datos de actualización
    const datosActualizacion: {
      numeroContrato?: string;
      fechaContrato?: Date;
      tipo?: TipoContrato;
      sueldoBase?: number;
      inicio?: Date;
      termino?: Date | null;
      estado?: 'activo' | 'inactivo' | 'terminado';
      cargo?: string;
      grado?: string;
      cantidadBienios?: number;
      escalafon?: string;
    } = {};

    if (dto.numero_contrato) datosActualizacion.numeroContrato = dto.numero_contrato;
    if (dto.fecha_contrato) datosActualizacion.fechaContrato = new Date(dto.fecha_contrato);
    if (dto.tipo) datosActualizacion.tipo = dto.tipo;
    if (dto.sueldo_base !== undefined) datosActualizacion.sueldoBase = dto.sueldo_base;
    if (dto.inicio) datosActualizacion.inicio = new Date(dto.inicio);
    if (dto.termino !== undefined) {
      datosActualizacion.termino = dto.termino && dto.termino.trim() ? new Date(dto.termino) : null;
    }
    if (dto.grado !== undefined) datosActualizacion.grado = dto.grado;
    if (dto.cantidad_bienios !== undefined) datosActualizacion.cantidadBienios = dto.cantidad_bienios;
    if (dto.escalafon !== undefined) datosActualizacion.escalafon = dto.escalafon;
    if (dto.cargo !== undefined) datosActualizacion.cargo = dto.cargo;

    // Actualizar entidad
    const contratoActualizado = contratoEntity.actualizar(datosActualizacion);

    // Guardar cambios
    await this.repository.guardar(id, contratoActualizado.toJSON());

    return contratoActualizado;
  }

  async eliminarContrato(id: string): Promise<boolean> {
    const contratoExistente = await this.repository.encontrarPorId(id);
    if (!contratoExistente) {
      throw new ContratoNotFoundException(id);
    }

    return await this.repository.eliminar(id);
  }

  async obtenerContratosVigentes(): Promise<ContratoEntity[]> {
    const todosContratos = await this.listarContratos();
    const ahora = new Date();
    return todosContratos.filter(contrato => contrato.estaVigente(ahora));
  }

  private mapToEntity(id: string, contratoData: Contrato): ContratoEntity {
    // Campos comunes
    const fechaContrato = new Date(contratoData.fecha_contrato);
    const inicio = new Date(contratoData.inicio);
    const termino = contratoData.termino && contratoData.termino !== '' ? new Date(contratoData.termino) : null;
    const creadoEn = new Date(contratoData.creado_en);
    const actualizadoEn = new Date(contratoData.actualizado_en);

    // Manejar diferentes tipos de contrato
    switch (contratoData.tipo) {
      case 'honorarios': {
        return new ContratoEntity(
          id,
          contratoData.empleadoId,
          contratoData.numero_contrato,
          fechaContrato,
          contratoData.tipo,
          contratoData.monto_bruto, // usar monto_bruto en lugar de sueldo_base
          inicio,
          termino,
          creadoEn,
          actualizadoEn,
          contratoData.estado,
          contratoData.cargo,
          undefined,
          undefined,
          undefined
        );
      }
      case 'contrata': {
        const sueldoBase = contratoData.sueldo_base ?? 0;
        return new ContratoEntity(
          id,
          contratoData.empleadoId,
          contratoData.numero_contrato,
          fechaContrato,
          contratoData.tipo,
          sueldoBase,
          inicio,
          termino,
          creadoEn,
          actualizadoEn,
          contratoData.estado,
          contratoData.cargo,
          contratoData.grado,
          contratoData.cantidad_bienios,
          contratoData.escalafon
        );
      }
      case 'planta': {
        const sueldoBase = contratoData.sueldo_base ?? 0;
        return new ContratoEntity(
          id,
          contratoData.empleadoId,
          contratoData.numero_contrato,
          fechaContrato,
          contratoData.tipo,
          sueldoBase,
          inicio,
          termino,
          creadoEn,
          actualizadoEn,
          contratoData.estado,
          contratoData.cargo,
          contratoData.grado,
          contratoData.cantidad_bienios,
          contratoData.escalafon
        );
      }
        default: {
          throw new Error(`Tipo de contrato no válido: ${(contratoData as any).tipo}`);
        }
     }
   }

   async refrescar(): Promise<void> {
     await this.repository.refrescar();
   }
 }
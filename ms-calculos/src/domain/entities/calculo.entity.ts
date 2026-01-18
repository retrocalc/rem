import { 
  CalculoRemuneracion, 
  ContratoHonorarios, 
  ContratoContrata, 
  ContratoPlanta, 
  ParametrosControl,
  EmpleadoData,
  ContratoData,
  DetallesReglas
} from '../interfaces/calculo.interface';

export class CalculoEntity {
  constructor(
    public readonly id: string,
    public readonly contratoId: string,
    public readonly empleadoId: string,
    public readonly mesProceso: string, // Formato: "YYYY-MM"
    public readonly montoBase: number,
    public readonly cantidadBienios: number = 0,
    public readonly montoBienios: number = 0,
    public readonly porcentajeRetencion: number,
    public readonly montoRetencion: number,
    public readonly liquidoPagar: number,
    public readonly creadoEn: Date,
    public readonly tipoContrato: 'honorarios' | 'contrata' | 'planta',
    public readonly estado: 'pendiente' | 'procesado' | 'pagado' | 'anulado',
    public readonly empleadoData?: EmpleadoData,
    public readonly contratoData?: ContratoData,
    public readonly detalles?: DetallesReglas
  ) {}

  public static crearParaHonorarios(
    contrato: ContratoHonorarios,
    parametros: ParametrosControl,
    mesProceso?: string,
    options?: { montoRetencion?: number; liquidoPagar?: number; detalles?: DetallesReglas },
    empleadoData?: EmpleadoData,
    contratoData?: ContratoData
  ): CalculoEntity {
    const ahora = new Date();
    const id = CalculoEntity.generarUUID();
    const mes = mesProceso || parametros.mes_anio_proceso;
    const porcentaje = parametros.porcentaje_retencion_honorarios;
    const montoRetencion = options?.montoRetencion ?? contrato.monto_bruto * porcentaje;
    const liquidoPagar = options?.liquidoPagar ?? contrato.monto_bruto - montoRetencion;

    return new CalculoEntity(
      id,
      contrato.id,
      contrato.empleadoId,
      mes,
      contrato.monto_bruto,
      0, // cantidadBienios
      0, // montoBienios
      porcentaje,
      montoRetencion,
      liquidoPagar,
      ahora,
      'honorarios',
      'procesado',
      empleadoData,
      contratoData,
      options?.detalles
    );
  }

  public static crearParaContrata(
    contrato: ContratoContrata,
    montoBase: number,
    bienios: number,
    mesProceso: string,
    empleadoData?: EmpleadoData,
    contratoData?: ContratoData,
    detalles?: DetallesReglas
  ): CalculoEntity {
    const ahora = new Date();
    const id = CalculoEntity.generarUUID();
    const total = montoBase + bienios;
    // Para contratas no hay retención (porcentaje_retencion = 0)
    const porcentaje = 0;
    const montoRetencion = 0;
    const liquidoPagar = total;

    return new CalculoEntity(
      id,
      contrato.id,
      contrato.empleadoId,
      mesProceso,
      montoBase,
      contrato.cantidad_bienios, // cantidadBienios
      bienios, // montoBienios
      porcentaje,
      montoRetencion,
      liquidoPagar,
      ahora,
      'contrata',
      'procesado',
      empleadoData,
      contratoData,
      detalles
    );
  }

  public static crearParaPlanta(
    contrato: ContratoPlanta,
    montoBase: number,
    bienios: number,
    mesProceso: string,
    empleadoData?: EmpleadoData,
    contratoData?: ContratoData,
    detalles?: DetallesReglas
  ): CalculoEntity {
    const ahora = new Date();
    const id = CalculoEntity.generarUUID();
    const total = montoBase + bienios;
    // Para planta no hay retención (porcentaje_retencion = 0)
    const porcentaje = 0;
    const montoRetencion = 0;
    const liquidoPagar = total;

    return new CalculoEntity(
      id,
      contrato.id,
      contrato.empleadoId,
      mesProceso,
      montoBase,
      contrato.cantidad_bienios, // cantidadBienios
      bienios, // montoBienios
      porcentaje,
      montoRetencion,
      liquidoPagar,
      ahora,
      'planta',
      'procesado',
      empleadoData,
      contratoData,
      detalles
    );
  }

  public marcarComoPagado(): CalculoEntity {
    if (this.estado === 'anulado') {
      throw new Error('No se puede marcar como pagado un cálculo anulado');
    }
    return new CalculoEntity(
      this.id,
      this.contratoId,
      this.empleadoId,
      this.mesProceso,
      this.montoBase,
      this.cantidadBienios,
      this.montoBienios,
      this.porcentajeRetencion,
      this.montoRetencion,
      this.liquidoPagar,
      this.creadoEn,
      this.tipoContrato,
      'pagado',
      this.empleadoData,
      this.contratoData,
      this.detalles
    );
  }

  public anular(): CalculoEntity {
    return new CalculoEntity(
      this.id,
      this.contratoId,
      this.empleadoId,
      this.mesProceso,
      this.montoBase,
      this.cantidadBienios,
      this.montoBienios,
      this.porcentajeRetencion,
      this.montoRetencion,
      this.liquidoPagar,
      this.creadoEn,
      this.tipoContrato,
      'anulado',
      this.empleadoData,
      this.contratoData,
      this.detalles
    );
  }

  public toJSON(): CalculoRemuneracion {
    const tipo = this.tipoContrato;
    const baseComun = {
      id: this.id,
      contratoId: this.contratoId,
      empleadoId: this.empleadoId,
      mes_proceso: this.mesProceso,
      liquido_pagar: this.liquidoPagar,
      creado_en: this.creadoEn.toISOString(),
      estado: this.estado,
      detalles: this.detalles
    };

    switch (tipo) {
      case 'honorarios':
        return {
          ...baseComun,
          tipo_contrato: tipo,
          monto_bruto: this.montoBase,
          porcentaje_retencion: this.porcentajeRetencion,
          monto_retencion: this.montoRetencion,
          empleado_data: this.empleadoData,
          contrato_data: this.contratoData as ContratoData & { tipo: 'honorarios' }
        };
      case 'contrata':
        return {
          ...baseComun,
          tipo_contrato: tipo,
          sueldo_base: this.montoBase,
          cantidad_bienios: this.cantidadBienios,
          monto_bienios: this.montoBienios,
          empleado_data: this.empleadoData,
          contrato_data: this.contratoData as ContratoData & { tipo: 'contrata' }
        };
      case 'planta':
        return {
          ...baseComun,
          tipo_contrato: tipo,
          sueldo_base: this.montoBase,
          cantidad_bienios: this.cantidadBienios,
          monto_bienios: this.montoBienios,
          empleado_data: this.empleadoData,
          contrato_data: this.contratoData as ContratoData & { tipo: 'planta' }
        };
      default:
        throw new Error(`Tipo de contrato no soportado: ${tipo as string}`);
    }
  }

  public static fromJSON(data: CalculoRemuneracion): CalculoEntity {
    // Type-safe extraction of embedded data
    const empleadoData = 'empleado_data' in data ? data.empleado_data : undefined;
    const contratoData = 'contrato_data' in data ? data.contrato_data : undefined;
    
    switch (data.tipo_contrato) {
      case 'honorarios': {
        const { id, contratoId, empleadoId, mes_proceso, creado_en, estado, monto_bruto, porcentaje_retencion, monto_retencion, liquido_pagar, detalles } = data;
        return new CalculoEntity(
          id,
          contratoId,
          empleadoId,
          mes_proceso,
          monto_bruto,
          0, // cantidadBienios
          0, // montoBienios
          porcentaje_retencion,
          monto_retencion,
          liquido_pagar,
          new Date(creado_en),
          'honorarios',
          estado,
          empleadoData,
          contratoData,
          detalles
        );
      }
      case 'contrata': {
        const { id, contratoId, empleadoId, mes_proceso, creado_en, estado, sueldo_base, cantidad_bienios, monto_bienios, liquido_pagar, detalles } = data;
        // Para contrata no hay retención
        const porcentajeRetencion = 0;
        const montoRetencion = 0;
        return new CalculoEntity(
          id,
          contratoId,
          empleadoId,
          mes_proceso,
          sueldo_base,
          cantidad_bienios,
          monto_bienios,
          porcentajeRetencion,
          montoRetencion,
          liquido_pagar,
          new Date(creado_en),
          'contrata',
          estado,
          empleadoData,
          contratoData,
          detalles
        );
      }
      case 'planta': {
        const { id, contratoId, empleadoId, mes_proceso, creado_en, estado, sueldo_base, cantidad_bienios, monto_bienios, liquido_pagar, detalles } = data;
        // Para planta no hay retención
        const porcentajeRetencion = 0;
        const montoRetencion = 0;
        return new CalculoEntity(
          id,
          contratoId,
          empleadoId,
          mes_proceso,
          sueldo_base,
          cantidad_bienios,
          monto_bienios,
          porcentajeRetencion,
          montoRetencion,
          liquido_pagar,
          new Date(creado_en),
          'planta',
          estado,
          empleadoData,
          contratoData,
          detalles
        );
      }
      default:
        throw new Error(`Tipo de contrato no soportado: ${(data as { tipo_contrato: string }).tipo_contrato}`);
    }
  }

  private static generarUUID(): string {
    // Usar uuidv4 en producción
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
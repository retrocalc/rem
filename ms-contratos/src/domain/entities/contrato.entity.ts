import { TipoContrato, ContratoHonorarios, ContratoContrata, ContratoPlanta, Contrato } from '../interfaces/contrato.interface';

export class ContratoEntity {
  constructor(
    public readonly id: string,
    public readonly empleadoId: string,
    public readonly numeroContrato: string,
    public readonly fechaContrato: Date,
    public readonly tipo: TipoContrato,
    public readonly montoBruto: number, // sueldo_base para honorarios, 0 para otros
    public readonly inicio: Date,
    public readonly termino: Date | null,
    public readonly creadoEn: Date,
    public readonly actualizadoEn: Date,
    public readonly estado: 'activo' | 'inactivo' | 'terminado',
    public readonly cargo?: string,
    public readonly grado?: string,
    public readonly cantidadBienios?: number,
    public readonly escalafon?: string
  ) {}

  // Alias para compatibilidad (sueldoBase -> montoBruto)
  get sueldoBase(): number {
    return this.montoBruto;
  }

  public static crear(
    empleadoId: string,
    numeroContrato: string,
    fechaContrato: Date,
    tipo: TipoContrato,
    montoBruto: number,
    inicio: Date,
    termino: Date | null,
    estado: 'activo' | 'inactivo' | 'terminado' = 'activo',
    cargo?: string,
    grado?: string,
    cantidadBienios?: number,
    escalafon?: string
  ): ContratoEntity {
    const ahora = new Date();
    const id = ContratoEntity.generarUUID();
    
    return new ContratoEntity(
      id,
      empleadoId,
      numeroContrato,
      fechaContrato,
      tipo,
      montoBruto,
      inicio,
      termino,
      ahora,
      ahora,
      estado,
      cargo,
      grado,
      cantidadBienios,
      escalafon
    );
  }

  public actualizar(
    datos: {
      numeroContrato?: string;
      fechaContrato?: Date;
      tipo?: TipoContrato;
      montoBruto?: number;
      inicio?: Date;
      termino?: Date | null;
      estado?: 'activo' | 'inactivo' | 'terminado';
      cargo?: string;
      grado?: string;
      cantidadBienios?: number;
      escalafon?: string;
    }
  ): ContratoEntity {
    return new ContratoEntity(
      this.id,
      this.empleadoId,
      datos.numeroContrato ?? this.numeroContrato,
      datos.fechaContrato ?? this.fechaContrato,
      datos.tipo ?? this.tipo,
      datos.montoBruto ?? this.montoBruto,
      datos.inicio ?? this.inicio,
      datos.termino ?? this.termino,
      this.creadoEn,
      new Date(), // actualizadoEn
      datos.estado ?? this.estado,
      datos.cargo ?? this.cargo,
      datos.grado ?? this.grado,
      datos.cantidadBienios ?? this.cantidadBienios,
      datos.escalafon ?? this.escalafon
    );
  }

  public estaVigente(fechaReferencia: Date = new Date()): boolean {
    if (this.termino === null) {
      return fechaReferencia >= this.inicio;
    }
    return fechaReferencia >= this.inicio && fechaReferencia <= this.termino;
  }

  public toJSON(): Contrato {
    const base = {
      id: this.id,
      empleadoId: this.empleadoId,
      numero_contrato: this.numeroContrato,
      fecha_contrato: this.fechaContrato.toISOString().split('T')[0],
      tipo: this.tipo,
      inicio: this.inicio.toISOString().split('T')[0],
      termino: this.termino ? this.termino.toISOString().split('T')[0] : '',
      creado_en: this.creadoEn.toISOString(),
      actualizado_en: this.actualizadoEn.toISOString(),
      estado: this.estado,
      ...(this.cargo && { cargo: this.cargo })
    };

    switch (this.tipo) {
      case 'honorarios': {
        return {
          ...base,
          tipo: 'honorarios',
          monto_bruto: this.montoBruto
        } as ContratoHonorarios;
      }
      case 'contrata': {
        const contrataJson: Partial<ContratoContrata> = {
          ...base,
          tipo: 'contrata',
          grado: this.grado!,
          cantidad_bienios: this.cantidadBienios!,
          ...(this.escalafon && { escalafon: this.escalafon })
        };
        // Solo incluir sueldo_base si tiene valor (opcional)
        if (this.montoBruto > 0) {
          contrataJson.sueldo_base = this.montoBruto;
        }
        return contrataJson as ContratoContrata;
      }
      case 'planta': {
        const plantaJson: Partial<ContratoPlanta> = {
          ...base,
          tipo: 'planta',
          grado: this.grado!,
          cantidad_bienios: this.cantidadBienios!,
          ...(this.escalafon && { escalafon: this.escalafon })
        };
        if (this.montoBruto > 0) {
          plantaJson.sueldo_base = this.montoBruto;
        }
        return plantaJson as ContratoPlanta;
      }
      default: {
        const exhaustiveCheck: never = this.tipo;
        throw new Error(`Tipo de contrato no válido: ${exhaustiveCheck as string}`);
      }
    }
  }

  private static generarUUID(): string {
    // Usar uuidv4 en producción
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c: string) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
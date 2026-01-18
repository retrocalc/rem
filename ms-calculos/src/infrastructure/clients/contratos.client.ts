import { HttpClient } from './http.client';
import { type ContratoHonorarios, type ContratoContrata, type ContratoPlanta, type Contrato } from '../../domain/interfaces/calculo.interface';
import type { AxiosError } from 'axios';

export interface RawContrato {
  id: string;
  empleadoId: string;
  tipo: 'honorarios' | 'contrata' | 'planta';
  termino?: string;
  monto_bruto?: number;
  grado?: string;
  cargo?: string;
  cantidad_bienios?: number;
}

export class ContratosClient {
  private http: HttpClient;

  constructor(baseURL: string) {
    this.http = new HttpClient(baseURL);
  }

  async obtenerContratosActivos(): Promise<ContratoHonorarios[]> {
    const contratos = await this.http.get<RawContrato[]>('/api/contratos');
    
    // Filtrar solo contratos de tipo "honorarios" y activos
    const ahora = new Date();
    return contratos.filter(contrato => {
      // Verificar tipo
      if (contrato.tipo !== 'honorarios') {
        return false;
      }
      
      // Verificar si está activo según término
      const termino = contrato.termino;
      
      // Si término está vacío o es null/undefined, el contrato está activo
      if (!termino || termino.trim() === '') {
        return true;
      }
      
      // Si tiene término, verificar si la fecha actual es anterior al término
      const fechaTermino = new Date(termino);
      return ahora <= fechaTermino;
      
    }).map(contrato => ({
      id: contrato.id,
      empleadoId: contrato.empleadoId,
      monto_bruto: contrato.monto_bruto,
      estado: 'activo', // Asumimos activo después del filtro
      tipo: 'honorarios'
    })) as ContratoHonorarios[];
  }

  async obtenerContratoPorId(id: string): Promise<ContratoHonorarios | null> {
    try {
      const contrato = await this.http.get<RawContrato>(`/api/contratos/${id}`);
      if (contrato.tipo === 'honorarios') {
        // Determinar estado basado en término
        const ahora = new Date();
        const termino = contrato.termino;
        let estado: 'activo' | 'inactivo' | 'terminado' = 'activo';
        
        if (termino && termino.trim() !== '') {
          const fechaTermino = new Date(termino);
          estado = ahora <= fechaTermino ? 'activo' : 'terminado';
        }
        
        return {
          id: contrato.id,
          empleadoId: contrato.empleadoId,
          monto_bruto: contrato.monto_bruto,
          estado,
          tipo: 'honorarios'
        } as ContratoHonorarios;
      }
      return null;
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error && (error as AxiosError).response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async obtenerContratoPorIdGenerico(id: string): Promise<Contrato | null> {
    console.log(`[ContratosClient.obtenerContratoPorIdGenerico] Obteniendo contrato ${id}`);
    try {
      const contrato = await this.http.get<RawContrato>(`/api/contratos/${id}`);
      console.log(`[ContratosClient.obtenerContratoPorIdGenerico] Contrato obtenido: ${JSON.stringify(contrato)}`);
      
      // Verificar si está activo según término
      const ahora = new Date();
      const termino = contrato.termino;
      let estado: 'activo' | 'inactivo' | 'terminado' = 'activo';
      
      if (termino && termino.trim() !== '') {
        const fechaTermino = new Date(termino);
        estado = ahora <= fechaTermino ? 'activo' : 'terminado';
      }
      
      // Mapear según tipo de contrato con validación de campos requeridos
      const base = {
        id: contrato.id,
        empleadoId: contrato.empleadoId,
        estado: estado as 'activo' | 'inactivo' | 'terminado'
      };
       
      if (contrato.tipo === 'honorarios') {
        // Validar campos requeridos para honorarios
        if (typeof contrato.monto_bruto !== 'number') {
          throw new Error(`Contrato ${contrato.id} de tipo honorarios tiene monto_bruto inválido: ${contrato.monto_bruto}`);
        }
        return {
          ...base,
          monto_bruto: contrato.monto_bruto,
          tipo: 'honorarios' as const
        } as ContratoHonorarios;
      } else if (contrato.tipo === 'contrata') {
        // Validar campos requeridos para contrata
        if (!contrato.grado || typeof contrato.grado !== 'string') {
          throw new Error(`Contrato ${contrato.id} de tipo contrata tiene grado inválido: ${contrato.grado}`);
        }
        if (typeof contrato.cantidad_bienios !== 'number' || contrato.cantidad_bienios < 0) {
          throw new Error(`Contrato ${contrato.id} de tipo contrata tiene cantidad_bienios inválido: ${contrato.cantidad_bienios}`);
        }
        return {
          ...base,
          grado: contrato.grado,
          cargo: contrato.cargo,
          cantidad_bienios: contrato.cantidad_bienios,
          tipo: 'contrata' as const
        } as ContratoContrata;
      } else if (contrato.tipo === 'planta') {
        // Validar campos requeridos para planta
        if (!contrato.grado || typeof contrato.grado !== 'string') {
          throw new Error(`Contrato ${contrato.id} de tipo planta tiene grado inválido: ${contrato.grado}`);
        }
        if (typeof contrato.cantidad_bienios !== 'number' || contrato.cantidad_bienios < 0) {
          throw new Error(`Contrato ${contrato.id} de tipo planta tiene cantidad_bienios inválido: ${contrato.cantidad_bienios}`);
        }
        return {
          ...base,
          grado: contrato.grado,
          cargo: contrato.cargo,
          cantidad_bienios: contrato.cantidad_bienios,
          tipo: 'planta' as const
        } as ContratoPlanta;
      } else {
        // Tipo de contrato no soportado
        throw new Error(`Tipo de contrato no soportado: ${contrato.tipo as string}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error && (error as AxiosError).response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

   async refrescar(): Promise<void> {
     try {
       await this.http.post('/api/contratos/inicializar', {});
     } catch (error: unknown) {
       // Log pero no fallar si el endpoint no existe o hay error
       console.warn(`No se pudo refrescar contratos: ${error instanceof Error ? error.message : String(error)}`);
     }
   }

    async obtenerContratosActivosGenerico(): Promise<Contrato[]> {
     console.log('[ContratosClient.obtenerContratosActivosGenerico] Obteniendo contratos activos');
     const contratos = await this.http.get<RawContrato[]>('/api/contratos');
     console.log(`[ContratosClient.obtenerContratosActivosGenerico] ${contratos.length} contratos obtenidos del servicio`);
    
    // Filtrar contratos activos (de cualquier tipo)
    const ahora = new Date();
    const contratosActivos = contratos.filter(contrato => {
      // Verificar si está activo según término
      const termino = contrato.termino;
      
      // Si término está vacío o es null/undefined, el contrato está activo
      if (!termino || termino.trim() === '') {
        return true;
      }
      
      // Si tiene término, verificar si la fecha actual es anterior al término
      const fechaTermino = new Date(termino);
      return ahora <= fechaTermino;
      
    }).map(contrato => {
      // Mapear según tipo de contrato con validación de campos requeridos
      const base = {
        id: contrato.id,
        empleadoId: contrato.empleadoId,
        estado: 'activo' as const
      };
       
      if (contrato.tipo === 'honorarios') {
        // Validar campos requeridos para honorarios
        if (typeof contrato.monto_bruto !== 'number') {
          // eslint-disable-next-line no-console
          console.warn(`Contrato ${contrato.id} de tipo honorarios tiene monto_bruto inválido: ${contrato.monto_bruto}`);
          return null;
        }
        return {
          ...base,
          monto_bruto: contrato.monto_bruto,
          tipo: 'honorarios' as const
        } as ContratoHonorarios;
       } else if (contrato.tipo === 'contrata') {
        // Validar campos requeridos para contrata
        if (!contrato.grado || typeof contrato.grado !== 'string') {
          // eslint-disable-next-line no-console
          console.warn(`Contrato ${contrato.id} de tipo contrata tiene grado inválido: ${contrato.grado}`);
          return null;
        }
        if (typeof contrato.cantidad_bienios !== 'number' || contrato.cantidad_bienios < 0) {
          // eslint-disable-next-line no-console
          console.warn(`Contrato ${contrato.id} de tipo contrata tiene cantidad_bienios inválido: ${contrato.cantidad_bienios}`);
          return null;
        }
        return {
          ...base,
          grado: contrato.grado,
          cargo: contrato.cargo,
          cantidad_bienios: contrato.cantidad_bienios,
          tipo: 'contrata' as const
        } as ContratoContrata;
      } else if (contrato.tipo === 'planta') {
        // Validar campos requeridos para planta
        if (!contrato.grado || typeof contrato.grado !== 'string') {
          // eslint-disable-next-line no-console
          console.warn(`Contrato ${contrato.id} de tipo planta tiene grado inválido: ${contrato.grado}`);
          return null;
        }
        if (typeof contrato.cantidad_bienios !== 'number' || contrato.cantidad_bienios < 0) {
          // eslint-disable-next-line no-console
          console.warn(`Contrato ${contrato.id} de tipo planta tiene cantidad_bienios inválido: ${contrato.cantidad_bienios}`);
          return null;
        }
        return {
          ...base,
          grado: contrato.grado,
          cargo: contrato.cargo,
          cantidad_bienios: contrato.cantidad_bienios,
          tipo: 'planta' as const
        } as ContratoPlanta;
      } else {
        // Tipo de contrato no soportado - excluir
        // eslint-disable-next-line no-console
        console.warn(`Tipo de contrato no soportado: ${contrato.tipo as string} para contrato ${contrato.id}`);
        return null;
      }
     }).filter((contrato): contrato is Contrato => contrato !== null);
     console.log(`[ContratosClient.obtenerContratosActivosGenerico] ${contratosActivos.length} contratos activos después del filtrado`);
     return contratosActivos;
   }
}
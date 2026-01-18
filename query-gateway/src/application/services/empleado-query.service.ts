import { HttpClient } from '../../infrastructure/clients/http-client';
import { CacheService } from '../../infrastructure/caching/cache.service';
import {
  EmpleadoCompletoDTO,
  EmpleadosPaginadosDTO,
  FiltroEmpleadosDTO,
  EmpleadoFiltrosDTO,
  PaginacionDTO,
  ContratoResumenDTO
} from '../../api/dto/empleado.dto';
import { logger } from '../../infrastructure/logging/logger';

interface EmpleadoFromService {
  id: string;
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

interface ContratoFromService {
  id: string;
  empleadoId: string;
  tipo: 'honorarios' | 'contrata' | 'planta';
  escalafon?: string;
  grado?: string;
  estado: 'activo' | 'inactivo' | 'terminado';
  inicio: string;
  termino?: string;
  cargo?: string;
}

export class EmpleadoQueryService {
  constructor(
    private httpClient: HttpClient,
    private cacheService: CacheService
  ) {}

  async obtenerEmpleadosConContratos(filtros?: FiltroEmpleadosDTO): Promise<EmpleadosPaginadosDTO> {
    const cacheKey = this.buildCacheKey('empleados-contratos', filtros);
    
    return this.cacheService.withCache(
      cacheKey,
      async () => {
        try {
          // Obtener empleados y contratos en paralelo
          const [empleadosData, contratosData] = await Promise.all([
            this.httpClient.get<EmpleadoFromService[]>('empleados', '/empleados'),
            this.httpClient.get<ContratoFromService[]>('contratos', '/contratos')
          ]);

          // Combinar datos
          const empleadosCombinados = this.combinarEmpleadosConContratos(empleadosData, contratosData);
          
          // Aplicar filtros
          const empleadosFiltrados = this.aplicarFiltros(empleadosCombinados, filtros);
          
          // Paginación
          const { page = 1, limit = 20 } = filtros || {};
          const paginados = this.paginarEmpleados(empleadosFiltrados, page, limit);
          
          // Obtener filtros disponibles
          const filtrosDisponibles = this.obtenerFiltrosDisponibles(empleadosCombinados);

          return {
            empleados: paginados.empleados,
            paginacion: paginados.paginacion,
            filtros: filtrosDisponibles
          };
        } catch (error: any) {
          logger.error('Error obteniendo empleados con contratos:', {
            error: error.message,
            filtros,
            timestamp: new Date().toISOString()
          });
          throw error;
        }
      },
      60 // Cache por 1 minuto
    );
  }

  async obtenerEmpleadoCompleto(id: string): Promise<EmpleadoCompletoDTO> {
    const cacheKey = `empleado-completo:${id}`;
    
    return this.cacheService.withCache(
      cacheKey,
      async () => {
        try {
          // Obtener empleado específico
          const empleado = await this.httpClient.get<EmpleadoFromService>('empleados', `/empleados/${id}`);
          
          // Buscar contrato del empleado
          const contratos = await this.httpClient.get<ContratoFromService[]>('contratos', '/contratos');
          const contratoEmpleado = contratos.find(c => c.empleadoId === id);
          
          return this.combinarEmpleadoConContrato(empleado, contratoEmpleado);
        } catch (error: any) {
          logger.error(`Error obteniendo empleado ${id}:`, {
            id,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          throw error;
        }
      },
      120 // Cache por 2 minutos
    );
  }

  async obtenerResumenEmpleados(): Promise<{
    total: number;
    activos: number;
    porTipoContrato: Record<string, number>;
    porEscalafon: Record<string, number>;
  }> {
    const cacheKey = 'resumen-empleados';
    
    return this.cacheService.withCache(
      cacheKey,
      async () => {
        try {
          const [empleados, contratos] = await Promise.all([
            this.httpClient.get<EmpleadoFromService[]>('empleados', '/empleados'),
            this.httpClient.get<ContratoFromService[]>('contratos', '/contratos')
          ]);

          const empleadosCombinados = this.combinarEmpleadosConContratos(empleados, contratos);
          
          // Calcular estadísticas
          const porTipoContrato: Record<string, number> = {
            honorarios: 0,
            contrata: 0,
            planta: 0,
            sin_contrato: 0
          };
          
          const porEscalafon: Record<string, number> = {};
          let activos = 0;

          for (const empleado of empleadosCombinados) {
            if (empleado.contrato?.tipo) {
              porTipoContrato[empleado.contrato.tipo] = (porTipoContrato[empleado.contrato.tipo] || 0) + 1;
              
              if (empleado.contrato.estado === 'activo') {
                activos++;
              }
              
              if (empleado.contrato.escalafon) {
                porEscalafon[empleado.contrato.escalafon] = (porEscalafon[empleado.contrato.escalafon] || 0) + 1;
              }
            } else {
              porTipoContrato.sin_contrato++;
            }
          }

          return {
            total: empleadosCombinados.length,
            activos,
            porTipoContrato,
            porEscalafon
          };
        } catch (error: any) {
          logger.error('Error obteniendo resumen de empleados:', {
            error: error.message,
            timestamp: new Date().toISOString()
          });
          throw error;
        }
      },
      30 // Cache por 30 segundos
    );
  }

  private combinarEmpleadosConContratos(
    empleados: EmpleadoFromService[],
    contratos: ContratoFromService[]
  ): EmpleadoCompletoDTO[] {
    const contratoPorEmpleado = new Map<string, ContratoFromService>();
    
    for (const contrato of contratos) {
      contratoPorEmpleado.set(contrato.empleadoId, contrato);
    }

    return empleados.map(empleado => 
      this.combinarEmpleadoConContrato(empleado, contratoPorEmpleado.get(empleado.id))
    );
  }

  private combinarEmpleadoConContrato(
    empleado: EmpleadoFromService,
    contrato?: ContratoFromService
  ): EmpleadoCompletoDTO {
    return {
      id: empleado.id,
      rut: empleado.datos_personales.rut,
      nombre: empleado.datos_personales.nombre,
      email: empleado.datos_personales.email,
      profesion: empleado.datos_personales.profesion,
      contrato: contrato ? {
        id: contrato.id,
        tipo: contrato.tipo,
        escalafon: contrato.escalafon,
        grado: contrato.grado,
        estado: contrato.estado,
        inicio: contrato.inicio,
        termino: contrato.termino,
        cargo: contrato.cargo
      } : undefined,
      tieneContrato: !!contrato
    };
  }

  private aplicarFiltros(
    empleados: EmpleadoCompletoDTO[],
    filtros?: FiltroEmpleadosDTO
  ): EmpleadoCompletoDTO[] {
    if (!filtros) return empleados;

    return empleados.filter(empleado => {
      // Filtro por tipo de contrato
      if (filtros.tipoContrato && filtros.tipoContrato !== 'todos') {
        if (!empleado.contrato || empleado.contrato.tipo !== filtros.tipoContrato) {
          return false;
        }
      }

      // Filtro por escalafón
      if (filtros.escalafon) {
        if (!empleado.contrato?.escalafon || empleado.contrato.escalafon !== filtros.escalafon) {
          return false;
        }
      }

      // Filtro por estado
      if (filtros.estado) {
        if (!empleado.contrato || empleado.contrato.estado !== filtros.estado) {
          return false;
        }
      }

      // Búsqueda por texto
      if (filtros.search) {
        const searchLower = filtros.search.toLowerCase();
        const matchesNombre = empleado.nombre.toLowerCase().includes(searchLower);
        const matchesRut = empleado.rut.toLowerCase().includes(searchLower);
        const matchesEmail = empleado.email?.toLowerCase().includes(searchLower) || false;
        const matchesProfesion = empleado.profesion?.titulo.toLowerCase().includes(searchLower) || false;
        
        if (!(matchesNombre || matchesRut || matchesEmail || matchesProfesion)) {
          return false;
        }
      }

      return true;
    });
  }

  private paginarEmpleados(
    empleados: EmpleadoCompletoDTO[],
    page: number,
    limit: number
  ): { empleados: EmpleadoCompletoDTO[]; paginacion: PaginacionDTO } {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const empleadosPagina = empleados.slice(startIndex, endIndex);
    const total = empleados.length;
    const totalPaginas = Math.ceil(total / limit);

    return {
      empleados: empleadosPagina,
      paginacion: {
        pagina: page,
        limite: limit,
        total,
        totalPaginas
      }
    };
  }

  private obtenerFiltrosDisponibles(empleados: EmpleadoCompletoDTO[]): EmpleadoFiltrosDTO {
    const tiposContrato = new Set<ContratoResumenDTO['tipo']>();
    const escalafones = new Set<string>();
    const estados = new Set<ContratoResumenDTO['estado']>();

    for (const empleado of empleados) {
      if (empleado.contrato) {
        tiposContrato.add(empleado.contrato.tipo);
        estados.add(empleado.contrato.estado);
        
        if (empleado.contrato.escalafon) {
          escalafones.add(empleado.contrato.escalafon);
        }
      }
    }

    return {
      tiposContrato: Array.from(tiposContrato),
      escalafones: Array.from(escalafones),
      estados: Array.from(estados)
    };
  }

  private buildCacheKey(base: string, filtros?: any): string {
    if (!filtros) return base;
    
    const filtrosStr = JSON.stringify(filtros);
    const hash = this.simpleHash(filtrosStr);
    return `${base}:${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  async invalidarCacheEmpleados(): Promise<void> {
    await this.cacheService.invalidatePattern('empleado-*');
    await this.cacheService.invalidatePattern('empleados-*');
    await this.cacheService.invalidatePattern('resumen-empleados');
    logger.debug('Cache de empleados invalidado');
  }
}
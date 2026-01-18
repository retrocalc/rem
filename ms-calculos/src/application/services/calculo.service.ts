import { ICalculoRepository } from '../../domain/interfaces/repository.interface';
import { CalculoEntity } from '../../domain/entities/calculo.entity';
import { CalculoNotFoundException } from '../../domain/exceptions/calculo-not-found.exception';
import { type ParametrosControl, type Contrato } from '../../domain/interfaces/calculo.interface';
import { ParametrosClient } from '../../infrastructure/clients/parametros.client';
import { ContratosClient } from '../../infrastructure/clients/contratos.client';
import { CalcRulesClient } from '../../infrastructure/clients/calc-rules.client';
import { EmpleadosClient } from '../../infrastructure/clients/empleados.client';
import { AppConfig } from '../../config/app.config';

function dividirEnChunks<T>(array: T[], tamanoChunk: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += tamanoChunk) {
    chunks.push(array.slice(i, i + tamanoChunk));
  }
  return chunks;
}

export class CalculoService {
  private parametrosClient: ParametrosClient;
  private contratosClient: ContratosClient;
  private calcRulesClient: CalcRulesClient;
  private empleadosClient: EmpleadosClient;

  constructor(
    private repository: ICalculoRepository,
    parametrosBaseUrl?: string,
    contratosBaseUrl?: string,
    calcRulesBaseUrl?: string,
    empleadosBaseUrl?: string
  ) {
    const config = AppConfig;
    this.parametrosClient = new ParametrosClient(parametrosBaseUrl || config.servicios.parametros);
    this.contratosClient = new ContratosClient(contratosBaseUrl || config.servicios.contratos);
    this.calcRulesClient = new CalcRulesClient(calcRulesBaseUrl || config.servicios.calcRules);
    this.empleadosClient = new EmpleadosClient(empleadosBaseUrl || config.servicios.empleados);
  }

   async inicializar(): Promise<void> {
     console.log('[CalculoService.inicializar] Iniciando inicialización del servicio');
     // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
     await (this.repository as any).inicializar?.();
     console.log('[CalculoService.inicializar] Inicialización completada');
   }

   public async refrescarDatosExternos(): Promise<void> {
     console.log('[CalculoService.refrescarDatosExternos] Refrescando datos externos');
     try {
       // Refrescar contratos y empleados para asegurar datos actualizados
       console.log('[CalculoService.refrescarDatosExternos] Refrescando contratos...');
       await this.contratosClient.refrescar();
       console.log('[CalculoService.refrescarDatosExternos] Refrescando empleados...');
       await this.empleadosClient.refrescar();
       console.log('[CalculoService.refrescarDatosExternos] Datos externos refrescados exitosamente');
     } catch (error: unknown) {
       // No fallar si no se puede refrescar, solo log
       console.warn(`[CalculoService.refrescarDatosExternos] Advertencia al refrescar datos externos: ${error instanceof Error ? error.message : String(error)}`);
     }
   }

   async procesarRemuneraciones(tamanoLote: number = 100, delayEntreLotes: number = 100, onProgress?: (message: string) => void): Promise<CalculoEntity[]> {
      const tiempoInicio = Date.now();
      // Logger que puede enviar progreso a la respuesta HTTP o usar console.log
      const logger = {
        info: (message: string) => {
          if (onProgress) {
            onProgress(message);
          }
          console.log(message);
        },
        error: (message: string) => {
          // Los errores siempre van a console.error
          console.error(message);
        },
        warn: (message: string) => {
          // Las advertencias siempre van a console.warn
          console.warn(message);
        }
      };
      
      logger.info(`[CalculoService.procesarRemuneraciones] ======= INICIO PROCESO MASIVO =======`);
      logger.info(`[CalculoService.procesarRemuneraciones] Configuración: lotes de ${tamanoLote}, delay ${delayEntreLotes}ms`);
      logger.info(`[CalculoService.procesarRemuneraciones] Hora inicio: ${new Date().toISOString()}`);
      // Log de uso de memoria inicial
      const memoriaInicial = process.memoryUsage();
      logger.info(`[CalculoService.procesarRemuneraciones] Memoria inicial: RSS=${Math.round(memoriaInicial.rss / 1024 / 1024)}MB, HeapUsed=${Math.round(memoriaInicial.heapUsed / 1024 / 1024)}MB`);
    
    // Refrescar datos externos antes de procesar
    logger.info('[CalculoService.procesarRemuneraciones] FASE 1: Refrescando datos externos...');
    try {
      await this.refrescarDatosExternos();
      logger.info('[CalculoService.procesarRemuneraciones] ✓ Datos externos refrescados exitosamente');
    } catch (error: unknown) {
      logger.error(`[CalculoService.procesarRemuneraciones] ✗ Error refrescando datos externos: ${error instanceof Error ? error.message : String(error)}`);
      // Continuar aunque falle el refresh
    }
    
    // Obtener parámetros actuales
    logger.info('[CalculoService.procesarRemuneraciones] FASE 2: Obteniendo parámetros actuales...');
    let parametros, mesProceso;
    try {
      parametros = await this.parametrosClient.obtenerParametros();
      mesProceso = parametros.mes_anio_proceso;
      logger.info(`[CalculoService.procesarRemuneraciones] ✓ Parámetros obtenidos: Mes=${mesProceso}, Institución=${parametros.institucion}`);
      logger.info(`[CalculoService.procesarRemuneraciones] Porcentaje retención honorarios: ${parametros.porcentaje_retencion_honorarios}`);
    } catch (error: unknown) {
      logger.error(`[CalculoService.procesarRemuneraciones] ✗ Error obteniendo parámetros: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }

    // Eliminar todos los cálculos existentes para este mes (optimización)
    logger.info(`[CalculoService.procesarRemuneraciones] FASE 3: Eliminando cálculos existentes para mes ${mesProceso}...`);
    let eliminados = 0;
    try {
      eliminados = await this.repository.eliminarPorMesProceso(mesProceso);
      logger.info(`[CalculoService.procesarRemuneraciones] ✓ ${eliminados} cálculos eliminados del mes ${mesProceso}`);
    } catch (error: unknown) {
      logger.error(`[CalculoService.procesarRemuneraciones] ✗ Error eliminando cálculos existentes: ${error instanceof Error ? error.message : String(error)}`);
      // Continuar aunque falle la eliminación
    }

    // Obtener todos los contratos activos (honorarios, contrata y planta)
    logger.info('[CalculoService.procesarRemuneraciones] FASE 4: Obteniendo contratos activos...');
    let contratos = [];
    try {
      contratos = await this.contratosClient.obtenerContratosActivosGenerico();
      logger.info(`[CalculoService.procesarRemuneraciones] ✓ ${contratos.length} contratos activos obtenidos`);
      
      // Estadísticas por tipo de contrato
      const statsPorTipo = contratos.reduce((acc, contrato) => {
        acc[contrato.tipo] = (acc[contrato.tipo] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      logger.info(`[CalculoService.procesarRemuneraciones] Distribución por tipo: ${JSON.stringify(statsPorTipo)}`);
    } catch (error: unknown) {
      logger.error(`[CalculoService.procesarRemuneraciones] ✗ Error obteniendo contratos activos: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
    
    if (contratos.length === 0) {
      logger.error('[CalculoService.procesarRemuneraciones] ✗ No hay contratos activos para procesar.');
      throw new Error('No hay contratos activos para procesar.');
    }

    // Dividir contratos en lotes
    logger.info(`[CalculoService.procesarRemuneraciones] FASE 5: Dividiendo contratos en lotes...`);
    const lotes = dividirEnChunks(contratos, tamanoLote);
    logger.info(`[CalculoService.procesarRemuneraciones] ✓ Contratos divididos en ${lotes.length} lotes de máximo ${tamanoLote} contratos cada uno`);
    
    const calculosCreados: CalculoEntity[] = [];
    const erroresPorContrato: Array<{contratoId: string, error: string}> = [];
    let loteIndex = 0;
    let contratosExitosos = 0;
    let contratosFallidos = 0;
    
    logger.info(`[CalculoService.procesarRemuneraciones] FASE 6: Procesando lotes (inicio)`);
    
    for (const lote of lotes) {
      loteIndex++;
      const tiempoLoteInicio = Date.now();
      logger.info(`\n[CalculoService.procesarRemuneraciones] === LOTE ${loteIndex}/${lotes.length} ===`);
      logger.info(`[CalculoService.procesarRemuneraciones] Tamaño lote: ${lote.length} contratos`);
      logger.info(`[CalculoService.procesarRemuneraciones] Progreso total: ${contratosExitosos + contratosFallidos}/${contratos.length} contratos`);
      
      const calculosLote: CalculoEntity[] = [];
      let exitososLote = 0;
      let fallidosLote = 0;
      
      // Procesar cada contrato en el lote
      for (let i = 0; i < lote.length; i++) {
        const contrato = lote[i];
        const progresoContrato = i + 1;
        
        logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Contrato ${progresoContrato}/${lote.length}: ID=${contrato.id}, Tipo=${contrato.tipo}, Empleado=${contrato.empleadoId}`);
        try {
          // Obtener datos del empleado para embeberse
          logger.info(`[CalculoService.procesarRemuneraciones] Obteniendo datos del empleado ${contrato.empleadoId}...`);
          let empleadoData = null;
          try {
            empleadoData = await this.empleadosClient.obtenerEmpleadoPorId(contrato.empleadoId);
            logger.info(`[CalculoService.procesarRemuneraciones] Datos del empleado obtenidos: ${empleadoData ? 'Sí' : 'No'}`);
          } catch (error: unknown) {
            logger.warn(`[CalculoService.procesarRemuneraciones] No se pudieron obtener datos del empleado ${contrato.empleadoId}: ${error instanceof Error ? error.message : String(error)}`);
            // Continuar sin datos del empleado
          }
          
          // Extraer atributos del empleado para enviar a reglas de cálculo
          const atributosEmpleado = empleadoData ? {
            asig_prof: empleadoData.datos_personales?.asig_prof,
            sist_previsional: empleadoData.datos_personales?.sist_previsional,
            sist_salud: empleadoData.datos_personales?.sist_salud
          } : {};
          
          if (contrato.tipo === 'honorarios') {
            // Contrato de honorarios - usar reglas de cálculo
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Contrato ${contrato.id}: Tipo HONORARIOS`);
            
            if (!contrato.monto_bruto) {
              const errorMsg = `Contrato ${contrato.id} de tipo honorarios no tiene monto_bruto definido`;
              logger.error(`[CalculoService.procesarRemuneraciones] ✗ ${errorMsg}`);
              throw new Error(errorMsg);
            }
            
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Monto bruto: ${contrato.monto_bruto}`);
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Llamando a ms-calc-rules...`);
            
            const resultado = await this.calcRulesClient.calcular({
              institucion: parametros.institucion,
              monto_bruto: contrato.monto_bruto,
              porcentaje_retencion_honorarios: parametros.porcentaje_retencion_honorarios,
              ...atributosEmpleado
            });
            
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] ✓ Resultado cálculo obtenido`);
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Detalles: ${JSON.stringify(resultado.detalles || {}).substring(0, 200)}...`);
            
            // Extraer valores de detalles
            const detalles = resultado.detalles || {};
            const montoRetencion = detalles.monto_retencion_honorarios?.valor ?? contrato.monto_bruto * parametros.porcentaje_retencion_honorarios;
            const liquidoPagar = detalles.liquido_honorario?.valor ?? contrato.monto_bruto - montoRetencion;
            
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Monto retención: ${montoRetencion}, Líquido a pagar: ${liquidoPagar}`);
            
            const calculo = CalculoEntity.crearParaHonorarios(
              contrato, 
              parametros, 
              mesProceso, 
              { montoRetencion, liquidoPagar, detalles: resultado.detalles },
              empleadoData || undefined,
              contrato
            );
            
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Guardando cálculo en repositorio...`);
            await this.repository.guardar(calculo.id, calculo.toJSON());
            
            calculosLote.push(calculo);
            exitososLote++;
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] ✓ Contrato honorarios ${contrato.id} procesado exitosamente`);
          } else if (contrato.tipo === 'contrata') {
            // Contrato de contrata - usar reglas de cálculo
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Contrato ${contrato.id}: Tipo CONTRATA`);
            
            // Validar atributos requeridos para contrata
            if (!contrato.grado) {
              const errorMsg = `Contrato ${contrato.id} de tipo contrata no tiene grado definido`;
              logger.error(`[CalculoService.procesarRemuneraciones] ✗ ${errorMsg}`);
              throw new Error(errorMsg);
            }
            if (contrato.cantidad_bienios === undefined) {
              const errorMsg = `Contrato ${contrato.id} de tipo contrata no tiene cantidad_bienios definido`;
              logger.error(`[CalculoService.procesarRemuneraciones] ✗ ${errorMsg}`);
              throw new Error(errorMsg);
            }
            
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Cargo: ${contrato.cargo}, Grado: ${contrato.grado}, Bienios: ${contrato.cantidad_bienios}`);
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Atributos empleado: asig_prof=${atributosEmpleado.asig_prof}, sist_previsional=${atributosEmpleado.sist_previsional}, sist_salud=${atributosEmpleado.sist_salud}`);
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Llamando a ms-calc-rules...`);
            
            const resultado = await this.calcRulesClient.calcular({
              institucion: parametros.institucion,
              cargo: contrato.cargo,
              grado: contrato.grado,
              cantidad_bienios: contrato.cantidad_bienios,
              ...atributosEmpleado
            });
            
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] ✓ Resultado cálculo obtenido`);
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Sueldo base: ${resultado.sueldo_base}, Bienios: ${resultado.bienios}, Total: ${resultado.total}`);
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Detalles: ${JSON.stringify(resultado.detalles || {}).substring(0, 200)}...`);
            
            const calculo = CalculoEntity.crearParaContrata(
              contrato,
              resultado.sueldo_base,
              resultado.bienios,
              mesProceso,
              empleadoData || undefined,
              contrato,
              resultado.detalles
            );
            
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Guardando cálculo en repositorio...`);
            await this.repository.guardar(calculo.id, calculo.toJSON());
            
            calculosLote.push(calculo);
            exitososLote++;
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] ✓ Contrato contrata ${contrato.id} procesado exitosamente`);
          } else if (contrato.tipo === 'planta') {
            // Contrato de planta - usar reglas de cálculo
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Contrato ${contrato.id}: Tipo PLANTA`);
            
            // Validar atributos requeridos para planta
            if (!contrato.grado) {
              const errorMsg = `Contrato ${contrato.id} de tipo planta no tiene grado definido`;
              logger.error(`[CalculoService.procesarRemuneraciones] ✗ ${errorMsg}`);
              throw new Error(errorMsg);
            }
            if (contrato.cantidad_bienios === undefined) {
              const errorMsg = `Contrato ${contrato.id} de tipo planta no tiene cantidad_bienios definido`;
              logger.error(`[CalculoService.procesarRemuneraciones] ✗ ${errorMsg}`);
              throw new Error(errorMsg);
            }
            
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Cargo: ${contrato.cargo}, Grado: ${contrato.grado}, Bienios: ${contrato.cantidad_bienios}`);
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Atributos empleado: asig_prof=${atributosEmpleado.asig_prof}, sist_previsional=${atributosEmpleado.sist_previsional}, sist_salud=${atributosEmpleado.sist_salud}`);
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Llamando a ms-calc-rules...`);
            
            // Contrato de planta - usar reglas de cálculo (mismo endpoint que contrata)
            const resultado = await this.calcRulesClient.calcular({
              institucion: parametros.institucion,
              cargo: contrato.cargo,
              grado: contrato.grado,
              cantidad_bienios: contrato.cantidad_bienios,
              ...atributosEmpleado
            });
            
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] ✓ Resultado cálculo obtenido`);
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Sueldo base: ${resultado.sueldo_base}, Bienios: ${resultado.bienios}, Total: ${resultado.total}`);
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Detalles: ${JSON.stringify(resultado.detalles || {}).substring(0, 200)}...`);
            
            const calculo = CalculoEntity.crearParaPlanta(
              contrato,
              resultado.sueldo_base,
              resultado.bienios,
              mesProceso,
              empleadoData || undefined,
              contrato,
              resultado.detalles
            );
            
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] Guardando cálculo en repositorio...`);
            await this.repository.guardar(calculo.id, calculo.toJSON());
            
            calculosLote.push(calculo);
            exitososLote++;
            logger.info(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] ✓ Contrato planta ${contrato.id} procesado exitosamente`);
          } else {
            logger.warn(`[CalculoService.procesarRemuneraciones] Tipo de contrato no soportado: ${(contrato as Contrato).tipo}`);
            // Continuar con el siguiente contrato
          }
        } catch (error: unknown) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error(`[CalculoService.procesarRemuneraciones] [Lote ${loteIndex}] ✗ Error procesando contrato ${contrato.id} (tipo: ${contrato.tipo}): ${errorMsg}`);
          erroresPorContrato.push({ contratoId: contrato.id, error: errorMsg });
          fallidosLote++;
          // Continuar con el siguiente contrato, pero registrar el error
        }
      }
      
      // Estadísticas del lote
      const tiempoLoteFin = Date.now();
      const duracionLote = tiempoLoteFin - tiempoLoteInicio;
      
      // Agregar cálculos del lote a la lista total
      calculosCreados.push(...calculosLote);
      contratosExitosos += exitososLote;
      contratosFallidos += fallidosLote;
      
      logger.info(`\n[CalculoService.procesarRemuneraciones] === RESUMEN LOTE ${loteIndex}/${lotes.length} ===`);
      logger.info(`[CalculoService.procesarRemuneraciones] Duración lote: ${duracionLote}ms`);
      logger.info(`[CalculoService.procesarRemuneraciones] Contratos exitosos: ${exitososLote}`);
      logger.info(`[CalculoService.procesarRemuneraciones] Contratos fallidos: ${fallidosLote}`);
      logger.info(`[CalculoService.procesarRemuneraciones] Cálculos creados en lote: ${calculosLote.length}`);
       logger.info(`[CalculoService.procesarRemuneraciones] Total acumulado: ${calculosCreados.length}`);
      logger.info(`[CalculoService.procesarRemuneraciones] Progreso total: ${contratosExitosos + contratosFallidos}/${contratos.length} contratos`);
       // Memoria del lote
       const memoriaLote = process.memoryUsage();
       logger.info(`[CalculoService.procesarRemuneraciones] Memoria lote: RSS=${Math.round(memoriaLote.rss / 1024 / 1024)}MB, HeapUsed=${Math.round(memoriaLote.heapUsed / 1024 / 1024)}MB`);
      
      // Aplicar delay entre lotes (excepto después del último lote)
      if (loteIndex < lotes.length && delayEntreLotes > 0) {
        logger.info(`[CalculoService.procesarRemuneraciones] Esperando ${delayEntreLotes}ms antes del siguiente lote...`);
        await new Promise(resolve => setTimeout(resolve, delayEntreLotes));
      }
    }

    // Estadísticas finales
    const tiempoFin = Date.now();
    const duracionTotal = tiempoFin - tiempoInicio;
    const duracionMinutos = (duracionTotal / 60000).toFixed(2);
    const contratosProcesados = contratosExitosos + contratosFallidos;
    
    logger.info(`\n[CalculoService.procesarRemuneraciones] ======= RESUMEN FINAL PROCESO MASIVO =======`);
    logger.info(`[CalculoService.procesarRemuneraciones] Hora fin: ${new Date().toISOString()}`);
    logger.info(`[CalculoService.procesarRemuneraciones] Duración total: ${duracionTotal}ms (${duracionMinutos} minutos)`);
    logger.info(`[CalculoService.procesarRemuneraciones] Contratos procesados: ${contratosProcesados}/${contratos.length}`);
    logger.info(`[CalculoService.procesarRemuneraciones] Contratos exitosos: ${contratosExitosos}`);
    logger.info(`[CalculoService.procesarRemuneraciones] Contratos fallidos: ${contratosFallidos}`);
    logger.info(`[CalculoService.procesarRemuneraciones] Tasa de éxito: ${contratosExitosos > 0 ? ((contratosExitosos / contratosProcesados) * 100).toFixed(2) : 0}%`);
     logger.info(`[CalculoService.procesarRemuneraciones] Cálculos creados: ${calculosCreados.length}`);
     logger.info(`[CalculoService.procesarRemuneraciones] Lotes procesados: ${lotes.length}`);
     // Estadísticas de rendimiento y memoria
     const memoriaFinal = process.memoryUsage();
     logger.info(`[CalculoService.procesarRemuneraciones] Memoria final: RSS=${Math.round(memoriaFinal.rss / 1024 / 1024)}MB, HeapUsed=${Math.round(memoriaFinal.heapUsed / 1024 / 1024)}MB`);
     logger.info(`[CalculoService.procesarRemuneraciones] Delta memoria: RSS=${Math.round((memoriaFinal.rss - memoriaInicial.rss) / 1024 / 1024)}MB, HeapUsed=${Math.round((memoriaFinal.heapUsed - memoriaInicial.heapUsed) / 1024 / 1024)}MB`);
     if (contratosProcesados > 0) {
       logger.info(`[CalculoService.procesarRemuneraciones] Tiempo promedio por contrato: ${(duracionTotal / contratosProcesados).toFixed(2)}ms`);
       logger.info(`[CalculoService.procesarRemuneraciones] Tasa de procesamiento: ${(contratosProcesados / (duracionTotal / 1000)).toFixed(2)} contratos/segundo`);
     }
    
    if (erroresPorContrato.length > 0) {
      logger.info(`\n[CalculoService.procesarRemuneraciones] ======= ERRORES DETECTADOS =======`);
      logger.info(`[CalculoService.procesarRemuneraciones] Total errores: ${erroresPorContrato.length}`);
      // Mostrar primeros 10 errores como ejemplo
      erroresPorContrato.slice(0, 10).forEach((error, index) => {
        logger.info(`[CalculoService.procesarRemuneraciones] Error ${index + 1}: Contrato ${error.contratoId} - ${error.error}`);
      });
      if (erroresPorContrato.length > 10) {
        logger.info(`[CalculoService.procesarRemuneraciones] ... y ${erroresPorContrato.length - 10} errores más`);
      }
    }
    
    // Si no se crearon cálculos (todos los contratos tenían tipos no soportados)
    if (calculosCreados.length === 0) {
      console.error('[CalculoService.procesarRemuneraciones] ✗ No se pudieron procesar contratos. Tipos de contrato no soportados o todos los contratos fallaron.');
      throw new Error(`No se pudieron procesar contratos. ${erroresPorContrato.length} errores registrados.`);
    }

    logger.info(`[CalculoService.procesarRemuneraciones] ✓ Proceso masivo completado exitosamente`);
    logger.info(`[CalculoService.procesarRemuneraciones] ==========================================\n`);
    return calculosCreados;
  }

    async procesarRemuneracionPorContrato(contratoId: string): Promise<CalculoEntity> {
      console.log(`[CalculoService.procesarRemuneracionPorContrato] Iniciando procesamiento para contrato ${contratoId}`);
      console.log('[CalculoService.procesarRemuneracionPorContrato] VERSION CON ATRIBUTOS EMPLEADO');
      // Refrescar datos externos antes de procesar
      await this.refrescarDatosExternos();
      console.log(`[CalculoService.procesarRemuneracionPorContrato] Datos externos refrescados para contrato ${contratoId}`);
      
      // Obtener parámetros actuales
      const parametros = await this.parametrosClient.obtenerParametros();
      console.log(`[CalculoService.procesarRemuneracionPorContrato] Parámetros obtenidos: institución ${parametros.institucion}, mes ${parametros.mes_anio_proceso}`);
     const mesProceso = parametros.mes_anio_proceso;

    // Obtener el contrato específico
    const contrato = await this.contratosClient.obtenerContratoPorIdGenerico(contratoId);
    console.log(`[CalculoService.procesarRemuneracionPorContrato] Contrato obtenido: ${contrato ? contrato.id : 'null'}, tipo: ${contrato ? contrato.tipo : 'N/A'}`);
    if (!contrato) {
      throw new Error(`Contrato con ID ${contratoId} no encontrado`);
    }
    // Obtener datos del empleado para embeberse
    let empleadoData = null;
    try {
      empleadoData = await this.empleadosClient.obtenerEmpleadoPorId(contrato.empleadoId);
      console.log(`[CalculoService.procesarRemuneracionPorContrato] Datos del empleado obtenidos para ${contrato.empleadoId}: ${empleadoData ? 'Sí' : 'No'}`);
    } catch (error: unknown) {
      console.warn(`[CalculoService.procesarRemuneracionPorContrato] No se pudieron obtener datos del empleado ${contrato.empleadoId}: ${error instanceof Error ? error.message : String(error)}`);
      // Continuar sin datos del empleado
    }

    // Eliminar cálculos existentes para este contrato en este mes
    const calculosExistentes = await this.repository.encontrarPorContratoId(contratoId);
    const calculosMesActual = calculosExistentes.filter(c => c.mes_proceso === mesProceso);
    for (const calculoExistente of calculosMesActual) {
      await this.repository.eliminar(calculoExistente.id);
    }

    // Procesar contrato según su tipo
    try {
      if (contrato.tipo === 'honorarios') {
        // Contrato de honorarios - usar reglas de cálculo
        if (!contrato.monto_bruto) {
          throw new Error(`Contrato ${contrato.id} de tipo honorarios no tiene monto_bruto definido`);
        }
        // eslint-disable-next-line no-console
        console.log(`Procesando contrato honorarios ${contrato.id} con monto_bruto ${contrato.monto_bruto}`);
        // Extraer atributos del empleado para enviar a reglas de cálculo
        const atributosEmpleado = empleadoData ? {
          asig_prof: empleadoData.datos_personales?.asig_prof,
          sist_previsional: empleadoData.datos_personales?.sist_previsional,
          sist_salud: empleadoData.datos_personales?.sist_salud
        } : {};

        const resultado = await this.calcRulesClient.calcular({
          institucion: parametros.institucion,
          monto_bruto: contrato.monto_bruto,
          porcentaje_retencion_honorarios: parametros.porcentaje_retencion_honorarios,
          ...atributosEmpleado
        });
        // Extraer valores de detalles
        const detalles = resultado.detalles || {};
        const montoRetencion = detalles.monto_retencion_honorarios?.valor ?? contrato.monto_bruto * parametros.porcentaje_retencion_honorarios;
        const liquidoPagar = detalles.liquido_honorario?.valor ?? contrato.monto_bruto - montoRetencion;
         const calculo = CalculoEntity.crearParaHonorarios(
           contrato, 
           parametros, 
           mesProceso, 
           { montoRetencion, liquidoPagar, detalles: resultado.detalles },
           empleadoData || undefined,
           contrato
         );
        
        await this.repository.guardar(calculo.id, calculo.toJSON());
        // eslint-disable-next-line no-console
        console.log(`Procesado contrato honorarios ${contrato.id} para empleado ${contrato.empleadoId}`);
        return calculo;
        
      } else if (contrato.tipo === 'contrata') {
        // Validar atributos requeridos para contrata
        if (!contrato.grado) {
          throw new Error(`Contrato ${contrato.id} de tipo contrata no tiene grado definido`);
        }
        if (contrato.cantidad_bienios === undefined) {
          throw new Error(`Contrato ${contrato.id} de tipo contrata no tiene cantidad_bienios definido`);
        }
        
        // eslint-disable-next-line no-console
        console.log(`Procesando contrato contrata ${contrato.id} con cargo ${contrato.cargo}, grado ${contrato.grado}, bienios ${contrato.cantidad_bienios}`);
        // Extraer atributos del empleado para enviar a reglas de cálculo
        const atributosEmpleado = empleadoData ? {
          asig_prof: empleadoData.datos_personales?.asig_prof,
          sist_previsional: empleadoData.datos_personales?.sist_previsional,
          sist_salud: empleadoData.datos_personales?.sist_salud
        } : {};
        console.log('Atributos extraídos:', atributosEmpleado);

        // Contrato de contrata - usar reglas de cálculo
        const resultado = await this.calcRulesClient.calcular({
          institucion: parametros.institucion,
          cargo: contrato.cargo,
          grado: contrato.grado,
          cantidad_bienios: contrato.cantidad_bienios,
          ...atributosEmpleado
        });
        // eslint-disable-next-line no-console
        console.log(`Resultado cálculo reglas: sueldo_base=${resultado.sueldo_base}, bienios=${resultado.bienios}`);
        
         const calculo = CalculoEntity.crearParaContrata(
           contrato,
           resultado.sueldo_base,
           resultado.bienios,
           mesProceso,
           empleadoData || undefined,
           contrato,
           resultado.detalles
         );
        
        await this.repository.guardar(calculo.id, calculo.toJSON());
        // eslint-disable-next-line no-console
        console.log(`Procesado contrato contrata ${contrato.id} para empleado ${contrato.empleadoId}`);
        return calculo;
        
      } else if (contrato.tipo === 'planta') {
        // Validar atributos requeridos para planta
        if (!contrato.grado) {
          throw new Error(`Contrato ${contrato.id} de tipo planta no tiene grado definido`);
        }
        if (contrato.cantidad_bienios === undefined) {
          throw new Error(`Contrato ${contrato.id} de tipo planta no tiene cantidad_bienios definido`);
        }
        
        // eslint-disable-next-line no-console
        console.log(`Procesando contrato planta ${contrato.id} con cargo ${contrato.cargo}, grado ${contrato.grado}, bienios ${contrato.cantidad_bienios}`);
        // Extraer atributos del empleado para enviar a reglas de cálculo
        const atributosEmpleado = empleadoData ? {
          asig_prof: empleadoData.datos_personales?.asig_prof,
          sist_previsional: empleadoData.datos_personales?.sist_previsional,
          sist_salud: empleadoData.datos_personales?.sist_salud
        } : {};

        // Contrato de planta - usar reglas de cálculo (mismo endpoint que contrata)
        const resultado = await this.calcRulesClient.calcular({
          institucion: parametros.institucion,
          cargo: contrato.cargo,
          grado: contrato.grado,
          cantidad_bienios: contrato.cantidad_bienios,
          ...atributosEmpleado
        });
        // eslint-disable-next-line no-console
        console.log(`Resultado cálculo reglas: sueldo_base=${resultado.sueldo_base}, bienios=${resultado.bienios}`);
        
         const calculo = CalculoEntity.crearParaPlanta(
           contrato,
           resultado.sueldo_base,
           resultado.bienios,
           mesProceso,
           empleadoData || undefined,
           contrato,
           resultado.detalles
         );
        
        await this.repository.guardar(calculo.id, calculo.toJSON());
        // eslint-disable-next-line no-console
        console.log(`Procesado contrato planta ${contrato.id} para empleado ${contrato.empleadoId}`);
        return calculo;
        
      } else {
        throw new Error(`Tipo de contrato no soportado: ${(contrato as Contrato).tipo}`);
      }
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error(`Error procesando contrato ${contrato.id} (tipo: ${contrato.tipo}):`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async cerrarMes(): Promise<ParametrosControl> {
    // Llamar al cliente de parámetros para cerrar el mes
    return this.parametrosClient.cerrarMes();
  }

  async obtenerCalculoPorId(id: string): Promise<CalculoEntity> {
    const calculoData = await this.repository.encontrarPorId(id);
    if (!calculoData) {
      throw new CalculoNotFoundException(id);
    }
    return CalculoEntity.fromJSON(calculoData);
  }

  async obtenerCalculosPorContrato(contratoId: string): Promise<CalculoEntity[]> {
    const calculosData = await this.repository.encontrarPorContratoId(contratoId);
    return calculosData.map(CalculoEntity.fromJSON);
  }

  async obtenerCalculosPorEmpleado(empleadoId: string): Promise<CalculoEntity[]> {
    const calculosData = await this.repository.encontrarPorEmpleadoId(empleadoId);
    return calculosData.map(CalculoEntity.fromJSON);
  }

  async obtenerCalculosPorMes(mesProceso: string): Promise<CalculoEntity[]> {
    const calculosData = await this.repository.encontrarPorMesProceso(mesProceso);
    return calculosData.map(CalculoEntity.fromJSON);
  }

  async listarCalculos(): Promise<CalculoEntity[]> {
    const calculosMap = await this.repository.listarTodos();
    const calculos: CalculoEntity[] = [];

    for (const [, calculoData] of calculosMap.entries()) {
      calculos.push(CalculoEntity.fromJSON(calculoData));
    }

    return calculos;
  }

  async marcarComoPagado(id: string): Promise<CalculoEntity> {
    const calculo = await this.obtenerCalculoPorId(id);
    const calculoPagado = calculo.marcarComoPagado();
    await this.repository.guardar(id, calculoPagado.toJSON());
    return calculoPagado;
  }

  async anularCalculo(id: string): Promise<CalculoEntity> {
    const calculo = await this.obtenerCalculoPorId(id);
    const calculoAnulado = calculo.anular();
    await this.repository.guardar(id, calculoAnulado.toJSON());
    return calculoAnulado;
  }

  async obtenerResumenMes(mesProceso: string): Promise<{
    totalCalculos: number;
    totalSueldoBase: number;
    totalRetenciones: number;
    totalLiquido: number;
  }> {
    const calculos = await this.obtenerCalculosPorMes(mesProceso);
    
    return {
      totalCalculos: calculos.length,
      totalSueldoBase: calculos.reduce((sum, calc) => sum + calc.montoBase, 0),
      totalRetenciones: calculos.reduce((sum, calc) => sum + calc.montoRetencion, 0),
      totalLiquido: calculos.reduce((sum, calc) => sum + calc.liquidoPagar, 0),
    };
  }

  async calcularParaEmpleado(
    empleadoId: string,
    mesProceso: string,
    parametrosAdicionales: Record<string, any> = {}
  ): Promise<{
    id: string;
    empleado_id: string;
    mes: number;
    anio: number;
    salario_base: number;
    salario_neto: number;
    moneda: string;
    fecha_calculo: string;
    detalles?: Record<string, any>;
  }> {
    console.log(`[CalculoService.calcularParaEmpleado] Calculando para empleado ${empleadoId}, mes ${mesProceso}`);
    
    // Obtener parámetros actuales (institución, porcentajes)
    const parametros = await this.parametrosClient.obtenerParametros();
    console.log(`[CalculoService.calcularParaEmpleado] Institución activa: ${parametros.institucion}`);
    
    // Obtener todos los contratos activos y filtrar por empleado
    const contratos = await this.contratosClient.obtenerContratosActivosGenerico();
    const contratosEmpleado = contratos.filter(c => c.empleadoId === empleadoId);
    
    if (contratosEmpleado.length === 0) {
      throw new Error(`El empleado ${empleadoId} no tiene contratos activos`);
    }
    
    console.log(`[CalculoService.calcularParaEmpleado] Encontrados ${contratosEmpleado.length} contratos activos para el empleado`);
    
    // Obtener datos del empleado
    let empleadoData = null;
    try {
      empleadoData = await this.empleadosClient.obtenerEmpleadoPorId(empleadoId);
    } catch (error) {
      console.warn(`[CalculoService.calcularParaEmpleado] No se pudieron obtener datos del empleado ${empleadoId}:`, error instanceof Error ? error.message : String(error));
    }
    
    // Extraer atributos del empleado para enviar a reglas de cálculo
    const atributosEmpleado = empleadoData?.datos_personales ? {
      asig_prof: empleadoData.datos_personales.asig_prof,
      sist_previsional: empleadoData.datos_personales.sist_previsional,
      sist_salud: empleadoData.datos_personales.sist_salud
    } : {};
    
    // Filtrar atributos undefined y loguear
    const atributosFiltrados = Object.fromEntries(
      Object.entries(atributosEmpleado).filter(([_, value]) => value !== undefined)
    );
    console.log(`[CalculoService.calcularParaEmpleado] Atributos extraídos:`, atributosFiltrados);
    
    // Procesar cada contrato del empleado (simulación, sin guardar en repositorio)
    let totalSalarioBase = 0;
    let totalLiquido = 0;
    const detallesContratos: Array<{
      contratoId: string;
      tipo: string;
       montoBase: number;
       liquido: number;
      detallesReglas?: Record<string, any>;
    }> = [];
    
    for (const contrato of contratosEmpleado) {
      console.log(`[CalculoService.calcularParaEmpleado] Procesando contrato ${contrato.id}, tipo ${contrato.tipo}`);
      
      try {
        if (contrato.tipo === 'honorarios') {
          if (!contrato.monto_bruto) {
            throw new Error(`Contrato ${contrato.id} de tipo honorarios no tiene monto_bruto definido`);
          }
          
          // Aplicar parámetros adicionales si existen (ej: modificar monto_bruto)
          const montoBruto = parametrosAdicionales.monto_bruto || contrato.monto_bruto;
          const porcentajeRetencion = parametrosAdicionales.porcentaje_retencion_honorarios || parametros.porcentaje_retencion_honorarios;
          
           const resultado = await this.calcRulesClient.calcular({
             institucion: parametros.institucion,
             monto_bruto: montoBruto,
             porcentaje_retencion_honorarios: porcentajeRetencion,
             ...atributosFiltrados
           });
          
          // Extraer valores del resultado
          const montoBase = resultado.detalles?.monto_bruto_honorario?.valor || montoBruto;
          const deducciones = resultado.detalles?.monto_retencion_honorarios?.valor || (montoBruto * porcentajeRetencion);
          // Calcular líquido correctamente (monto base - deducciones)
          // NOTA: El total devuelto por calc-rules incluye la retención sumada, lo cual es incorrecto para líquido
          const liquido = montoBase - deducciones;
          
          totalSalarioBase += montoBase;
          totalLiquido += liquido;
          
          detallesContratos.push({
            contratoId: contrato.id,
            tipo: 'honorarios',
            montoBase,
            liquido,
            detallesReglas: resultado.detalles
          });
          
        } else if (contrato.tipo === 'contrata' || contrato.tipo === 'planta') {
          if (!contrato.grado || contrato.cantidad_bienios === undefined) {
            throw new Error(`Contrato ${contrato.id} de tipo ${contrato.tipo} no tiene grado o cantidad_bienios definido`);
          }
          
          // Aplicar parámetros adicionales si existen
          const cantidadBienios = parametrosAdicionales.cantidad_bienios || contrato.cantidad_bienios;
          const cargo = parametrosAdicionales.cargo || contrato.cargo;
          
           const resultado = await this.calcRulesClient.calcular({
             institucion: parametros.institucion,
             cargo: cargo,
             grado: contrato.grado,
             cantidad_bienios: cantidadBienios,
             ...atributosFiltrados
           });
          
           // Extraer valores del resultado
           const montoBase = resultado.sueldo_base;
           const liquido = resultado.total;
          
          totalSalarioBase += montoBase;
          totalLiquido += liquido;
          
          detallesContratos.push({
            contratoId: contrato.id,
            tipo: contrato.tipo,
            montoBase,
            liquido,
            detallesReglas: resultado.detalles
          });
        }
      } catch (error) {
        console.error(`[CalculoService.calcularParaEmpleado] Error procesando contrato ${contrato.id}:`, error instanceof Error ? error.message : String(error));
        // Continuar con el siguiente contrato
      }
    }
    
    // Si ningún contrato pudo procesarse
    if (detallesContratos.length === 0) {
      throw new Error(`No se pudo procesar ningún contrato para el empleado ${empleadoId}`);
    }
    
    // Preparar respuesta en el formato esperado por el dashboard
    const [anio, mes] = mesProceso.split('-').map(Number);
    const respuesta = {
      id: `calculo-sim-${Date.now()}`,
      empleado_id: empleadoId,
      mes,
      anio,
      salario_base: totalSalarioBase,
      salario_neto: totalLiquido,
      moneda: 'CLP',
      fecha_calculo: new Date().toISOString(),
      detalles: {
        contratos: detallesContratos,
        parametros_usados: {
          institucion: parametros.institucion,
          mes_proceso: mesProceso,
          porcentaje_retencion_honorarios: parametros.porcentaje_retencion_honorarios
        },
        empleado_data: empleadoData
      }
    };
    
    console.log(`[CalculoService.calcularParaEmpleado] Cálculo completado para empleado ${empleadoId}:`, respuesta);
    return respuesta;
  }
}
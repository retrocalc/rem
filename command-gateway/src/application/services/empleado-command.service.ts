import { HttpClient } from '../../infrastructure/clients/http-client';
import {
  CrearEmpleadoCompletoDTO,
  ActualizarEmpleadoCompletoDTO,
  TransaccionResultadoDTO,
  SagaStep
} from '../../api/dto/comando.dto';
import { logger } from '../../infrastructure/logging/logger';

export class EmpleadoCommandService {
  constructor(private httpClient: HttpClient) {}

  async crearEmpleadoConContrato(datos: CrearEmpleadoCompletoDTO): Promise<TransaccionResultadoDTO> {
    const transaccionId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const pasos: TransaccionResultadoDTO['pasos'] = [];
    const errores: TransaccionResultadoDTO['errores'] = [];
    
    let empleadoId: string | undefined;
    let contratoId: string | undefined;

    logger.info(`Iniciando transacción ${transaccionId}: Crear empleado con contrato`, {
      transaccionId,
      timestamp: new Date().toISOString()
    });

    try {
      // Paso 1: Crear empleado
      const paso1 = await this.ejecutarPaso({
        servicio: 'empleados',
        operacion: 'CREATE',
        endpoint: '/empleados',
        datos: datos.empleado,
        compensacion: {
          endpoint: `/empleados/{empleadoId}`,
          datos: null
        }
      }, transaccionId);
      
      pasos.push(paso1);
      
      if (!paso1.exito) {
        throw new Error(`Fallo creación de empleado: ${paso1.error}`);
      }
      
      empleadoId = paso1.mensaje?.match(/empleado creado con ID: (\w+)/)?.[1];
      
      if (!empleadoId) {
        throw new Error('No se pudo obtener ID del empleado creado');
      }

      // Paso 2: Crear contrato (depende del empleado)
      const datosContrato = {
        ...datos.contrato,
        empleadoId
      };

      const paso2 = await this.ejecutarPaso({
        servicio: 'contratos',
        operacion: 'CREATE',
        endpoint: '/contratos',
        datos: datosContrato,
        compensacion: {
          endpoint: `/contratos/{contratoId}`,
          datos: null
        }
      }, transaccionId, { empleadoId });
      
      pasos.push(paso2);
      
      if (!paso2.exito) {
        // Compensar: eliminar empleado creado
        logger.warn(`Compensando transacción ${transaccionId}: Eliminando empleado ${empleadoId}`, {
          transaccionId,
          empleadoId,
          timestamp: new Date().toISOString()
        });
        
        await this.ejecutarCompensacion({
          servicio: 'empleados',
          operacion: 'DELETE',
          endpoint: `/empleados/${empleadoId}`,
          datos: null
        }, transaccionId);
        
        throw new Error(`Fallo creación de contrato: ${paso2.error}`);
      }
      
      contratoId = paso2.mensaje?.match(/contrato creado con ID: (\w+)/)?.[1];

      logger.info(`Transacción ${transaccionId} completada exitosamente`, {
        transaccionId,
        empleadoId,
        contratoId,
        timestamp: new Date().toISOString()
      });

      return {
        exito: true,
        transaccionId,
        pasos,
        empleadoId,
        contratoId,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error(`Transacción ${transaccionId} falló:`, {
        transaccionId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      errores.push({
        servicio: 'command-gateway',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        exito: false,
        transaccionId,
        pasos,
        errores,
        timestamp: new Date().toISOString()
      };
    }
  }

  async actualizarEmpleadoConContrato(
    empleadoId: string,
    datos: ActualizarEmpleadoCompletoDTO
  ): Promise<TransaccionResultadoDTO> {
    const transaccionId = `tx-update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const pasos: TransaccionResultadoDTO['pasos'] = [];
    const errores: TransaccionResultadoDTO['errores'] = [];

    logger.info(`Iniciando transacción ${transaccionId}: Actualizar empleado ${empleadoId} con contrato`, {
      transaccionId,
      empleadoId,
      timestamp: new Date().toISOString()
    });

    try {
      // Obtener contrato actual del empleado
      const contratos = await this.httpClient.get<any[]>('contratos', '/contratos');
      const contratoEmpleado = contratos.find(c => c.empleadoId === empleadoId);
      
      if (!contratoEmpleado) {
        throw new Error(`No se encontró contrato para el empleado ${empleadoId}`);
      }

      const contratoId = contratoEmpleado.id;
      const estadoOriginal = contratoEmpleado.estado;
      const datosOriginales = { empleado: {}, contrato: contratoEmpleado };

      // Paso 1: Actualizar empleado (si hay datos)
      if (datos.empleado && Object.keys(datos.empleado).length > 0) {
        const paso1 = await this.ejecutarPaso({
          servicio: 'empleados',
          operacion: 'UPDATE',
          endpoint: `/empleados/${empleadoId}`,
          datos: datos.empleado,
          compensacion: {
            endpoint: `/empleados/${empleadoId}`,
            datos: datosOriginales.empleado
          }
        }, transaccionId);
        
        pasos.push(paso1);
        
        if (!paso1.exito) {
          throw new Error(`Fallo actualización de empleado: ${paso1.error}`);
        }
      }

      // Paso 2: Actualizar contrato (si hay datos)
      if (datos.contrato && Object.keys(datos.contrato).length > 0) {
        const paso2 = await this.ejecutarPaso({
          servicio: 'contratos',
          operacion: 'UPDATE',
          endpoint: `/contratos/${contratoId}`,
          datos: { ...datos.contrato, empleadoId },
          compensacion: {
            endpoint: `/contratos/${contratoId}`,
            datos: { estado: estadoOriginal, empleadoId }
          }
        }, transaccionId, { empleadoId, contratoId });
        
        pasos.push(paso2);
        
        if (!paso2.exito) {
          // Compensar: revertir cambios en empleado si se actualizó
          if (datos.empleado && Object.keys(datos.empleado).length > 0) {
            logger.warn(`Compensando transacción ${transaccionId}: Revirtiendo empleado ${empleadoId}`, {
              transaccionId,
              empleadoId,
              timestamp: new Date().toISOString()
            });
            
            await this.ejecutarCompensacion({
              servicio: 'empleados',
              operacion: 'UPDATE',
              endpoint: `/empleados/${empleadoId}`,
              datos: datosOriginales.empleado
            }, transaccionId);
          }
          
          throw new Error(`Fallo actualización de contrato: ${paso2.error}`);
        }
      }

      logger.info(`Transacción ${transaccionId} completada exitosamente`, {
        transaccionId,
        empleadoId,
        contratoId,
        timestamp: new Date().toISOString()
      });

      return {
        exito: true,
        transaccionId,
        pasos,
        empleadoId,
        contratoId,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error(`Transacción ${transaccionId} falló:`, {
        transaccionId,
        empleadoId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      errores.push({
        servicio: 'command-gateway',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        exito: false,
        transaccionId,
        pasos,
        errores,
        timestamp: new Date().toISOString()
      };
    }
  }

  async ejecutarTransaccionPersonalizada(pasos: SagaStep[]): Promise<TransaccionResultadoDTO> {
    const transaccionId = `tx-custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const resultados: TransaccionResultadoDTO['pasos'] = [];
    const errores: TransaccionResultadoDTO['errores'] = [];
    const compensaciones: Array<{ paso: SagaStep; datosOriginales: any }> = [];

    logger.info(`Iniciando transacción personalizada ${transaccionId} con ${pasos.length} pasos`, {
      transaccionId,
      totalPasos: pasos.length,
      timestamp: new Date().toISOString()
    });

    try {
      for (let i = 0; i < pasos.length; i++) {
        const paso = pasos[i];
        
        const resultado = await this.ejecutarPaso(paso, transaccionId);
        resultados.push(resultado);
        
        if (!resultado.exito) {
          // Ejecutar compensaciones en orden inverso
          logger.warn(`Transacción ${transaccionId} falló en paso ${i + 1}, ejecutando compensaciones`, {
            transaccionId,
            paso: i + 1,
            servicio: paso.servicio,
            timestamp: new Date().toISOString()
          });
          
          for (let j = compensaciones.length - 1; j >= 0; j--) {
            const comp = compensaciones[j];
            await this.ejecutarCompensacion(comp.paso, transaccionId);
          }
          
          throw new Error(`Fallo en paso ${i + 1} (${paso.servicio}): ${resultado.error}`);
        }
        
        // Guardar para posible compensación
        if (paso.compensacion) {
          compensaciones.push({ paso, datosOriginales: resultado.mensaje });
        }
      }

      logger.info(`Transacción personalizada ${transaccionId} completada exitosamente`, {
        transaccionId,
        totalPasos: pasos.length,
        timestamp: new Date().toISOString()
      });

      return {
        exito: true,
        transaccionId,
        pasos: resultados,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error(`Transacción personalizada ${transaccionId} falló:`, {
        transaccionId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      errores.push({
        servicio: 'command-gateway',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        exito: false,
        transaccionId,
        pasos: resultados,
        errores,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async ejecutarPaso(
    paso: SagaStep,
    transaccionId: string,
    variables?: Record<string, string>
  ): Promise<TransaccionResultadoDTO['pasos'][0]> {
    const timestamp = new Date().toISOString();
    
    try {
      let endpoint = paso.endpoint;
      let datos = paso.datos;
      
      // Reemplazar variables en endpoint y datos
      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          endpoint = endpoint.replace(`{${key}}`, value);
          if (datos && typeof datos === 'string') {
            datos = datos.replace(`{${key}}`, value);
          }
        }
      }

      logger.debug(`Ejecutando paso: ${paso.servicio} ${paso.operacion} ${endpoint}`, {
        transaccionId,
        servicio: paso.servicio,
        operacion: paso.operacion,
        endpoint,
        timestamp
      });

      let respuesta: any;
      
      switch (paso.operacion) {
        case 'CREATE':
          respuesta = await this.httpClient.post(paso.servicio, endpoint, datos);
          break;
        case 'UPDATE':
          respuesta = await this.httpClient.put(paso.servicio, endpoint, datos);
          break;
        case 'DELETE':
          respuesta = await this.httpClient.delete(paso.servicio, endpoint);
          break;
        default:
          throw new Error(`Operación no soportada: ${paso.operacion}`);
      }

      return {
        servicio: paso.servicio,
        operacion: paso.operacion,
        exito: true,
        mensaje: typeof respuesta === 'string' ? respuesta : JSON.stringify(respuesta),
        timestamp
      };

    } catch (error: any) {
      logger.error(`Error ejecutando paso ${paso.servicio} ${paso.operacion}:`, {
        transaccionId,
        servicio: paso.servicio,
        operacion: paso.operacion,
        error: error.message,
        timestamp
      });

      return {
        servicio: paso.servicio,
        operacion: paso.operacion,
        exito: false,
        error: error.message,
        timestamp
      };
    }
  }

  private async ejecutarCompensacion(
    paso: SagaStep,
    transaccionId: string
  ): Promise<void> {
    if (!paso.compensacion) return;

    try {
      logger.debug(`Ejecutando compensación: ${paso.servicio} ${paso.compensacion.endpoint}`, {
        transaccionId,
        servicio: paso.servicio,
        timestamp: new Date().toISOString()
      });

      await this.httpClient.post(paso.servicio, paso.compensacion.endpoint, paso.compensacion.datos);

    } catch (error: any) {
      logger.error(`Error ejecutando compensación ${paso.servicio}:`, {
        transaccionId,
        servicio: paso.servicio,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      // No re-lanzar error en compensación
    }
  }
}
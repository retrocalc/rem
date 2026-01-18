import { Request, Response } from 'express';
import { EmpleadoCommandService } from '../../application/services/empleado-command.service';
import {
  CrearEmpleadoCompletoDTO,
  ActualizarEmpleadoCompletoDTO,
  SagaStep
} from '../dto/comando.dto';
import { logger } from '../../infrastructure/logging/logger';

export class CommandController {
  constructor(private empleadoCommandService: EmpleadoCommandService) {}

  async crearEmpleadoCompleto(req: Request, res: Response): Promise<void> {
    try {
      const datos: CrearEmpleadoCompletoDTO = req.body;
      
      // Validación básica
      if (!datos.empleado || !datos.contrato) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Se requieren datos de empleado y contrato',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!datos.empleado.datos_personales?.rut || !datos.empleado.datos_personales?.nombre) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Se requieren RUT y nombre del empleado',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!datos.contrato.tipo || !datos.contrato.inicio) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Se requieren tipo y fecha de inicio del contrato',
          timestamp: new Date().toISOString()
        });
        return;
      }

      logger.info('Creando empleado con contrato', {
        rut: datos.empleado.datos_personales.rut,
        tipoContrato: datos.contrato.tipo,
        timestamp: new Date().toISOString()
      });

      const resultado = await this.empleadoCommandService.crearEmpleadoConContrato(datos);
      
      if (resultado.exito) {
        res.status(201).json({
          success: true,
          message: 'Empleado y contrato creados exitosamente',
          transaccionId: resultado.transaccionId,
          empleadoId: resultado.empleadoId,
          contratoId: resultado.contratoId,
          pasos: resultado.pasos,
          timestamp: resultado.timestamp
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create employee with contract',
          transaccionId: resultado.transaccionId,
          pasos: resultado.pasos,
          errores: resultado.errores,
          timestamp: resultado.timestamp
        });
      }

    } catch (error: any) {
      logger.error('Error en crearEmpleadoCompleto:', {
        error: error.message,
        body: req.body,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process create employee request',
        timestamp: new Date().toISOString()
      });
    }
  }

  async actualizarEmpleadoCompleto(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const datos: ActualizarEmpleadoCompletoDTO = req.body;
      
      if (!id) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Employee ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validación: al menos un campo para actualizar
      if ((!datos.empleado || Object.keys(datos.empleado).length === 0) &&
          (!datos.contrato || Object.keys(datos.contrato).length === 0)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Se requieren datos de empleado y/o contrato para actualizar',
          timestamp: new Date().toISOString()
        });
        return;
      }

      logger.info('Actualizando empleado con contrato', {
        empleadoId: id,
        timestamp: new Date().toISOString()
      });

      const resultado = await this.empleadoCommandService.actualizarEmpleadoConContrato(id, datos);
      
      if (resultado.exito) {
        res.status(200).json({
          success: true,
          message: 'Empleado y contrato actualizados exitosamente',
          transaccionId: resultado.transaccionId,
          empleadoId: resultado.empleadoId,
          contratoId: resultado.contratoId,
          pasos: resultado.pasos,
          timestamp: resultado.timestamp
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update employee with contract',
          transaccionId: resultado.transaccionId,
          pasos: resultado.pasos,
          errores: resultado.errores,
          timestamp: resultado.timestamp
        });
      }

    } catch (error: any) {
      logger.error('Error en actualizarEmpleadoCompleto:', {
        error: error.message,
        id: req.params.id,
        body: req.body,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process update employee request',
        timestamp: new Date().toISOString()
      });
    }
  }

  async ejecutarTransaccionPersonalizada(req: Request, res: Response): Promise<void> {
    try {
      const pasos: SagaStep[] = req.body.pasos;
      
      if (!pasos || !Array.isArray(pasos) || pasos.length === 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Se requiere un array de pasos para la transacción',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validar cada paso
      for (const paso of pasos) {
        if (!paso.servicio || !paso.operacion || !paso.endpoint) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Cada paso debe tener servicio, operación y endpoint',
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      logger.info('Ejecutando transacción personalizada', {
        totalPasos: pasos.length,
        timestamp: new Date().toISOString()
      });

      const resultado = await this.empleadoCommandService.ejecutarTransaccionPersonalizada(pasos);
      
      res.status(resultado.exito ? 200 : 500).json({
        success: resultado.exito,
        transaccionId: resultado.transaccionId,
        pasos: resultado.pasos,
        errores: resultado.errores,
        timestamp: resultado.timestamp
      });

    } catch (error: any) {
      logger.error('Error en ejecutarTransaccionPersonalizada:', {
        error: error.message,
        body: req.body,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to execute custom transaction',
        timestamp: new Date().toISOString()
      });
    }
  }

  async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      // Verificar que podemos acceder a los servicios básicos
      await Promise.all([
        this.empleadoCommandService['httpClient'].get('parametros', '/health'),
        this.empleadoCommandService['httpClient'].get('empleados', '/health'),
        this.empleadoCommandService['httpClient'].get('contratos', '/health')
      ]);
      
      res.status(200).json({
        status: 'healthy',
        service: 'command-gateway',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    } catch (error: any) {
      logger.error('Health check failed:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      res.status(503).json({
        status: 'unhealthy',
        service: 'command-gateway',
        error: error.message,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    }
  }
}
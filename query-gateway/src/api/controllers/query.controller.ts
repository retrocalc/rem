import { Request, Response } from 'express';
import { EmpleadoQueryService } from '../../application/services/empleado-query.service';
import { FiltroEmpleadosDTO } from '../dto/empleado.dto';
import { logger } from '../../infrastructure/logging/logger';

export class QueryController {
  constructor(private empleadoQueryService: EmpleadoQueryService) {}

  async obtenerEmpleadosConContratos(req: Request, res: Response): Promise<void> {
    try {
      const filtros: FiltroEmpleadosDTO = {
        tipoContrato: req.query.tipoContrato as any,
        escalafon: req.query.escalafon as string,
        estado: req.query.estado as any,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20
      };

      logger.info('Obteniendo empleados con contratos', { filtros });

      const result = await this.empleadoQueryService.obtenerEmpleadosConContratos(filtros);
      
      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error en obtenerEmpleadosConContratos:', {
        error: error.message,
        query: req.query,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch employees with contracts',
        timestamp: new Date().toISOString()
      });
    }
  }

  async obtenerEmpleadoCompleto(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Employee ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      logger.info('Obteniendo empleado completo', { id });

      const empleado = await this.empleadoQueryService.obtenerEmpleadoCompleto(id);
      
      if (!empleado) {
        res.status(404).json({
          error: 'Not Found',
          message: `Employee with ID ${id} not found`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json(empleado);
    } catch (error: any) {
      logger.error('Error en obtenerEmpleadoCompleto:', {
        error: error.message,
        id: req.params.id,
        timestamp: new Date().toISOString()
      });
      
      if (error.response?.status === 404) {
        res.status(404).json({
          error: 'Not Found',
          message: `Employee with ID ${req.params.id} not found`,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch employee details',
        timestamp: new Date().toISOString()
      });
    }
  }

  async obtenerResumenEmpleados(_req: Request, res: Response): Promise<void> {
    try {
      logger.info('Obteniendo resumen de empleados');

      const resumen = await this.empleadoQueryService.obtenerResumenEmpleados();
      
      res.status(200).json(resumen);
    } catch (error: any) {
      logger.error('Error en obtenerResumenEmpleados:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch employees summary',
        timestamp: new Date().toISOString()
      });
    }
  }

  async invalidarCache(_req: Request, res: Response): Promise<void> {
    try {
      logger.info('Invalidando cache de consultas');

      await this.empleadoQueryService.invalidarCacheEmpleados();
      
      res.status(200).json({
        message: 'Cache invalidated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Error invalidando cache:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to invalidate cache',
        timestamp: new Date().toISOString()
      });
    }
  }

  async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      // Verificar que podemos acceder a los servicios básicos
      await this.empleadoQueryService.obtenerResumenEmpleados();
      
      res.status(200).json({
        status: 'healthy',
        service: 'query-gateway',
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
        service: 'query-gateway',
        error: error.message,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    }
  }
}
import { Request, Response } from 'express';
import axios from 'axios';
import { ServiceConfig } from '../../config/app.config';
import { logger } from '../../infrastructure/logging/logger';



export class HealthController {
  constructor(private services: ServiceConfig[]) {}

  async checkHealth(_req: Request, res: Response): Promise<void> {
    try {
      const healthPromises = this.services.map(async (service) => {
        const startTime = Date.now();
        
        try {
          const response = await axios.get(`${service.url}${service.healthPath}`, {
            timeout: 5000
          });
          
          const responseTime = Date.now() - startTime;
          
          return {
            service: service.name,
            status: response.status === 200 ? 'healthy' : 'unhealthy',
            responseTime,
            timestamp: new Date().toISOString(),
            statusCode: response.status
          };
        } catch (error: any) {
          const responseTime = Date.now() - startTime;
          
          return {
            service: service.name,
            status: 'unhealthy',
            responseTime,
            timestamp: new Date().toISOString(),
            error: error.message || 'Unknown error',
            statusCode: error.response?.status || 0
          };
        }
      });

      const results = await Promise.all(healthPromises);
      
      // Calcular estado general del sistema
      const healthyServices = results.filter(r => r.status === 'healthy').length;
      const totalServices = results.length;
      const systemStatus = healthyServices === totalServices ? 'healthy' : 
                          healthyServices > 0 ? 'degraded' : 'unhealthy';
      
      res.status(200).json({
        status: systemStatus,
        timestamp: new Date().toISOString(),
        services: results,
        summary: {
          total: totalServices,
          healthy: healthyServices,
          unhealthy: totalServices - healthyServices,
          uptime: process.uptime()
        }
      });
    } catch (error: any) {
      logger.error('Health check failed:', { error: error.message });
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to perform health checks',
        message: error.message
      });
    }
  }

  async simpleHealth(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
}
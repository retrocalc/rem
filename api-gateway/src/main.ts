import express from 'express';
import { appConfig } from './config/app.config';
import { ProxyManager } from './infrastructure/proxy/proxy-manager';
import { HealthController } from './api/controllers/health.controller';
import { loggingMiddleware, requestLogger } from './api/middlewares/logging.middleware';
import { corsMiddleware, corsHeadersMiddleware } from './api/middlewares/cors.middleware';
import { errorMiddleware, notFoundMiddleware } from './api/middlewares/error.middleware';
import { logger } from './infrastructure/logging/logger';

class APIGateway {
  private app: express.Application;
  private proxyManager: ProxyManager;
  private healthController: HealthController;

  constructor() {
    this.app = express();
    this.proxyManager = new ProxyManager(appConfig.services);
    this.healthController = new HealthController(appConfig.services);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Logging
    this.app.use(requestLogger);
    this.app.use(loggingMiddleware);
    
    // CORS
    this.app.use(corsMiddleware);
    this.app.use(corsHeadersMiddleware);
    
    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request ID
    this.app.use((req, res, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      res.header('X-Request-ID', req.headers['x-request-id'] as string);
      next();
    });
  }

  private setupRoutes(): void {
    // Health checks
    this.app.get('/api/health', (req, res) => this.healthController.checkHealth(req, res));
    this.app.get('/health', (req, res) => this.healthController.simpleHealth(req, res));
    
    // Proxy routes
    this.setupProxyRoutes();
    
    // Gateway info
    this.app.get('/api/gateway/info', (_req: express.Request, res: express.Response) => {
      res.status(200).json({
        name: 'API Gateway',
        version: '1.0.0',
        status: 'operational',
        services: appConfig.services.map(s => ({
          name: s.name,
          url: s.url,
          port: s.port
        })),
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
  }

  private setupProxyRoutes(): void {
    // Proxy dinámico basado en el path
    this.app.use('/api/parametros', (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const proxy = this.proxyManager.getProxy('parametros');
      if (proxy) {
        proxy(req, res, next);
      } else {
        next(new Error('Proxy for parametros service not found'));
      }
    });

    this.app.use('/api/empleados', (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const proxy = this.proxyManager.getProxy('empleados');
      if (proxy) {
        proxy(req, res, next);
      } else {
        next(new Error('Proxy for empleados service not found'));
      }
    });

    this.app.use('/api/contratos', (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const proxy = this.proxyManager.getProxy('contratos');
      if (proxy) {
        proxy(req, res, next);
      } else {
        next(new Error('Proxy for contratos service not found'));
      }
    });

    this.app.use('/api/calculos', (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const proxy = this.proxyManager.getProxy('calculos');
      if (proxy) {
        proxy(req, res, next);
      } else {
        next(new Error('Proxy for calculos service not found'));
      }
    });

    this.app.use('/api/calc-rules', (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const proxy = this.proxyManager.getProxy('calc-rules');
      if (proxy) {
        proxy(req, res, next);
      } else {
        next(new Error('Proxy for calc-rules service not found'));
      }
    });

    // Gateway proxies (para futuros gateways)
    this.app.use('/api/query', (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const proxy = this.proxyManager.getProxy('query-gateway');
      if (proxy) {
        proxy(req, res, next);
      } else {
        next(new Error('Proxy for query-gateway not found'));
      }
    });

    this.app.use('/api/command', (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const proxy = this.proxyManager.getProxy('command-gateway');
      if (proxy) {
        proxy(req, res, next);
      } else {
        next(new Error('Proxy for command-gateway not found'));
      }
    });
  }

  private setupErrorHandling(): void {
    // 404 - Not Found
    this.app.use('*', notFoundMiddleware);
    
    // Error handling
    this.app.use(errorMiddleware);
  }

  public start(): void {
    const server = this.app.listen(appConfig.port, () => {
      logger.info(`API Gateway started on port ${appConfig.port}`, {
        port: appConfig.port,
        environment: process.env.NODE_ENV || 'development',
        services: appConfig.services.length,
        timestamp: new Date().toISOString()
      });

      // Log de servicios configurados
      logger.info('Configured services:', {
        services: appConfig.services.map(s => `${s.name}: ${s.url}`)
      });
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcing shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Manejo de errores no capturados
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled rejection at:', { promise, reason });
      shutdown('unhandledRejection');
    });
  }
}

// Iniciar el gateway
const gateway = new APIGateway();
gateway.start();

export default gateway;
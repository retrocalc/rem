import express from 'express';
import cors from 'cors';
import { appConfig } from './config/app.config';
import { HttpClient } from './infrastructure/clients/http-client';
import { EmpleadoCommandService } from './application/services/empleado-command.service';
import { CommandController } from './api/controllers/command.controller';
import { logger } from './infrastructure/logging/logger';

class CommandGateway {
  private app: express.Application;
  private httpClient: HttpClient;
  private empleadoCommandService: EmpleadoCommandService;
  private commandController: CommandController;

  constructor() {
    this.app = express();
    this.httpClient = new HttpClient(appConfig.services);
    this.empleadoCommandService = new EmpleadoCommandService(this.httpClient);
    this.commandController = new CommandController(this.empleadoCommandService);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private asyncHandler(fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      fn(req, res, next).catch(next);
    };
  }

  private setupMiddleware(): void {
    // Logging middleware
    this.app.use((req, res, next) => {
      const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      req.headers['x-request-id'] = requestId;
      res.header('X-Request-ID', requestId);

      const startTime = Date.now();
      
      // Skip logging for health endpoints
      if (!(req.path === '/health' || req.path === '/api/health')) {
        logger.info(`Incoming request: ${req.method} ${req.path}`, {
          requestId,
          method: req.method,
          path: req.path,
          query: req.query,
          timestamp: new Date().toISOString()
        });

        res.on('finish', () => {
          const duration = Date.now() - startTime;
          logger.info(`Request completed: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
            requestId,
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration,
            timestamp: new Date().toISOString()
          });
        });
      }

      next();
    });

    // CORS
    this.app.use(cors({
      origin: appConfig.cors.origin,
      methods: appConfig.cors.methods,
      allowedHeaders: appConfig.cors.allowedHeaders
    }));

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // Health checks
    this.app.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'healthy',
        service: 'command-gateway',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    this.app.get('/api/health', this.asyncHandler(async (req, res) => {
      await this.commandController.healthCheck(req, res);
    }));

    // Command endpoints
    this.app.post('/api/command/empleados/completo', this.asyncHandler(async (req, res) => {
      await this.commandController.crearEmpleadoCompleto(req, res);
    }));

    this.app.put('/api/command/empleados/:id/actualizar', this.asyncHandler(async (req, res) => {
      await this.commandController.actualizarEmpleadoCompleto(req, res);
    }));

    this.app.post('/api/command/transaccion', this.asyncHandler(async (req, res) => {
      await this.commandController.ejecutarTransaccionPersonalizada(req, res);
    }));

    // Gateway info
    this.app.get('/api/gateway/info', (_req, res) => {
      res.status(200).json({
        name: 'Command Gateway',
        version: '1.0.0',
        status: 'operational',
        port: appConfig.port,
        services: Object.keys(appConfig.services),
        cache: {
          enabled: appConfig.cache.enabled,
          ttl: appConfig.cache.ttl
        },
        command: appConfig.command,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
  }

  private setupErrorHandling(): void {
    // 404 - Not Found
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        requestId: req.headers['x-request-id'],
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    });
  }

  public start(): void {
    const server = this.app.listen(appConfig.port, () => {
      logger.info(`Command Gateway started on port ${appConfig.port}`, {
        port: appConfig.port,
        environment: process.env.NODE_ENV || 'development',
        services: Object.keys(appConfig.services).length,
        cacheEnabled: appConfig.cache.enabled,
        timestamp: new Date().toISOString()
      });

      logger.info('Service configuration:', {
        services: Object.keys(appConfig.services),
        commandConfig: appConfig.command
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
    
    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', { promise, reason });
      shutdown('unhandledRejection');
    });
  }
}

// Start the gateway
const gateway = new CommandGateway();
gateway.start();

export default gateway;
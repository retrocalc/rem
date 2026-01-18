import express from 'express';
import cors from 'cors';
import { appConfig } from './config/app.config';
import { HttpClient } from './infrastructure/clients/http-client';
import { CacheService } from './infrastructure/caching/cache.service';
import { EmpleadoQueryService } from './application/services/empleado-query.service';
import { QueryController } from './api/controllers/query.controller';
import { logger } from './infrastructure/logging/logger';

class QueryGateway {
  private app: express.Application;
  private httpClient: HttpClient;
  private cacheService: CacheService;
  private empleadoQueryService: EmpleadoQueryService;
  private queryController: QueryController;

  constructor() {
    this.app = express();
    this.httpClient = new HttpClient(appConfig.services);
    this.cacheService = new CacheService(appConfig.cache);
    this.empleadoQueryService = new EmpleadoQueryService(this.httpClient, this.cacheService);
    this.queryController = new QueryController(this.empleadoQueryService);
    
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
        service: 'query-gateway',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    this.app.get('/api/health', this.asyncHandler(async (req, res) => {
      await this.queryController.healthCheck(req, res);
    }));

    // Query endpoints
    this.app.get('/api/query/empleados', this.asyncHandler(async (req, res) => {
      await this.queryController.obtenerEmpleadosConContratos(req, res);
    }));

    this.app.get('/api/query/empleados/:id', this.asyncHandler(async (req, res) => {
      await this.queryController.obtenerEmpleadoCompleto(req, res);
    }));

    this.app.get('/api/query/empleados/resumen', this.asyncHandler(async (req, res) => {
      await this.queryController.obtenerResumenEmpleados(req, res);
    }));

    this.app.post('/api/query/cache/invalidate', this.asyncHandler(async (req, res) => {
      await this.queryController.invalidarCache(req, res);
    }));

    // Gateway info
    this.app.get('/api/gateway/info', (_req, res) => {
      res.status(200).json({
        name: 'Query Gateway',
        version: '1.0.0',
        status: 'operational',
        port: appConfig.port,
        services: Object.keys(appConfig.services),
        cache: {
          enabled: appConfig.cache.enabled,
          ttl: appConfig.cache.ttl
        },
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
      logger.info(`Query Gateway started on port ${appConfig.port}`, {
        port: appConfig.port,
        environment: process.env.NODE_ENV || 'development',
        services: Object.keys(appConfig.services).length,
        cacheEnabled: appConfig.cache.enabled,
        timestamp: new Date().toISOString()
      });

      // Log cache stats
      logger.info('Cache configuration:', {
        enabled: appConfig.cache.enabled,
        ttl: appConfig.cache.ttl,
        redis: appConfig.cache.redis ? 'enabled' : 'disabled'
      });
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        // Disconnect cache
        await this.cacheService.disconnect();
        
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
const gateway = new QueryGateway();
gateway.start();

export default gateway;
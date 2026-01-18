import { createProxyMiddleware } from 'http-proxy-middleware';
import { RequestHandler, Request, Response } from 'express';
import { ServiceConfig } from '../../config/app.config';
import { logger } from '../logging/logger';
import { ClientRequest, IncomingMessage } from 'http';

export class ProxyManager {
  private proxies: Map<string, RequestHandler> = new Map();

  constructor(private services: ServiceConfig[]) {
    this.initializeProxies();
  }

  private initializeProxies(): void {
    for (const service of this.services) {
       const proxyOptions: any = {
        target: service.url,
        changeOrigin: true,
        pathRewrite: (path: string) => {
          // Mantener el path original para los endpoints de API
          return path;
        },
        on: {
          proxyReq: (_proxyReq: ClientRequest, req: Request, _res: Response) => {
            logger.info(`Proxying ${req.method} ${req.url} to ${service.name} (${service.url})`, {
              method: req.method,
              originalUrl: req.originalUrl,
              service: service.name,
              target: service.url
            });
          },
          proxyRes: (proxyRes: IncomingMessage, req: Request, _res: Response) => {
            logger.info(`Response from ${service.name}: ${proxyRes.statusCode}`, {
              service: service.name,
              statusCode: proxyRes.statusCode,
              originalUrl: req.originalUrl
            });
          },
          error: (err: Error, req: Request, res: Response) => {
            logger.error(`Proxy error to ${service.name}: ${err.message}`, {
              service: service.name,
              error: err.message,
              originalUrl: req.originalUrl
            });
            
            if (!res.headersSent) {
              res.status(502).json({
                error: 'Bad Gateway',
                message: `Service ${service.name} is unavailable`,
                service: service.name,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      };

      const proxy = createProxyMiddleware(proxyOptions);
      this.proxies.set(service.name, proxy);
    }
  }

  getProxy(serviceName: string): RequestHandler | undefined {
    return this.proxies.get(serviceName);
  }

  getAllProxies(): Map<string, RequestHandler> {
    return this.proxies;
  }

  getServiceByPath(path: string): ServiceConfig | undefined {
    // Determinar qué servicio maneja este path
    if (path.startsWith('/api/parametros')) {
      return this.services.find(s => s.name === 'parametros');
    } else if (path.startsWith('/api/empleados')) {
      return this.services.find(s => s.name === 'empleados');
    } else if (path.startsWith('/api/contratos')) {
      return this.services.find(s => s.name === 'contratos');
    } else if (path.startsWith('/api/calculos')) {
      return this.services.find(s => s.name === 'calculos');
    } else if (path.startsWith('/api/calc-rules')) {
      return this.services.find(s => s.name === 'calc-rules');
    } else if (path.startsWith('/api/query')) {
      return this.services.find(s => s.name === 'query-gateway');
    } else if (path.startsWith('/api/command')) {
      return this.services.find(s => s.name === 'command-gateway');
    }
    
    return undefined;
  }
}
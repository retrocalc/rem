import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { logger } from '../../infrastructure/logging/logger';

export const loggingMiddleware = morgan((tokens: morgan.TokenIndexer<Request, Response>, req: Request, res: Response) => {
  const method = tokens.method(req, res);
  const url = tokens.url(req, res);
  const status = tokens.status(req, res);
  const responseTime = tokens['response-time'](req, res);
  const contentLength = tokens.res(req, res, 'content-length');
  const userAgent = tokens['user-agent'](req, res);

  const logData = {
    method,
    url,
    status: parseInt(status || '0'),
    responseTime: responseTime ? `${responseTime}ms` : undefined,
    contentLength,
    userAgent,
    ip: req.ip,
    timestamp: new Date().toISOString()
  };

  // Log level basado en status code
  if (parseInt(status || '0') >= 400) {
    logger.error(`${method} ${url} ${status} ${responseTime}ms`, logData);
  } else {
    logger.info(`${method} ${url} ${status} ${responseTime}ms`, logData);
  }

  return null;
});

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Interceptar la respuesta para registrar tiempo total
  const originalSend = res.send;
  res.send = function(body): Response {
    const responseTime = Date.now() - startTime;
    
    logger.debug('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length') || body?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    return originalSend.call(this, body);
  };
  
  logger.debug('Request received', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  next();
};
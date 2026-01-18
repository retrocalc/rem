import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/logging/logger';

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const errorMiddleware = (
  error: Error | HttpError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Error caught by middleware:', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: error.name,
      message: error.message,
      code: error.code,
      details: error.details,
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    });
    return;
  }

  // Errores de validación de JSON
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      error: 'Invalid JSON',
      message: 'The request contains invalid JSON',
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Error interno del servidor
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
};

// Middleware para rutas no encontradas
export const notFoundMiddleware = (req: Request, res: Response): void => {
  logger.warn('Route not found:', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
    suggestions: [
      'Check the URL for typos',
      'Verify the HTTP method (GET, POST, etc.)',
      'Consult the API documentation'
    ]
  });
};
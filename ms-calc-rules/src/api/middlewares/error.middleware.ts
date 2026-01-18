import { Request, Response, NextFunction } from 'express';

function isErrorWithMessage(error: unknown): error is Error {
  return error instanceof Error;
}

function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) return error.message;
  return String(error);
}

export class ErrorMiddleware {
  static handle(error: unknown, _req: Request, res: Response, _next: NextFunction) {
    console.error('Error en microservicio:', error);
    
    const mensaje = getErrorMessage(error);
    const statusCode = mensaje.includes('no encontrado') || 
                       mensaje.includes('no es válido') ||
                       mensaje.includes('El atributo') ||
                       mensaje.includes('Grado')
                     ? 400 
                     : 500;
    
    res.status(statusCode).json({
      error: mensaje,
      timestamp: new Date().toISOString()
    });
  }
}
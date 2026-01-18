import { Request, Response, NextFunction } from 'express';

export class ErrorMiddleware {
  static handle(err: Error, _req: Request, res: Response, _next: NextFunction) {
    console.error(`[Error] ${err.message}`, { stack: err.stack });

    // Errores de validación
    if (err.message.includes('validación') || err.message.includes('Validation')) {
      return res.status(400).json({
        error: err.message,
        code: 'VALIDATION_ERROR'
      });
    }

    // Error genérico
    return res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
}
import { Request, Response, NextFunction } from 'express';
import { CalculoNotFoundException } from '../../domain/exceptions/calculo-not-found.exception';

export class ErrorMiddleware {
  static handle(err: Error, _req: Request, res: Response, _next: NextFunction) {
    // eslint-disable-next-line no-console
    console.error(`[Error] ${err.message}`, { stack: err.stack });

    // Errores de validación
    if (err.message.includes('validación') || err.message.includes('Validation') || err.message.includes('Ya existe')) {
      return res.status(400).json({
        error: err.message,
        code: 'VALIDATION_ERROR'
      });
    }

    // Cálculo no encontrado
    if (err instanceof CalculoNotFoundException) {
      return res.status(404).json({
        error: err.message,
        code: 'NOT_FOUND'
      });
    }

    // Error genérico
    return res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
}
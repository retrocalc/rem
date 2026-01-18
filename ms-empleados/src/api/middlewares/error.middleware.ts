import { Request, Response, NextFunction } from 'express';
import { EmpleadoNotFoundException } from '../../domain/exceptions/empleado-not-found.exception';

export class ErrorMiddleware {
  static handle(err: Error, _req: Request, res: Response, _next: NextFunction) {
    console.error(`[Error] ${err.message}`, { stack: err.stack });

    // Errores de validación
    if (err.message.includes('validación') || err.message.includes('Validation') || err.message.includes('Ya existe')) {
      return res.status(400).json({
        error: err.message,
        code: 'VALIDATION_ERROR'
      });
    }

    // Empleado no encontrado
    if (err instanceof EmpleadoNotFoundException) {
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
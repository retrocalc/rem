import { Request, Response, NextFunction } from 'express';
import { CrearEmpleadoDTO } from '../../application/dto/crear-empleado.dto';

export class ValidationMiddleware {
  static validateCrearEmpleado(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CrearEmpleadoDTO.fromJSON(req.body);
      const errores = dto.validar();
      
      if (errores.length > 0) {
        return res.status(400).json({
          error: 'Error de validación',
          detalles: errores
        });
      }
      
      // Adjuntar DTO validado a la request para uso posterior
      (req as any).validatedDto = dto;
      return next();
    } catch (error: any) {
      return res.status(400).json({
        error: 'Error de validación',
        detalles: [error.message]
      });
    }
  }

  static validateActualizarEmpleado(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CrearEmpleadoDTO.fromJSON(req.body);
      const errores = dto.validar();
      
      if (errores.length > 0) {
        return res.status(400).json({
          error: 'Error de validación',
          detalles: errores
        });
      }
      
      (req as any).validatedDto = dto;
      return next();
    } catch (error: any) {
      return res.status(400).json({
        error: 'Error de validación',
        detalles: [error.message]
      });
    }
  }
}
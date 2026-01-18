import { Request, Response, NextFunction } from 'express';
import { CrearContratoDTO } from '../../application/dto/crear-contrato.dto';

export class ValidationMiddleware {
  static validateCrearContrato(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CrearContratoDTO.fromJSON(req.body);
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

  static validateActualizarContrato(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CrearContratoDTO.fromJSON(req.body);
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
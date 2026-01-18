import { Request, Response, NextFunction } from 'express';

export class ValidationMiddleware {
  static validateActualizarParametros(req: Request, res: Response, next: NextFunction) {
    const { mes_anio_proceso } = req.body;

    const errores: string[] = [];

    if (!mes_anio_proceso || typeof mes_anio_proceso !== 'string') {
      errores.push('Mes año proceso es requerido');
    } else {
      const regex = /^\d{4}-\d{2}$/;
      if (!regex.test(mes_anio_proceso)) {
        errores.push('Mes año proceso debe tener formato YYYY-MM');
      } else {
        const [year, month] = mes_anio_proceso.split('-').map(Number);
        if (month < 1 || month > 12) {
          errores.push('Mes debe estar entre 01 y 12');
        }
        const date = new Date(year, month - 1, 1);
        if (date.getFullYear() !== year || date.getMonth() + 1 !== month) {
          errores.push('Fecha inválida');
        }
      }
    }

    if (errores.length > 0) {
      return res.status(400).json({
        error: 'Error de validación',
        detalles: errores
      });
    }

    return next();
  }
}
import { Request, Response } from 'express';
import { ParametroService } from '../../application/services/parametro.service';
import { ActualizarParametrosDTO } from '../../application/dto/actualizar-parametros.dto';

export class ParametroController {
  constructor(private parametroService: ParametroService) {}

  async obtenerParametros(_req: Request, res: Response) {
    try {
      const parametros = await this.parametroService.obtenerParametros();
      return res.json(parametros);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async actualizarParametros(req: Request, res: Response) {
    try {
      const dto = ActualizarParametrosDTO.fromJSON(req.body);
      await this.parametroService.actualizarParametros(dto);
      return res.json({ mensaje: 'Parámetros actualizados exitosamente' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async obtenerMesAnioProceso(_req: Request, res: Response) {
    try {
      const mesAnio = await this.parametroService.obtenerMesAnioProceso();
      return res.json({ mes_anio_proceso: mesAnio });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async actualizarMesAnioProceso(req: Request, res: Response) {
    try {
      const { mes_anio_proceso } = req.body;
      await this.parametroService.actualizarMesAnioProceso(mes_anio_proceso);
      return res.json({ mensaje: 'Mes año proceso actualizado exitosamente' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async obtenerInstituciones(_req: Request, res: Response) {
    try {
      const instituciones = await this.parametroService.obtenerInstituciones();
      return res.json(instituciones);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async refrescar(_req: Request, res: Response) {
    try {
      await this.parametroService.refrescar();
      return res.json({ mensaje: 'Datos refrescados exitosamente' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
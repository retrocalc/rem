import { Request, Response } from 'express';
import { ContratoService } from '../../application/services/contrato.service';
import { CrearContratoDTO } from '../../application/dto/crear-contrato.dto';
import { ContratoNotFoundException } from '../../domain/exceptions/contrato-not-found.exception';
import { ContratoEntity } from '../../domain/entities/contrato.entity';

export class ContratoController {
  constructor(private contratoService: ContratoService) {}

  async listarContratos(_req: Request, res: Response) {
    try {
      const contratos = await this.contratoService.listarContratos();
      const contratosJSON = contratos.map((contrato: ContratoEntity) => contrato.toJSON());
      return res.json(contratosJSON);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async obtenerContratoPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const contrato = await this.contratoService.obtenerContratoPorId(id);
      return res.json(contrato.toJSON());
    } catch (error: any) {
      if (error instanceof ContratoNotFoundException) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  async obtenerContratosPorEmpleadoId(req: Request, res: Response) {
    try {
      const { empleadoId } = req.params;
      const contratos = await this.contratoService.obtenerContratosPorEmpleadoId(empleadoId);
      return res.json(contratos.map((contrato: ContratoEntity) => contrato.toJSON()));
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async obtenerContratosVigentes(_req: Request, res: Response) {
    try {
      const contratos = await this.contratoService.obtenerContratosVigentes();
      return res.json(contratos.map((contrato: ContratoEntity) => contrato.toJSON()));
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async crearContrato(req: Request, res: Response) {
    try {
      const dto = CrearContratoDTO.fromJSON(req.body);
      const contrato = await this.contratoService.crearContrato(dto);
      return res.status(201).json(contrato.toJSON());
    } catch (error: any) {
      if (error.message.includes('Error de validación') || error.message.includes('Ya existe')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  async actualizarContrato(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const dto = CrearContratoDTO.fromJSON(req.body);
      const contrato = await this.contratoService.actualizarContrato(id, dto);
      return res.json(contrato.toJSON());
    } catch (error: any) {
      if (error instanceof ContratoNotFoundException) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Error de validación') || error.message.includes('Ya existe')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  async eliminarContrato(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const eliminado = await this.contratoService.eliminarContrato(id);
      if (eliminado) {
        return res.json({ mensaje: `Contrato ${id} eliminado exitosamente` });
      } else {
        return res.status(500).json({ error: 'Error al eliminar contrato' });
      }
    } catch (error: any) {
      if (error instanceof ContratoNotFoundException) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  async inicializar(_req: Request, res: Response) {
    try {
      await this.contratoService.inicializar();
      return res.json({ mensaje: 'Microservicio de contratos inicializado' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async refrescar(_req: Request, res: Response) {
    try {
      await this.contratoService.refrescar();
      return res.json({ mensaje: 'Datos de contratos refrescados desde archivo JSON' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
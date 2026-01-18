import { Request, Response } from 'express';
import { EmpleadoService } from '../../application/services/empleado.service';
import { CrearEmpleadoDTO } from '../../application/dto/crear-empleado.dto';
import { EmpleadoNotFoundException } from '../../domain/exceptions/empleado-not-found.exception';

export class EmpleadoController {
  constructor(private empleadoService: EmpleadoService) {}

  async listarEmpleados(_req: Request, res: Response) {
    try {
      const empleados = await this.empleadoService.listarEmpleados();
      return res.json(empleados.map(emp => emp.toJSON()));
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async obtenerEmpleadoPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const empleado = await this.empleadoService.obtenerEmpleadoPorId(id);
      return res.json(empleado.toJSON());
    } catch (error: any) {
      if (error instanceof EmpleadoNotFoundException) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  async obtenerEmpleadoPorRUT(req: Request, res: Response) {
    try {
      const { rut } = req.params;
      const empleado = await this.empleadoService.obtenerEmpleadoPorRUT(rut);
      return res.json(empleado.toJSON());
    } catch (error: any) {
      if (error instanceof EmpleadoNotFoundException) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  async crearEmpleado(req: Request, res: Response) {
    try {
      const dto = CrearEmpleadoDTO.fromJSON(req.body);
      const empleado = await this.empleadoService.crearEmpleado(dto);
      return res.status(201).json(empleado.toJSON());
    } catch (error: any) {
      if (error.message.includes('Error de validación') || error.message.includes('Ya existe')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  async actualizarEmpleado(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const dto = CrearEmpleadoDTO.fromJSON(req.body);
      const empleado = await this.empleadoService.actualizarEmpleado(id, dto);
      return res.json(empleado.toJSON());
    } catch (error: any) {
      if (error instanceof EmpleadoNotFoundException) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Error de validación') || error.message.includes('Ya existe')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  async eliminarEmpleado(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const eliminado = await this.empleadoService.eliminarEmpleado(id);
      if (eliminado) {
        return res.json({ mensaje: `Empleado ${id} eliminado exitosamente` });
      } else {
        return res.status(500).json({ error: 'Error al eliminar empleado' });
      }
    } catch (error: any) {
      if (error instanceof EmpleadoNotFoundException) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  async inicializar(_req: Request, res: Response) {
    try {
      await this.empleadoService.inicializar();
      return res.json({ mensaje: 'Microservicio de empleados inicializado' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async refrescar(_req: Request, res: Response) {
    try {
      await this.empleadoService.refrescar();
      return res.json({ mensaje: 'Datos refrescados exitosamente' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
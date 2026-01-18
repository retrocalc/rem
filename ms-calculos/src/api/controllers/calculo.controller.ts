import { Request, Response } from 'express';
import { CalculoService } from '../../application/services/calculo.service';
import { CalculoNotFoundException } from '../../domain/exceptions/calculo-not-found.exception';

function isErrorWithMessage(error: unknown): error is Error {
  return error instanceof Error;
}

function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) return error.message;
  return String(error);
}

export class CalculoController {
  constructor(private calculoService: CalculoService) {}

  async procesarRemuneraciones(req: Request, res: Response) {
    try {
      console.log(`[CalculoController.procesarRemuneraciones] Iniciando proceso masivo`);
       const { tamanoLote, delayEntreLotes } = req.body;
       
       // Valores por defecto - usar != null para permitir 0 como valor válido
       const tamanoLoteNum = tamanoLote != null ? Number(tamanoLote) : 100;
       const delayEntreLotesNum = delayEntreLotes != null ? Number(delayEntreLotes) : 100;
      
      console.log(`[CalculoController.procesarRemuneraciones] Parámetros recibidos: tamanoLote=${tamanoLoteNum}, delayEntreLotes=${delayEntreLotesNum}`);
      
       // Validar parámetros
       if (!Number.isInteger(tamanoLoteNum) || tamanoLoteNum <= 0) {
         return res.status(400).json({ error: 'tamanoLote debe ser un número entero mayor a 0' });
       }
       if (!Number.isInteger(delayEntreLotesNum) || delayEntreLotesNum < 0) {
         return res.status(400).json({ error: 'delayEntreLotes debe ser un número entero no negativo' });
       }
       const progressMessages: string[] = [];
       const calculos = await this.calculoService.procesarRemuneraciones(
         tamanoLoteNum, 
         delayEntreLotesNum,
         (message: string) => {
           progressMessages.push(message);
         }
        );
        console.log(`[CalculoController.procesarRemuneraciones] Se recopilaron ${progressMessages.length} mensajes de progreso`);
        return res.status(201).json({
         mensaje: `Se procesaron ${calculos.length} cálculos de remuneración`,
         log: progressMessages,
         estadisticas: {
           tamanoLote: tamanoLoteNum,
           delayEntreLotes: delayEntreLotesNum,
           totalCalculos: calculos.length,
           primerosCalculosIds: calculos.slice(0, 10).map(calculo => calculo.id) // Solo primeros 10 IDs como ejemplo
         }
       });
    } catch (error: unknown) {
      console.error(`[CalculoController.procesarRemuneraciones] Error en proceso masivo:`, getErrorMessage(error));
      if (getErrorMessage(error).includes('Ya existen cálculos procesados') || 
          getErrorMessage(error).includes('No hay contratos') ||
          getErrorMessage(error).includes('No se pudieron procesar contratos')) {
        return res.status(400).json({ error: getErrorMessage(error) });
      }
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }

  async cerrarMes(_req: Request, res: Response) {
    try {
      const parametros = await this.calculoService.cerrarMes();
      return res.json({
        mensaje: 'Mes cerrado exitosamente',
        nuevo_mes_proceso: parametros.mes_anio_proceso
      });
    } catch (error: unknown) {
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }

  async listarCalculos(_req: Request, res: Response) {
    try {
      const calculos = await this.calculoService.listarCalculos();
      return res.json(calculos.map(calculo => calculo.toJSON()));
    } catch (error: unknown) {
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }

  async obtenerCalculoPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const calculo = await this.calculoService.obtenerCalculoPorId(id);
      return res.json(calculo.toJSON());
    } catch (error: unknown) {
      if (error instanceof CalculoNotFoundException) {
        return res.status(404).json({ error: getErrorMessage(error) });
      }
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }

  async obtenerCalculosPorContrato(req: Request, res: Response) {
    try {
      const { contratoId } = req.params;
      const calculos = await this.calculoService.obtenerCalculosPorContrato(contratoId);
      return res.json(calculos.map(calculo => calculo.toJSON()));
    } catch (error: unknown) {
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }

  async obtenerCalculosPorEmpleado(req: Request, res: Response) {
    try {
      const { empleadoId } = req.params;
      const calculos = await this.calculoService.obtenerCalculosPorEmpleado(empleadoId);
      return res.json(calculos.map(calculo => calculo.toJSON()));
    } catch (error: unknown) {
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }

  async obtenerCalculosPorMes(req: Request, res: Response) {
    try {
      const { mesProceso } = req.params;
      const calculos = await this.calculoService.obtenerCalculosPorMes(mesProceso);
      return res.json(calculos.map(calculo => calculo.toJSON()));
    } catch (error: unknown) {
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }

  async marcarComoPagado(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const calculo = await this.calculoService.marcarComoPagado(id);
      return res.json({
        mensaje: `Cálculo ${id} marcado como pagado`,
        calculo: calculo.toJSON()
      });
    } catch (error: unknown) {
      if (error instanceof CalculoNotFoundException) {
        return res.status(404).json({ error: getErrorMessage(error) });
      }
      if (getErrorMessage(error).includes('No se puede marcar como pagado')) {
        return res.status(400).json({ error: getErrorMessage(error) });
      }
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }

  async anularCalculo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const calculo = await this.calculoService.anularCalculo(id);
      return res.json({
        mensaje: `Cálculo ${id} anulado`,
        calculo: calculo.toJSON()
      });
    } catch (error: unknown) {
      if (error instanceof CalculoNotFoundException) {
        return res.status(404).json({ error: getErrorMessage(error) });
      }
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }

  async obtenerResumenMes(req: Request, res: Response) {
    try {
      const { mesProceso } = req.params;
      const resumen = await this.calculoService.obtenerResumenMes(mesProceso);
      return res.json({
        mes_proceso: mesProceso,
        ...resumen
      });
    } catch (error: unknown) {
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }

  async procesarRemuneracionPorContrato(req: Request, res: Response) {
    const { id_contrato } = req.params;
    console.log(`[CalculoController.procesarRemuneracionPorContrato] Procesando contrato ${id_contrato}`);
    try {
      const calculo = await this.calculoService.procesarRemuneracionPorContrato(id_contrato);
      return res.status(201).json({
        mensaje: `Cálculo procesado para contrato ${id_contrato}`,
        calculo: calculo.toJSON()
      });
    } catch (error: unknown) {
      console.error(`[CalculoController.procesarRemuneracionPorContrato] Error procesando contrato ${id_contrato}:`, getErrorMessage(error));
      if (getErrorMessage(error).includes('no encontrado') || 
          getErrorMessage(error).includes('no tiene') ||
          getErrorMessage(error).includes('no soportado')) {
        return res.status(400).json({ error: getErrorMessage(error) });
      }
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }

  async inicializar(_req: Request, res: Response) {
    try {
      await this.calculoService.inicializar();
      return res.json({ mensaje: 'Microservicio de cálculos inicializado' });
    } catch (error: unknown) {
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }

  async refrescarDatosExternos(_req: Request, res: Response) {
    try {
      await this.calculoService.refrescarDatosExternos();
      return res.json({ mensaje: 'Datos externos (contratos y empleados) refrescados' });
    } catch (error: unknown) {
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }

  async calcularParaEmpleado(req: Request, res: Response) {
    const { empleado_id, mes, anio, parametros_adicionales } = req.body;
    
    console.log(`[CalculoController.calcularParaEmpleado] Solicitando cálculo para empleado ${empleado_id}, mes ${mes}, año ${anio}`);
    
    if (!empleado_id) {
      return res.status(400).json({ error: 'El campo empleado_id es requerido' });
    }
    
    try {
      // Validar mes y año
      const mesNum = parseInt(mes?.toString() || new Date().getMonth() + 1);
      const anioNum = parseInt(anio?.toString() || new Date().getFullYear());
      
      if (mesNum < 1 || mesNum > 12) {
        return res.status(400).json({ error: 'El mes debe estar entre 1 y 12' });
      }
      
      if (anioNum < 2000 || anioNum > 2100) {
        return res.status(400).json({ error: 'El año debe estar entre 2000 y 2100' });
      }
      
      const mesProceso = `${anioNum}-${mesNum.toString().padStart(2, '0')}`;
      
      const resultado = await this.calculoService.calcularParaEmpleado(
        empleado_id,
        mesProceso,
        parametros_adicionales || {}
      );
      
      return res.json(resultado);
      
    } catch (error: unknown) {
      console.error(`[CalculoController.calcularParaEmpleado] Error calculando para empleado ${empleado_id}:`, getErrorMessage(error));
      
      if (getErrorMessage(error).includes('no encontrado') || 
          getErrorMessage(error).includes('no tiene')) {
        return res.status(404).json({ error: getErrorMessage(error) });
      }
      
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }
}
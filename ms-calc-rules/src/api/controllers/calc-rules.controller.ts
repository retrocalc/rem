import { Request, Response } from 'express';
import { CalcRulesService } from '../../application/services/calc-rules.service';
import { ContratoAttributes } from '../../domain/interfaces/rules.interface';

function isErrorWithMessage(error: unknown): error is Error {
  return error instanceof Error;
}

function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) return error.message;
  return String(error);
}

export class CalcRulesController {
  constructor(private calcRulesService: CalcRulesService) {}

  async calcular(req: Request, res: Response) {
    try {
      const attributes: ContratoAttributes = req.body;
      const usuario = req.headers['x-user'] as string | undefined;
      console.log('CalcRulesController.calcular recibió atributos:', JSON.stringify(attributes), usuario ? `usuario: ${usuario}` : '');
      
      // Validar entrada básica
      if (!attributes || typeof attributes !== 'object') {
        return res.status(400).json({ 
          error: 'Se requiere un objeto con atributos de contrato' 
        });
      }

      const resultado = await this.calcRulesService.calcular(attributes, usuario);
      console.log('CalcRulesController.calcular resultado:', JSON.stringify(resultado).substring(0, 200));
      return res.json(resultado);
    } catch (error: unknown) {
      const mensaje = getErrorMessage(error);
      
      if (mensaje.includes('no encontrado') || 
          mensaje.includes('no es válido') ||
          mensaje.includes('El atributo') ||
          mensaje.includes('Grado')) {
        return res.status(400).json({ error: mensaje });
      }
      
      return res.status(500).json({ error: mensaje });
    }
  }

  async obtenerRules(req: Request, res: Response) {
    try {
      const usuario = req.headers['x-user'] as string | undefined;
      const rules = await this.calcRulesService.getRules(undefined, usuario);
      
      return res.json({
        rules,
        base_calculo: {}, // Mantener compatibilidad con respuesta esperada
        timestamp: new Date().toISOString()
      });
    } catch (error: unknown) {
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }

  async refrescar(req: Request, res: Response) {
    try {
      const usuario = req.headers['x-user'] as string | undefined;
      await this.calcRulesService.refrescar(usuario);
      const rules = await this.calcRulesService.getRules(undefined, usuario);
      
      return res.json({
        status: 'ok',
        message: 'Reglas recargadas desde disco',
        rules_loaded: Object.keys(rules).length,
        base_calculo_loaded: 0, // base_calculo ya no se carga
        timestamp: new Date().toISOString()
      });
    } catch (error: unknown) {
      return res.status(500).json({ 
        status: 'error',
        error: getErrorMessage(error),
        timestamp: new Date().toISOString()
      });
    }
  }

  async obtenerRulesCrudo(req: Request, res: Response) {
    try {
      const usuario = req.headers['x-user'] as string | undefined;
      const rules = await this.calcRulesService.getRulesCrudo(undefined, usuario);
      
      return res.json({
        rules,
        timestamp: new Date().toISOString()
      });
    } catch (error: unknown) {
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }

  async guardarRules(req: Request, res: Response) {
    try {
      const { rules } = req.body;
      const usuario = req.headers['x-user'] as string | undefined;
      
      if (!rules || typeof rules !== 'object') {
        return res.status(400).json({ 
          error: 'Se requiere un objeto "rules" en el cuerpo de la solicitud' 
        });
      }

      await this.calcRulesService.guardarRules(rules, undefined, usuario);
      
      return res.json({
        status: 'ok',
        message: 'Reglas guardadas exitosamente',
        timestamp: new Date().toISOString()
      });
    } catch (error: unknown) {
      const mensaje = getErrorMessage(error);
      return res.status(500).json({ 
        status: 'error',
        error: mensaje,
        timestamp: new Date().toISOString()
      });
    }
  }

  async health(req: Request, res: Response) {
    try {
      const usuario = req.headers['x-user'] as string | undefined;
      // Verificar que las reglas están cargadas
      const rules = await this.calcRulesService.getRules(undefined, usuario);
      
      return res.json({
        status: 'healthy',
        service: 'ms-calc-rules',
        rules_loaded: Object.keys(rules).length > 0,
        base_calculo_loaded: true, // Siempre true ya que no se carga archivo
        timestamp: new Date().toISOString()
      });
    } catch (error: unknown) {
      return res.status(500).json({ 
        status: 'unhealthy',
        service: 'ms-calc-rules',
        error: getErrorMessage(error),
        timestamp: new Date().toISOString()
      });
    }
  }
}

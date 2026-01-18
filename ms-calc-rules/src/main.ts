import express from 'express';
import cors from 'cors';
import { AppConfig } from './config/app.config';
import { JsonStorage } from './infrastructure/persistence/json-storage';
import { CalcRulesService } from './application/services/calc-rules.service';
import { CalcRulesController } from './api/controllers/calc-rules.controller';
import { ErrorMiddleware } from './api/middlewares/error.middleware';
import { ParametrosClient } from './infrastructure/clients/parametros.client';

import fs from 'fs/promises';

async function bootstrap() {
  const app = express();

  // Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Logging middleware
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.url}`, req.body ? JSON.stringify(req.body).substring(0, 200) : '');
    next();
  });

  // Asegurar que el directorio de datos existe
  const dataDir = AppConfig.jsonDataPath;
  await fs.mkdir(dataDir, { recursive: true });

  // Inicializar repositorio, cliente de parámetros y servicio
  const storage = new JsonStorage(dataDir);
  const parametrosClient = new ParametrosClient();
  const calcRulesService = new CalcRulesService(storage, parametrosClient);
  
  try {
    await calcRulesService.inicializar();
    console.log('✅ Reglas de cálculo cargadas exitosamente');
  } catch (error: any) {
    console.error('❌ Error cargando reglas:', error.message);
    process.exit(1);
  }

  const calcRulesController = new CalcRulesController(calcRulesService);

  // Rutas de cálculo de reglas
  app.post('/api/calc-rules/calcular', (req, res) => calcRulesController.calcular(req, res));
  app.get('/api/calc-rules/rules', (req, res) => calcRulesController.obtenerRules(req, res));
  app.post('/api/calc-rules/refrescar', (req, res) => calcRulesController.refrescar(req, res));
  
  // Rutas CRUD para reglas (para dashboard)
  app.get('/api/calc-rules/rules/crud', (req, res) => calcRulesController.obtenerRulesCrudo(req, res));
  app.put('/api/calc-rules/rules/crud', (req, res) => calcRulesController.guardarRules(req, res));
  
  // Ruta de salud
  app.get('/api/health', (req, res) => calcRulesController.health(req, res));

  // Ruta de bienvenida
  app.get('/', (_req, res) => {
    res.json({
      mensaje: 'Microservicio de Cálculo basado en Reglas API',
      version: '1.0.0',
      endpoints: {
        calcular: 'POST /api/calc-rules/calcular',
        obtenerRules: 'GET /api/calc-rules/rules',
        refrescar: 'POST /api/calc-rules/refrescar',
        obtenerRulesCrudo: 'GET /api/calc-rules/rules/crud',
        guardarRules: 'PUT /api/calc-rules/rules/crud',
        health: 'GET /api/health'
      }
    });
  });

  // Middleware de errores
  app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    ErrorMiddleware.handle(error, req, res, next);
  });

  // Iniciar servidor
  app.listen(AppConfig.port, () => {
    console.log(`Microservicio de cálculo de reglas ejecutándose en http://localhost:${AppConfig.port}`);
    console.log(`Modo: ${AppConfig.nodeEnv}`);
    console.log(`Directorio de datos: ${AppConfig.jsonDataPath}`);
  });
}

bootstrap().catch(error => {
  console.error('Error al iniciar el microservicio:', error);
  process.exit(1);
});
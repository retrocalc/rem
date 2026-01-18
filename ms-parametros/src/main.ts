import express from 'express';
import cors from 'cors';
import { AppConfig } from './config/app.config';
import { SistemaJsonRepository } from './infrastructure/repositories/json/sistema.repository';
import { ParametroService } from './application/services/parametro.service';
import { ParametroController } from './api/controllers/parametro.controller';
import { ErrorMiddleware } from './api/middlewares/error.middleware';
import { ValidationMiddleware } from './api/middlewares/validation.middleware';
import path from 'path';
import fs from 'fs/promises';

async function bootstrap() {
  const app = express();

  // Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Asegurar que el directorio de datos existe
  const dataDir = path.dirname(AppConfig.jsonDataPath);
  await fs.mkdir(dataDir, { recursive: true });

  // Inicializar repositorio
  const sistemaRepository = new SistemaJsonRepository(AppConfig.jsonDataPath);
  await sistemaRepository.inicializar();

  // Inicializar servicios
  const parametroService = new ParametroService(sistemaRepository);
  const parametroController = new ParametroController(parametroService);

  // Rutas de parámetros
  app.get('/api/parametros', (req, res) => parametroController.obtenerParametros(req, res));

  app.get('/api/parametros/instituciones', (req, res) => parametroController.obtenerInstituciones(req, res));

  app.put('/api/parametros', 
    ValidationMiddleware.validateActualizarParametros,
    (req, res) => parametroController.actualizarParametros(req, res)
  );

  app.get('/api/parametros/mes-anio-proceso', (req, res) => parametroController.obtenerMesAnioProceso(req, res));

  app.put('/api/parametros/mes-anio-proceso',
    ValidationMiddleware.validateActualizarParametros,
    (req, res) => parametroController.actualizarMesAnioProceso(req, res)
  );

  // Ruta para refrescar datos desde archivo JSON
  app.post('/api/parametros/refrescar', (req, res) => parametroController.refrescar(req, res));

  // Ruta de salud
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'ms-parametros',
      timestamp: new Date().toISOString()
    });
  });

  // Ruta de bienvenida
  app.get('/', (_req, res) => {
    res.json({
      mensaje: 'Microservicio de Parámetros API',
      version: '1.0.0',
      endpoints: {
        parametros: '/api/parametros',
        health: '/api/health',
        refrescar: '/api/parametros/refrescar'
      }
    });
  });

  // Middleware de errores
  app.use(ErrorMiddleware.handle);

  // Iniciar servidor
  app.listen(AppConfig.port, () => {
    console.log(`Microservicio de parámetros ejecutándose en http://localhost:${AppConfig.port}`);
    console.log(`Modo: ${AppConfig.nodeEnv}`);
    console.log(`Archivo de datos: ${AppConfig.jsonDataPath}`);
  });
}

bootstrap().catch(error => {
  console.error('Error al iniciar el microservicio:', error);
  process.exit(1);
});
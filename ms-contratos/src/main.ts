import express from 'express';
import cors from 'cors';
import { AppConfig } from './config/app.config';
import { ContratoJsonRepository } from './infrastructure/repositories/json/json.repository';
import { ContratoService } from './application/services/contrato.service';
import { ContratoController } from './api/controllers/contrato.controller';
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
  const contratoRepository = new ContratoJsonRepository(AppConfig.jsonDataPath);
  await contratoRepository.inicializar();

  // Inicializar servicios
  const contratoService = new ContratoService(contratoRepository);
  await contratoService.inicializar();

  const contratoController = new ContratoController(contratoService);

  // Rutas de contratos
  app.get('/api/contratos', (req, res) => contratoController.listarContratos(req, res));
  app.get('/api/contratos/:id', (req, res) => contratoController.obtenerContratoPorId(req, res));
  app.get('/api/contratos/empleado/:empleadoId', (req, res) => contratoController.obtenerContratosPorEmpleadoId(req, res));
  app.get('/api/contratos/vigentes', (req, res) => contratoController.obtenerContratosVigentes(req, res));
  
  app.post('/api/contratos',
    ValidationMiddleware.validateCrearContrato,
    (req, res) => contratoController.crearContrato(req, res)
  );

  app.put('/api/contratos/:id',
    ValidationMiddleware.validateActualizarContrato,
    (req, res) => contratoController.actualizarContrato(req, res)
  );

  app.delete('/api/contratos/:id', (req, res) => contratoController.eliminarContrato(req, res));

  // Ruta de inicialización (útil para pruebas)
  app.post('/api/contratos/inicializar', (req, res) => contratoController.inicializar(req, res));

  // Ruta para refrescar datos desde archivo JSON
  app.post('/api/contratos/refrescar', (req, res) => contratoController.refrescar(req, res));

  // Ruta de salud
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'ms-contratos',
      timestamp: new Date().toISOString()
    });
  });

  // Ruta de bienvenida
  app.get('/', (_req, res) => {
    res.json({
      mensaje: 'Microservicio de Contratos API',
      version: '1.0.0',
      endpoints: {
        listar: 'GET /api/contratos',
        obtener: 'GET /api/contratos/:id',
        obtenerPorEmpleado: 'GET /api/contratos/empleado/:empleadoId',
        obtenerVigentes: 'GET /api/contratos/vigentes',
         crear: 'POST /api/contratos',
         actualizar: 'PUT /api/contratos/:id',
         eliminar: 'DELETE /api/contratos/:id',
         inicializar: 'POST /api/contratos/inicializar',
         refrescar: 'POST /api/contratos/refrescar',
         health: 'GET /api/health'
      }
    });
  });

  // Middleware de errores
  app.use(ErrorMiddleware.handle);

  // Iniciar servidor
  app.listen(AppConfig.port, () => {
    console.log(`Microservicio de contratos ejecutándose en http://localhost:${AppConfig.port}`);
    console.log(`Modo: ${AppConfig.nodeEnv}`);
    console.log(`Archivo de datos: ${AppConfig.jsonDataPath}`);
  });
}

bootstrap().catch(error => {
  console.error('Error al iniciar el microservicio:', error);
  process.exit(1);
});
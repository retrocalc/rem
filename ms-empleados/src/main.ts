import express from 'express';
import cors from 'cors';
import { AppConfig } from './config/app.config';
import { EmpleadoJsonRepository } from './infrastructure/repositories/json/json.repository';
import { EmpleadoService } from './application/services/empleado.service';
import { EmpleadoController } from './api/controllers/empleado.controller';
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
  const empleadoRepository = new EmpleadoJsonRepository(AppConfig.jsonDataPath);
  await empleadoRepository.inicializar();

  // Inicializar servicios
  const empleadoService = new EmpleadoService(empleadoRepository);
  await empleadoService.inicializar();

  const empleadoController = new EmpleadoController(empleadoService);

  // Rutas de empleados
  app.get('/api/empleados', (req, res) => empleadoController.listarEmpleados(req, res));
  app.get('/api/empleados/:id', (req, res) => empleadoController.obtenerEmpleadoPorId(req, res));
  app.get('/api/empleados/rut/:rut', (req, res) => empleadoController.obtenerEmpleadoPorRUT(req, res));
  
  app.post('/api/empleados',
    ValidationMiddleware.validateCrearEmpleado,
    (req, res) => empleadoController.crearEmpleado(req, res)
  );

  app.put('/api/empleados/:id',
    ValidationMiddleware.validateActualizarEmpleado,
    (req, res) => empleadoController.actualizarEmpleado(req, res)
  );

  app.delete('/api/empleados/:id', (req, res) => empleadoController.eliminarEmpleado(req, res));

  // Ruta de inicialización (útil para pruebas)
  app.post('/api/empleados/inicializar', (req, res) => empleadoController.inicializar(req, res));

  // Ruta para refrescar datos desde archivo JSON
  app.post('/api/empleados/refrescar', (req, res) => empleadoController.refrescar(req, res));

  // Ruta de salud
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'ms-empleados',
      timestamp: new Date().toISOString()
    });
  });

  // Ruta de bienvenida
  app.get('/', (_req, res) => {
    res.json({
      mensaje: 'Microservicio de Empleados API',
      version: '1.0.0',
      endpoints: {
        listar: 'GET /api/empleados',
        obtener: 'GET /api/empleados/:id',
        obtenerPorRUT: 'GET /api/empleados/rut/:rut',
        crear: 'POST /api/empleados',
        actualizar: 'PUT /api/empleados/:id',
        eliminar: 'DELETE /api/empleados/:id',
        inicializar: 'POST /api/empleados/inicializar',
        refrescar: 'POST /api/empleados/refrescar',
        health: 'GET /api/health'
      }
    });
  });

  // Middleware de errores
  app.use(ErrorMiddleware.handle);

  // Iniciar servidor
  app.listen(AppConfig.port, () => {
    console.log(`Microservicio de empleados ejecutándose en http://localhost:${AppConfig.port}`);
    console.log(`Modo: ${AppConfig.nodeEnv}`);
    console.log(`Archivo de datos: ${AppConfig.jsonDataPath}`);
  });
}

bootstrap().catch(error => {
  console.error('Error al iniciar el microservicio:', error);
  process.exit(1);
});
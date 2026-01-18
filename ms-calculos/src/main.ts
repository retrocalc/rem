import express from 'express';
import cors from 'cors';
import { AppConfig } from './config/app.config';
import { CalculoJsonRepository } from './infrastructure/repositories/json/json.repository';
import { CalculoService } from './application/services/calculo.service';
import { CalculoController } from './api/controllers/calculo.controller';
import { ErrorMiddleware } from './api/middlewares/error.middleware';
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
  const calculoRepository = new CalculoJsonRepository(AppConfig.jsonDataPath);
  await calculoRepository.inicializar();

  // Inicializar servicios
  const calculoService = new CalculoService(calculoRepository);
  await calculoService.inicializar();

  const calculoController = new CalculoController(calculoService);

   // Rutas de cálculos
  app.post('/api/calculos/procesar_remuneraciones', (req, res) => calculoController.procesarRemuneraciones(req, res));
  app.post('/api/calculos/procesar_remuneracion/:id_contrato', (req, res) => calculoController.procesarRemuneracionPorContrato(req, res));
  app.post('/api/calculos/calcular', (req, res) => calculoController.calcularParaEmpleado(req, res));
  app.post('/api/calculos/cierre_mes', (req, res) => calculoController.cerrarMes(req, res));
  
  app.get('/api/calculos', (req, res) => calculoController.listarCalculos(req, res));
  app.get('/api/calculos/:id', (req, res) => calculoController.obtenerCalculoPorId(req, res));
  app.get('/api/calculos/contrato/:contratoId', (req, res) => calculoController.obtenerCalculosPorContrato(req, res));
  app.get('/api/calculos/empleado/:empleadoId', (req, res) => calculoController.obtenerCalculosPorEmpleado(req, res));
  app.get('/api/calculos/mes/:mesProceso', (req, res) => calculoController.obtenerCalculosPorMes(req, res));
  app.get('/api/calculos/resumen/:mesProceso', (req, res) => calculoController.obtenerResumenMes(req, res));
  
  app.put('/api/calculos/:id/marcar_pagado', (req, res) => calculoController.marcarComoPagado(req, res));
  app.put('/api/calculos/:id/anular', (req, res) => calculoController.anularCalculo(req, res));

  // Ruta de inicialización (útil para pruebas)
  app.post('/api/calculos/inicializar', (req, res) => calculoController.inicializar(req, res));

  // Ruta para refrescar datos externos (contratos y empleados)
  app.post('/api/calculos/refrescar_datos_externos', (req, res) => calculoController.refrescarDatosExternos(req, res));

  // Ruta de salud
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'ms-calculos',
      timestamp: new Date().toISOString()
    });
  });

  // Ruta de bienvenida
  app.get('/', (_req, res) => {
    res.json({
      mensaje: 'Microservicio de Cálculos de Remuneraciones API',
      version: '1.0.0',
      endpoints: {
          procesarRemuneraciones: 'POST /api/calculos/procesar_remuneraciones',
          procesarRemuneracion: 'POST /api/calculos/procesar_remuneracion/:id_contrato',
          calcularParaEmpleado: 'POST /api/calculos/calcular',
         cerrarMes: 'POST /api/calculos/cierre_mes',
        listarCalculos: 'GET /api/calculos',
        obtenerCalculo: 'GET /api/calculos/:id',
        obtenerPorContrato: 'GET /api/calculos/contrato/:contratoId',
        obtenerPorEmpleado: 'GET /api/calculos/empleado/:empleadoId',
        obtenerPorMes: 'GET /api/calculos/mes/:mesProceso',
        resumenMes: 'GET /api/calculos/resumen/:mesProceso',
         marcarPagado: 'PUT /api/calculos/:id/marcar_pagado',
         anular: 'PUT /api/calculos/:id/anular',
         refrescarDatosExternos: 'POST /api/calculos/refrescar_datos_externos',
         health: 'GET /api/health'
      }
    });
  });

  // Middleware de errores
  app.use(ErrorMiddleware.handle);

  // Iniciar servidor
  app.listen(AppConfig.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Microservicio de cálculos ejecutándose en http://localhost:${AppConfig.port}`);
    // eslint-disable-next-line no-console
    console.log(`Modo: ${AppConfig.nodeEnv}`);
    // eslint-disable-next-line no-console
    console.log(`Archivo de datos: ${AppConfig.jsonDataPath}`);
  });
}

bootstrap().catch(error => {
  // eslint-disable-next-line no-console
  console.error('Error al iniciar el microservicio:', error);
  process.exit(1);
});
import path from 'path';

export const AppConfig = {
  port: process.env.PORT || 3004, // Puerto para cálculos
  jsonDataPath: process.env.JSON_DATA_PATH || 
    path.join(process.cwd(), 'data', 'calculos.json'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // URLs de otros microservicios
  servicios: {
    parametros: process.env.PARAMETROS_URL || 'http://localhost:3001',
    empleados: process.env.EMPLEADOS_URL || 'http://localhost:3002',
    contratos: process.env.CONTRATOS_URL || 'http://localhost:3003',
    calcRules: process.env.CALC_RULES_URL || 'http://localhost:3005'
  },

  // Configuración de backups
  backups: {
    enabled: true,
    maxBackups: 10,
    backupBeforeWrite: true
  },

  // Configuración de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.join(process.cwd(), 'logs', 'calculos.log')
  }
};
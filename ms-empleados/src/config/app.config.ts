import path from 'path';

export const AppConfig = {
  port: process.env.PORT || 3002, // Puerto diferente
  jsonDataPath: process.env.JSON_DATA_PATH || 
    path.join(process.cwd(), 'data', 'empleados.json'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Configuración de backups
  backups: {
    enabled: true,
    maxBackups: 10,
    backupBeforeWrite: true
  },

  // Configuración de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.join(process.cwd(), 'logs', 'empleados.log')
  }
};
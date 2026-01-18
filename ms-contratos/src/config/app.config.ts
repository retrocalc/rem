import path from 'path';

export const AppConfig = {
  port: process.env.PORT || 3003, // Puerto diferente
  jsonDataPath: process.env.JSON_DATA_PATH || 
    path.join(process.cwd(), 'data', 'contratos.json'),
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
    file: process.env.LOG_FILE || path.join(process.cwd(), 'logs', 'contratos.log')
  }
};
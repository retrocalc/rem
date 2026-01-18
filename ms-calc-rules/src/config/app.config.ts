import path from 'path';

export const AppConfig = {
  port: process.env.PORT || 3005, // Puerto para cálculo de reglas
  jsonDataPath: process.env.JSON_DATA_PATH || 
    path.join(process.cwd(), 'data'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Archivos de configuración de reglas
  rulesFiles: {
    rules: process.env.RULES_FILE || 'rules.json'
  },

  // Configuración de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.join(process.cwd(), 'logs', 'calc-rules.log')
  }
};
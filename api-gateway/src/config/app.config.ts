export interface ServiceConfig {
  name: string;
  url: string;
  port: number;
  healthPath: string;
}

export interface AppConfig {
  port: number;
  services: ServiceConfig[];
  cors: {
    origin: string;
    methods: string[];
    allowedHeaders: string[];
  };
  logging: {
    level: string;
    format: 'combined' | 'common' | 'dev' | 'short' | 'tiny';
  };
}

export const appConfig: AppConfig = {
  port: parseInt(process.env.PORT || '3000'),
  services: [
    {
      name: 'parametros',
      url: process.env.PARAMETROS_URL || 'http://localhost:3001',
      port: 3001,
      healthPath: '/api/parametros/health'
    },
    {
      name: 'empleados',
      url: process.env.EMPLEADOS_URL || 'http://localhost:3002',
      port: 3002,
      healthPath: '/api/empleados/health'
    },
    {
      name: 'contratos',
      url: process.env.CONTRATOS_URL || 'http://localhost:3003',
      port: 3003,
      healthPath: '/api/contratos/health'
    },
    {
      name: 'calculos',
      url: process.env.CALCULOS_URL || 'http://localhost:3004',
      port: 3004,
      healthPath: '/api/calculos/health'
    },
    {
      name: 'calc-rules',
      url: process.env.CALC_RULES_URL || 'http://localhost:3005',
      port: 3005,
      healthPath: '/api/calc-rules/health'
    },
    {
      name: 'query-gateway',
      url: process.env.QUERY_GATEWAY_URL || 'http://localhost:3006',
      port: 3006,
      healthPath: '/api/query/health'
    },
    {
      name: 'command-gateway',
      url: process.env.COMMAND_GATEWAY_URL || 'http://localhost:3007',
      port: 3007,
      healthPath: '/api/command/health'
    }
  ],
  cors: {
    origin: '*', // En producción, especificar dominios permitidos
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  logging: {
    level: 'info',
    format: 'combined'
  }
};
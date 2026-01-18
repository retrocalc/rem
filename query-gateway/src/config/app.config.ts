export interface ServiceEndpoint {
  name: string;
  url: string;
  timeout: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
}

export interface QueryConfig {
  maxParallelRequests: number;
  defaultTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface AppConfig {
  port: number;
  services: {
    [key: string]: ServiceEndpoint;
  };
  cache: CacheConfig;
  query: QueryConfig;
  cors: {
    origin: string;
    methods: string[];
    allowedHeaders: string[];
  };
}

export const appConfig: AppConfig = {
  port: parseInt(process.env.PORT || '3006'),
  services: {
    parametros: {
      name: 'parametros',
      url: process.env.PARAMETROS_URL || 'http://localhost:3001/api',
      timeout: 10000
    },
    empleados: {
      name: 'empleados',
      url: process.env.EMPLEADOS_URL || 'http://localhost:3002/api',
      timeout: 10000
    },
    contratos: {
      name: 'contratos',
      url: process.env.CONTRATOS_URL || 'http://localhost:3003/api',
      timeout: 10000
    },
    calculos: {
      name: 'calculos',
      url: process.env.CALCULOS_URL || 'http://localhost:3004/api',
      timeout: 15000
    },
    calcRules: {
      name: 'calc-rules',
      url: process.env.CALC_RULES_URL || 'http://localhost:3005/api',
      timeout: 10000
    }
  },
  cache: {
    enabled: false,
    ttl: 300, // 5 minutes
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    }
  },
  query: {
    maxParallelRequests: 10,
    defaultTimeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }
};
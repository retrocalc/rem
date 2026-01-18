import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { appConfig } from '../../config/app.config';

// Configuración de CORS
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // En desarrollo, permitir todos los orígenes
    if (process.env.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }
    
    // En producción, validar orígenes permitidos
    const allowedOrigins = Array.isArray(appConfig.cors.origin) 
      ? appConfig.cors.origin 
      : [appConfig.cors.origin];
    
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: appConfig.cors.methods,
  allowedHeaders: appConfig.cors.allowedHeaders,
  exposedHeaders: ['X-Request-ID', 'X-Response-Time'],
  credentials: true,
  maxAge: 86400 // 24 horas en segundos
};

export const corsMiddleware = cors(corsOptions);

// Middleware para headers CORS adicionales
export const corsHeadersMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Headers CORS básicos
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', appConfig.cors.methods.join(', '));
  res.header('Access-Control-Allow-Headers', appConfig.cors.allowedHeaders.join(', '));
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  // Headers de seguridad
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Header para identificar el gateway
  res.header('X-Gateway', 'api-gateway-v1.0');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};
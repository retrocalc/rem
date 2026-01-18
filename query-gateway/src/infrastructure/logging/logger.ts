import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

const customFormat = printf(({ level, message, timestamp, service, ...metadata }) => {
  let msg = `${timestamp} [${service || 'query-gateway'}] ${level}: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

export const createLogger = (serviceName = 'query-gateway') => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
      timestamp(),
      json(),
      colorize()
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console({
        format: combine(
          colorize(),
          timestamp(),
          customFormat
        )
      }),
      new winston.transports.File({
        filename: 'logs/query-gateway-error.log',
        level: 'error',
        format: combine(
          timestamp(),
          json()
        )
      }),
      new winston.transports.File({
        filename: 'logs/query-gateway-combined.log',
        format: combine(
          timestamp(),
          json()
        )
      })
    ]
  });
};

export const logger = createLogger();
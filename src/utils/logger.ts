import winston from 'winston';
import { config } from './config';

// Create custom format for vulnerability-aware logging
const vulnerableFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  let logMessage = `${timestamp} [${level}]: ${message}`;
  
  // If vulnerability flag is enabled, log sensitive data
  if (config.vulnerabilities.api8Misconfig) {
    if (meta.requestBody) {
      logMessage += `\nRequest Body: ${JSON.stringify(meta.requestBody)}`;
    }
    if (meta.responseBody) {
      logMessage += `\nResponse Body: ${JSON.stringify(meta.responseBody)}`;
    }
    if (meta.secrets) {
      logMessage += `\nSecrets: ${JSON.stringify(meta.secrets)}`;
    }
  }
  
  return logMessage;
});

export const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    vulnerableFormat
  ),
  defaultMeta: { service: 'vulnyoga' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Middleware for logging requests (vulnerable to information disclosure)
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  // Log request details
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    // Vulnerable: log request body if misconfig is enabled
    ...(config.vulnerabilities.api8Misconfig && {
      requestBody: req.body,
      headers: req.headers
    })
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data: any) {
    // Vulnerable: log response body if misconfig is enabled
    if (config.vulnerabilities.api8Misconfig) {
      logger.info('Response sent', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseBody: data,
        duration: Date.now() - start
      });
    } else {
      logger.info('Response sent', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: Date.now() - start
      });
    }
    
    return originalJson.call(this, data);
  };

  next();
};

// Helper to log security events
export const securityLogger = {
  bolaAttempt: (userId: number, targetId: number, resource: string) => {
    logger.warn('BOLA attempt detected', {
      userId,
      targetId,
      resource,
      vulnerability: 'API1_BOLA'
    });
  },
  
  brokenAuthAttempt: (email: string, reason: string) => {
    logger.warn('Broken authentication attempt', {
      email,
      reason,
      vulnerability: 'API2_BROKEN_AUTH'
    });
  },
  
  boplaAttempt: (userId: number, field: string, value: any) => {
    logger.warn('BOPLA attempt detected', {
      userId,
      field,
      value,
      vulnerability: 'API3_BOPLA'
    });
  },
  
  resourceExhaustion: (userId: number, resource: string, amount: number) => {
    logger.warn('Resource exhaustion attempt', {
      userId,
      resource,
      amount,
      vulnerability: 'API4_RESOURCE'
    });
  },
  
  functionAuthBypass: (userId: number, funcName: string, role: string) => {
    logger.warn('Function level auth bypass', {
      userId,
      function: funcName,
      role,
      vulnerability: 'API5_FUNC_AUTH'
    });
  },
  
  businessFlowViolation: (userId: number, flow: string, step: string) => {
    logger.warn('Business flow violation', {
      userId,
      flow,
      step,
      vulnerability: 'API6_BUSINESS_FLOW'
    });
  },
  
  ssrfAttempt: (userId: number, url: string) => {
    logger.warn('SSRF attempt detected', {
      userId,
      url,
      vulnerability: 'API7_SSRF'
    });
  },
  
  misconfigExploit: (userId: number, config: string) => {
    logger.warn('Security misconfiguration exploited', {
      userId,
      config,
      vulnerability: 'API8_MISCONFIG'
    });
  },
  
  inventoryExploit: (userId: number, endpoint: string) => {
    logger.warn('Inventory management exploit', {
      userId,
      endpoint,
      vulnerability: 'API9_INVENTORY'
    });
  },
  
  unsafeApiConsumption: (userId: number, api: string, response: any) => {
    logger.warn('Unsafe API consumption', {
      userId,
      api,
      response,
      vulnerability: 'API10_UNSAFE_CONSUMP'
    });
  }
};

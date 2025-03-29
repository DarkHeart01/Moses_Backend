import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger.service';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Log request details
    const start = Date.now();
    const { method, url, ip } = req;
    const userAgent = req.get('user-agent') || '';
  
    // Log request start
    logger.info(`Incoming request`, {
      method,
      url,
      ip,
      userAgent
    });
  
    // Log response details when the response is finished
    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
  
      logger.info(`Request completed`, {
        method,
        url,
        statusCode,
        duration,
        ip,
        userAgent
      });
    });
  
    next();
  };
  
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import logger from '../config/logger';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Log incoming request for debugging
      logger.debug('Validation request', {
        path: req.path,
        method: req.method,
        body: req.body
      });

      // Parse and transform the body, then update req.body with transformed values
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        // Log validation errors for debugging
        logger.warn('Validation failed', {
          path: req.path,
          method: req.method,
          errors: details,
          body: req.body
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VAL_001',
            message: 'Validation error',
            details
          }
        });
        return;
      }
      
      logger.error('Validation error (non-Zod)', {
        path: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'VAL_001',
          message: 'Invalid request data'
        }
      });
    }
  };
};


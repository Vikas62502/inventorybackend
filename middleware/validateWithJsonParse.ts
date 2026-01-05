import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import logger from '../config/logger';
import { logInfo, logError } from '../utils/loggerHelper';

export const validateWithJsonParse = (schema: ZodSchema, jsonFields: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Log incoming request for debugging
      logger.debug('Validation request (with JSON parse)', {
        path: req.path,
        method: req.method,
        body: req.body,
        jsonFields
      });

      // Parse JSON strings in specified fields
      const body = { ...req.body };
      for (const field of jsonFields) {
        if (body[field] && typeof body[field] === 'string') {
          try {
            body[field] = JSON.parse(body[field]);
            logger.debug(`Parsed JSON field: ${field}`, {
              original: req.body[field],
              parsed: body[field]
            });
          } catch (parseError) {
            logger.warn('JSON parse error', {
              field,
              value: body[field],
              error: parseError instanceof Error ? parseError.message : 'Unknown error'
            });
            res.status(400).json({ 
              success: false,
              error: {
                code: 'VAL_001',
                message: 'Validation error',
                details: [{ 
                  field: field, 
                  message: `Invalid JSON in field '${field}'. Must be valid JSON.` 
                }]
              }
            });
            return;
          }
        }
      }
      
      // Validate the processed body
      logInfo('📥 Validating stock request', {
        bodyKeys: Object.keys(body),
        hasItems: !!body.items,
        itemsType: typeof body.items,
        itemsIsArray: Array.isArray(body.items),
        itemsLength: Array.isArray(body.items) ? body.items.length : 'N/A',
        requested_from: body.requested_from,
        body: JSON.stringify(body).substring(0, 1000) // First 1000 chars for debugging
      });
      
      const parsed = schema.parse(body);
      // Update req.body with parsed values
      req.body = parsed;
      
      logger.debug('Validation successful', {
        path: req.path,
        method: req.method,
        bodyKeys: Object.keys(req.body)
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        // Log validation errors for debugging
        logError('❌ Validation failed (with JSON parse)', {
          path: req.path,
          method: req.method,
          errorCount: details.length,
          errors: JSON.stringify(details),
          bodyKeys: Object.keys(req.body),
          body: JSON.stringify(req.body).substring(0, 2000), // First 2000 chars
          firstError: details[0] ? `${details[0].field}: ${details[0].message}` : 'Unknown error'
        });
        
        logger.warn('Validation failed (with JSON parse)', {
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
            details: details.map(d => ({
              field: d.field,
              message: d.message
            }))
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

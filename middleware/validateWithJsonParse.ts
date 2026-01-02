import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateWithJsonParse = (schema: ZodSchema, jsonFields: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Parse JSON strings in specified fields
      const body = { ...req.body };
      for (const field of jsonFields) {
        if (body[field] && typeof body[field] === 'string') {
          try {
            body[field] = JSON.parse(body[field]);
          } catch (parseError) {
            res.status(400).json({ 
              error: `Invalid JSON in field '${field}'`,
              details: [{ path: field, message: 'Must be valid JSON' }]
            });
            return;
          }
        }
      }
      
      // Validate the processed body
      schema.parse(body);
      // Update req.body with parsed values
      req.body = body;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err) => ({
          path: err.path.join('.'),
          message: err.message
        }));
        res.status(400).json({
          error: 'Validation error',
          details: errors
        });
        return;
      }
      res.status(400).json({ error: 'Invalid request data' });
    }
  };
};


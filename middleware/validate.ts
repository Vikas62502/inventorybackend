import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Parse and transform the body, then update req.body with transformed values
      const parsed = schema.parse(req.body);
      req.body = parsed;
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


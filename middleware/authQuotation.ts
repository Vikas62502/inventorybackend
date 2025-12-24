import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Dealer, Visitor } from '../models/index-quotation';

// Authenticate dealer or admin
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_003',
          message: 'Invalid token'
        }
      });
      return;
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SYS_001',
          message: 'JWT secret not configured'
        }
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as { id: string; role?: string; type?: string };

      // Check if it's a dealer/admin
      if (decoded.role === 'dealer' || decoded.role === 'admin') {
        const dealer = await Dealer.findByPk(decoded.id);
        if (!dealer || !dealer.isActive) {
          res.status(401).json({
            success: false,
            error: {
              code: 'AUTH_005',
              message: 'Account suspended'
            }
          });
          return;
        }

        req.dealer = {
          id: dealer.id,
          username: dealer.username,
          role: dealer.role
        };
        req.user = {
          id: dealer.id,
          username: dealer.username,
          role: dealer.role
        };
        next();
        return;
      }

      // Check if it's a visitor
      if (decoded.role === 'visitor' || decoded.type === 'visitor') {
        const visitor = await Visitor.findByPk(decoded.id);
        if (!visitor || !visitor.isActive) {
          res.status(401).json({
            success: false,
            error: {
              code: 'AUTH_005',
              message: 'Account suspended'
            }
          });
          return;
        }

        req.visitor = {
          id: visitor.id,
          username: visitor.username
        };
        req.user = {
          id: visitor.id,
          username: visitor.username,
          role: 'visitor'
        };
        next();
        return;
      }

      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_003',
          message: 'Invalid token'
        }
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_002',
            message: 'Token expired'
          }
        });
        return;
      }
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_003',
          message: 'Invalid token'
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SYS_001',
        message: 'Internal server error'
      }
    });
  }
};

// Authorize dealer only
export const authorizeDealer = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.dealer) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_004',
        message: 'Insufficient permissions'
      }
    });
    return;
  }
  next();
};

// Authorize admin only
export const authorizeAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.dealer || req.dealer.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: {
        code: 'AUTH_004',
        message: 'Insufficient permissions'
      }
    });
    return;
  }
  next();
};

// Authorize visitor only
export const authorizeVisitor = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.visitor) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_004',
        message: 'Insufficient permissions'
      }
    });
    return;
  }
  next();
};


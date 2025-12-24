import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Dealer, Visitor } from '../models/index-quotation';
import { logError } from '../utils/loggerHelper';

// Login - for dealers and visitors
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VAL_002',
          message: 'Username and password are required'
        }
      });
      return;
    }

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

    // Try dealer first
    let dealer = await Dealer.findOne({ where: { username } });
    if (dealer) {
      if (!dealer.isActive) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_005',
            message: 'Account suspended'
          }
        });
        return;
      }

      const isValidPassword = await bcrypt.compare(password, dealer.password);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_001',
            message: 'Invalid username or password'
          }
        });
        return;
      }

      const expiresIn: string = process.env.JWT_EXPIRE || '7d';
      const token = jwt.sign(
        { id: dealer.id, role: dealer.role },
        jwtSecret,
        { expiresIn } as SignOptions
      );

      // Generate refresh token
      const refreshToken = jwt.sign(
        { id: dealer.id, role: dealer.role, type: 'refresh' },
        jwtSecret,
        { expiresIn: '30d' } as SignOptions
      );

      res.json({
        success: true,
        data: {
          token,
          refreshToken,
          user: {
            id: dealer.id,
            username: dealer.username,
            firstName: dealer.firstName,
            lastName: dealer.lastName,
            email: dealer.email,
            role: dealer.role
          },
          expiresIn: 3600
        }
      });
      return;
    }

    // Try visitor
    const visitor = await Visitor.findOne({ where: { username } });
    if (visitor) {
      if (!visitor.isActive) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_005',
            message: 'Account suspended'
          }
        });
        return;
      }

      const isValidPassword = await bcrypt.compare(password, visitor.password);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_001',
            message: 'Invalid username or password'
          }
        });
        return;
      }

      const expiresIn: string = process.env.JWT_EXPIRE || '7d';
      const token = jwt.sign(
        { id: visitor.id, role: 'visitor', type: 'visitor' },
        jwtSecret,
        { expiresIn } as SignOptions
      );

      const refreshToken = jwt.sign(
        { id: visitor.id, role: 'visitor', type: 'refresh' },
        jwtSecret,
        { expiresIn: '30d' } as SignOptions
      );

      res.json({
        success: true,
        data: {
          token,
          refreshToken,
          user: {
            id: visitor.id,
            username: visitor.username,
            firstName: visitor.firstName,
            lastName: visitor.lastName,
            email: visitor.email,
            role: 'visitor'
          },
          expiresIn: 3600
        }
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_001',
        message: 'Invalid username or password'
      }
    });
  } catch (error) {
    logError('Login error', error, { username: req.body.username });
    res.status(500).json({
      success: false,
      error: {
        code: 'SYS_001',
        message: 'Internal server error'
      }
    });
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
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

    const refreshToken = authHeader.substring(7);
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
      const decoded = jwt.verify(refreshToken, jwtSecret) as { id: string; role?: string; type?: string };

      if (decoded.type !== 'refresh') {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_003',
            message: 'Invalid refresh token'
          }
        });
        return;
      }

      const expiresIn: string = process.env.JWT_EXPIRE || '7d';
      const token = jwt.sign(
        { id: decoded.id, role: decoded.role },
        jwtSecret,
        { expiresIn } as SignOptions
      );

      res.json({
        success: true,
        data: {
          token,
          expiresIn: 3600
        }
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_002',
            message: 'Refresh token expired'
          }
        });
        return;
      }
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_003',
          message: 'Invalid refresh token'
        }
      });
    }
  } catch (error) {
    logError('Refresh token error', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYS_001',
        message: 'Internal server error'
      }
    });
  }
};

// Logout
export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

// Change password
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VAL_002',
          message: 'Current password and new password are required'
        }
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VAL_001',
          message: 'Password must be at least 6 characters long',
          details: [{
            field: 'newPassword',
            message: 'Password must be at least 6 characters long'
          }]
        }
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_003',
          message: 'User not authenticated'
        }
      });
      return;
    }

    // Check if dealer
    if (req.dealer) {
      const dealer = await Dealer.findByPk(req.dealer.id);
      if (!dealer) {
        res.status(404).json({
          success: false,
          error: {
            code: 'RES_001',
            message: 'User not found'
          }
        });
        return;
      }

      const isValidPassword = await bcrypt.compare(currentPassword, dealer.password);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_001',
            message: 'Current password is incorrect'
          }
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await dealer.update({ password: hashedPassword });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
      return;
    }

    // Check if visitor
    if (req.visitor) {
      const visitor = await Visitor.findByPk(req.visitor.id);
      if (!visitor) {
        res.status(404).json({
          success: false,
          error: {
            code: 'RES_001',
            message: 'User not found'
          }
        });
        return;
      }

      const isValidPassword = await bcrypt.compare(currentPassword, visitor.password);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_001',
            message: 'Current password is incorrect'
          }
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await visitor.update({ password: hashedPassword });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_003',
        message: 'User not authenticated'
      }
    });
  } catch (error) {
    logError('Change password error', error, { userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: {
        code: 'SYS_001',
        message: 'Internal server error'
      }
    });
  }
};


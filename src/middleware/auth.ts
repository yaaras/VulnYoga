import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../utils/config';
import { logger, securityLogger } from '../utils/logger';
import { AuthenticatedRequest, JWTPayload, UserRole } from '../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // VULN_API2_BROKEN_AUTH: Accept token from multiple sources
    if (config.vulnerabilities.api2BrokenAuth) {
      // Vulnerable: Accept token from query parameter
      token = req.query.token as string;
      
      // Also check Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    } else {
      // Secure: Only accept from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authorization header required' });
        return;
      }
      token = authHeader.substring(7);
    }

    if (!token) {
      res.status(401).json({ error: 'Token required' });
      return;
    }

    // VULN_API2_BROKEN_AUTH: Weak JWT verification
    let decoded: JWTPayload;
    
    if (config.vulnerabilities.api2BrokenAuth) {
      // Vulnerable: No expiration check, weak secret
      try {
        decoded = jwt.verify(token, config.jwtSecret as any) as JWTPayload;
        
        // Vulnerable: Ignore expiration
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
          logger.warn('Expired token used', { token, decoded });
          // Still allow the request to proceed
        }
      } catch (error) {
        // Vulnerable: Try with different algorithms
        try {
          decoded = jwt.verify(token, config.jwtSecret as any, { algorithms: ['HS256', 'none'] }) as JWTPayload;
        } catch (innerError) {
          res.status(401).json({ error: 'Invalid token' });
          return;
        }
      }
    } else {
      // Secure: Proper JWT verification with expiration check
      try {
        decoded = jwt.verify(token, config.jwtSecret as any, { 
          algorithms: ['HS256'],
          ignoreExpiration: false 
        }) as JWTPayload;
      } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true }
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole
    };
    next();
  } catch (error) {
    logger.error('Authentication error', { error });
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (requiredRole: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // VULN_API5_FUNC_AUTH: Trust client-controlled role header
    let userRole = req.user.role;
    
    if (config.vulnerabilities.api5FuncAuth) {
      // Vulnerable: Trust X-Role header from client
      const clientRole = req.headers['x-role'] as string;
      if (clientRole) {
        userRole = clientRole as any;
        securityLogger.functionAuthBypass(req.user.id, req.path, clientRole);
      }
    }

    // Check if user has required role
    if (userRole !== requiredRole && userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole('ADMIN');
export const requireStaff = requireRole('STAFF');

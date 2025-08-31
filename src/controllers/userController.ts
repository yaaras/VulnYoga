import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import { logger, securityLogger } from '../utils/logger';
import { AuthenticatedRequest, CreateUserRequest, UpdateUserRequest, JWTPayload } from '../types';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, address, phone, role }: CreateUserRequest = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // VULN_API3_BOPLA: Mass assignment vulnerability
    const userData: any = {
      email,
      passwordHash,
      name,
      address,
      phone
    };

    if (config.vulnerabilities.api3Bopla) {
      // Vulnerable: Allow mass assignment of sensitive fields
      if (role) {
        userData.role = role;
        securityLogger.boplaAttempt(0, 'role', role);
      }
    } else {
      // Secure: Only allow specific fields, role defaults to CUSTOMER
      userData.role = 'CUSTOMER';
    }

    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret as any,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    logger.error('Registration error', { error });
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret as any,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });
  } catch (error) {
    logger.error('Login error', { error });
    res.status(500).json({ error: 'Login failed' });
  }
};

export const getUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id || '0');
    const requestingUser = req.user!;

    // VULN_API1_BOLA: Broken Object Level Authorization
    if (config.vulnerabilities.api1Bola) {
      // Vulnerable: No ownership check - any authenticated user can access any user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          address: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      securityLogger.bolaAttempt(requestingUser.id, userId, 'user');
      res.json(user);
    } else {
      // Secure: Check ownership or admin role
      if (requestingUser.id !== userId && requestingUser.role !== 'ADMIN') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          address: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    }
  } catch (error) {
    logger.error('Get user error', { error });
    res.status(500).json({ error: 'Failed to get user' });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id || '0');
    const requestingUser = req.user!;
    const updateData: UpdateUserRequest = req.body;

    // VULN_API1_BOLA: Broken Object Level Authorization
    if (config.vulnerabilities.api1Bola) {
      // Vulnerable: No ownership check
      securityLogger.bolaAttempt(requestingUser.id, userId, 'user_update');
    } else {
      // Secure: Check ownership or admin role
      if (requestingUser.id !== userId && requestingUser.role !== 'ADMIN') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    // VULN_API3_BOPLA: Broken Object Property Level Authorization
    if (config.vulnerabilities.api3Bopla) {
      // Vulnerable: Allow updates to sensitive properties
      if (updateData.role && requestingUser.role !== 'ADMIN') {
        securityLogger.boplaAttempt(requestingUser.id, 'role', updateData.role);
      }
      if (updateData.resetToken) {
        securityLogger.boplaAttempt(requestingUser.id, 'resetToken', updateData.resetToken);
      }
    } else {
      // Secure: Whitelist allowed fields
      const allowedFields = ['name', 'address', 'phone'];
      const filteredData: any = {};
      
      for (const field of allowedFields) {
        if (updateData[field as keyof UpdateUserRequest] !== undefined) {
          filteredData[field] = updateData[field as keyof UpdateUserRequest];
        }
      }
      
      // Only admins can update role
      if (updateData.role && requestingUser.role === 'ADMIN') {
        filteredData.role = updateData.role;
      }
      
      Object.assign(updateData, filteredData);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        address: true,
        phone: true,
        role: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    logger.error('Update user error', { error });
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    // VULN_API2_BROKEN_AUTH: No proof of ownership required
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwtSecret as any,
        { expiresIn: '1h' }
      );

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken }
      });

      // In a real app, this would be sent via email
      logger.info('Password reset token generated', { email, resetToken });
    }

    // Always return success to prevent email enumeration
    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    logger.error('Password reset error', { error });
    res.status(500).json({ error: 'Password reset failed' });
  }
};

export const consumeResetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;
    const { newPassword } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Token required' });
      return;
    }

    // VULN_API2_BROKEN_AUTH: Weak token verification
    let decoded: any;
    
    if (config.vulnerabilities.api2BrokenAuth) {
      // Vulnerable: No expiration check
      try {
        decoded = jwt.verify(token, config.jwtSecret as any);
      } catch (error) {
        res.status(400).json({ error: 'Invalid token' });
        return;
      }
    } else {
      // Secure: Proper token verification
      try {
        decoded = jwt.verify(token, config.jwtSecret as any, { ignoreExpiration: false });
      } catch (error) {
        res.status(400).json({ error: 'Invalid or expired token' });
        return;
      }
    }

    const user = await prisma.user.findFirst({
      where: { 
        id: decoded.userId,
        resetToken: token
      }
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid token' });
      return;
    }

    // Hash new password and clear reset token
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        passwordHash,
        resetToken: null
      }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Consume reset token error', { error });
    res.status(500).json({ error: 'Password update failed' });
  }
};

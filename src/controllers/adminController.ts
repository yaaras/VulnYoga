import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../utils/config';
import { logger, securityLogger } from '../utils/logger';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestingUser = req.user!;

    // VULN_API5_FUNC_AUTH: Broken Function Level Authorization
    if (config.vulnerabilities.api5FuncAuth) {
      // Vulnerable: Any authenticated user can access admin endpoint
      securityLogger.functionAuthBypass(requestingUser.id, 'get_all_users', requestingUser.role);
    } else {
      // Secure: Check for admin role
      if (requestingUser.role !== 'ADMIN') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        address: true,
        phone: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (error) {
    logger.error('Get all users error', { error });
    res.status(500).json({ error: 'Failed to get users' });
  }
};

export const getSystemStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestingUser = req.user!;

    // VULN_API5_FUNC_AUTH: Broken Function Level Authorization
    if (config.vulnerabilities.api5FuncAuth) {
      // Vulnerable: Any authenticated user can access admin endpoint
      securityLogger.functionAuthBypass(requestingUser.id, 'get_system_stats', requestingUser.role);
    } else {
      // Secure: Check for admin role
      if (requestingUser.role !== 'ADMIN') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }
    }

    const [userCount, itemCount, orderCount, totalRevenue] = await Promise.all([
      prisma.user.count(),
      prisma.item.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { paid: true },
        _sum: { total: true }
      })
    ]);

    res.json({
      users: userCount,
      items: itemCount,
      orders: orderCount,
      totalRevenue: totalRevenue._sum.total || 0
    });
  } catch (error) {
    logger.error('Get system stats error', { error });
    res.status(500).json({ error: 'Failed to get system stats' });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestingUser = req.user!;
    const userId = parseInt(req.params.id);

    // VULN_API5_FUNC_AUTH: Broken Function Level Authorization
    if (config.vulnerabilities.api5FuncAuth) {
      // Vulnerable: Any authenticated user can delete users
      securityLogger.functionAuthBypass(requestingUser.id, 'delete_user', requestingUser.role);
    } else {
      // Secure: Check for admin role
      if (requestingUser.role !== 'ADMIN') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error', { error });
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

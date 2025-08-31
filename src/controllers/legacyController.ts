import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../utils/config';
import { logger, securityLogger } from '../utils/logger';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

export const listAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // VULN_API9_INVENTORY: Legacy endpoint with no authentication
    if (config.vulnerabilities.api9Inventory) {
      // Vulnerable: No authentication required
      securityLogger.inventoryExploit(0, 'legacy_list_all_users');

      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          address: true,
          phone: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(users);
    } else {
      // Secure: Endpoint disabled
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    logger.error('Legacy list all users error', { error });
    res.status(500).json({ error: 'Failed to get users' });
  }
};

export const getUserOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);

    // VULN_API9_INVENTORY: Legacy endpoint with BOLA
    if (config.vulnerabilities.api9Inventory) {
      // Vulnerable: No authentication, BOLA vulnerability
      securityLogger.inventoryExploit(0, 'legacy_get_user_orders');
      securityLogger.bolaAttempt(0, userId, 'legacy_orders');

      const orders = await prisma.order.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(orders);
    } else {
      // Secure: Endpoint disabled
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    logger.error('Legacy get user orders error', { error });
    res.status(500).json({ error: 'Failed to get orders' });
  }
};

export const getBulkItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { include } = req.query;

    // VULN_API9_INVENTORY: Legacy endpoint that leaks sensitive data
    if (config.vulnerabilities.api9Inventory) {
      // Vulnerable: Leaks supplier emails
      securityLogger.inventoryExploit(0, 'legacy_bulk_items');

      let selectFields: any = {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        imageUrl: true,
        isFeatured: true,
        createdAt: true
      };

      if (include === 'supplier') {
        selectFields.costPrice = true;
        selectFields.supplierEmail = true;
      }

      const items = await prisma.item.findMany({
        select: selectFields,
        orderBy: { createdAt: 'desc' }
      });

      res.json(items);
    } else {
      // Secure: Endpoint disabled
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    logger.error('Legacy bulk items error', { error });
    res.status(500).json({ error: 'Failed to get items' });
  }
};

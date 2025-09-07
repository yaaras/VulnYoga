import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../utils/config';
import { logger, securityLogger } from '../utils/logger';
import { AuthenticatedRequest, CreateItemRequest, UpdateItemRequest, SearchRequest } from '../types';

const prisma = new PrismaClient();

export const getItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await prisma.item.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        imageUrl: true,
        isFeatured: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(items);
  } catch (error) {
    logger.error('Get items error', { error });
    res.status(500).json({ error: 'Failed to get items' });
  }
};

export const getItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const itemId = parseInt(req.params.id);

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        imageUrl: true,
        isFeatured: true,
        createdAt: true
      }
    });

    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json(item);
  } catch (error) {
    logger.error('Get item error', { error });
    res.status(500).json({ error: 'Failed to get item' });
  }
};

export const searchItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q = '', page = 1, pageSize = 10 }: SearchRequest = req.query as any;
    const requestingUser = (req as AuthenticatedRequest).user;

    // VULN_API4_RESOURCE: Unrestricted Resource Consumption
    let actualPageSize = parseInt(String(pageSize)) || 10;
    let actualPage = parseInt(String(page)) || 1;

    if (config.vulnerabilities.api4Resource) {
      // Vulnerable: No limits on pageSize or search complexity
      actualPageSize = Math.max(1, actualPageSize);
      actualPage = Math.max(1, actualPage);
      
      if (requestingUser) {
        securityLogger.resourceExhaustion(requestingUser.id, 'search', actualPageSize);
      }
    } else {
      // Secure: Enforce reasonable limits
      actualPageSize = Math.min(Math.max(1, actualPageSize), 100);
      actualPage = Math.max(1, actualPage);
    }

    const skip = (actualPage - 1) * actualPageSize;

    // VULN_API4_RESOURCE: CPU-intensive search without limits
    let whereClause: any = {};
    
    if (q) {
      if (config.vulnerabilities.api4Resource) {
        // Vulnerable: Use LIKE with wildcards on both sides (CPU intensive)
        whereClause.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } }
        ];
      } else {
        // Secure: Use indexed search or limit complexity
        whereClause.OR = [
          { name: { startsWith: q, mode: 'insensitive' } },
          { description: { startsWith: q, mode: 'insensitive' } }
        ];
      }
    }

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          stock: true,
          imageUrl: true,
          isFeatured: true,
          createdAt: true
        },
        skip,
        take: actualPageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.item.count({ where: whereClause })
    ]);

    res.json({
      items,
      pagination: {
        page: actualPage,
        pageSize: actualPageSize,
        total,
        totalPages: Math.ceil(total / actualPageSize)
      }
    });
  } catch (error) {
    logger.error('Search items error', { error });
    res.status(500).json({ error: 'Search failed' });
  }
};

export const createItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestingUser = req.user!;
    const itemData: CreateItemRequest = req.body;

    // VULN_API3_BOPLA: Mass assignment vulnerability
    if (config.vulnerabilities.api3Bopla) {
      // Vulnerable: Accept all fields including sensitive ones
      const item = await prisma.item.create({
        data: {
          ...itemData,
          costPrice: itemData.costPrice || 0,
          supplierEmail: itemData.supplierEmail || '',
          createdByUserId: requestingUser.id
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          costPrice: true, // Exposed in vulnerable mode
          supplierEmail: true, // Exposed in vulnerable mode
          stock: true,
          imageUrl: true,
          isFeatured: true,
          createdAt: true
        }
      });

      if (itemData.costPrice) {
        securityLogger.boplaAttempt(requestingUser.id, 'costPrice', itemData.costPrice);
      }
      if (itemData.supplierEmail) {
        securityLogger.boplaAttempt(requestingUser.id, 'supplierEmail', itemData.supplierEmail);
      }

      res.status(201).json(item);
    } else {
      // Secure: Whitelist allowed fields
      const allowedFields = ['name', 'description', 'price', 'stock', 'imageUrl', 'isFeatured'];
      const filteredData: any = {};
      
      for (const field of allowedFields) {
        if (itemData[field as keyof CreateItemRequest] !== undefined) {
          filteredData[field] = itemData[field as keyof CreateItemRequest];
        }
      }

      const item = await prisma.item.create({
        data: {
          ...filteredData,
          costPrice: 0, // Default value
          supplierEmail: 'default@supplier.com', // Default value
          createdByUserId: requestingUser.id
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          stock: true,
          imageUrl: true,
          isFeatured: true,
          createdAt: true
        }
      });

      res.status(201).json(item);
    }
  } catch (error) {
    logger.error('Create item error', { error });
    res.status(500).json({ error: 'Failed to create item' });
  }
};

export const updateItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const itemId = parseInt(req.params.id);
    const requestingUser = req.user!;
    const updateData: UpdateItemRequest = req.body;

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id: itemId }
    });

    if (!existingItem) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    // VULN_API3_BOPLA: Mass assignment vulnerability
    if (config.vulnerabilities.api3Bopla) {
      // Vulnerable: Allow updates to sensitive fields
      const updatedItem = await prisma.item.update({
        where: { id: itemId },
        data: updateData,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          costPrice: true, // Exposed in vulnerable mode
          supplierEmail: true, // Exposed in vulnerable mode
          stock: true,
          imageUrl: true,
          isFeatured: true,
          updatedAt: true
        }
      });

      if (updateData.costPrice) {
        securityLogger.boplaAttempt(requestingUser.id, 'costPrice', updateData.costPrice);
      }
      if (updateData.supplierEmail) {
        securityLogger.boplaAttempt(requestingUser.id, 'supplierEmail', updateData.supplierEmail);
      }

      res.json(updatedItem);
    } else {
      // Secure: Whitelist allowed fields
      const allowedFields = ['name', 'description', 'price', 'stock', 'imageUrl', 'isFeatured'];
      const filteredData: any = {};
      
      for (const field of allowedFields) {
        if (updateData[field as keyof UpdateItemRequest] !== undefined) {
          filteredData[field] = updateData[field as keyof UpdateItemRequest];
        }
      }

      const updatedItem = await prisma.item.update({
        where: { id: itemId },
        data: filteredData,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          stock: true,
          imageUrl: true,
          isFeatured: true,
          updatedAt: true
        }
      });

      res.json(updatedItem);
    }
  } catch (error) {
    logger.error('Update item error', { error });
    res.status(500).json({ error: 'Failed to update item' });
  }
};

export const deleteItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const itemId = parseInt(req.params.id);
    const requestingUser = req.user!;

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id: itemId }
    });

    if (!existingItem) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    // VULN_API5_FUNC_AUTH: Function level authorization bypass
    // This is handled in the middleware, but we log the attempt here
    if (config.vulnerabilities.api5FuncAuth) {
      securityLogger.functionAuthBypass(requestingUser.id, 'delete_item', requestingUser.role);
    }

    await prisma.item.delete({
      where: { id: itemId }
    });

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    logger.error('Delete item error', { error });
    res.status(500).json({ error: 'Failed to delete item' });
  }
};

export const exportItems = async (req: Request, res: Response): Promise<void> => {
  try {
    // VULN_API8_MISCONFIG: No authentication required for sensitive operation
    if (config.vulnerabilities.api8Misconfig) {
      // Vulnerable: No auth check for data export
      securityLogger.misconfigExploit(0, 'unauthenticated_export');
    } else {
      // Secure: Require authentication
      const requestingUser = (req as AuthenticatedRequest).user;
      if (!requestingUser) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
    }

    const items = await prisma.item.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        isFeatured: true,
        createdAt: true
      }
    });

    // Convert to CSV format
    const csvHeader = 'ID,Name,Description,Price,Stock,Featured,Created\n';
    const csvRows = items.map((item: any) => 
      `${item.id},"${item.name}","${item.description}",${item.price},${item.stock},${item.isFeatured},${item.createdAt}`
    ).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="items.csv"');
    res.send(csvContent);
  } catch (error) {
    logger.error('Export items error', { error });
    res.status(500).json({ error: 'Export failed' });
  }
};

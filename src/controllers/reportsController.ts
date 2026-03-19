import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const salesReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, region, category, sortBy } = req.query as any;

    if (!sortBy) {
      res.status(400).json({ error: 'sortBy parameter required' });
      return;
    }

    // VULN_SQLI: SQL Injection via sortBy (non-obvious param name)
    if (config.vulnerabilities.sqli) {
      // Vulnerable: sortBy injected directly into ORDER BY clause
      try {
        const query = `SELECT id, name, price, stock FROM items ORDER BY ${sortBy}`;
        const results = await prisma.$queryRawUnsafe(query);
        res.json({
          report: results,
          filters: { startDate, endDate, region, category }
        });
      } catch (error: any) {
        logger.error('SQLi report error', { error, sortBy });
        const rawMessage = error.message || '';
        const msgMatch = rawMessage.match(/Message: `([^`]+)`/);
        const sqliteMsg = msgMatch ? msgMatch[1] : rawMessage;
        res.status(500).json({
          error: 'Report generation failed',
          message: `SQLITE_ERROR: ${sqliteMsg}`,
          details: rawMessage
        });
      }
    } else {
      // Secure: Whitelist allowed sort columns
      const allowedSorts = ['name', 'price', 'stock', 'id'];
      const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'id';
      const items = await prisma.item.findMany({
        select: { id: true, name: true, price: true, stock: true },
        orderBy: { [safeSortBy]: 'asc' }
      });
      res.json({
        report: items,
        filters: { startDate, endDate, region, category }
      });
    }
  } catch (error) {
    logger.error('Sales report error', { error });
    res.status(500).json({ error: 'Report generation failed' });
  }
};

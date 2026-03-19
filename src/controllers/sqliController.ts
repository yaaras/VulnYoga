import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.query as any;

    if (!username) {
      res.status(400).json({ error: 'username parameter required' });
      return;
    }

    // VULN_SQLI: SQL Injection
    if (config.vulnerabilities.sqli) {
      // Vulnerable: Direct string concatenation in raw SQL query
      try {
        const query = `SELECT id, name, email, role FROM users WHERE name LIKE '%${username}%'`;
        const results = await prisma.$queryRawUnsafe(query);
        res.json({ users: results });
      } catch (error: any) {
        logger.error('SQLi search error', { error, username });
        // Vulnerable: Expose raw SQL error details to the client
        // Extract the inner database error message for maximum info leakage
        const rawMessage = error.message || '';
        const codeMatch = rawMessage.match(/Code: `(\d+)`/);
        const msgMatch = rawMessage.match(/Message: `([^`]+)`/);
        const sqliteCode = codeMatch ? codeMatch[1] : 'unknown';
        const sqliteMsg = msgMatch ? msgMatch[1] : rawMessage;

        res.status(500).json({
          error: 'Search failed',
          message: `SQLITE_ERROR: ${sqliteMsg}`,
          code: sqliteCode,
          details: rawMessage
        });
      }
    } else {
      // Secure: Parameterized query
      const results = await prisma.user.findMany({
        where: {
          name: { contains: username }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });
      res.json({ users: results });
    }
  } catch (error) {
    logger.error('User search error', { error });
    res.status(500).json({ error: 'Search failed' });
  }
};

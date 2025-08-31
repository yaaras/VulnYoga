import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../utils/config';
import { logger, securityLogger } from '../utils/logger';
import { AuthenticatedRequest, CreateApiKeyRequest } from '../types';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const getMyApiKeys = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestingUser = req.user!;

    // VULN_API9_INVENTORY: Improper Inventory Management
    if (config.vulnerabilities.api9Inventory) {
      // Vulnerable: Allow users to list API keys for other users
      const { userId } = req.query;
      const targetUserId = userId ? parseInt(userId as string) : requestingUser.id;

      const apiKeys = await prisma.apiKey.findMany({
        where: { userId: targetUserId },
        select: {
          id: true,
          key: true,
          label: true,
          revoked: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      if (targetUserId !== requestingUser.id) {
        securityLogger.inventoryExploit(requestingUser.id, 'list_others_api_keys');
      }

      res.json(apiKeys);
    } else {
      // Secure: Only list own API keys
      const apiKeys = await prisma.apiKey.findMany({
        where: { userId: requestingUser.id },
        select: {
          id: true,
          key: true,
          label: true,
          revoked: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(apiKeys);
    }
  } catch (error) {
    logger.error('Get API keys error', { error });
    res.status(500).json({ error: 'Failed to get API keys' });
  }
};

export const createApiKey = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestingUser = req.user!;
    const { label, userId }: CreateApiKeyRequest = req.body;

    if (!label) {
      res.status(400).json({ error: 'Label is required' });
      return;
    }

    // VULN_API9_INVENTORY: Improper Inventory Management
    if (config.vulnerabilities.api9Inventory) {
      // Vulnerable: Allow users to create API keys for other users
      const targetUserId = userId || requestingUser.id;
      
      if (targetUserId !== requestingUser.id) {
        securityLogger.inventoryExploit(requestingUser.id, 'create_others_api_keys');
      }

      const apiKey = await prisma.apiKey.create({
        data: {
          userId: targetUserId,
          key: generateApiKey(),
          label
        },
        select: {
          id: true,
          key: true,
          label: true,
          createdAt: true
        }
      });

      res.status(201).json(apiKey);
    } else {
      // Secure: Only create API keys for self
      const apiKey = await prisma.apiKey.create({
        data: {
          userId: requestingUser.id,
          key: generateApiKey(),
          label
        },
        select: {
          id: true,
          key: true,
          label: true,
          createdAt: true
        }
      });

      res.status(201).json(apiKey);
    }
  } catch (error) {
    logger.error('Create API key error', { error });
    res.status(500).json({ error: 'Failed to create API key' });
  }
};

export const revokeApiKey = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestingUser = req.user!;
    const keyId = parseInt(req.params.id);

    // VULN_API9_INVENTORY: Improper Inventory Management
    if (config.vulnerabilities.api9Inventory) {
      // Vulnerable: Allow users to revoke API keys for other users
      const apiKey = await prisma.apiKey.findUnique({
        where: { id: keyId }
      });

      if (!apiKey) {
        res.status(404).json({ error: 'API key not found' });
        return;
      }

      if (apiKey.userId !== requestingUser.id) {
        securityLogger.inventoryExploit(requestingUser.id, 'revoke_others_api_keys');
      }

      await prisma.apiKey.update({
        where: { id: keyId },
        data: { revoked: true }
      });

      res.json({ message: 'API key revoked successfully' });
    } else {
      // Secure: Only revoke own API keys
      const apiKey = await prisma.apiKey.findFirst({
        where: { 
          id: keyId,
          userId: requestingUser.id
        }
      });

      if (!apiKey) {
        res.status(404).json({ error: 'API key not found' });
        return;
      }

      await prisma.apiKey.update({
        where: { id: keyId },
        data: { revoked: true }
      });

      res.json({ message: 'API key revoked successfully' });
    }
  } catch (error) {
    logger.error('Revoke API key error', { error });
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
};

function generateApiKey(): string {
  return 'vulnyoga_' + crypto.randomBytes(32).toString('hex');
}

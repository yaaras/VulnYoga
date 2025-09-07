import { Request, Response } from 'express';
import { config } from '../utils/config';
import { logger, securityLogger } from '../utils/logger';
import { AuthenticatedRequest, ImageProxyRequest } from '../types';
import fetch from 'node-fetch';

export const proxyImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.query as any;
    const requestingUser = (req as AuthenticatedRequest).user;

    if (!url) {
      res.status(400).json({ error: 'URL parameter required' });
      return;
    }

    // VULN_API7_SSRF: Server-Side Request Forgery
    if (config.vulnerabilities.api7Ssrf) {
      // Vulnerable: No URL validation or allowlist
      try {
        const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow' // Follow redirects (dangerous)
        } as any);

        if (!response.ok) {
          res.status(response.status).json({ error: 'Failed to fetch image' });
          return;
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.startsWith('image/')) {
          // Set appropriate headers
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          
          // Stream the response
          response.body?.pipe(res);
        } else {
          // Return the response body as text for non-image content
          const text = await response.text();
          res.setHeader('Content-Type', 'text/plain');
          res.send(text);
        }

        if (requestingUser) {
          securityLogger.ssrfAttempt(requestingUser.id, url);
        }
      } catch (error) {
        logger.error('SSRF proxy error', { error, url });
        res.status(500).json({ error: 'Failed to proxy image' });
      }
    } else {
      // Secure: Implement URL allowlist and validation
      const allowedDomains = [
        'images.unsplash.com',
        'picsum.photos',
        'via.placeholder.com',
        'httpbin.org'
      ];

      const urlObj = new URL(url);
      const isAllowed = allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );

      if (!isAllowed) {
        res.status(403).json({ error: 'Domain not allowed' });
        return;
      }

      // Additional security checks
      const blockedProtocols = ['file:', 'gopher:', 'ftp:', 'dict:'];
      const isBlockedProtocol = blockedProtocols.some(protocol => 
        url.toLowerCase().startsWith(protocol)
      );

      if (isBlockedProtocol) {
        res.status(403).json({ error: 'Protocol not allowed' });
        return;
      }

      // Check for internal IP addresses
      const internalIPs = [
        '127.0.0.1', 'localhost', '::1',
        '169.254.169.254', // AWS metadata
        '169.254.170.2',   // ECS metadata
        '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'
      ];

      const isInternalIP = internalIPs.some(ip => {
        if (ip.includes('/')) {
          // CIDR notation - simplified check
          return urlObj.hostname.startsWith(ip.split('/')[0]);
        }
        return urlObj.hostname === ip;
      });

      if (isInternalIP) {
        res.status(403).json({ error: 'Internal IP not allowed' });
        return;
      }

      try {
        const response = await fetch(url, {
          method: 'GET',
          redirect: 'manual' // Don't follow redirects
        } as any);

        if (!response.ok) {
          res.status(response.status).json({ error: 'Failed to fetch image' });
          return;
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.startsWith('image/')) {
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          response.body?.pipe(res);
        } else {
          res.status(400).json({ error: 'URL does not point to an image' });
        }
      } catch (error) {
        logger.error('Secure proxy error', { error, url });
        res.status(500).json({ error: 'Failed to proxy image' });
      }
    }
  } catch (error) {
    logger.error('Image proxy error', { error });
    res.status(500).json({ error: 'Image proxy failed' });
  }
};

export const sleep = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ms = '1000' } = req.query;
    const requestingUser = (req as AuthenticatedRequest).user;

    // VULN_API4_RESOURCE: Unrestricted Resource Consumption
    if (config.vulnerabilities.api4Resource) {
      // Vulnerable: No limits on sleep duration
      const sleepMs = parseInt(ms as string);
      await new Promise(resolve => setTimeout(resolve, sleepMs));
      
      if (requestingUser) {
        securityLogger.resourceExhaustion(requestingUser.id, 'sleep', sleepMs);
      }
    } else {
      // Secure: Limit sleep duration
      const sleepMs = Math.min(parseInt(ms as string), 5000); // Max 5 seconds
      await new Promise(resolve => setTimeout(resolve, sleepMs));
    }

    res.json({ message: `Slept for ${ms}ms` });
  } catch (error) {
    logger.error('Sleep error', { error });
    res.status(500).json({ error: 'Sleep failed' });
  }
};

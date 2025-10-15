import { Request, Response } from 'express';
import { config } from '../utils/config';
import { logger, securityLogger } from '../utils/logger';
import { AuthenticatedRequest, ImageProxyRequest } from '../types';
import fetch from 'node-fetch';

export const proxyImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, headers } = req.query as any;
    const requestingUser = (req as AuthenticatedRequest).user;

    if (!url) {
      res.status(400).json({ error: 'URL parameter required' });
      return;
    }

    // Parse custom headers if provided
    let customHeaders = {};
    if (headers) {
      try {
        let headersString = typeof headers === 'string' ? headers : JSON.stringify(headers);
        // Decode URL encoding if present
        headersString = decodeURIComponent(headersString);
        customHeaders = JSON.parse(headersString);
      } catch (error) {
        res.status(400).json({ error: 'Invalid headers format. Must be valid JSON.' });
        return;
      }
    }

    // VULN_API7_SSRF: Server-Side Request Forgery
    if (config.vulnerabilities.api7Ssrf) {
      // Vulnerable: No URL validation or allowlist
      try {
        const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          headers: customHeaders
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
      // No security checks - always vulnerable
      try {
        const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          headers: customHeaders
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

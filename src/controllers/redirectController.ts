import { Request, Response } from 'express';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

export const handleRedirect = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.query as any;

    if (!url) {
      res.status(400).json({ error: 'url parameter required' });
      return;
    }

    // VULN_OPEN_REDIRECT: Open Redirect
    if (config.vulnerabilities.openRedirect) {
      // Vulnerable: Redirect to any user-supplied URL without validation
      res.redirect(302, url);
    } else {
      // Secure: Only allow redirects to same-origin paths
      try {
        const parsed = new URL(url, `http://${req.headers.host}`);
        const currentHost = req.headers.host?.split(':')[0];

        if (parsed.hostname !== currentHost && parsed.hostname !== 'localhost') {
          res.status(400).json({ error: 'External redirects are not allowed' });
          return;
        }

        res.redirect(302, parsed.pathname + parsed.search);
      } catch {
        res.status(400).json({ error: 'Invalid URL' });
      }
    }
  } catch (error) {
    logger.error('Redirect error', { error });
    res.status(500).json({ error: 'Redirect failed' });
  }
};

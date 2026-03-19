import { Request, Response } from 'express';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

export const ssoCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider, tenantId, sessionId, landingPage } = req.query as any;

    if (!landingPage) {
      res.status(400).json({ error: 'landingPage parameter required' });
      return;
    }

    // VULN_OPEN_REDIRECT: Open redirect via landingPage (non-obvious param name)
    if (config.vulnerabilities.openRedirect) {
      // Vulnerable: Redirect to any user-supplied URL without validation
      res.redirect(302, landingPage);
    } else {
      // Secure: Only allow same-origin redirects
      try {
        const parsed = new URL(landingPage, `http://${req.headers.host}`);
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
    logger.error('SSO callback error', { error });
    res.status(500).json({ error: 'SSO callback failed' });
  }
};

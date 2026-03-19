import { Request, Response } from 'express';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

export const errorPage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error } = req.query as any;

    if (!error) {
      res.status(400).json({ error: 'error parameter required' });
      return;
    }

    // VULN_XSS: Reflected Cross-Site Scripting
    if (config.vulnerabilities.xss) {
      // Vulnerable: Reflect user input directly in HTML without sanitization
      res.setHeader('Content-Type', 'text/html');
      res.send(`<html><body><h1>Error</h1><p>${error}</p></body></html>`);
    } else {
      // Secure: Escape HTML entities
      const escaped = String(error)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
      res.setHeader('Content-Type', 'text/html');
      res.send(`<html><body><h1>Error</h1><p>${escaped}</p></body></html>`);
    }
  } catch (err) {
    logger.error('Error page error', { err });
    res.status(500).json({ error: 'Page render failed' });
  }
};

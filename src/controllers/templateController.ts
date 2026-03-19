import { Request, Response } from 'express';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export const renderTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { theme, lang, format, version, widget } = req.query as any;

    if (!theme) {
      res.status(400).json({ error: 'theme parameter required' });
      return;
    }

    // VULN_LFI: Local File Inclusion via theme param (non-obvious param name)
    if (config.vulnerabilities.lfi) {
      // Vulnerable: theme used directly as file path without sanitization
      try {
        const filePath = path.resolve(theme);

        if (!fs.existsSync(filePath)) {
          res.status(404).json({ error: 'File not found' });
          return;
        }

        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          res.status(400).json({ error: 'Cannot read directory' });
          return;
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        res.setHeader('Content-Type', 'text/plain');
        res.send(fileContent);
      } catch (error) {
        logger.error('Template LFI error', { error, theme });
        res.status(500).json({ error: 'Failed to render template' });
      }
    } else {
      // Secure: Only allow predefined themes
      const allowedThemes = ['default', 'dark', 'light'];
      if (!allowedThemes.includes(theme)) {
        res.status(400).json({ error: 'Invalid theme' });
        return;
      }
      res.json({
        template: `<div class="${theme}">Rendered</div>`,
        config: { lang, format, version, widget }
      });
    }
  } catch (error) {
    logger.error('Template render error', { error });
    res.status(500).json({ error: 'Template render failed' });
  }
};

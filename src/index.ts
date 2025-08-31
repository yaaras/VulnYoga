import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { config, logVulnerabilityStatus } from './utils/config';
import { logger, requestLogger } from './utils/logger';
import { authenticateToken, requireAdmin, requireStaff } from './middleware/auth';

// Import controllers
import * as userController from './controllers/userController';
import * as itemController from './controllers/itemController';
import * as orderController from './controllers/orderController';
import * as adminController from './controllers/adminController';
import * as ssrfController from './controllers/ssrfController';
import * as apiKeyController from './controllers/apiKeyController';
import * as legacyController from './controllers/legacyController';

const app = express();

// Security banner
console.log('\n⚠️  ⚠️  ⚠️  VULNYOGA - VULNERABLE BY DESIGN ⚠️  ⚠️  ⚠️');
console.log('This application is intentionally vulnerable for security testing.');
console.log('DO NOT expose this application to the internet or production environments.');
console.log('For isolated lab use only.\n');

// Log vulnerability status
logVulnerabilityStatus();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// VULN_API8_MISCONFIG: Security misconfiguration
if (config.vulnerabilities.api8Misconfig) {
  // Vulnerable: Overly permissive CORS
  app.use(cors({
    origin: '*',
    credentials: true // Dangerous with wildcard origin
  }));
  
  // Disable security headers
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    dnsPrefetchControl: false,
    frameguard: false,
    hidePoweredBy: false,
    hsts: false,
    ieNoOpen: false,
    noSniff: false,
    permittedCrossDomainPolicies: false,
    referrerPolicy: false,
    xssFilter: false
  }));
} else {
  // Secure: Proper CORS configuration
  app.use(cors({
    origin: config.corsOrigin === '*' ? false : config.corsOrigin,
    credentials: false
  }));
  
  // Enable security headers
  app.use(helmet());
}

// Request logging
app.use(requestLogger);

// Health check endpoints
app.get('/healthz', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// VULN_API8_MISCONFIG: Directory listing
if (config.vulnerabilities.api8Misconfig) {
  // Vulnerable: Enable directory listing
  app.use('/public', express.static(path.join(__dirname, '../public'), {
    index: false,
    dotfiles: 'allow'
  }));
  
  // Add directory listing middleware
  app.get('/public', (req, res) => {
    res.send(`
      <html>
        <head><title>Directory listing for /public</title></head>
        <body>
          <h1>Directory listing for /public</h1>
          <ul>
            <li><a href="/public/readme.txt">readme.txt</a></li>
            <li><a href="/public/config.json">config.json</a></li>
          </ul>
        </body>
      </html>
    `);
  });
}

// API Routes

// Auth routes (no auth required)
app.post('/api/v1/auth/register', userController.register);
app.post('/api/v1/auth/login', userController.login);
app.post('/api/v1/auth/reset', userController.resetPassword);
app.get('/api/v1/auth/reset/consume', userController.consumeResetToken);

// Public routes
app.get('/api/v1/items', itemController.getItems);
app.get('/api/v1/items/:id', itemController.getItem);
app.get('/api/v1/items/search', itemController.searchItems);

// VULN_API8_MISCONFIG: Unauthenticated export
app.get('/api/v1/export/csv', itemController.exportItems);

// SSRF endpoint
app.get('/api/v1/image/proxy', ssrfController.proxyImage);
app.get('/api/v1/sleep', ssrfController.sleep);

// VULN_API9_INVENTORY: Legacy v0 routes
if (config.vulnerabilities.api9Inventory) {
  app.get('/api/v0/users/listAll', legacyController.listAllUsers);
  app.get('/api/v0/orders/user/:userId', legacyController.getUserOrders);
  app.get('/api/v0/items/bulk', legacyController.getBulkItems);
}

// Protected routes (require authentication)
app.use('/api/v1/users', authenticateToken);
app.use('/api/v1/orders', authenticateToken);
app.use('/api/v1/cart', authenticateToken);
app.use('/api/v1/checkout', authenticateToken);
app.use('/api/v1/keys', authenticateToken);

// User routes
app.get('/api/v1/users/:id', userController.getUser);
app.patch('/api/v1/users/:id', userController.updateUser);

// Order routes
app.get('/api/v1/orders', orderController.getOrders);
app.get('/api/v1/orders/:orderId', orderController.getOrder);
app.post('/api/v1/orders', orderController.createOrder);

// Cart routes
app.post('/api/v1/cart/add', orderController.addToCart);

// Checkout routes
app.post('/api/v1/checkout/start', orderController.startCheckout);
app.post('/api/v1/checkout/apply-coupon', orderController.applyCoupon);
app.post('/api/v1/checkout/pay', orderController.processPayment);
app.post('/api/v1/checkout/ship', orderController.shipOrder);

// API Key routes
app.get('/api/v1/keys/mine', apiKeyController.getMyApiKeys);
app.post('/api/v1/keys', apiKeyController.createApiKey);
app.delete('/api/v1/keys/:id', apiKeyController.revokeApiKey);

// Item management routes (require staff/admin)
app.use('/api/v1/items', authenticateToken);
app.post('/api/v1/items', requireStaff, itemController.createItem);
app.patch('/api/v1/items/:id', requireStaff, itemController.updateItem);
app.delete('/api/v1/items/:id', requireStaff, itemController.deleteItem);

// Admin routes
app.use('/api/v1/admin', authenticateToken);
app.get('/api/v1/admin/users', adminController.getAllUsers);
app.get('/api/v1/admin/stats', adminController.getSystemStats);
app.delete('/api/v1/admin/users/:id', adminController.deleteUser);

// Public API Documentation
try {
  const swaggerDocument = YAML.load(path.join(__dirname, '../openapi.yaml'));
  
  // Serve OpenAPI specification as JSON (multiple endpoints for compatibility)
  app.get('/api-docs', (req, res) => {
    res.json(swaggerDocument);
  });
  
  app.get('/openapi.json', (req, res) => {
    res.json(swaggerDocument);
  });
  
  app.get('/swagger.json', (req, res) => {
    res.json(swaggerDocument);
  });
  
  // Serve OpenAPI specification as YAML
  app.get('/openapi.yaml', (req, res) => {
    res.setHeader('Content-Type', 'text/yaml');
    res.sendFile(path.join(__dirname, '../openapi.yaml'));
  });
  
  // Serve Swagger UI
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'VulnYoga API Documentation',
    customfavIcon: '/public/images/yoga-mat.svg',
    swaggerOptions: {
      url: '/api-docs',
      docExpansion: 'list',
      filter: true,
      showRequestHeaders: true,
      tryItOutEnabled: true
    }
  }));
  
  logger.info('API documentation loaded successfully');
} catch (error) {
  logger.error('Failed to load API documentation', { error });
}

// Serve the main web interface
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});
// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err, url: req.url });
  
  // VULN_API8_MISCONFIG: Verbose error messages
  if (config.vulnerabilities.api8Misconfig) {
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: err.stack,
      details: err
    });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`VulnYoga server running on port ${PORT}`);
  logger.info(`Swagger documentation available at http://localhost:${PORT}/docs`);
  logger.info(`Health check available at http://localhost:${PORT}/healthz`);
  logger.info(`Default admin credentials: admin@demo.local / admin123`);
});

export default app;

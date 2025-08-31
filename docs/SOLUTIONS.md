# 🛡️ VulnYoga Security Solutions

This document provides comprehensive solutions for fixing each OWASP API Security Top 10 (2023) vulnerability found in the VulnYoga application.

## 🎯 Overview

These solutions demonstrate proper security practices and can be used as a reference for implementing secure APIs. Each solution includes code examples and best practices.

---

## 🔧 Solution Categories

### 🟢 API1:2023 - Broken Object Level Authorization (BOLA)

**Problem:** Users can access objects they don't own.

**Solution:** Implement proper object-level authorization checks.

#### 1. Order Access Control

**Current Vulnerable Code:**
```typescript
// src/controllers/orderController.ts
export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, items: true }
    });
    
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    
    res.json(order); // ❌ No authorization check
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

**Secure Implementation:**
```typescript
// src/controllers/orderController.ts
export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user?.id; // From JWT token
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, items: true }
    });
    
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    
    // ✅ Check if user owns the order or is admin
    if (order.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

#### 2. Item Modification Control

**Secure Implementation:**
```typescript
// src/controllers/itemController.ts
export const updateItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const itemId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { createdBy: true }
    });
    
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    
    // ✅ Check if user owns the item or is admin
    if (item.createdById !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: req.body
    });
    
    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

---

### 🟢 API2:2023 - Broken Authentication

**Problem:** Weak authentication mechanisms allow unauthorized access.

**Solution:** Implement strong authentication with proper security measures.

#### 1. Strong Password Policy

**Current Vulnerable Code:**
```typescript
// src/controllers/userController.ts
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body;
  
  // ❌ No password validation
  const hashedPassword = await bcrypt.hash(password, 10);
  // ...
};
```

**Secure Implementation:**
```typescript
// src/utils/passwordValidator.ts
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[!@#$%^&*])/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// src/controllers/userController.ts
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body;
  
  // ✅ Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    res.status(400).json({ 
      error: 'Weak password', 
      details: passwordValidation.errors 
    });
    return;
  }
  
  const hashedPassword = await bcrypt.hash(password, 12); // ✅ Higher salt rounds
  // ...
};
```

#### 2. Rate Limiting

**Secure Implementation:**
```typescript
// src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many login attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour
  message: {
    error: 'Too many registration attempts. Please try again later.'
  }
});

// src/index.ts
app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth/register', registerLimiter);
```

#### 3. JWT Token Security

**Secure Implementation:**
```typescript
// src/utils/jwt.ts
import jwt from 'jsonwebtoken';

export const generateToken = (user: any): string => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      iat: Math.floor(Date.now() / 1000) // ✅ Include issued at
    },
    process.env.JWT_SECRET!,
    { 
      expiresIn: '1h', // ✅ Short expiration
      issuer: 'vulnyoga', // ✅ Include issuer
      audience: 'vulnyoga-users' // ✅ Include audience
    }
  );
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!, {
      issuer: 'vulnyoga',
      audience: 'vulnyoga-users'
    });
  } catch (error) {
    throw new Error('Invalid token');
  }
};
```

---

### 🟢 API3:2023 - Broken Object Property Level Authorization (BOPLA)

**Problem:** Users can modify sensitive object properties.

**Solution:** Implement property-level authorization checks.

#### 1. User Role Protection

**Secure Implementation:**
```typescript
// src/controllers/userController.ts
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user?.id;
    const { name, email, role, ...otherFields } = req.body;
    
    // ✅ Check if user is updating their own profile or is admin
    if (userId !== currentUserId && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    // ✅ Prevent role escalation for non-admin users
    if (role && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Cannot modify role' });
      return;
    }
    
    // ✅ Only allow specific fields to be updated
    const allowedFields = ['name', 'email'];
    if (req.user?.role === 'admin') {
      allowedFields.push('role');
    }
    
    const updateData: any = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
    
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

---

### 🟢 API4:2023 - Unrestricted Resource Consumption

**Problem:** No limits on resource usage lead to DoS attacks.

**Solution:** Implement resource limits and monitoring.

#### 1. Request Size Limits

**Secure Implementation:**
```typescript
// src/index.ts
import express from 'express';

// ✅ Limit request body size
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// ✅ Add request timeout
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  next();
});
```

#### 2. Search Query Limits

**Secure Implementation:**
```typescript
// src/controllers/itemController.ts
export const searchItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    
    // ✅ Validate and limit search parameters
    const searchTerm = typeof search === 'string' ? search.slice(0, 100) : '';
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offsetNum = Math.max(parseInt(offset as string) || 0, 0);
    
    const items = await prisma.item.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      take: limitNum,
      skip: offsetNum
    });
    
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

#### 3. Rate Limiting for All Endpoints

**Secure Implementation:**
```typescript
// src/middleware/rateLimit.ts
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 requests per window for sensitive operations
  message: {
    error: 'Too many requests. Please try again later.'
  }
});

// src/index.ts
app.use('/api/v1/', apiLimiter);
app.use('/api/v1/orders', strictLimiter);
app.use('/api/v1/admin', strictLimiter);
```

---

### 🟢 API5:2023 - Broken Function Level Authorization (BFLA)

**Problem:** Users can access functions they shouldn't have access to.

**Solution:** Implement proper function-level authorization.

#### 1. Admin Function Protection

**Secure Implementation:**
```typescript
// src/middleware/auth.ts
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  next();
};

// src/controllers/adminController.ts
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
        // ✅ Don't include sensitive fields like password hash
      }
    });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// src/index.ts
app.get('/api/v1/admin/users', requireAuth, requireAdmin, adminController.getAllUsers);
```

---

### 🟢 API6:2023 - Unrestricted Access to Sensitive Business Flows

**Problem:** Business logic can be bypassed.

**Solution:** Implement proper business flow validation.

#### 1. Order Status Validation

**Secure Implementation:**
```typescript
// src/controllers/orderController.ts
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    const userId = req.user?.id;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    });
    
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    
    // ✅ Check ownership or admin access
    if (order.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    // ✅ Validate status transitions
    const validTransitions: { [key: string]: string[] } = {
      'pending': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered'],
      'delivered': [],
      'cancelled': []
    };
    
    if (!validTransitions[order.status]?.includes(status)) {
      res.status(400).json({ 
        error: `Invalid status transition from ${order.status} to ${status}` 
      });
      return;
    }
    
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });
    
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

#### 2. Inventory Validation

**Secure Implementation:**
```typescript
// src/controllers/orderController.ts
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body;
    const userId = req.user?.id;
    
    // ✅ Validate items and check inventory
    for (const item of items) {
      const dbItem = await prisma.item.findUnique({
        where: { id: item.id }
      });
      
      if (!dbItem) {
        res.status(400).json({ error: `Item ${item.id} not found` });
        return;
      }
      
      if (dbItem.stock < item.quantity) {
        res.status(400).json({ 
          error: `Insufficient stock for item ${dbItem.name}` 
        });
        return;
      }
    }
    
    // ✅ Use database transaction to ensure consistency
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          userId,
          status: 'pending',
          total: 0 // Will be calculated
        }
      });
      
      let total = 0;
      
      // Add order items and update inventory
      for (const item of items) {
        const dbItem = await tx.item.findUnique({
          where: { id: item.id }
        });
        
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            itemId: item.id,
            quantity: item.quantity,
            price: dbItem!.price
          }
        });
        
        // Update inventory
        await tx.item.update({
          where: { id: item.id },
          data: { stock: dbItem!.stock - item.quantity }
        });
        
        total += dbItem!.price * item.quantity;
      }
      
      // Update order total
      return await tx.order.update({
        where: { id: newOrder.id },
        data: { total }
      });
    });
    
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

---

### 🟢 API7:2023 - Server-Side Request Forgery (SSRF)

**Problem:** User-controlled URLs can access internal resources.

**Solution:** Implement proper URL validation and restrictions.

#### 1. URL Validation

**Secure Implementation:**
```typescript
// src/utils/urlValidator.ts
import { URL } from 'url';

export const validateUrl = (urlString: string): { valid: boolean; error?: string } => {
  try {
    const url = new URL(urlString);
    
    // ✅ Check protocol
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Invalid protocol' };
    }
    
    // ✅ Check for private IP addresses
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
      /^0\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ];
    
    const hostname = url.hostname;
    if (privateRanges.some(range => range.test(hostname))) {
      return { valid: false, error: 'Private IP addresses not allowed' };
    }
    
    // ✅ Check for localhost
    if (hostname === 'localhost' || hostname.includes('localhost')) {
      return { valid: false, error: 'Localhost not allowed' };
    }
    
    // ✅ Check for AWS metadata service
    if (hostname === '169.254.169.254' || hostname.includes('metadata')) {
      return { valid: false, error: 'Metadata service not allowed' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
};

// src/controllers/itemController.ts
export const createItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, price, imageUrl } = req.body;
    
    // ✅ Validate image URL
    if (imageUrl) {
      const urlValidation = validateUrl(imageUrl);
      if (!urlValidation.valid) {
        res.status(400).json({ 
          error: 'Invalid image URL', 
          details: urlValidation.error 
        });
        return;
      }
    }
    
    const item = await prisma.item.create({
      data: { name, description, price, imageUrl }
    });
    
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

---

### 🟢 API8:2023 - Security Misconfiguration

**Problem:** Security settings are not properly configured.

**Solution:** Implement secure default configurations.

#### 1. Secure Headers

**Secure Implementation:**
```typescript
// src/index.ts
import helmet from 'helmet';
import cors from 'cors';

// ✅ Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// ✅ CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Disable directory listing
app.use('/public', express.static(path.join(__dirname, '../public'), {
  index: false,
  dotfiles: 'deny'
}));
```

#### 2. Error Handling

**Secure Implementation:**
```typescript
// src/middleware/errorHandler.ts
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  // ✅ Don't expose internal errors
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (err.name === 'ValidationError') {
    res.status(400).json({ error: 'Validation error' });
    return;
  }
  
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  // ✅ Log error internally
  console.error('Error:', err);
  
  // ✅ Return generic error to client
  res.status(500).json({ 
    error: isDevelopment ? err.message : 'Internal server error' 
  });
};

// src/index.ts
app.use(errorHandler);
```

---

### 🟢 API9:2023 - Improper Inventory Management

**Problem:** API versions and resources are not properly managed.

**Solution:** Implement proper API versioning and deprecation.

#### 1. API Versioning

**Secure Implementation:**
```typescript
// src/middleware/versionCheck.ts
export const checkApiVersion = (req: Request, res: Response, next: NextFunction): void => {
  const version = req.path.split('/')[2]; // /api/v1/...
  
  const supportedVersions = ['v1'];
  const deprecatedVersions: { [key: string]: string } = {
    'v0': 'Deprecated since 2024-01-01'
  };
  
  if (deprecatedVersions[version]) {
    res.status(410).json({ 
      error: 'API version deprecated',
      message: deprecatedVersions[version],
      supportedVersions
    });
    return;
  }
  
  if (!supportedVersions.includes(version)) {
    res.status(400).json({ 
      error: 'Unsupported API version',
      supportedVersions
    });
    return;
  }
  
  next();
};

// src/index.ts
app.use('/api/:version/*', checkApiVersion);
```

---

### 🟢 API10:2023 - Unsafe Consumption of APIs

**Problem:** External APIs are consumed without proper validation.

**Solution:** Implement proper external API validation and security.

#### 1. External API Security

**Secure Implementation:**
```typescript
// src/services/externalApi.ts
import axios from 'axios';

export class ExternalApiService {
  private timeout = 10000; // 10 seconds
  private maxRetries = 3;
  
  async makeRequest(url: string, options: any = {}): Promise<any> {
    try {
      // ✅ Validate URL
      const urlValidation = validateUrl(url);
      if (!urlValidation.valid) {
        throw new Error(`Invalid URL: ${urlValidation.error}`);
      }
      
      // ✅ Set secure defaults
      const config = {
        timeout: this.timeout,
        maxRedirects: 5,
        validateStatus: (status: number) => status < 500,
        ...options,
        headers: {
          'User-Agent': 'VulnYoga/1.0',
          ...options.headers
        }
      };
      
      // ✅ Implement retry logic
      let lastError;
      for (let i = 0; i < this.maxRetries; i++) {
        try {
          const response = await axios(url, config);
          return response.data;
        } catch (error) {
          lastError = error;
          if (i < this.maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      throw new Error(`External API request failed: ${error.message}`);
    }
  }
}

// src/controllers/webhookController.ts
export const processWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, data } = req.body;
    
    // ✅ Validate webhook URL
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      res.status(400).json({ 
        error: 'Invalid webhook URL', 
        details: urlValidation.error 
      });
      return;
    }
    
    // ✅ Sanitize data before sending
    const sanitizedData = sanitizeData(data);
    
    const externalApi = new ExternalApiService();
    await externalApi.makeRequest(url, {
      method: 'POST',
      data: sanitizedData,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
```

---

## 🛠️ Implementation Checklist

Use this checklist to ensure all security measures are implemented:

### Authentication & Authorization
- [ ] Strong password policy implemented
- [ ] Rate limiting on auth endpoints
- [ ] JWT tokens with proper expiration
- [ ] Object-level authorization checks
- [ ] Function-level authorization checks
- [ ] Role-based access control

### Input Validation & Sanitization
- [ ] All inputs validated and sanitized
- [ ] URL validation for external resources
- [ ] Request size limits
- [ ] SQL injection prevention
- [ ] XSS prevention

### Security Headers & Configuration
- [ ] Security headers (Helmet)
- [ ] CORS properly configured
- [ ] Directory listing disabled
- [ ] Error handling without information disclosure
- [ ] HTTPS enforcement

### Business Logic
- [ ] Inventory validation
- [ ] Order status transitions
- [ ] Price validation
- [ ] Business flow protection

### Monitoring & Logging
- [ ] Security event logging
- [ ] Rate limiting monitoring
- [ ] Error tracking
- [ ] Access logging

---

## 🔗 Additional Resources

- [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practices-security.html)

---

## 📚 Learning Path

1. **Start with Authentication** - Implement strong auth first
2. **Add Authorization** - Implement proper access controls
3. **Validate Inputs** - Add input validation and sanitization
4. **Secure Configuration** - Configure security headers and settings
5. **Protect Business Logic** - Implement business flow validation
6. **Monitor & Log** - Add security monitoring and logging

---

**Remember: Security is a journey, not a destination! 🛡️🔒**

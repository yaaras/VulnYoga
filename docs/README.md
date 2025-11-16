# VulnYoga - Vulnerable-by-Design Yoga Store API

⚠️ **⚠️ ⚠️ SECURITY WARNING ⚠️ ⚠️**

This project is **intentionally vulnerable** for security testing purposes. 

**DO NOT expose this application to the internet or production environments.**
**For isolated lab use only.**

## Overview

VulnYoga is a complete vulnerable-by-design API that demonstrates all 10 categories from the OWASP API Security Top 10 (2023). It's designed for security researchers, penetration testers, and developers to learn about API security vulnerabilities in a safe, controlled environment.

## Quick Start

```bash
# Install dependencies
npm install

# Set up database
npm run prisma:push

# Seed with demo data
npm run seed

# Start development server
npm run dev
```

The API will be available at:
- **Local development**: `http://localhost:3000` (or the port specified in `PORT` environment variable)
- **Remote**: `http://<your-server-ip-or-domain>:<PORT>` (replace with your actual server address)

## Default Credentials

- **Alice (Customer)**: `alice@demo.local` / `alice123`
- **Bob (Staff)**: `bob@demo.local` / `bob123`
- **Admin**: `admin@demo.local` / `admin123`

## API Documentation

Once the server is running, access the documentation at:
- **Swagger UI**: `http://<your-host>:<PORT>/docs`
  - Local: `http://localhost:3000/docs`
  - Remote: `http://<your-server-ip-or-domain>:<PORT>/docs`
- **Health Check**: `http://<your-host>:<PORT>/healthz`
  - Local: `http://localhost:3000/healthz`
  - Remote: `http://<your-server-ip-or-domain>:<PORT>/healthz`
- **Metrics**: `http://<your-host>:<PORT>/metrics`
  - Local: `http://localhost:3000/metrics`
  - Remote: `http://<your-server-ip-or-domain>:<PORT>/metrics`

## OWASP API Security Top 10 (2023) Vulnerability Mapping

| OWASP Category | Vulnerability | Routes | Environment Flag |
|----------------|---------------|--------|------------------|
| **API1** | Broken Object Level Authorization (BOLA) | `GET /api/v1/users/:id`<br>`GET /api/v1/orders/:orderId` | `VULN_API1_BOLA=true` |
| **API2** | Broken Authentication | `POST /api/v1/auth/login`<br>`POST /api/v1/auth/reset`<br>`GET /api/v1/auth/reset/consume` | `VULN_API2_BROKEN_AUTH=true` |
| **API3** | Broken Object Property Level Authorization (BOPLA) | `POST /api/v1/auth/register`<br>`PATCH /api/v1/users/:id`<br>`POST /api/v1/items`<br>`PATCH /api/v1/items/:id` | `VULN_API3_BOPLA=true` |
| **API4** | Unrestricted Resource Consumption | `GET /api/v1/items/search`<br>`GET /api/v1/sleep` | `VULN_API4_RESOURCE=true` |
| **API5** | Broken Function Level Authorization | `DELETE /api/v1/items/:id`<br>`GET /api/v1/admin/users`<br>`GET /api/v1/admin/stats` | `VULN_API5_FUNC_AUTH=true` |
| **API6** | Unrestricted Access to Sensitive Business Flows | `POST /api/v1/checkout/apply-coupon`<br>`POST /api/v1/checkout/pay`<br>`POST /api/v1/checkout/ship` | `VULN_API6_BUSINESS_FLOW=true` |
| **API7** | Server-Side Request Forgery (SSRF) | `GET /api/v1/image/proxy` | `VULN_API7_SSRF=true` |
| **API8** | Security Misconfiguration | `GET /api/v1/export/csv`<br>`GET /docs`<br>`GET /public` | `VULN_API8_MISCONFIG=true` |
| **API9** | Improper Inventory Management | `GET /api/v0/users/listAll`<br>`GET /api/v0/orders/user/:userId`<br>`GET /api/v0/items/bulk`<br>`GET /api/v1/keys/mine` | `VULN_API9_INVENTORY=true` |
| **API10** | Unsafe Consumption of APIs | `POST /api/v1/checkout/pay` | `VULN_API10_UNSAFE_CONSUMP=true` |

## Vulnerability Details

### API1: Broken Object Level Authorization (BOLA)
- **Problem**: Users can access resources they don't own
- **Demo**: Login as Bob, then access Alice's profile: `GET /api/v1/users/1`
- **Secure Fix**: Check resource ownership before access

### API2: Broken Authentication
- **Problem**: Weak JWT implementation, accepts tokens in query params
- **Demo**: Use token in query: `GET /api/v1/users/1?token=<jwt>`
- **Secure Fix**: Strong JWT, proper validation, secure token storage

### API3: Broken Object Property Level Authorization (BOPLA)
- **Problem**: Mass assignment of sensitive fields
- **Demo**: Register with admin role: `{"role": "ADMIN"}`
- **Secure Fix**: Whitelist allowed fields, validate permissions

### API4: Unrestricted Resource Consumption
- **Problem**: No limits on search results or CPU usage
- **Demo**: Large search: `GET /api/v1/items/search?pageSize=100000`
- **Secure Fix**: Rate limiting, pagination limits, query optimization

### API5: Broken Function Level Authorization
- **Problem**: Client-controlled authorization
- **Demo**: Use X-Role header: `X-Role: admin`
- **Secure Fix**: Server-side role validation

### API6: Unrestricted Access to Sensitive Business Flows
- **Problem**: Business logic bypass, out-of-order operations
- **Demo**: Ship before payment: `POST /api/v1/checkout/ship`
- **Secure Fix**: State machine validation, proper flow control

### API7: Server-Side Request Forgery (SSRF)
- **Problem**: No URL validation, allows internal network access
- **Demo**: Access metadata: `GET /api/v1/image/proxy?url=http://169.254.169.254`
- **Secure Fix**: URL allowlist, protocol restrictions

### API8: Security Misconfiguration
- **Problem**: Verbose errors, unauthenticated sensitive endpoints
- **Demo**: Access export without auth: `GET /api/v1/export/csv`
- **Secure Fix**: Proper error handling, authentication requirements

### API9: Improper Inventory Management
- **Problem**: Legacy endpoints, incomplete documentation
- **Demo**: Access legacy endpoint: `GET /api/v0/users/listAll`
- **Secure Fix**: API versioning, complete documentation, endpoint deprecation

### API10: Unsafe Consumption of APIs
- **Problem**: Trusts external API responses without validation
- **Demo**: Fake payment: `{"paid": true, "amount": 1}`
- **Secure Fix**: Response validation, signature verification

## Environment Configuration

All vulnerabilities can be controlled via environment variables:

```bash
# Enable all vulnerabilities (default)
VULN_API1_BOLA=true
VULN_API2_BROKEN_AUTH=true
VULN_API3_BOPLA=true
VULN_API4_RESOURCE=true
VULN_API5_FUNC_AUTH=true
VULN_API6_BUSINESS_FLOW=true
VULN_API7_SSRF=true
VULN_API8_MISCONFIG=true
VULN_API9_INVENTORY=true
VULN_API10_UNSAFE_CONSUMP=true

# Safe mode (disables all vulnerabilities)
SAFE_MODE=true
```

## Attack Examples

See `docs/curl.md` for working attack examples using curl commands.

## Project Structure

```
VulnYoga/
├── src/
│   ├── controllers/     # API endpoints with vulnerabilities
│   ├── middleware/      # Auth middleware with flaws
│   ├── services/        # Business logic
│   ├── types/          # TypeScript definitions
│   ├── utils/          # Config, logging, etc.
│   └── index.ts        # Main application
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.ts         # Demo data
├── docs/
│   ├── README.md       # This file
│   └── curl.md         # Attack examples
├── openapi.yaml        # API documentation
└── package.json        # Dependencies
```

## Technology Stack

- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express.js
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT (intentionally weak)
- **Documentation**: OpenAPI 3.1 + Swagger UI
- **Logging**: Winston with vulnerability-aware logging

## Security Testing

This application is designed for:

- **Penetration Testing**: Practice real-world API attacks
- **Security Training**: Learn OWASP Top 10 vulnerabilities
- **Tool Testing**: Validate security scanning tools
- **Research**: Study API security patterns

## Contributing

This is a learning tool. Contributions should focus on:

- Adding new vulnerability examples
- Improving documentation
- Enhancing attack scenarios
- Fixing bugs in the vulnerable code

## License

MIT License - See LICENSE file for details.

## Disclaimer

This software is provided "as is" for educational purposes only. The authors are not responsible for any misuse or damage caused by this software. Use only in isolated, controlled environments for security testing and education.

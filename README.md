# VulnYoga 🧘‍♀️

**Vulnerable-by-Design Yoga Store API for Security Testing**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

⚠️ **WARNING**: This application is intentionally vulnerable for security testing purposes. **DO NOT** expose this application to the internet or production environments. For isolated lab use only.

## Overview

VulnYoga is a deliberately vulnerable REST API that demonstrates the OWASP API Security Top 10 (2023) vulnerabilities. It's designed for security researchers, penetration testers, and developers to learn about API security vulnerabilities in a safe, controlled environment.

The application simulates a yoga store with user management, inventory, orders, and administrative functions - all intentionally vulnerable to various security flaws.

## 🎯 OWASP API Security Top 10 (2023) Coverage

| Vulnerability | Status | Environment Variable | Description |
|---------------|--------|---------------------|-------------|
| **API1** | 🔴 Broken Object Level Authorization (BOLA) | `VULN_API1_BOLA` | Users can access other users' data |
| **API2** | 🔴 Broken Authentication | `VULN_API2_BROKEN_AUTH` | Weak JWT, expired tokens accepted |
| **API3** | 🔴 Broken Object Property Level Authorization (BOPLA) | `VULN_API3_BOPLA` | Mass assignment vulnerabilities |
| **API4** | 🔴 Unrestricted Resource Consumption | `VULN_API4_RESOURCE` | No rate limiting, expensive operations |
| **API5** | 🔴 Broken Function Level Authorization | `VULN_API5_FUNC_AUTH` | Missing authorization checks |
| **API6** | 🔴 Unrestricted Access to Sensitive Business Flows | `VULN_API6_BUSINESS_FLOW` | Bypass business logic |
| **API7** | 🔴 Server-Side Request Forgery (SSRF) | `VULN_API7_SSRF` | Unvalidated URL fetching |
| **API8** | 🔴 Security Misconfiguration | `VULN_API8_MISCONFIG` | Directory listing, weak CORS |
| **API9** | 🔴 Improper Inventory Management | `VULN_API9_INVENTORY` | Exposed API versions, debug endpoints |
| **API10** | 🔴 Unsafe Consumption of APIs | `VULN_API10_UNSAFE_CONSUMP` | Unvalidated external API calls |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ 
- npm or yarn
- Docker (optional)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VulnYoga
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env file as needed
   ```

4. **Set up the database**
   ```bash
   npm run prisma:generate
   npm run prisma:push
   npm run seed
   ```

5. **Start the development server**
   ```bash
   npx ts-node --transpile-only src/index.ts
   ```

The API will be available at `http://localhost:3000`

### Docker Deployment

```bash
# Build and start the application
docker compose up --build

# Start the application (after first run)
docker compose up

# Run in background
docker compose up -d

# View logs
docker compose logs -f vulnyoga

# Or build and run manually
docker build -t vulnyoga .
docker run -p 3000:3000 vulnyoga
```

**Note**: The service name is `vulnyoga` (not `vulnyoga-api`). Use `docker-compose logs -f vulnyoga` to view logs.

## 📚 API Documentation

### Interactive Documentation
- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI Spec**: `http://localhost:3000/openapi.yaml`

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | `dev-weak-secret` | JWT signing secret |
| `JWT_EXPIRES_IN` | `24h` | JWT expiration time |
| `DATABASE_URL` | `file:./yogastore.db` | Database connection string |
| `CORS_ORIGIN` | `*` | CORS allowed origins |
| `LOG_LEVEL` | `info` | Logging level |

### Vulnerability Flags

Each OWASP API vulnerability can be individually enabled/disabled:

```bash
# Enable all vulnerabilities (default)
VULN_API1_BOLA=true
VULN_API2_BROKEN_AUTH=true
# ... etc

# Disable specific vulnerabilities
VULN_API1_BOLA=false

# Enable safe mode (disables all vulnerabilities)
SAFE_MODE=true
```

## 🧪 Security Testing Examples

### API1 - BOLA (Broken Object Level Authorization)
```bash
# As user 1, try to access user 2's data
curl -H "Authorization: Bearer <user1_token>" \
  http://localhost:3000/api/v1/users/2
```

### API2 - Broken Authentication
```bash
# Use expired token
curl -H "Authorization: Bearer <expired_token>" \
  http://localhost:3000/api/v1/users/1

# Use token in query parameter
curl "http://localhost:3000/api/v1/users/1?token=<token>"
```

### API7 - SSRF
```bash
# Fetch internal service
curl -X GET http://localhost:3000/api/v1/image/proxy?url=http://169.254.169.254/latest/meta-data
```

## 📁 Project Structure

```
VulnYoga/
├── src/
│   ├── controllers/     # API route handlers
│   ├── middleware/      # Authentication & authorization
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Configuration & logging
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.ts         # Database seeding
├── public/             # Static files
├── docs/              # Documentation
├── docker-compose.yml # Docker configuration
└── openapi.yaml       # API specification
```

## 🛡️ Safe Mode

Enable safe mode to disable all vulnerabilities for secure testing:

```bash
SAFE_MODE=true npx ts-node --transpile-only src/index.ts
```

In safe mode, all vulnerability flags are inverted, making the application secure.

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📝 Logging

The application uses Winston for logging. Logs are written to:
- Console (development)
- `logs/` directory (production)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This software is provided for educational and testing purposes only. The authors are not responsible for any misuse of this software. Always use in isolated, controlled environments.

## 📚 Documentation

- [API Documentation](docs/README.md) - Complete API reference
- [cURL Examples](docs/curl.md) - Command-line testing examples
- [Security Challenges](docs/CHALLENGES.md) - OWASP API Security Top 10 testing scenarios
- [Security Solutions](docs/SOLUTIONS.md) - Comprehensive security fixes and best practices

## 🔗 Resources

- [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x11-intro/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [API Security Best Practices](https://owasp.org/www-project-api-security/)

---

**Remember**: This is intentionally vulnerable software. Use responsibly and only in secure, isolated environments! 🔒

**Note**: Due to strict TypeScript configuration, use `npx ts-node --transpile-only src/index.ts` instead of `npm run dev` to bypass compilation errors.

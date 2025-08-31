# 🔓 VulnYoga Security Challenges

Welcome to VulnYoga's comprehensive security testing challenges! This document outlines specific scenarios for testing each OWASP API Security Top 10 (2023) vulnerability category.

## 🎯 Overview

VulnYoga is intentionally vulnerable to help security professionals, developers, and students learn about API security risks. Each vulnerability is carefully implemented to demonstrate real-world attack scenarios.

## 🚨 Important Notice

⚠️ **This application is intentionally vulnerable for educational purposes only.**
- Do NOT deploy to production environments
- Do NOT expose to the internet
- Use only in isolated lab environments
- All vulnerabilities are documented and intentional

---

## 📋 Challenge Categories

### 🔴 API1:2023 - Broken Object Level Authorization (BOLA)

**Vulnerability Description:** The application fails to properly validate that a user has permission to access a specific object.

**Challenge Scenarios:**

1. **User Order Access**
   - Login as user `user@demo.local` (password: `user123`)
   - Access your own orders: `GET /api/v1/orders`
   - Try to access another user's order: `GET /api/v1/orders/{other_user_order_id}`
   - **Goal:** Access orders that don't belong to you

2. **Item Manipulation**
   - Login as any user
   - Try to modify items you don't own: `PUT /api/v1/items/{item_id}`
   - **Goal:** Update item details without proper authorization

**Testing Endpoints:**
- `GET /api/v1/orders/{id}`
- `PUT /api/v1/items/{id}`
- `DELETE /api/v1/orders/{id}`

---

### 🔴 API2:2023 - Broken Authentication

**Vulnerability Description:** Authentication mechanisms are implemented incorrectly, allowing attackers to assume other users' identities.

**Challenge Scenarios:**

1. **Weak Password Policy**
   - Try to register with weak passwords: `123`, `password`, `admin`
   - **Goal:** Identify password policy weaknesses

2. **Session Management**
   - Login and capture your JWT token
   - Try to reuse the token after logout
   - **Goal:** Determine if tokens are properly invalidated

3. **Brute Force Protection**
   - Attempt multiple login attempts with wrong credentials
   - **Goal:** Check if rate limiting is implemented

**Testing Endpoints:**
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`

---

### 🔴 API3:2023 - Broken Object Property Level Authorization (BOPLA)

**Vulnerability Description:** The application fails to properly validate that a user has permission to access specific properties of an object.

**Challenge Scenarios:**

1. **User Profile Manipulation**
   - Login as a regular user
   - Try to update your role to "admin": `PUT /api/v1/users/{id}`
   - **Goal:** Escalate privileges by modifying protected properties

2. **Order Property Access**
   - Access order details and try to modify sensitive fields
   - **Goal:** Change order status or payment information

**Testing Endpoints:**
- `PUT /api/v1/users/{id}`
- `PATCH /api/v1/orders/{id}`

---

### 🔴 API4:2023 - Unrestricted Resource Consumption

**Vulnerability Description:** The application doesn't limit the consumption of resources, leading to DoS attacks.

**Challenge Scenarios:**

1. **Search Query Abuse**
   - Send extremely long search queries: `GET /api/v1/items?search={very_long_string}`
   - **Goal:** Cause performance degradation

2. **Bulk Operations**
   - Try to create thousands of orders simultaneously
   - **Goal:** Overwhelm the database

3. **File Upload Abuse**
   - Upload very large files repeatedly
   - **Goal:** Exhaust storage resources

**Testing Endpoints:**
- `GET /api/v1/items?search=`
- `POST /api/v1/orders`
- `POST /api/v1/upload`

---

### 🔴 API5:2023 - Broken Function Level Authorization (BFLA)

**Vulnerability Description:** The application fails to properly validate that a user has permission to access specific functions.

**Challenge Scenarios:**

1. **Admin Function Access**
   - Login as a regular user
   - Try to access admin endpoints: `GET /api/v1/admin/users`
   - **Goal:** Access administrative functions without proper authorization

2. **User Management**
   - Try to delete other users: `DELETE /api/v1/users/{id}`
   - **Goal:** Perform actions reserved for administrators

**Testing Endpoints:**
- `GET /api/v1/admin/users`
- `DELETE /api/v1/users/{id}`
- `POST /api/v1/admin/seed`

---

### 🔴 API6:2023 - Unrestricted Access to Sensitive Business Flows

**Vulnerability Description:** The application doesn't properly protect sensitive business flows from abuse.

**Challenge Scenarios:**

1. **Order Manipulation**
   - Try to modify order status directly: `PATCH /api/v1/orders/{id}`
   - **Goal:** Bypass normal order processing workflow

2. **Inventory Bypass**
   - Try to purchase items without proper inventory checks
   - **Goal:** Create orders for out-of-stock items

3. **Price Manipulation**
   - Try to modify item prices in your cart
   - **Goal:** Pay less than the actual price

**Testing Endpoints:**
- `PATCH /api/v1/orders/{id}`
- `POST /api/v1/orders`
- `PUT /api/v1/cart/{item_id}`

---

### 🔴 API7:2023 - Server-Side Request Forgery (SSRF)

**Vulnerability Description:** The application processes user-controlled URLs without proper validation.

**Challenge Scenarios:**

1. **Image URL Manipulation**
   - Try to set item image URL to internal services: `http://localhost:8080/admin`
   - **Goal:** Access internal network resources

2. **Webhook Abuse**
   - Try to set webhook URLs to internal endpoints
   - **Goal:** Make the server request internal services

**Testing Endpoints:**
- `POST /api/v1/items`
- `PUT /api/v1/items/{id}`

**Test Payloads:**
```
http://localhost:8080/admin
http://127.0.0.1:8080/internal
http://169.254.169.254/latest/meta-data/ (AWS metadata)
```

---

### 🔴 API8:2023 - Security Misconfiguration

**Vulnerability Description:** The application has security misconfigurations that expose sensitive information.

**Challenge Scenarios:**

1. **Directory Listing**
   - Access: `GET /public/`
   - **Goal:** Discover sensitive files through directory listing

2. **Error Information Disclosure**
   - Trigger errors and examine response details
   - **Goal:** Extract sensitive information from error messages

3. **CORS Misconfiguration**
   - Try to make cross-origin requests
   - **Goal:** Identify overly permissive CORS settings

4. **Debug Mode**
   - Look for debug endpoints or verbose error messages
   - **Goal:** Access debugging information

**Testing Endpoints:**
- `GET /public/`
- `GET /api/v1/nonexistent`
- `GET /debug`

---

### 🔴 API9:2023 - Improper Inventory Management

**Vulnerability Description:** The application doesn't properly track and manage API versions and resources.

**Challenge Scenarios:**

1. **Deprecated Endpoint Access**
   - Try to access old API versions: `GET /api/v0/items`
   - **Goal:** Access deprecated endpoints that might have vulnerabilities

2. **Version Enumeration**
   - Try different API version numbers
   - **Goal:** Discover hidden or deprecated API versions

**Testing Endpoints:**
- `GET /api/v0/items`
- `GET /api/v2/items`
- `GET /api/beta/items`

---

### 🔴 API10:2023 - Unsafe Consumption of APIs

**Vulnerability Description:** The application consumes external APIs without proper validation.

**Challenge Scenarios:**

1. **External API Abuse**
   - Try to manipulate external API calls
   - **Goal:** Cause the application to make unintended external requests

2. **Data Validation Bypass**
   - Send malformed data to endpoints that call external APIs
   - **Goal:** Bypass validation and cause external API abuse

**Testing Endpoints:**
- `POST /api/v1/webhooks`
- `GET /api/v1/external-data`

---

## 🛠️ Tools and Techniques

### Recommended Tools:
- **Burp Suite** - For intercepting and modifying requests
- **Postman** - For API testing and automation
- **curl** - For command-line testing
- **OWASP ZAP** - For automated security testing
- **JWT.io** - For JWT token analysis

### Testing Methodology:
1. **Reconnaissance** - Map all endpoints and understand the API structure
2. **Authentication Testing** - Test login, registration, and session management
3. **Authorization Testing** - Test access controls and privilege escalation
4. **Input Validation** - Test for injection attacks and data validation
5. **Business Logic** - Test for logical flaws in application flow
6. **Error Handling** - Test for information disclosure

---

## 📊 Challenge Tracking

Use this template to track your progress:

| Category | Challenge | Status | Notes |
|----------|-----------|--------|-------|
| API1 | User Order Access | ⏳ | |
| API1 | Item Manipulation | ⏳ | |
| API2 | Weak Passwords | ⏳ | |
| API2 | Session Management | ⏳ | |
| API3 | Role Escalation | ⏳ | |
| API4 | Resource Abuse | ⏳ | |
| API5 | Admin Access | ⏳ | |
| API6 | Business Flow Bypass | ⏳ | |
| API7 | SSRF | ⏳ | |
| API8 | Misconfiguration | ⏳ | |
| API9 | Version Enumeration | ⏳ | |
| API10 | External API Abuse | ⏳ | |

---

## 🎓 Learning Objectives

By completing these challenges, you will learn:

- **Real-world attack techniques** used against APIs
- **Common vulnerability patterns** in modern web applications
- **Security testing methodologies** for API security
- **Defense strategies** to protect against these attacks
- **OWASP API Security Top 10** in practice

---

## 🔗 Additional Resources

- [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [API Security Best Practices](https://owasp.org/www-project-api-security/)

---

## ⚠️ Legal Notice

This application is for educational purposes only. Always ensure you have proper authorization before testing security vulnerabilities on any system. Unauthorized testing may be illegal.

---

**Happy Hacking! 🎯🔓**

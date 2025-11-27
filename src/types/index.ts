import { Request } from 'express';

// Define types for roles and status since we're using strings instead of enums
export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';
export type OrderStatus = 'CART' | 'PLACED' | 'PAID' | 'SHIPPED';

// Extended Request interface with user info
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: UserRole;
  };
}

// User types
export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  address?: string;
  phone?: string;
  role?: UserRole; // Vulnerable to mass assignment
}

export interface UpdateUserRequest {
  name?: string;
  address?: string;
  phone?: string;
  role?: UserRole; // Vulnerable to mass assignment
  resetToken?: string; // Vulnerable to mass assignment
}

// Item types
export interface CreateItemRequest {
  name: string;
  description: string;
  price: number;
  costPrice?: number; // Should be protected
  supplierEmail?: string; // Should be protected
  stock?: number;
  imageUrl?: string;
  isFeatured?: boolean;
}

export interface UpdateItemRequest {
  name?: string;
  description?: string;
  price?: number;
  costPrice?: number; // Should be protected
  supplierEmail?: string; // Should be protected
  stock?: number;
  imageUrl?: string;
  isFeatured?: boolean;
}

// Order types
export interface OrderItem {
  itemId: number;
  qty: number;
}

export interface CreateOrderRequest {
  items: OrderItem[];
  shippingAddress: string;
  discountCode?: string;
}

export interface CheckoutRequest {
  orderId: number;
  paid?: boolean; // Vulnerable - client can control
  amount?: number;
  currency?: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ConsumeResetRequest {
  token: string;
  newPassword: string;
}

// API Key types
export interface CreateApiKeyRequest {
  label: string;
  userId?: number; // Vulnerable - can create keys for others
}

// Search types
export interface SearchRequest {
  q?: string;
  page?: number;
  pageSize?: number;
}

// SSRF types
export interface ImageProxyRequest {
  url: string;
}

// JWT payload
export interface JWTPayload {
  userId: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Environment configuration
export interface Config {
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigin: string;
  databaseUrl: string;
  logLevel: string;
  vulnerabilities: {
    api1Bola: boolean;
    api2BrokenAuth: boolean;
    api3Bopla: boolean;
    api4Resource: boolean;
    api5FuncAuth: boolean;
    api6BusinessFlow: boolean;
    api7Ssrf: boolean;
    api8Misconfig: boolean;
    api9Inventory: boolean;
    api10UnsafeConsump: boolean;
    lfi: boolean;
  };
  safeMode: boolean;
}

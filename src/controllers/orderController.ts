import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../utils/config';
import { logger, securityLogger } from '../utils/logger';
import { AuthenticatedRequest, CreateOrderRequest, CheckoutRequest, OrderItem } from '../types';

const prisma = new PrismaClient();

export const getOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestingUser = req.user!;

    const orders = await prisma.order.findMany({
      where: { userId: requestingUser.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    logger.error('Get orders error', { error });
    res.status(500).json({ error: 'Failed to get orders' });
  }
};

export const getOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.orderId);
    const requestingUser = req.user!;

    // VULN_API1_BOLA: Broken Object Level Authorization
    if (config.vulnerabilities.api1Bola) {
      // Vulnerable: No ownership check - any authenticated user can access any order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      securityLogger.bolaAttempt(requestingUser.id, orderId, 'order');
      res.json(order);
    } else {
      // Secure: Check ownership or admin role
      const order = await prisma.order.findFirst({
        where: { 
          id: orderId,
          userId: requestingUser.role === 'ADMIN' ? undefined : requestingUser.id
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      res.json(order);
    }
  } catch (error) {
    logger.error('Get order error', { error });
    res.status(500).json({ error: 'Failed to get order' });
  }
};

export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestingUser = req.user!;
    const { items, shippingAddress, discountCode }: CreateOrderRequest = req.body;

    // Calculate total
    let total = 0;
    for (const item of items) {
      const dbItem = await prisma.item.findUnique({
        where: { id: item.itemId }
      });
      if (dbItem) {
        total += dbItem.price * item.qty;
      }
    }

    // Apply discount if provided
    if (discountCode) {
      if (discountCode === 'FREESHIP') {
        total = Math.max(0, total - 10);
      } else if (discountCode === 'HALFPRICE') {
        total = total * 0.5;
      }
    }

    const order = await prisma.order.create({
      data: {
        userId: requestingUser.id,
        items: JSON.stringify(items),
        total,
        discountCode,
        shippingAddress,
        status: 'CART'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(order);
  } catch (error) {
    logger.error('Create order error', { error });
    res.status(500).json({ error: 'Failed to create order' });
  }
};

export const addToCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestingUser = req.user!;
    const { itemId, qty } = req.body;

    // Get or create cart order
    let cartOrder = await prisma.order.findFirst({
      where: {
        userId: requestingUser.id,
        status: 'CART'
      }
    });

    if (!cartOrder) {
      cartOrder = await prisma.order.create({
        data: {
          userId: requestingUser.id,
          items: JSON.stringify([{ itemId, qty }]),
          total: 0,
          status: 'CART',
          shippingAddress: ''
        }
      });
    } else {
      // Add item to existing cart
      const currentItems: OrderItem[] = JSON.parse(cartOrder.items);
      const existingItemIndex = currentItems.findIndex(item => item.itemId === itemId);
      
      if (existingItemIndex >= 0) {
        currentItems[existingItemIndex].qty += qty;
      } else {
        currentItems.push({ itemId, qty });
      }

      // Recalculate total
      let total = 0;
      for (const item of currentItems) {
        const dbItem = await prisma.item.findUnique({
          where: { id: item.itemId }
        });
        if (dbItem) {
          total += dbItem.price * item.qty;
        }
      }

      cartOrder = await prisma.order.update({
        where: { id: cartOrder.id },
        data: {
          items: JSON.stringify(currentItems),
          total
        }
      });
    }

    res.json(cartOrder);
  } catch (error) {
    logger.error('Add to cart error', { error });
    res.status(500).json({ error: 'Failed to add to cart' });
  }
};

export const startCheckout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestingUser = req.user!;
    const { orderId } = req.body;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: requestingUser.id,
        status: 'CART'
      }
    });

    if (!order) {
      res.status(404).json({ error: 'Cart not found' });
      return;
    }

    // Update order status to PLACED
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PLACED' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json(updatedOrder);
  } catch (error) {
    logger.error('Start checkout error', { error });
    res.status(500).json({ error: 'Failed to start checkout' });
  }
};

export const applyCoupon = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestingUser = req.user!;
    const { orderId, couponCode } = req.body;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: requestingUser.id,
        status: { in: ['PLACED', 'PAID'] }
      }
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // VULN_API6_BUSINESS_FLOW: Allow coupon replay and stacking
    if (config.vulnerabilities.api6BusinessFlow) {
      // Vulnerable: Allow multiple coupon applications
      let newTotal = order.total;
      
      if (couponCode === 'FREESHIP') {
        newTotal = Math.max(0, newTotal - 10);
      } else if (couponCode === 'HALFPRICE') {
        newTotal = newTotal * 0.5;
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { 
          total: newTotal,
          discountCode: couponCode // Overwrite previous discount
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      securityLogger.businessFlowViolation(requestingUser.id, 'checkout', 'coupon_replay');
      res.json(updatedOrder);
    } else {
      // Secure: Only allow one coupon per order
      if (order.discountCode) {
        res.status(400).json({ error: 'Coupon already applied' });
        return;
      }

      let newTotal = order.total;
      
      if (couponCode === 'FREESHIP') {
        newTotal = Math.max(0, newTotal - 10);
      } else if (couponCode === 'HALFPRICE') {
        newTotal = newTotal * 0.5;
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { 
          total: newTotal,
          discountCode: couponCode
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.json(updatedOrder);
    }
  } catch (error) {
    logger.error('Apply coupon error', { error });
    res.status(500).json({ error: 'Failed to apply coupon' });
  }
};

export const processPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestingUser = req.user!;
    const { orderId, paid, amount, currency }: CheckoutRequest = req.body;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: requestingUser.id,
        status: 'PLACED'
      }
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // VULN_API6_BUSINESS_FLOW: Allow out-of-order operations
    // VULN_API10_UNSAFE_CONSUMP: Trust client-controlled payment status
    if (config.vulnerabilities.api6BusinessFlow || config.vulnerabilities.api10UnsafeConsump) {
      // Vulnerable: Trust client-provided payment status
      const paymentSuccess = paid || false;
      
      if (paymentSuccess) {
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: { 
            status: 'PAID',
            paid: true
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        if (config.vulnerabilities.api6BusinessFlow) {
          securityLogger.businessFlowViolation(requestingUser.id, 'checkout', 'payment_skip');
        }
        if (config.vulnerabilities.api10UnsafeConsump) {
          securityLogger.unsafeApiConsumption(requestingUser.id, 'payment', { paid, amount, currency });
        }

        res.json(updatedOrder);
      } else {
        res.status(400).json({ error: 'Payment failed' });
      }
    } else {
      // Secure: Simulate actual payment processing
      const paymentResult = await simulatePayment(order.total, currency || 'USD');
      
      if (paymentResult.success) {
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: { 
            status: 'PAID',
            paid: true
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        res.json(updatedOrder);
      } else {
        res.status(400).json({ error: 'Payment failed' });
      }
    }
  } catch (error) {
    logger.error('Process payment error', { error });
    res.status(500).json({ error: 'Payment processing failed' });
  }
};

export const shipOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestingUser = req.user!;
    const { orderId } = req.body;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: requestingUser.id
      }
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // VULN_API6_BUSINESS_FLOW: Allow shipping before payment
    if (config.vulnerabilities.api6BusinessFlow) {
      // Vulnerable: Allow shipping regardless of payment status
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'SHIPPED' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (order.status !== 'PAID') {
        securityLogger.businessFlowViolation(requestingUser.id, 'checkout', 'ship_before_pay');
      }

      res.json(updatedOrder);
    } else {
      // Secure: Only ship paid orders
      if (order.status !== 'PAID') {
        res.status(400).json({ error: 'Order must be paid before shipping' });
        return;
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'SHIPPED' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.json(updatedOrder);
    }
  } catch (error) {
    logger.error('Ship order error', { error });
    res.status(500).json({ error: 'Failed to ship order' });
  }
};

// Mock payment processing function
async function simulatePayment(amount: number, currency: string): Promise<{ success: boolean }> {
  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Simulate payment success (90% success rate)
  return { success: Math.random() > 0.1 };
}

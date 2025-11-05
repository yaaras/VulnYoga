import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding VulnYoga database...');

  // Create users
  const alicePassword = await bcrypt.hash('alice123', 10);
  const bobPassword = await bcrypt.hash('bob123', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@demo.local' },
    update: {},
    create: {
      email: 'alice@demo.local',
      passwordHash: alicePassword,
      name: 'Alice Johnson',
      address: '123 Main St, Anytown, USA',
      phone: '+1-555-0101',
      role: 'CUSTOMER'
    }
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@demo.local' },
    update: {},
    create: {
      email: 'bob@demo.local',
      passwordHash: bobPassword,
      name: 'Bob Smith',
      address: '456 Oak Ave, Somewhere, USA',
      phone: '+1-555-0102',
      role: 'STAFF'
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.local' },
    update: {},
    create: {
      email: 'admin@demo.local',
      passwordHash: adminPassword,
      name: 'Admin User',
      address: '789 Admin Blvd, System, USA',
      phone: '+1-555-0000',
      role: 'ADMIN'
    }
  });

  console.log('✅ Users created');

  // Create items
  const items = await Promise.all([
    prisma.item.upsert({
      where: { id: 1 },
      update: {
        name: 'Premium Yoga Mat',
        description: 'High-quality non-slip yoga mat perfect for all types of yoga practice',
        price: 49.99,
        costPrice: 25.00,
        supplierEmail: 'mats@yogasupplier.com',
        stock: 50,
        imageUrl: 'https://picsum.photos/400/300?random=1',
        isFeatured: true,
      },
      create: {
        name: 'Premium Yoga Mat',
        description: 'High-quality non-slip yoga mat perfect for all types of yoga practice',
        price: 49.99,
        costPrice: 25.00,
        supplierEmail: 'mats@yogasupplier.com',
        stock: 50,
        imageUrl: 'https://picsum.photos/400/300?random=1',
        isFeatured: true,
        createdByUserId: bob.id
      }
    }),
    prisma.item.upsert({
      where: { id: 2 },
      update: {
        name: 'Yoga Blocks Set',
        description: 'Set of 2 high-density foam yoga blocks for support and alignment',
        price: 19.99,
        costPrice: 8.00,
        supplierEmail: 'blocks@yogasupplier.com',
        stock: 100,
        imageUrl: 'https://picsum.photos/400/300?random=2',
        isFeatured: false,
      },
      create: {
        name: 'Yoga Blocks Set',
        description: 'Set of 2 high-density foam yoga blocks for support and alignment',
        price: 19.99,
        costPrice: 8.00,
        supplierEmail: 'blocks@yogasupplier.com',
        stock: 100,
        imageUrl: 'https://picsum.photos/400/300?random=2',
        isFeatured: false,
        createdByUserId: bob.id
      }
    }),
    prisma.item.upsert({
      where: { id: 3 },
      update: {
        name: 'Yoga Strap',
        description: 'Cotton yoga strap for stretching and improving flexibility',
        price: 12.99,
        costPrice: 5.00,
        supplierEmail: 'straps@yogasupplier.com',
        stock: 75,
        imageUrl: 'https://picsum.photos/400/300?random=3',
        isFeatured: false,
      },
      create: {
        name: 'Yoga Strap',
        description: 'Cotton yoga strap for stretching and improving flexibility',
        price: 12.99,
        costPrice: 5.00,
        supplierEmail: 'straps@yogasupplier.com',
        stock: 75,
        imageUrl: 'https://picsum.photos/400/300?random=3',
        isFeatured: false,
        createdByUserId: bob.id
      }
    }),
    prisma.item.upsert({
      where: { id: 4 },
      update: {
        name: 'Meditation Cushion',
        description: 'Comfortable meditation cushion for seated practice',
        price: 34.99,
        costPrice: 15.00,
        supplierEmail: 'cushions@yogasupplier.com',
        stock: 30,
        imageUrl: 'https://picsum.photos/400/300?random=4',
        isFeatured: true,
      },
      create: {
        name: 'Meditation Cushion',
        description: 'Comfortable meditation cushion for seated practice',
        price: 34.99,
        costPrice: 15.00,
        supplierEmail: 'cushions@yogasupplier.com',
        stock: 30,
        imageUrl: 'https://picsum.photos/400/300?random=4',
        isFeatured: true,
        createdByUserId: bob.id
      }
    }),
    prisma.item.upsert({
      where: { id: 5 },
      update: {
        name: 'Yoga Towel',
        description: 'Absorbent yoga towel for hot yoga and intense sessions',
        price: 24.99,
        costPrice: 10.00,
        supplierEmail: 'towels@yogasupplier.com',
        stock: 60,
        imageUrl: 'https://picsum.photos/400/300?random=5',
        isFeatured: false,
      },
      create: {
        name: 'Yoga Towel',
        description: 'Absorbent yoga towel for hot yoga and intense sessions',
        price: 24.99,
        costPrice: 10.00,
        supplierEmail: 'towels@yogasupplier.com',
        stock: 60,
        imageUrl: 'https://picsum.photos/400/300?random=5',
        isFeatured: false,
        createdByUserId: bob.id
      }
    }),
    prisma.item.upsert({
      where: { id: 6 },
      update: {
        name: 'Online Yoga Class - Beginner',
        description: '4-week beginner yoga course with video lessons',
        price: 79.99,
        costPrice: 20.00,
        supplierEmail: 'classes@yogainstructor.com',
        stock: 999,
        imageUrl: 'https://picsum.photos/400/300?random=6',
        isFeatured: true,
      },
      create: {
        name: 'Online Yoga Class - Beginner',
        description: '4-week beginner yoga course with video lessons',
        price: 79.99,
        costPrice: 20.00,
        supplierEmail: 'classes@yogainstructor.com',
        stock: 999,
        imageUrl: 'https://picsum.photos/400/300?random=6',
        isFeatured: true,
        createdByUserId: bob.id
      }
    }),
    prisma.item.upsert({
      where: { id: 7 },
      update: {
        name: 'Yoga Bag',
        description: 'Spacious yoga bag with compartments for all your gear',
        price: 39.99,
        costPrice: 18.00,
        supplierEmail: 'bags@yogasupplier.com',
        stock: 40,
        imageUrl: 'https://picsum.photos/400/300?random=7',
        isFeatured: false,
      },
      create: {
        name: 'Yoga Bag',
        description: 'Spacious yoga bag with compartments for all your gear',
        price: 39.99,
        costPrice: 18.00,
        supplierEmail: 'bags@yogasupplier.com',
        stock: 40,
        imageUrl: 'https://picsum.photos/400/300?random=7',
        isFeatured: false,
        createdByUserId: bob.id
      }
    }),
    prisma.item.upsert({
      where: { id: 8 },
      update: {
        name: 'Yoga Wheel',
        description: 'Yoga wheel for back bending and stretching exercises',
        price: 29.99,
        costPrice: 12.00,
        supplierEmail: 'wheels@yogasupplier.com',
        stock: 25,
        imageUrl: 'https://picsum.photos/400/300?random=8',
        isFeatured: false,
      },
      create: {
        name: 'Yoga Wheel',
        description: 'Yoga wheel for back bending and stretching exercises',
        price: 29.99,
        costPrice: 12.00,
        supplierEmail: 'wheels@yogasupplier.com',
        stock: 25,
        imageUrl: 'https://picsum.photos/400/300?random=8',
        isFeatured: false,
        createdByUserId: bob.id
      }
    }),
    prisma.item.upsert({
      where: { id: 9 },
      update: {
        name: 'Essential Oils Set',
        description: 'Set of 5 essential oils for aromatherapy during yoga',
        price: 44.99,
        costPrice: 22.00,
        supplierEmail: 'oils@aromatherapy.com',
        stock: 35,
        imageUrl: 'https://picsum.photos/400/300?random=9',
        isFeatured: false,
      },
      create: {
        name: 'Essential Oils Set',
        description: 'Set of 5 essential oils for aromatherapy during yoga',
        price: 44.99,
        costPrice: 22.00,
        supplierEmail: 'oils@aromatherapy.com',
        stock: 35,
        imageUrl: 'https://picsum.photos/400/300?random=9',
        isFeatured: false,
        createdByUserId: bob.id
      }
    }),
    prisma.item.upsert({
      where: { id: 10 },
      update: {
        name: 'Yoga Journal',
        description: 'Beautiful journal for tracking your yoga journey',
        price: 16.99,
        costPrice: 7.00,
        supplierEmail: 'journals@yogasupplier.com',
        stock: 80,
        imageUrl: 'https://picsum.photos/400/300?random=10',
        isFeatured: false,
      },
      create: {
        name: 'Yoga Journal',
        description: 'Beautiful journal for tracking your yoga journey',
        price: 16.99,
        costPrice: 7.00,
        supplierEmail: 'journals@yogasupplier.com',
        stock: 80,
        imageUrl: 'https://picsum.photos/400/300?random=10',
        isFeatured: false,
        createdByUserId: bob.id
      }
    }),
    prisma.item.upsert({
      where: { id: 11 },
      update: {
        name: 'Online Yoga Class - Advanced',
        description: '8-week advanced yoga course with challenging poses',
        price: 129.99,
        costPrice: 30.00,
        supplierEmail: 'classes@yogainstructor.com',
        stock: 999,
        imageUrl: 'https://picsum.photos/400/300?random=11',
        isFeatured: true,
      },
      create: {
        name: 'Online Yoga Class - Advanced',
        description: '8-week advanced yoga course with challenging poses',
        price: 129.99,
        costPrice: 30.00,
        supplierEmail: 'classes@yogainstructor.com',
        stock: 999,
        imageUrl: 'https://picsum.photos/400/300?random=11',
        isFeatured: true,
        createdByUserId: bob.id
      }
    }),
    prisma.item.upsert({
      where: { id: 12 },
      update: {
        name: 'Yoga Socks',
        description: 'Non-slip yoga socks for indoor practice',
        price: 14.99,
        costPrice: 6.00,
        supplierEmail: 'socks@yogasupplier.com',
        stock: 90,
        imageUrl: 'https://picsum.photos/400/300?random=12',
        isFeatured: false,
      },
      create: {
        name: 'Yoga Socks',
        description: 'Non-slip yoga socks for indoor practice',
        price: 14.99,
        costPrice: 6.00,
        supplierEmail: 'socks@yogasupplier.com',
        stock: 90,
        imageUrl: 'https://picsum.photos/400/300?random=12',
        isFeatured: false,
        createdByUserId: bob.id
      }
    })
  ]);

  console.log('✅ Items created');

  // Create orders
  const orders = await Promise.all([
    prisma.order.upsert({
      where: { id: 1 },
      update: {},
      create: {
        userId: alice.id,
        status: 'PAID',
        items: JSON.stringify([
          { itemId: 1, qty: 1 },
          { itemId: 2, qty: 2 }
        ]),
        total: 89.97,
        discountCode: 'FREESHIP',
        paid: true,
        shippingAddress: '123 Main St, Anytown, USA'
      }
    }),
    prisma.order.upsert({
      where: { id: 2 },
      update: {},
      create: {
        userId: alice.id,
        status: 'SHIPPED',
        items: JSON.stringify([
          { itemId: 4, qty: 1 },
          { itemId: 9, qty: 1 }
        ]),
        total: 79.98,
        discountCode: null,
        paid: true,
        shippingAddress: '123 Main St, Anytown, USA'
      }
    }),
    prisma.order.upsert({
      where: { id: 3 },
      update: {},
      create: {
        userId: bob.id,
        status: 'PLACED',
        items: JSON.stringify([
          { itemId: 6, qty: 1 }
        ]),
        total: 79.99,
        discountCode: null,
        paid: false,
        shippingAddress: '456 Oak Ave, Somewhere, USA'
      }
    })
  ]);

  console.log('✅ Orders created');

  // Create API keys
  const apiKeys = await Promise.all([
    prisma.apiKey.upsert({
      where: { id: 1 },
      update: {},
      create: {
        userId: alice.id,
        key: 'vulnyoga_alice_demo_key_1234567890abcdef',
        label: 'Demo API Key',
        revoked: false
      }
    }),
    prisma.apiKey.upsert({
      where: { id: 2 },
      update: {},
      create: {
        userId: bob.id,
        key: 'vulnyoga_bob_staff_key_abcdef1234567890',
        label: 'Staff API Key',
        revoked: false
      }
    })
  ]);

  console.log('✅ API keys created');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\nDemo Users:');
  console.log('  Alice (Customer): alice@demo.local / alice123');
  console.log('  Bob (Staff): bob@demo.local / bob123');
  console.log('  Admin: admin@demo.local / admin123');
  console.log('\nDemo API Keys:');
  console.log('  Alice: vulnyoga_alice_demo_key_1234567890abcdef');
  console.log('  Bob: vulnyoga_bob_staff_key_abcdef1234567890');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

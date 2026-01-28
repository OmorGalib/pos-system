import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (optional - be careful in production!)
  console.log('🗑️  Clearing existing data...');
  await prisma.saleItem.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  // Create admin user
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@pos.com',
      password: hashedPassword,
      name: 'Admin User',
    },
  });

  console.log(`✅ Created admin user: ${admin.email}`);

  // Create sample products
  console.log('📦 Creating sample products...');
  const products = await prisma.product.createMany({
    data: [
      {
        name: 'Laptop Dell XPS 13',
        sku: 'DLXPS13-001',
        price: 1299.99,
        stockQuantity: 15,
      },
      {
        name: 'iPhone 15 Pro',
        sku: 'IP15PRO-001',
        price: 999.99,
        stockQuantity: 25,
      },
      {
        name: 'Samsung 4K Monitor',
        sku: 'SAM4K-27',
        price: 349.99,
        stockQuantity: 10,
      },
      {
        name: 'Wireless Mouse Logitech',
        sku: 'LOG-WM001',
        price: 29.99,
        stockQuantity: 50,
      },
      {
        name: 'Mechanical Keyboard',
        sku: 'MK-RGB01',
        price: 89.99,
        stockQuantity: 30,
      },
    ],
  });

  console.log(`✅ Created ${products.count} products`);
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
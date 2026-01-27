import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed process...');

  // Create admin user if doesn't exist
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@pos.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin User',
      },
    });
    
    console.log(`✅ Admin user created: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
  } else {
    console.log('ℹ️ Admin user already exists');
  }

  // Create sample products if none exist
  const productCount = await prisma.product.count();
  
  if (productCount === 0) {
    await prisma.product.createMany({
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
    console.log('✅ Sample products created');
  }

  console.log('🎉 Seed process completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
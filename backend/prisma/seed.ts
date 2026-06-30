import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'caboisai1811@gmail.com';
  const password = 'admin123';
  const passwordHash = await hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { 
      role: Role.admin,
      passwordHash,
    },
    create: {
      email: adminEmail,
      name: 'Admin',
      role: Role.admin,
      passwordHash,
      subscription: {
        create: { plan: 'pro', status: 'active' },
      },
    },
  });

  // Đảm bảo subscription là pro nếu user đã tồn tại từ trước
  await prisma.subscription.upsert({
    where: { userId: admin.id },
    update: { plan: 'pro', status: 'active' },
    create: { userId: admin.id, plan: 'pro', status: 'active' },
  });

  console.log(`Admin user ready: ${admin.email} (password: ${password})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.log('ADMIN_EMAIL not set — skipping admin seed');
    return;
  }

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.admin },
    create: {
      email: adminEmail,
      name: 'Admin',
      role: Role.admin,
      subscription: {
        create: { plan: 'pro', status: 'active' },
      },
    },
  });

  console.log(`Admin user ready: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

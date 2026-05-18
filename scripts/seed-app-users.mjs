import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const users = [
    { email: 'torpong@gmail.com', role: 'admin' },
    { email: 'user@2startup.cloud', role: 'user' },
    { email: 'readonly@2startup.cloud', role: 'readonly' },
];

try {
    for (const user of users) {
        await prisma.appUser.upsert({
            where: { email: user.email },
            update: { role: user.role, isActive: true },
            create: user,
        });
    }

    const seeded = await prisma.appUser.findMany({
        orderBy: { email: 'asc' },
    });
    console.log(`Seeded ${seeded.length} app users.`);
    seeded.forEach((user) => console.log(`${user.email} (${user.role})`));
} finally {
    await prisma.$disconnect();
}

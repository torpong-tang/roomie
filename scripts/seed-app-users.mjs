import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Roomie has administrators only; every other sign-in is a Place with its own access code.
const admins = [
    { email: 'torpong@gmail.com' },
];

try {
    for (const admin of admins) {
        await prisma.appUser.upsert({
            where: { email: admin.email },
            update: { role: 'admin', isActive: true },
            create: { email: admin.email, role: 'admin' },
        });
    }

    const seeded = await prisma.appUser.findMany({ orderBy: { email: 'asc' } });
    console.log(`Seeded ${seeded.length} administrator(s).`);
    seeded.forEach((user) => console.log(`${user.email} (${user.isActive ? 'active' : 'inactive'})`));
} finally {
    await prisma.$disconnect();
}

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const maskUrl = (value) => {
    if (!value) return '(missing)';
    try {
        const url = new URL(value);
        if (url.password) url.password = '***';
        return url.toString();
    } catch {
        return '(invalid URL)';
    }
};

const describeUrl = (key) => {
    const value = process.env[key];
    if (!value) {
        console.log(`${key}: missing`);
        return;
    }
    try {
        const url = new URL(value);
        console.log(`${key}: ${url.username}@${url.hostname}:${url.port || '(default)'}${url.pathname}`);
        console.log(`${key}_MASKED: ${maskUrl(value)}`);
    } catch (error) {
        console.log(`${key}: invalid (${error.message})`);
    }
};

describeUrl('DATABASE_URL');
describeUrl('DIRECT_URL');

const prisma = new PrismaClient();

try {
    const [users, places, rooms, bookings] = await Promise.all([
        prisma.appUser.findMany({
            select: { email: true, role: true, isActive: true },
            orderBy: { email: 'asc' },
        }),
        prisma.place.findMany({
            select: { key: true, isActive: true },
            orderBy: { key: 'asc' },
        }),
        prisma.room.count(),
        prisma.booking.count(),
    ]);

    console.log('\nConnection: OK');
    console.log(`Rooms: ${rooms}`);
    console.log(`Bookings: ${bookings}`);
    console.log('Users:');
    users.forEach((user) => console.log(`- ${user.email} (${user.role}, ${user.isActive ? 'active' : 'inactive'})`));
    console.log('Places:');
    places.forEach((place) => console.log(`- ${place.key} (${place.isActive ? 'active' : 'inactive'})`));
} catch (error) {
    console.error('\nConnection: FAILED');
    console.error(error.message);
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
}

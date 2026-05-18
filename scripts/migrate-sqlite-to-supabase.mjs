import 'dotenv/config';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const sqlitePath = process.argv.find((arg) => !arg.startsWith('--') && arg.endsWith('.db')) || 'prisma/dev.db';
const shouldReset = process.argv.includes('--reset');
const sqlite = new Database(sqlitePath, { readonly: true });
const prisma = new PrismaClient();

const toDate = (value) => {
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string' && /^\d+$/.test(value)) return new Date(Number(value));
    return new Date(value);
};

const rooms = sqlite.prepare('SELECT * FROM Room').all();
const bookings = sqlite.prepare('SELECT * FROM Booking').all();

try {
    if (shouldReset) {
        await prisma.booking.deleteMany();
        await prisma.room.deleteMany();
    }

    for (const room of rooms) {
        await prisma.room.upsert({
            where: { id: room.id },
            update: {
                name: room.name,
                capacity: room.capacity,
                description: room.description,
                image: room.image,
                createdAt: toDate(room.createdAt),
                updatedAt: toDate(room.updatedAt),
            },
            create: {
                id: room.id,
                name: room.name,
                capacity: room.capacity,
                description: room.description,
                image: room.image,
                createdAt: toDate(room.createdAt),
                updatedAt: toDate(room.updatedAt),
            },
        });
    }

    for (const booking of bookings) {
        await prisma.booking.upsert({
            where: { id: booking.id },
            update: {
                roomId: booking.roomId,
                title: booking.title,
                startTime: toDate(booking.startTime),
                endTime: toDate(booking.endTime),
                user: booking.user,
                createdAt: toDate(booking.createdAt),
                updatedAt: toDate(booking.updatedAt),
            },
            create: {
                id: booking.id,
                roomId: booking.roomId,
                title: booking.title,
                startTime: toDate(booking.startTime),
                endTime: toDate(booking.endTime),
                user: booking.user,
                createdAt: toDate(booking.createdAt),
                updatedAt: toDate(booking.updatedAt),
            },
        });
    }

    const [roomCount, bookingCount] = await Promise.all([
        prisma.room.count(),
        prisma.booking.count(),
    ]);

    console.log(`Migrated ${rooms.length} rooms and ${bookings.length} bookings.`);
    console.log(`Supabase now has ${roomCount} rooms and ${bookingCount} bookings.`);
} finally {
    sqlite.close();
    await prisma.$disconnect();
}

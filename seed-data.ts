import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Ensure we have at least one room
    let room = await prisma.room.findFirst();

    if (!room) {
        room = await prisma.room.create({
            data: {
                name: 'Grand Ballroom',
                capacity: 50,
                description: 'Luxury meeting space with glass walls',
            }
        });
        console.log('Created room:', room.name);
    } else {
        console.log('Using existing room:', room.name);
    }

    // 2. Prepare 3 bookings for today (2026-02-01)
    const today = new Date('2026-02-01');

    const bookings = [
        {
            title: 'Morning Sync',
            startTime: new Date('2026-02-01T09:00:00'),
            endTime: new Date('2026-02-01T10:00:00'),
            user: 'Alice',
            roomId: room.id,
        },
        {
            title: 'Lunch Meeting',
            startTime: new Date('2026-02-01T22:00:00'), // Adjusting to after current time or just for today
            endTime: new Date('2026-02-01T23:00:00'),
            user: 'Bob',
            roomId: room.id,
        },
        {
            title: 'Evening Review',
            startTime: new Date('2026-02-02T09:00:00'), // For tomorrow to show on calendar
            endTime: new Date('2026-02-02T10:00:00'),
            user: 'Charlie',
            roomId: room.id,
        }
    ];

    console.log('Adding 3 bookings...');

    for (const b of bookings) {
        const created = await prisma.booking.create({
            data: b
        });
        console.log(`- Created booking: ${created.title} by ${created.user}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

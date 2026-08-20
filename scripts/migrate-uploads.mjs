import 'dotenv/config';
import { copyFile, mkdir, readdir } from 'fs/promises';
import { join, resolve } from 'path';
import { PrismaClient } from '@prisma/client';

/**
 * One-off move of room images out of public/uploads. The standalone postbuild step
 * wipes public/, so anything uploaded at runtime used to disappear on the next deploy.
 */
const legacyDir = resolve(process.cwd(), 'public', 'uploads');
const targetDir = process.env.ROOMIE_UPLOAD_DIR
    ? resolve(process.env.ROOMIE_UPLOAD_DIR)
    : resolve(process.cwd(), 'var', 'uploads');

const prisma = new PrismaClient();

try {
    await mkdir(targetDir, { recursive: true });

    let files = [];
    try {
        files = await readdir(legacyDir);
    } catch {
        console.log('No public/uploads directory; nothing to copy.');
    }

    for (const file of files) {
        await copyFile(join(legacyDir, file), join(targetDir, file));
    }
    console.log(`Copied ${files.length} file(s) to ${targetDir}`);

    const rooms = await prisma.room.findMany({ where: { image: { startsWith: '/uploads/' } } });
    for (const room of rooms) {
        const image = room.image.replace(/^\/uploads\//, '/api/uploads/');
        await prisma.room.update({ where: { id: room.id }, data: { image } });
        console.log(`${room.name}: ${room.image} -> ${image}`);
    }
    console.log(`Updated ${rooms.length} room image path(s).`);
} finally {
    await prisma.$disconnect();
}

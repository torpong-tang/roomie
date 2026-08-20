import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { assetPath } from '@/lib/paths';
import { requireAdmin } from '@/lib/auth';
import { UPLOAD_CONTENT_TYPES, UPLOAD_DIR, UPLOAD_URL_PREFIX } from '@/lib/uploads';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
    try {
        const { response } = await requireAdmin();
        if (response) return response;

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const extension = UPLOAD_CONTENT_TYPES[file.type];
        if (!extension) {
            return NextResponse.json({ error: 'Only JPG, PNG, WebP, and GIF images are allowed' }, { status: 400 });
        }

        if (file.size > MAX_UPLOAD_BYTES) {
            return NextResponse.json({ error: 'Image must be 5 MB or smaller' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        await mkdir(UPLOAD_DIR, { recursive: true });

        const safeBaseName = file.name
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9-_]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 48) || 'room-image';
        const filename = `${Date.now()}-${safeBaseName}-${randomUUID()}${extension}`;
        await writeFile(join(UPLOAD_DIR, filename), buffer);

        return NextResponse.json({ url: assetPath(`${UPLOAD_URL_PREFIX}/${filename}`) });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }
}

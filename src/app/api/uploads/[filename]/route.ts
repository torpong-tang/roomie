import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { requireUser } from '@/lib/auth';
import { contentTypeForFile, resolveUploadPath } from '@/lib/uploads';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    const { response } = await requireUser();
    if (response) return response;

    const { filename } = await params;
    const path = resolveUploadPath(filename);
    if (!path) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    try {
        const file = await readFile(path);
        return new NextResponse(new Uint8Array(file), {
            headers: {
                'Content-Type': contentTypeForFile(filename),
                'Content-Length': String(file.byteLength),
                'Cache-Control': 'private, max-age=3600',
            },
        });
    } catch {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
}

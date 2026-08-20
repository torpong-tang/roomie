import { mkdir, readdir, stat } from 'fs/promises';
import { join, parse } from 'path';
import sharp from 'sharp';

/**
 * The artwork in public/ is all 1024x1024 JPEGs of several hundred KB, far larger
 * than anything the UI actually displays. This writes right-sized WebP copies.
 * Re-run it if the source images change.
 */
const source = 'public/rooms';
const target = 'public/hero';
const HERO_WIDTH = 900;
const LOGO_WIDTH = 128;

const report = async (label, from, to) => {
    const before = (await stat(from)).size;
    const after = (await stat(to)).size;
    const saved = Math.round((1 - after / before) * 100);
    console.log(`${label} ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB (-${saved}%)`);
};

await mkdir(target, { recursive: true });

for (const file of await readdir(source)) {
    const { name } = parse(file);
    const out = join(target, `${name}.webp`);
    await sharp(join(source, file))
        .resize({ width: HERO_WIDTH, withoutEnlargement: true })
        .webp({ quality: 72 })
        .toFile(out);
    await report(`${file} ->`.padEnd(16) + `hero/${name}.webp`, join(source, file), out);
}

// The logo renders at 48px in the header but shipped as a full-size photo.
await sharp('public/logo.png')
    .resize({ width: LOGO_WIDTH, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile('public/logo.webp');
await report('logo.png ->    logo.webp', 'public/logo.png', 'public/logo.webp');

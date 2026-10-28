import sharp from 'sharp';
import { copyFile } from 'node:fs/promises';
// Reuse the site's outlined paw; keep its orange identity on installed icons.
const source = 'public/icons/paw.svg';
for (const [path, size] of [
  ['public/apple-touch-icon.png', 180],
  ['public/icons/paw-192.png', 192],
  ['public/icons/paw-512.png', 512],
  ['public/favicon-32.png', 32],
]) {
  await sharp(source).resize(size, size).flatten({ background: '#FCF8F6' }).png().toFile(path);
}
await copyFile(source, 'public/favicon.svg');
console.log('Generated Apple touch, Android/manifest, and browser icons.');

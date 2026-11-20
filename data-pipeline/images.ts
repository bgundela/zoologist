import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { request } from './http';
export const openLicense = /^(CC0(?: 1\.0)?|Public domain|CC BY(?:-SA)? [1-4]\.0)$/;
const photoLicenses: Record<string, string> = { cc0: 'CC0 1.0', 'cc-by': 'CC BY 4.0', 'cc-by-sa': 'CC BY-SA 4.0' };
export type Photo = {
 id: number;
 license_code?: string | null;
 attribution?: string;
 original_url?: string;
 url?: string;
 original_dimensions?: { width: number } | null;
};

export async function saveLicensedPhoto(photos: Photo[], id: string) {
 let attempts = 0;
 for (const photo of photos) {
  const license = photoLicenses[photo.license_code?.toLowerCase() ?? ''];
  const url = photo.original_url || photo.url?.replace(/\/square(?=\.[^/?]+(?:\?|$))/, '/original');
  if (!license || !url || (photo.original_dimensions && photo.original_dimensions.width < 1200)) continue;
  if (attempts === 3) break;
  attempts++;
  try {
   const image = Buffer.from(await (await request(url)).arrayBuffer());
   await processImage(image, id, license);
   return { photo, license };
  } catch (error) {
   console.warn(`Skipped photo ${photo.id}: ${String(error)}`);
  }
 }
}

async function processImage(buffer:Buffer,id:string,license:string) {
 if(!openLicense.test(license))throw new Error(`Unapproved photo license: ${license}`);
 const metadata=await sharp(buffer).metadata();
 if((metadata.width||0)<1200)throw new Error('Photo must be at least 1200px wide');
 await mkdir('public/img',{recursive:true});
 for(const width of [600,1200])await sharp(buffer).rotate().resize({width,withoutEnlargement:true}).webp({quality:82}).toFile(`public/img/${id}-${width}.webp`);
}

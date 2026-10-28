import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
export const openLicense = /^(CC0(?: 1\.0)?|Public domain|CC BY(?:-SA)? [1-4]\.0)$/;
export async function processImage(buffer:Buffer,id:string,license:string) {
 if(!openLicense.test(license))throw new Error(`Unapproved photo license: ${license}`);
 const metadata=await sharp(buffer).metadata();
 if((metadata.width||0)<1200)throw new Error('Photo must be at least 1200px wide');
 await mkdir('public/img',{recursive:true});
 for(const width of [600,1200])await sharp(buffer).rotate().resize({width,withoutEnlargement:true}).webp({quality:82}).toFile(`public/img/${id}-${width}.webp`);
}

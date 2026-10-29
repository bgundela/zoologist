import { factProblem } from './enrich';
import Ajv from 'ajv';
import { readFile,access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { contrast } from './theme';
import { openLicense } from './images';
import type { Animal } from './types';
import { validDate } from '../src/lib/today';
const ajv=new Ajv({allErrors:true});
const text={type:'string',minLength:1};
const url={type:'string',pattern:'^https://'};
const schema={type:'object',required:['id','commonName','scientificName','taxonomy','category','stats','conservationStatus','theme','image','habitat','funFacts','summary','sources','reviewed','textLicense'],properties:{id:{type:'string',pattern:'^[a-z0-9-]+$'},commonName:text,scientificName:text,category:text,reviewed:{type:'boolean'},textLicense:text,taxonomy:{type:'object',required:['class','order','family']},stats:{type:'object',required:['weightKg','lengthCm','lifespanYrs','diet','activity','livesIn']},conservationStatus:{type:'object',required:['code','label']},theme:{type:'object',required:['accent','tokens','accentDark','dark']},image:{type:'object',required:['src','srcset','alt','credit','license','licenseUrl','sourceUrl','changes'],properties:{src:text,alt:text,credit:text,license:text,licenseUrl:url,sourceUrl:url,changes:text,srcset:{type:'array',minItems:2,items:text}}},habitat:{type:'object',required:['types','regions','countries','rangeMapUrl','mapNote','threats','ecosystemRole']},funFacts:{type:'array',minItems:3,items:{type:'object',required:['text','source'],properties:{text,source:url}}},summary:{type:'array',minItems:1,items:text},sources:{type:'array',minItems:1,items:{type:'object',required:['label','url'],properties:{label:text,url}}}}};
const check=ajv.compile(schema);
export async function validateAnimal(animal:Animal){
 if(!check(animal))throw new Error(`Animal schema: ${ajv.errorsText(check.errors)}`);
 for(const fact of animal.funFacts){const problem=factProblem(fact.text);if(problem)throw new Error(`${animal.id}: ${problem}`);}
 const facts=animal.funFacts.map(f=>f.text.toLowerCase().replace(/[^a-z0-9]/g,''));
 if(new Set(facts).size!==facts.length)throw new Error(`${animal.id}: duplicate facts`);
 if(!openLicense.test(animal.image.license))throw new Error(`${animal.id}: photo license is not approved`);
 for(const path of [animal.image.src,...animal.image.srcset.map(s=>s.split(' ')[0]),animal.habitat.rangeMapUrl]){if(!path.startsWith('/img/')||path.includes('..'))throw new Error('Invalid asset path');await access(`public${path}`);}
 const t=animal.theme;
 for(const color of [t.accent,t.accentDark,...Object.values(t.tokens),...Object.values(t.dark)])if(!/^#[a-f\d]{6}$/i.test(color))throw new Error('Invalid theme color');
 for(const tokens of [t.tokens,t.dark])for(const [a,b] of [['ink','wash'],['muted','wash'],['ink','soft'],['muted','soft'],['on-deep','deep']]){if(contrast(tokens[a as keyof typeof tokens],tokens[b as keyof typeof tokens])<4.5)throw new Error(`${animal.id}: ${a}/${b} fails AA`);}
 if(contrast(t.accent,'#ffffff')<4.5)throw new Error('Accent fails AA');
}
export async function validateDataset(){
 const schedule=JSON.parse(await readFile('public/data/schedule.json','utf8'));
 if(!validDate(schedule.launch)||!schedule.order.length||!schedule.fallback)throw new Error('Invalid schedule');
 if(!schedule.fixture && new Set(schedule.order).size!==schedule.order.length)throw new Error('Repeated scheduled species');
 for(const id of new Set<string>([...schedule.order,schedule.fallback])){if(!/^[a-z0-9-]+$/.test(id))throw new Error('Invalid animal id');const animal=JSON.parse(await readFile(`public/data/animals/${id}.json`,'utf8'));if(animal.id!==id)throw new Error('Animal id mismatch');await validateAnimal(animal);}
 console.log(`Validated ${new Set(schedule.order).size} scheduled species, licensed assets, and AA theme contrast.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await validateDataset();

import { readFile,writeFile,rename } from 'node:fs/promises';
import { discoverCandidates,type Candidate } from './discover';
import { fetchAnimal } from './fetch';
import { validateAnimal } from './validate';
import { dayIndex,localDate } from '../src/lib/today';
import type { Animal } from './types';
import { makeTheme } from './theme';
const schedule=JSON.parse(await readFile('public/data/schedule.json','utf8'));
const overrides=JSON.parse(await readFile('data-pipeline/overrides.json','utf8'));
const today=localDate();
const current=Math.max(0,dayIndex(today,schedule.launch));
const target=current+15;
// Fill elapsed fixture days without changing any existing entry. Never wrap the schedule.
while(schedule.order.length<=current)schedule.order.push(schedule.fallback);
const used=new Set<string>(schedule.order);
const usedNames=new Set<string>();
for(const id of used){const a=JSON.parse(await readFile(`public/data/animals/${id}.json`,'utf8'));usedNames.add(a.scientificName);}
const pool:{animal:Animal;score:number}[]=[];
const slug=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-');
const needs=target-schedule.order.length;
if(needs<=0){console.log('Schedule already has a 14-day buffer.');process.exit(0);}
let inspected=0;
const state=JSON.parse(await readFile('data-pipeline/discovery-state.json','utf8'));
let nextPage=Number.isInteger(state.nextPage)&&state.nextPage>=1&&state.nextPage<=100?state.nextPage:1;
let pagesFetched=0;
// Bound API work and tolerate individual species/API failures. A later run can resume.
for(let batch=0;batch<8&&pool.length<needs+4;batch++){
 const page=nextPage;
 let candidates:Candidate[];
 try{candidates=await discoverCandidates(page);pagesFetched++;nextPage=candidates.length?(page%100)+1:1;}catch(error){console.warn('Candidate API unavailable:',String(error));break;}
 for(const candidate of candidates){
  const id=slug(candidate.name);
  if(used.has(id)||usedNames.has(candidate.name)||overrides.blocked.includes(id)||overrides.blocked.includes(candidate.name))continue;
  if(inspected++>=100)break;
  try {
   let result;
   try {const cached=JSON.parse(await readFile(`public/data/animals/${id}.json`,'utf8'));await validateAnimal(cached);result={animal:cached,score:0};}catch {result=await fetchAnimal(candidate,overrides.accents[id]);}
   await validateAnimal(result.animal);pool.push(result);used.add(id);console.log(`Candidate: ${result.animal.commonName}`);
  }catch(error){console.warn(`Skipped ${candidate.name}: ${String(error)}`);}
  if(pool.length>=needs+4)break;
 }
 if(inspected>=100)break;
}
pool.sort((a,b)=>b.score-a.score);
let previous:Animal=JSON.parse(await readFile(`public/data/animals/${schedule.order.at(-1)}.json`,'utf8'));
let added=0;
while(schedule.order.length<target&&pool.length){
 const date=new Date(Date.parse(schedule.launch+'T00:00:00Z')+schedule.order.length*86400000).toISOString().slice(0,10);
 const pin=overrides.pins[date];
 let index=pin?pool.findIndex(p=>p.animal.id===pin):pool.findIndex(p=>p.animal.taxonomy.class!==previous.taxonomy.class);
 if(pin&&index<0){console.warn(`Pinned species ${pin} unavailable; stopping rather than overriding the pin.`);break;}
 if(index<0)index=0;
 const {animal}=pool.splice(index,1)[0];
 if(overrides.accents[animal.id]){animal.theme=makeTheme(overrides.accents[animal.id]);await writeFile(`public/data/animals/${animal.id}.json`,JSON.stringify(animal,null,2)+'\n');}
 await validateAnimal(animal);schedule.order.push(animal.id);previous=animal;added++;
}
if(added){await writeFile('public/data/schedule.json.tmp',JSON.stringify(schedule,null,2)+'\n');await rename('public/data/schedule.json.tmp','public/data/schedule.json');}
console.log(`Appended ${added} animals. Existing entries preserved. ${Math.max(0,schedule.order.length-current-1)} future days available.`);
if(pagesFetched){
 await writeFile('data-pipeline/discovery-state.json',JSON.stringify({nextPage},null,2)+'\n');
}
if(!added){
 console.warn('No new animals passed validation. The existing schedule remains in use; the next daily run will try again.');
 if(!pagesFetched)process.exitCode=1;
}

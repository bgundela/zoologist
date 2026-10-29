import { readFile,readdir,writeFile } from 'node:fs/promises';
import { json } from './http';
import { extractFacts,explicitTraits } from './enrich';
import { validateAnimal } from './validate';
import { localDate } from '../src/lib/today';
import type { Animal } from './types';
// Explicit maintenance command: repairs content, never changes dates or review status.
const pending:{path:string;animal:Animal}[]=[];
for(const file of await readdir('public/data/animals')){
 if(!file.endsWith('.json'))continue;
 const path=`public/data/animals/${file}`;
 const animal:Animal=JSON.parse(await readFile(path,'utf8'));
 if(animal.reviewed)continue;
 const wiki=animal.sources.find(s=>new URL(s.url).hostname==='en.wikipedia.org');
 if(!wiki)throw new Error(`No Wikipedia source for ${animal.id}`);
 const title=decodeURIComponent(new URL(wiki.url).pathname.split('/wiki/')[1]);
 const result=await json(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts%7Crevisions&rvprop=ids&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}`);
 const page:any=Object.values(result.query.pages)[0];
 const revision=page.revisions?.[0]?.revid;
 if(!revision)throw new Error('Missing source revision');
 const source=`https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ','_'))}?oldid=${revision}`;
 const facts=extractFacts(page.extract||'',source);
 if(facts.length<3)throw new Error(`Insufficient clean facts for ${animal.id}; original record kept`);
 animal.funFacts=facts;
 const traits=explicitTraits(page.extract,[animal.commonName,animal.scientificName]);
 animal.stats.activity=traits.activity;animal.stats.activityNote=traits.activity?'Explicitly described in the source article':'';
 animal.stats.livesIn=traits.livesIn;animal.stats.livesInNote=traits.livesIn?'Explicitly described as arboreal in the source article':'';
 animal.updatedAt=localDate();
 await validateAnimal(animal);
 pending.push({path,animal});
 console.log(JSON.stringify({id:animal.id,facts,traits}));
}
// Validate every proposed repair before replacing any existing records.
for(const {path,animal} of pending)await writeFile(path,JSON.stringify(animal,null,2)+'\n');
console.log(`Repaired ${pending.length} records; schedule and review status preserved.`);

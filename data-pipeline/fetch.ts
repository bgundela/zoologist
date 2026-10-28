import { json,request } from './http';
import { extractFacts,nicheScore } from './enrich';
import type { Candidate } from './discover';
import type { Animal } from './types';
import { processImage,openLicense } from './images';
import { photoTheme } from './theme';
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
const strip=(s:string)=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').trim();
const status:Record<string,[string,string]>={Q211005:['LC','Least concern'],Q719675:['NT','Near threatened'],Q278113:['VU','Vulnerable'],Q11394:['EN','Endangered'],Q219127:['CR','Critically endangered'],Q239509:['EW','Extinct in the wild'],Q237350:['EX','Extinct'],Q3245245:['DD','Data deficient']};
const categories:Record<string,string>={Mammalia:'Mammal',Aves:'Bird',Reptilia:'Reptile',Amphibia:'Amphibian',Actinopterygii:'Fish',Insecta:'Insect',Mollusca:'Mollusk',Arachnida:'Arachnid'};
export function quantity(claims:any,property:string,units:Record<string,number>) {
 const quantities=(claims[property]||[]).flatMap((c:any)=>{
  if(c.rank==='deprecated')return [];
  const roles=c.qualifiers?.P3831||[];
  if(roles.some((q:any)=>q.datavalue?.value?.id!=='Q78101716'))return [];
  const value=c.mainsnak?.datavalue?.value;if(!value || !(value.unit in units))return [];
  const min=Number(value.lowerBound??value.amount)*units[value.unit],max=Number(value.upperBound??value.amount)*units[value.unit];
  return Number.isFinite(min)&&min>0&&Number.isFinite(max)?[{min,max}]:[];
 });
 return quantities.length?{min:Math.min(...quantities.map((q:any)=>q.min)),max:Math.max(...quantities.map((q:any)=>q.max))}:null;
}
export async function fetchAnimal(candidate:Candidate,accent?:string):Promise<{animal:Animal;score:number}> {
 const taxon=(await json(`https://api.inaturalist.org/v1/taxa/${candidate.id}`)).results[0];
 const gbif=await json(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(candidate.name)}&rank=SPECIES&kingdom=Animalia&strict=true`);
 if(gbif.matchType!=='EXACT'||gbif.rank!=='SPECIES'||gbif.status!=='ACCEPTED')throw new Error('Species is not an exact accepted GBIF match');
 const articleTitle=decodeURIComponent(new URL(taxon.wikipedia_url).pathname.split('/wiki/')[1]);
 const wiki=await json(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts%7Cpageprops&explaintext=1&redirects=1&titles=${encodeURIComponent(articleTitle)}`);
 const page:any=Object.values(wiki.query.pages)[0];
 const text=page.extract||'';if(text.length<2000)throw new Error('Article too short');
 const source=`https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ','_'))}`;
 const article=text.split(/\n== (?:References|Notes|Bibliography|External links) ==/i)[0];
 const facts=extractFacts(article,source);if(facts.length<3)throw new Error('Fewer than three sourceable facts');
 const qid=page.pageprops?.wikibase_item;if(!qid)throw new Error('No Wikidata entity');
 const claims=(await json(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`)).entities[qid].claims;
 const weight=quantity(claims,'P2067',{'http://www.wikidata.org/entity/Q11570':1,'http://www.wikidata.org/entity/Q41803':.001});
 const length=quantity(claims,'P2043',{'http://www.wikidata.org/entity/Q174728':1,'http://www.wikidata.org/entity/Q11573':100,'http://www.wikidata.org/entity/Q174789':.1});
 // Lifespan values need wild/captivity context; leave unknown rather than assume.
 const lifespan=null;
 const intro=text.split('\n').filter((p:string)=>p.length>100&&!p.startsWith('==')).slice(0,2);
 // Only use explicit sourced descriptions; never infer a diet/activity from taxonomy.
 const dietSentence=text.match(/[^.!?\n]*\b(?:diet consists|feeds (?:mainly |primarily )?on|diet includes|is (?:an? )?(?:omnivor|carnivor|herbivor))[^.!?\n]*[.!?]/i)?.[0]?.trim()||null;
 const activity=/\bnocturnal\b/i.test(text)?'Nocturnal':/\bdiurnal\b/i.test(text)?'Diurnal':null;
 const arboreal=/\barboreal\b/i.test(text)?'Trees':null;
 const count=[weight,length,lifespan,dietSentence,activity,arboreal].filter(Boolean).length;
 if(count<3)throw new Error('Insufficient documented quick stats');
 let photo:any;
 for(const entry of taxon.taxon_photos||[]){const p=entry.photo;if(!p)continue;const code=(p.license_code||'').toLowerCase();if(['cc0','cc-by','cc-by-sa'].includes(code)){photo=p;break;}}
 if(!photo)throw new Error('No openly licensed iNaturalist photo');
 const license=photo.license_code.toLowerCase()==='cc0'?'CC0 1.0':photo.license_code.toLowerCase()==='cc-by'?'CC BY 4.0':'CC BY-SA 4.0';
 if(!openLicense.test(license))throw new Error('Unapproved photo license');
 const photoUrl=photo.original_url||photo.large_url;if(!photoUrl)throw new Error('No large photo');
 const image=Buffer.from(await (await request(photoUrl)).arrayBuffer());
 const id=candidate.name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
 await processImage(image,id,license);
 const theme=await photoTheme(`public/img/${id}-1200.webp`,accent);
 const countries=await json(`https://api.gbif.org/v1/occurrence/search?taxon_key=${gbif.usageKey}&limit=0&facet=country&facetLimit=100&has_coordinate=true`);
 const codes=countries.facets?.[0]?.counts?.map((c:any)=>c.name)||[];
 if(!codes.length)throw new Error('No georeferenced range records');
 const regions=codes.map((code:string)=>new Intl.DisplayNames(['en'],{type:'region'}).of(code)||code);
 const density=Buffer.from(await (await request(`https://api.gbif.org/v2/map/occurrence/density/0/0/0@1x.png?taxonKey=${gbif.usageKey}&style=classic.poly&bin=hex&hexPerTile=100`)).arrayBuffer());
 const basemap=Buffer.from(await (await request('https://tile.gbif.org/3857/omt/0/0/0@1x.png?style=gbif-light')).arrayBuffer());
 await sharp(basemap).resize(512,512).tint(theme.tokens.line).composite([{input:await sharp(density).resize(512,512).tint(theme.accent).toBuffer()}]).webp().toFile(`public/img/${id}-range.webp`);
 const code=claims.P141?.find((c:any)=>c.rank!=='deprecated')?.mainsnak?.datavalue?.value?.id;
 const conservation=status[code]||['NE','Not evaluated'];
 let views=0;
 try{const end=new Date();end.setUTCDate(1);end.setUTCDate(0);const start=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth(),1));const fmt=(d:Date)=>d.toISOString().slice(0,10).replaceAll('-','');const result=await json(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(page.title.replaceAll(' ','_'))}/monthly/${fmt(start)}/${fmt(end)}`);views=result.items?.[0]?.views||0;}catch{}
 const gbifUrl=`https://www.gbif.org/species/${gbif.usageKey}`;
 const animal:Animal={id,commonName:taxon.preferred_common_name,scientificName:candidate.name,taxonomy:{class:gbif.class||taxon.iconic_taxon_name||'Animalia',order:gbif.order||'Not well documented',family:gbif.family||'Not well documented'},category:categories[taxon.iconic_taxon_name]||'Invertebrate',conservationStatus:{code:conservation[0],label:conservation[1]},theme,stats:{weightKg:weight,lengthCm:length?{...length,note:'Reported length; see source'}:null,lifespanYrs:{wild:null,captivity:null},diet:dietSentence?'See diet below':null,dietNote:dietSentence||'',activity,activityNote:'Described in the source article',livesIn:arboreal,livesInNote:arboreal?'Arboreal species':''},habitat:{types:['See source article for habitat details'],ecosystemRole:'Not well documented',regions,countries:codes,rangeMapUrl:`/img/${id}-range.webp`,mapNote:'GBIF recorded occurrences, world view (north up). Records show observations, not the complete native range. GBIF contributors; see source for dataset licenses. Basemap © OpenStreetMap contributors / OpenMapTiles; Natural Earth.',threats:'See conservation information in the sources.'},funFacts:facts,summary:intro,image:{src:`/img/${id}-1200.webp`,srcset:[`/img/${id}-600.webp 600w`,`/img/${id}-1200.webp 1200w`],alt:`${taxon.preferred_common_name} (${candidate.name}); species reference photograph`,credit:photo.attribution||'iNaturalist contributor',license,licenseUrl:license==='CC0 1.0'?'https://creativecommons.org/publicdomain/zero/1.0/':`https://creativecommons.org/licenses/${license.includes('SA')?'by-sa':'by'}/4.0/`,sourceUrl:`https://www.inaturalist.org/photos/${photo.id}`,changes:'Resized and converted to WebP'},sources:[{label:'Wikipedia (CC BY-SA 4.0)',url:source},{label:'Wikidata',url:`https://www.wikidata.org/wiki/${qid}`},{label:'iNaturalist',url:`https://www.inaturalist.org/taxa/${taxon.id}`},{label:'GBIF & dataset credits',url:gbifUrl},{label:'Map attribution',url:'https://tile.gbif.org/ui/'}],textLicense:'Extracts from Wikipedia, CC BY-SA 4.0. Formatting and selection edited. https://creativecommons.org/licenses/by-sa/4.0/',reviewed:false,updatedAt:new Date().toISOString().slice(0,10)};
 await writeFile(`public/data/animals/${id}.json`,JSON.stringify(animal,null,2)+'\n');
 return {animal,score:nicheScore(candidate.observations_count,text.length,count,views)};
}

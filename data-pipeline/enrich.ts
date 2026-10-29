// Extractive only: preserve whole source sentences, never invent or rewrite claims.
const excludedSections = /\b(?:taxonomy|taxonomic|systematics|subspecies|classification|etymology|naming|nomenclature|references|bibliography|external links|further reading|notes|basics)\b/i;
const backMatter = /^(?:references|bibliography|external links|further reading|notes|sources)$/i;
const taxonomyText = /\b(?:formally described|first described|first formally described|binomial|subspecies|genus|genera|taxonom|naturalist|coined the name|named after|etymology)\b/i;
const verb = /\b(?:is|are|was|were|has|have|had|can|may|will|do|does|did|feeds?|hunts?|eats?|lives?|sleeps?|uses?|taps?|finds?|helps?|keeps?|grows?|grow|migrates?|nests?|lays?|builds?|curls?|spends?|spend|ranges?|plays?|maintained|adapt|appear|emerge|occurs?|breeds?|produces?|weighs?|inhabits?|includes?|search(?:es)?|performs?|travels?|imitates?)\b/i;
export function factProblem(text:string):string|null {
 if(text!==text.trim() || /\n/.test(text))return 'Fact must be a single trimmed sentence';
 if(text.length<65 || text.length>320)return 'Fact length is outside the supported range';
 if(!/^[A-Z“"]/.test(text) || !/[.!?]["”]?$/.test(text))return 'Fact is not a complete sentence';
 if(/={2,}|\[|\]|\{\{|\}\}|<[^>]*>|https?:\/\/|\b(?:ISBN|doi:|Retrieved|copyright|citation needed)\b/i.test(text))return 'Fact contains markup or reference metadata';
 if(/\b[A-Z]\.["”]?$/.test(text) || /^(?:[A-Z]\.\s*)+/.test(text) || /^\S+\s+\([^)]*\d{4}/.test(text))return 'Fact looks like a taxonomic list fragment';
 if((text.match(/\(/g)||[]).length!==(text.match(/\)/g)||[]).length)return 'Fact contains a cut-off parenthetical';
 if(!verb.test(text))return 'Fact lacks a recognizable sentence predicate';
 return null;
}
export function proseParagraphs(text:string):string[] {
 const paragraphs:string[]=[];
 let blockedLevel:number|null=null;
 for(const raw of text.replace(/\r\n?/g,'\n').split(/\n+/)){
  const line=raw.trim();if(!line)continue;
  const heading=line.match(/^(={2,6})\s*(.*?)\s*\1$/);
  if(heading){
   if(backMatter.test(heading[2]))break;
   const level=heading[1].length;
   if(blockedLevel!==null && level<=blockedLevel)blockedLevel=null;
   if(blockedLevel===null && excludedSections.test(heading[2]))blockedLevel=level;
   continue;
  }
  if(blockedLevel!==null || /^(?:[*#;:|!]|[-–—•]\s)/.test(line) || /={2,}|\{\{|\}\}|<[^>]*>/.test(line))continue;
  const cleaned=line.replace(/\[(?:\d+(?:[–, -]\d+)*|citation needed)\]/gi,'').replace(/\s+/g,' ').trim();
  // Reject whole list rows before segmentation can turn one into a plausible fragment.
  if(!/^[A-Z“"]/.test(cleaned) || /^(?:[A-Z]\.\s*)+/.test(cleaned) || /^\S+\s+\([^)]*\d{4}/.test(cleaned))continue;
  paragraphs.push(cleaned);
 }
 return paragraphs;
}
const segmenter=new Intl.Segmenter('en',{granularity:'sentence'});
export function extractFacts(text:string,source:string) {
 const seen=new Set<string>();
 const paragraphs=proseParagraphs(text);
 const candidates=paragraphs.flatMap((p,paragraph)=>Array.from(segmenter.segment(p),s=>({text:s.segment.trim(),paragraph})));
 const ranked=candidates.filter(({text:s})=>{
  if(factProblem(s) || taxonomyText.test(s) || /\b(?:assorted threats|only increasing|this study|these findings|the former|the latter)\b/i.test(s))return false;
  const key=s.toLowerCase().replace(/[^a-z0-9]/g,'');if(seen.has(key))return false;seen.add(key);return true;
 }).map(({text,paragraph},index)=>({text,paragraph,source,index,score:(/\b(?:nocturnal|venom|camouflage|taps?|glow|feeds?|hunts?|burrow\w*|nests?|wings?|feathers?|calls?|eggs?|young)\b/i.test(text)?3:0)+(text.length<240?1:0)}))
 .sort((a,b)=>b.score-a.score||a.index-b.index);
 const chosen:typeof ranked=[];
 const usedParagraphs=new Set<number>();
 for(const candidate of ranked){if(usedParagraphs.has(candidate.paragraph))continue;chosen.push(candidate);usedParagraphs.add(candidate.paragraph);if(chosen.length===4)break;}
 // If prose is one long paragraph, keep the same strict sentence checks.
 if(chosen.length<3)for(const candidate of ranked){if(chosen.includes(candidate))continue;chosen.push(candidate);if(chosen.length===3)break;}
 return chosen.map(({text,source})=>({text,source}));
}
// A keyword elsewhere in an article may describe prey or a predator. Only accept
// an explicit description whose grammatical subject names this species.
export function explicitTraits(text:string,names:string[]) {
 const namesPattern=names.map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
 const subject=`(?:The )?(?:${namesPattern})(?:s)?`;
 const direct=new RegExp(`^${subject} (?:is|are) (?:a |an )?(?:(?:primarily|mainly|largely|mostly|strictly|typically) )?(nocturnal|diurnal|crepuscular|arboreal)\\b`,'i');
 const matches=proseParagraphs(text).flatMap(p=>Array.from(segmenter.segment(p),s=>s.segment.trim())).map(s=>s.match(direct)?.[1]?.toLowerCase()).filter(Boolean);
 const activities=[...new Set(matches.filter(x=>x!=='arboreal'))];
 return {activity:activities.length===1?activities[0]![0].toUpperCase()+activities[0]!.slice(1):null,livesIn:matches.includes('arboreal')?'Trees':null};
}
export function nicheScore(observations:number,articleLength:number,stats:number,pageviews:number) {
 const obscurity=pageviews>100 && pageviews<100000?Math.max(0,20-Math.abs(Math.log10(pageviews)-3.5)*7):0;
 return obscurity+Math.min(20,articleLength/1000)+stats*5+Math.min(10,Math.log10(Math.max(1,observations))*2);
}

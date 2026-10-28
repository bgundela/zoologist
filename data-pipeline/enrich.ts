// Extractive only: sentences stay attributed to the source article. No LLM integration.
export function extractFacts(text:string,source:string) {
 const sentences=text.replace(/\[[^\]]*\]/g,'').replace(/\s+/g,' ').match(/[^.!?]+[.!?]+(?:["”])?/g)||[];
 return sentences.map((s,index)=>({text:s.trim(),source,index,score:(/\d|largest|smallest|only|unique|unusual|unlike|special|nocturnal|venom|camouflage|tap|glow|migrat|adapt|feed|hunt|burrow/i.test(s)?3:0)+(s.length<240?1:0)}))
 .filter(s=>s.text.length>=65 && s.text.length<=320 && !/\b(?:ISBN|doi:|Retrieved|copyright|citation needed)\b/i.test(s.text))
 .sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,4).map(({text,source})=>({text,source}));
}
export function nicheScore(observations:number,articleLength:number,stats:number,pageviews:number) {
 const obscurity=pageviews>100 && pageviews<100000?Math.max(0,20-Math.abs(Math.log10(pageviews)-3.5)*7):0;
 return obscurity+Math.min(20,articleLength/1000)+stats*5+Math.min(10,Math.log10(Math.max(1,observations))*2);
}

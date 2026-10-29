import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayIndex,selectDay,untilMidnight,validDate } from '../src/lib/today';
import { extractFacts } from '../data-pipeline/enrich';
import { makeTheme,contrast } from '../data-pipeline/theme';
import { renderAnimal } from '../src/lib/render';
import fixture from '../public/data/animals/aye-aye.json';
import type { Animal } from '../data-pipeline/types';
const schedule={launch:'2026-10-28',order:['aye-aye','bird','fish'],fallback:'aye-aye'};
test('same local day picks consistently and changes at midnight',()=>{
 for(const hour of [0,8,12,23])assert.equal(selectDay(schedule,null,new Date(2026,9,29,hour,59)).id,'bird');
 assert.equal(selectDay(schedule,null,new Date(2026,9,30,0)).id,'fish');
});
test('date arithmetic ignores DST and leap days',()=>{assert.equal(dayIndex('2026-11-02','2026-10-31'),2);assert.equal(dayIndex('2028-03-01','2028-02-28'),2);});
test('DST countdown uses next local midnight',()=>{const d=new Date(2026,10,1,0);assert.equal(untilMidnight(d),new Date(2026,10,2).getTime()-d.getTime());});
test('past links work; future, malformed, prelaunch and unscheduled dates use today',()=>{
 const now=new Date(2026,9,29,13);
 assert.equal(selectDay(schedule,'2026-10-28',now).archived,true);
 for(const date of ['2026-10-30','2026-02-30','nope','2026-10-20','2027-01-01'])assert.equal(selectDay(schedule,date,now).id,'bird');
 assert.equal(validDate('2026-02-30'),false);
});
test('exhausted schedule uses explicit fallback without rewriting historical picks',()=>{assert.equal(selectDay(schedule,null,new Date(2027,1,1)).id,'aye-aye');});
test('themes pass AA in both modes',()=>{for(const color of ['#ffee00','#00aaff','#b4561e']){const t=makeTheme(color);assert.ok(contrast(t.accent,'#ffffff')>=4.5);assert.ok(contrast(t.dark.muted,t.dark.wash)>=4.5);}});
test('extractive facts preserve source text and attribution',()=>{const text='This unusual animal hunts for its food at night and sleeps in sheltered nests during daylight hours. Its largest claws are used for digging burrows and uncovering small invertebrates beneath the soil. Only the adults have these distinctive markings, which appear gradually as the young animals mature.';const facts=extractFacts(text,'https://example.org');assert.equal(facts.length,3);for(const fact of facts){assert.ok(text.includes(fact.text));assert.equal(fact.source,'https://example.org');}});
test('missing stats never render null or undefined, and text is escaped',()=>{const a=structuredClone(fixture) as Animal;a.stats.weightKg=null;a.stats.diet=null;a.commonName='<script>alert(1)</script>';const html=renderAnimal(a);assert.ok(html.includes('Not well documented'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('undefined'));assert.ok(!html.includes('>null<'));});
test('imperial rendering converts values',()=>{const html=renderAnimal(fixture as Animal,true);assert.ok(html.includes('4.4–6 lb'));assert.ok(html.includes('14.2–17.3 in'));});

import { permalink,shareAnimal } from '../src/lib/share';
test('share links preserve only the selected date',()=>{assert.equal(permalink('https://zoologist.example/?tracking=1#main','2026-10-28'),'https://zoologist.example/?date=2026-10-28');});
test('sharing uses native share with a dated link',async()=>{let received:any;const platform={share:async(data:any)=>{received=data;}} as Parameters<typeof shareAnimal>[2];assert.match(await shareAnimal('Aye-aye','https://example.org/?date=2026-10-28',platform),/Thanks/);assert.equal(received.url,'https://example.org/?date=2026-10-28');});
test('share fallback copies, handles denial, and cancels quietly',async()=>{let copied='';const p={clipboard:{writeText:async(s:string)=>{copied=s;}}} as Parameters<typeof shareAnimal>[2];assert.match(await shareAnimal('Aye-aye','https://example.org/',p),/copied/);assert.equal(copied,'https://example.org/');const denied={clipboard:{writeText:async()=>{throw new Error('denied');}}} as Parameters<typeof shareAnimal>[2];assert.match(await shareAnimal('Aye-aye','https://example.org/',denied),/Copy this link/);const canceled={share:async()=>{throw Object.assign(new Error('Canceled'),{name:'AbortError'});}} as Parameters<typeof shareAnimal>[2];assert.equal(await shareAnimal('Aye-aye','https://example.org/',canceled),'');});

import { quantity } from '../data-pipeline/fetch';
test('adult measurements exclude birth-weight qualifiers and deprecated values',()=>{const claim=(amount:string,role:string,rank='normal')=>({rank,mainsnak:{datavalue:{value:{amount,unit:'kg'}}},qualifiers:{P3831:[{datavalue:{value:{id:role}}}]}});assert.deepEqual(quantity({P2067:[claim('+0.115','Q4128476'),claim('+2.5','Q78101716'),claim('+100','Q78101716','deprecated')]},'P2067',{kg:1}),{min:2.5,max:2.5});});

import { verifyAppendOnly } from '../data-pipeline/schedule-integrity';
test('automated publishing preserves historical selections and rejects repeated new species',()=>{
 const before={launch:'2026-10-28',fallback:'aye-aye',order:['aye-aye','bird']};
 assert.doesNotThrow(()=>verifyAppendOnly(before,{...before,order:[...before.order,'fish']}));
 assert.throws(()=>verifyAppendOnly(before,{...before,order:['fish','bird']}),/preserve/);
 assert.throws(()=>verifyAppendOnly(before,{...before,order:['aye-aye']}),/preserve/);
 assert.throws(()=>verifyAppendOnly(before,{...before,launch:'2026-01-01'}),/launch/);
 assert.throws(()=>verifyAppendOnly(before,{...before,order:[...before.order,'bird']}),/repeated/);
});

import { backfillElapsedDays } from '../data-pipeline/scheduling';
test('discovery leaves an unassigned current day open instead of repeating the fallback',()=>{
 const original=['aye-aye'];
 // Oct 29 is day 1, including when the UTC+14 workflow reaches it before Los Angeles.
 const order=backfillElapsedDays(original,1,'aye-aye');
 assert.deepEqual(order,['aye-aye']);
 order.push('buteo-lineatus');
 assert.equal(selectDay({launch:'2026-10-28',fallback:'aye-aye',order},null,new Date(2026,9,29,12)).id,'buteo-lineatus');
 assert.deepEqual(original,['aye-aye']);
});
test('discovery backfills missing past days while preserving existing assignments',()=>{
 assert.deepEqual(backfillElapsedDays(['aye-aye'],3,'aye-aye'),['aye-aye','aye-aye','aye-aye']);
 assert.deepEqual(backfillElapsedDays(['aye-aye','bird','fish'],1,'aye-aye'),['aye-aye','bird','fish']);
});

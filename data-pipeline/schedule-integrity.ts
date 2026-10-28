import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { Schedule } from '../src/lib/today';
export function verifyAppendOnly(before:Schedule,after:Schedule) {
 if(before.launch!==after.launch || before.fallback!==after.fallback)throw new Error('Discovery cannot change the launch date or fallback.');
 if(after.order.length<before.order.length || before.order.some((id,i)=>after.order[i]!==id))throw new Error('Discovery must preserve every existing schedule entry.');
 const used=new Set(before.order);
 for(const id of after.order.slice(before.order.length)){
  // Elapsed days without a scheduled entry can be backfilled with the explicit fallback.
  if(id!==after.fallback && used.has(id))throw new Error('Discovery appended a repeated species.');
  used.add(id);
 }
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 const before=JSON.parse(execFileSync('git',['show','HEAD:public/data/schedule.json'],{encoding:'utf8'}));
 const after=JSON.parse(await readFile('public/data/schedule.json','utf8'));
 verifyAppendOnly(before,after);
 console.log('Existing daily selections preserved.');
}

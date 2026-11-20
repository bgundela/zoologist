import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { dayIndex, localDate, type Schedule } from '../src/lib/today';
import { backfillElapsedDays } from './scheduling';
export function verifyAppendOnly(before:Schedule,after:Schedule,today=localDate()) {
 if(before.launch!==after.launch || before.fallback!==after.fallback)throw new Error('Discovery cannot change the launch date or fallback.');
 if(after.order.length<before.order.length || before.order.some((id,i)=>after.order[i]!==id))throw new Error('Discovery must preserve every existing schedule entry.');
 const elapsed=backfillElapsedDays(before,dayIndex(today,before.launch));
 const used=new Set(before.order);
 for(let index=before.order.length;index<after.order.length;index++){
  const id=after.order[index];
  if(index<elapsed.length){
   if(id!==elapsed[index])throw new Error('Discovery must preserve the rotation for elapsed dates.');
   continue;
  }
  if(id===after.fallback || used.has(id))throw new Error('Discovery appended a repeated species.');
  used.add(id);
 }
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 const before=JSON.parse(execFileSync('git',['show','HEAD:public/data/schedule.json'],{encoding:'utf8'}));
 const after=JSON.parse(await readFile('public/data/schedule.json','utf8'));
 verifyAppendOnly(before,after,process.env.SCHEDULE_DATE);
 console.log('Existing daily selections preserved.');
}

import { permalink,shareAnimal } from './share';
import schedule from '../../public/data/schedule.json';
import { localDate, selectDay, untilMidnight } from './today';
import { renderAnimal } from './render';
import type { Animal } from '../../data-pipeline/types';
const animals=Object.values(import.meta.glob('../../public/data/animals/*.json',{eager:true,import:'default'})) as Animal[];
const content=document.querySelector<HTMLElement>('#animal-content')!;
const banner=document.querySelector<HTMLElement>('#archive-banner')!;
let imperial=false;
try {imperial=localStorage.getItem('zoologist-units')==='imperial';} catch {}
let selection=selectDay(schedule,new URLSearchParams(location.search).get('date'));
let animal=animals.find(a=>a.id===selection.id)!;
let lastDate=localDate();
function applyTheme(){
 const dark=matchMedia('(prefers-color-scheme: dark)').matches;
 for(const [key,value] of Object.entries(dark?animal.theme.dark:animal.theme.tokens))document.documentElement.style.setProperty('--accent-'+key,value);
 document.documentElement.style.setProperty('--accent',animal.theme.accent);
 document.documentElement.style.setProperty('--accent-bright',animal.theme.accentDark);
 document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content=animal.theme.accent;
}
function render(){
 selection=selectDay(schedule,new URLSearchParams(location.search).get('date'));
 animal=animals.find(a=>a.id===selection.id)||animals.find(a=>a.id===schedule.fallback)!;
 applyTheme();content.innerHTML=renderAnimal(animal,imperial);delete document.documentElement.dataset.pending;
 const time=document.querySelector<HTMLTimeElement>('#header-date')!;
 time.dateTime=selection.date;time.textContent=new Date(selection.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
 banner.hidden=!selection.archived;banner.querySelector('span')!.textContent=time.textContent;
 document.title=`${animal.commonName} · Zoologist`;
 document.querySelector('#share-button')!.lastChild!.textContent=selection.archived?'Share this animal':'Share today’s animal';
}
content.addEventListener('click',event=>{
 const button=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-unit]');if(!button)return;
 imperial=button.dataset.unit==='imperial';try{localStorage.setItem('zoologist-units',imperial?'imperial':'metric');}catch{}
 render();content.querySelector<HTMLButtonElement>(`[data-unit="${imperial?'imperial':'metric'}"]`)!.focus();
});
function tick(){
 if(localDate()!==lastDate){lastDate=localDate();render();}
 const minutes=Math.max(1,Math.ceil(untilMidnight()/60000));
 document.querySelector('#countdown')!.textContent=`${Math.floor(minutes/60)}h ${minutes%60}m`;
}
render();tick();setInterval(tick,1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme);
document.querySelector('#share-button')!.addEventListener('click',async()=>{
 document.querySelector('#share-message')!.textContent=await shareAnimal(animal.commonName,permalink(location.href,selection.date),navigator);
});

export function permalink(href:string,date:string) {
 const url=new URL(href);url.search='';url.hash='';url.searchParams.set('date',date);return url.href;
}
export async function shareAnimal(name:string,url:string,platform:{share?:(data:ShareData)=>Promise<void>;clipboard?:{writeText:(text:string)=>Promise<void>}}):Promise<string>{
 try{
  if(platform.share){await platform.share({title:`Meet the ${name} · Zoologist`,text:'A little daily discovery.',url});return 'Thanks for sharing a little curiosity.';}
  if(platform.clipboard){await platform.clipboard.writeText(url);return 'Link copied. Share a little curiosity!';}
 }catch(error){if((error as Error).name==='AbortError')return '';}
 return `Copy this link: ${url}`;
}

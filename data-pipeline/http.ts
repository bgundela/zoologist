const lastRequest=new Map<string,number>();
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
export async function request(url:string):Promise<Response> {
 const host=new URL(url).hostname;
 for(let attempt=0;attempt<3;attempt++){
  await delay(Math.max(0,1100-(Date.now()-(lastRequest.get(host)||0))));lastRequest.set(host,Date.now());
  try {
   const response=await fetch(url,{headers:{'User-Agent':'Zoologist/1.0 (https://github.com/bgundela/zoologist; daily animal educational project)'},signal:AbortSignal.timeout(30000)});
   if(response.ok)return response;
   if(response.status!==429 && response.status<500)throw new Error(`${response.status}: ${url}`);
   if(attempt===2)throw new Error(`${response.status}: ${url}`);
   await delay(Math.min(15000,Number(response.headers.get('retry-after')||2)*1000*(attempt+1)));
  }catch(error){if(attempt===2)throw error;await delay(2000*(attempt+1));}
 }
 throw new Error(`Request exhausted: ${url}`);
}
export async function json(url:string):Promise<any> {return (await request(url)).json();}

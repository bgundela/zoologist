const lastRequest=new Map<string,number>();
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
export async function request(url:string):Promise<Response> {
 const host=new URL(url).hostname;
 for(let attempt=0;attempt<3;attempt++){
  await delay(Math.max(0,1100-(Date.now()-(lastRequest.get(host)||0))));lastRequest.set(host,Date.now());
  let response:Response;
  try {
   response=await fetch(url,{headers:{'User-Agent':'Zoologist/1.0 (https://github.com/bgundela/zoologist; daily animal educational project)'},signal:AbortSignal.timeout(30000)});
  }catch(error){if(attempt===2)throw error;await delay(2000*(attempt+1));continue;}
  if(response.ok)return response;
  if(attempt===2||(response.status!==429 && response.status<500))throw new Error(`${response.status}: ${url}`);
  const header=response.headers.get('retry-after');
  const seconds=header && /^\d+$/.test(header) ? Number(header) : header ? (Date.parse(header)-Date.now())/1000 : NaN;
  await delay(Math.min(15000,Math.max(0,Number.isFinite(seconds)?seconds:2*(attempt+1))*1000));
 }
 throw new Error(`Request exhausted: ${url}`);
}
export async function json(url:string):Promise<any> {return (await request(url)).json();}

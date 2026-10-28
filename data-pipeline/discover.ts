import { json } from './http';
export type Candidate={id:number;name:string;preferred_common_name?:string;iconic_taxon_name?:string;observations_count:number;wikipedia_url?:string;rank:string};
export async function discoverCandidates(page=1):Promise<Candidate[]> {
 const data=await json(`https://api.inaturalist.org/v1/taxa?taxon_id=1&rank=species&is_active=true&per_page=100&page=${page}&order=desc&order_by=observations_count`);
 return data.results.filter((t:Candidate)=>t.wikipedia_url&&t.preferred_common_name&&t.rank==='species');
}

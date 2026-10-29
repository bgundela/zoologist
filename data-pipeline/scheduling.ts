// Preserve elapsed dates, but leave an unassigned current day available for a discovery.
export function backfillElapsedDays(order:string[],current:number,fallback:string):string[] {
 const result=[...order];
 while(result.length<current)result.push(fallback);
 return result;
}

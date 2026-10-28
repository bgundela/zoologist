import fixture from '../public/data/animals/aye-aye.json';
export type Animal = Omit<typeof fixture,'theme'|'stats'|'conservationStatus'> & {
 theme: ReturnType<typeof import('./theme').makeTheme>;
 conservationStatus: {code:string;label:string};
 stats: {weightKg: {min:number;max:number}|null;lengthCm:{min:number;max:number;note:string}|null;lifespanYrs:{wild:number|null;captivity:number|null};diet:string|null;dietNote:string;activity:string|null;activityNote:string;livesIn:string|null;livesInNote:string};
};

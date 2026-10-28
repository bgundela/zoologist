import sharp from 'sharp';
const rgb = (hex: string) => hex.replace('#','').match(/../g)!.map(x=>parseInt(x,16));
export function mix(hex: string, target: string, fraction: number) { return '#'+rgb(hex).map((c,i)=>Math.round(c+(rgb(target)[i]-c)*fraction).toString(16).padStart(2,'0')).join(''); }
function luminance(hex:string) { return rgb(hex).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0); }
export function contrast(a:string,b:string) { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
export function makeTheme(input:string, source='manual') {
  let accent=input;
  for(let i=0;contrast(accent,'#ffffff')<4.5 && i<40;i++) accent=mix(accent,'#000000',.04);
  const tokens={wash:mix(accent,'#ffffff',.96),soft:mix(accent,'#ffffff',.88),line:mix(accent,'#ffffff',.72),ink:mix(accent,'#000000',.82),muted:mix(accent,'#000000',.5),deep:mix(accent,'#000000',.56),'on-deep':mix(accent,'#ffffff',.9)};
  const dark={wash:mix(accent,'#000000',.90),soft:mix(accent,'#000000',.78),line:mix(accent,'#000000',.45),ink:mix(accent,'#ffffff',.92),muted:mix(accent,'#ffffff',.7),deep:mix(accent,'#000000',.65),'on-deep':mix(accent,'#ffffff',.92)};
  return {accent,tokens,accentDark:mix(accent,'#ffffff',.45),dark,source};
}
export async function photoTheme(path:string,override?:string) {
  if(override)return makeTheme(override);
  const { dominant }=await sharp(path).stats();
  const values=[dominant.r,dominant.g,dominant.b];
  const extracted='#'+values.map(v=>v.toString(16).padStart(2,'0')).join('');
  return makeTheme(Math.max(...values)-Math.min(...values)<20?'#8b501f':extracted,'photo-dominant');
}

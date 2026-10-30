export type Instrument = 'kick' | 'snare' | 'hat' | 'bass' | 'melody' | 'vibe';
export interface Layer { id: string; userId: string; userName: string; color: string; instrument: Instrument; steps: number[]; notes?: string[]; degrees?: number[]; createdAt: number; }
export type Command = { kind: 'layer'; instrument: Instrument; pattern: number[]; notes?: string[] } | { kind: 'reset' } | { kind: 'vibe'; text: string };
const patterns: Record<string, number[]> = { kick: [0,8], snare: [4,12], hat: [0,4,8,12], 'bass 1': [0,8], 'bass 2': [0,4,8,12], 'bass 3': [0,6,10,14], 'bass 4': [0,3,7,11,14] };
export function parseCommand(message: string): Command | null {
 const s=message.trim(); if(/^!reset$/i.test(s)) return {kind:'reset'};
 const m=s.match(/^!vibe\s+(.{1,120})$/i); if(m?.[1]) return {kind:'vibe',text:m[1].trim()};
 const low=s.toLowerCase(); if(['!kick','!snare','!hat'].includes(low)){const inst=low.slice(1) as Instrument;return {kind:'layer',instrument:inst,pattern:patterns[inst]!};}
 const b=low.match(/^!bass\s+([1-4])$/);if(b){const k=`bass ${b[1]}`;return {kind:'layer',instrument:'bass',pattern:patterns[k]!};}
 const mm=s.match(/^!melody\s+(.+)$/i); if(mm?.[1]) {const notes=mm[1].split(/\s+/); if(notes.length>8||!notes.every(n=>/^[A-Ga-g][#b]?\d?$/.test(n)))return null;return {kind:'layer',instrument:'melody',pattern:notes.map((_,i)=>Math.floor(i*16/notes.length)),notes};}
 return null;
}
const chromatic=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const scales:Record<string,number[]>={major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10],pentatonic:[0,2,4,7,9],'minor pentatonic':[0,3,5,7,10]};
export function snapNote(note:string,key='C',scale='major'):string {const normalized=note.replace(/Db/gi,'C#').replace(/Eb/gi,'D#').replace(/Gb/gi,'F#').replace(/Ab/gi,'G#').replace(/Bb/gi,'A#');const target=chromatic.indexOf(normalized.replace(/\d/,'').toUpperCase());const root=chromatic.indexOf(key.toUpperCase());if(target<0||root<0)return key;const allowed=scales[scale.toLowerCase()]??scales.major!;let best=root,dist=99;for(let octave=-1;octave<=1;octave++)for(const step of allowed){const n=(root+step+12*octave+12)%12;const d=Math.min((target-n+12)%12,(n-target+12)%12);if(d<dist){dist=d;best=n;}}return chromatic[best]!;}
export function addLayer(layers:Layer[],layer:Layer):Layer[]{return [...layers,layer].slice(-8);}
export class RateLimiter { private last=new Map<string,number>(); private vibe=new Map<string,number>(); allow(id:string,now=Date.now(),isVibe=false):boolean {const map=isVibe?this.vibe:this.last, wait=isVibe?30000:5000;const prev=map.get(id)??-Infinity;if(now-prev<wait)return false;map.set(id,now);return true;} }
export function nextQuantizedTime(now:number,anchor:number,quantum:number):number { if(quantum<=0)throw new Error('quantum must be positive'); return anchor+Math.max(0,Math.ceil((now-anchor)/quantum))*quantum; }

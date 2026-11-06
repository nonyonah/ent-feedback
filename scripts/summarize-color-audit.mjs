import fs from 'node:fs';
import {converter,parse,formatHex} from 'culori';
import {APCAcontrast,sRGBtoY} from 'apca-w3';
const input=process.argv[2];
if(!input)throw Error('Pass the path to rendered browser color measurements.');
const data=JSON.parse(fs.readFileSync(input,'utf8'));
const luminance=c=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const rgb=converter('rgb');
const output=data.map(page=>({...page,rows:page.rows.map(row=>{const a=luminance(row.foreground),b=luminance(row.background);return {...row,wcag:Number(((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(3)),apca:Number(APCAcontrast(sRGBtoY(row.foreground),sRGBtoY(row.background)).toFixed(1))};}),tokens:Object.fromEntries(Object.entries(page.tokens).map(([name,value])=>{const parsed=parse(value),color=parsed&&rgb(parsed);return [name,{value,hex:color?formatHex(color):null,srgbChannels:color?[color.r,color.g,color.b].map(v=>Number(v.toFixed(6))):null,inSRGB:color?[color.r,color.g,color.b].every(v=>v>=-.001&&v<=1.001):null}];}))}));
fs.writeFileSync('docs/color-audit/rendered-pairs.json',JSON.stringify(output,null,2)+'\n');
for(const theme of ['light','dark']){const pages=output.filter(p=>p.theme===theme),rows=pages.flatMap(p=>p.rows.map(r=>({...r,screen:p.screen})));console.log(JSON.stringify({theme,pairs:rows.length,failures:rows.filter(r=>r.kind==='text'&&r.wcag<4.5).map(r=>({screen:r.screen,name:r.name,slot:r.slot,ratio:r.wcag,fg:r.foreground,bg:r.background})),outOfGamut:Object.entries(pages[0].tokens).filter(([,v])=>v.inSRGB===false),unparsed:Object.entries(pages[0].tokens).filter(([,v])=>v.inSRGB===null)},null,2));}

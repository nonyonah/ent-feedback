import 'server-only';
import {lookup} from 'node:dns/promises';
import {request} from 'node:https';
import {isIP,BlockList} from 'node:net';
import {scrubSource} from '@/lib/chat/contracts';

const blocked=new BlockList();
for(const [network,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const)blocked.addSubnet(network,prefix,'ipv4');
export function publicAddress(address:string){return isIP(address)===4&&!blocked.check(address,'ipv4');}
export function websiteUrl(value:string){
 const url=new URL(value);if(url.protocol!=='https:'||url.port||url.username||url.password||isIP(url.hostname)||!url.hostname.includes('.')||/\.(localhost|local|internal|test|invalid|example)$/.test(url.hostname))throw Error('Use a public HTTPS website address.');
 if(url.search||url.hash)throw Error('Use a page address without query parameters or a fragment.');return url;
}
export type WebsitePage={url:string;title:string;text:string};
export function extractPage(html:string,url:URL):WebsitePage{
 const decode=(value:string)=>value.replace(/&#(x[\da-f]+|\d+);/gi,(_,code:string)=>{const value=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):parseInt(code,10);return value>0&&value<=0x10ffff?String.fromCodePoint(value):'';}).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,entity:string)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[entity]!));
 const title=decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]??url.hostname).replace(/<[^>]*>/g,'').slice(0,160);
 const body=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|noscript|svg|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ');
 return {url:url.href,title,text:scrubSource(decode(body.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim(),14400)};
}
// Resolve and validate every destination, then pin that public IP to the TLS
// connection. No cookies, authorization, proxies or cross-origin redirects.
export async function readPublicPage(url:URL,origin:string,signal:AbortSignal,redirects=0):Promise<{body:string;url:URL;type:string}>{
 websiteUrl(url.href);if(url.origin!==origin||redirects>3)throw Error('The website redirected outside its domain.');signal.throwIfAborted();
 let abortLookup:()=>void=()=>{};
 const aborted=new Promise<never>((_,reject)=>{abortLookup=()=>reject(Error('Website sync timed out.'));signal.addEventListener('abort',abortLookup,{once:true});});
 const addresses=await Promise.race([lookup(url.hostname,{family:4,all:true}),aborted]).finally(()=>signal.removeEventListener('abort',abortLookup));
 if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw Error('This website address is not supported.');signal.throwIfAborted();
 const result=await new Promise<{status:number;location?:string;body:string;type:string}>((resolve,reject)=>{
  const req=request(url,{agent:false,family:4,signal,lookup:(_host,_options,callback)=>callback(null,addresses[0].address,4),headers:{'User-Agent':'EntKnowledgeBot/1.0','Accept':'text/html,text/plain;q=0.9','Accept-Encoding':'identity'}},res=>{
   let size=0;const chunks:Buffer[]=[];
   res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>512000){res.destroy(Error('This page is too large to import.'));return;}chunks.push(chunk);});
   res.on('error',reject);res.on('end',()=>resolve({status:res.statusCode??0,location:res.headers.location,body:Buffer.concat(chunks).toString('utf8'),type:res.headers['content-type']??''}));
  });req.setTimeout(5000,()=>req.destroy(Error('This website took too long to respond.')));req.on('error',reject);req.end();
 });
 if([301,302,303,307,308].includes(result.status)&&result.location)return readPublicPage(new URL(result.location,url),origin,signal,redirects+1);
 if(url.pathname==='/robots.txt'&&[404,410].includes(result.status))return {body:'',url,type:'text/plain'};
 if(result.status<200||result.status>=300)throw Error('The website could not be read. Check that it is public.');
 if(!/text\/(html|plain)/i.test(result.type))throw Error('Use an HTML website page.');return {...result,url};
}
export function robotsAllows(body:string,path:string){
 type Rule={path:string;allow:boolean};const groups:{agents:string[];rules:Rule[]}[]=[];let current={agents:[] as string[],rules:[] as Rule[]};let directives=false;
 for(const line of body.split('\n')){const clean=line.split('#')[0].trim(),split=clean.indexOf(':');if(split<0)continue;const name=clean.slice(0,split).toLowerCase(),value=clean.slice(split+1).trim();
  if(name==='user-agent'){if(directives){groups.push(current);current={agents:[],rules:[]};directives=false;}current.agents.push(value.toLowerCase());}
  else if(current.agents.length&&(name==='disallow'||name==='allow')){directives=true;if(value)current.rules.push({path:value,allow:name==='allow'});}
 }groups.push(current);
 const exact=groups.filter(group=>group.agents.includes('entknowledgebot'));const applicable=exact.length?exact:groups.filter(group=>group.agents.includes('*'));
 const matches=applicable.flatMap(group=>group.rules).filter(rule=>{
  const end=rule.path.endsWith('$');const pattern=end?rule.path.slice(0,-1):rule.path;
  const parts=pattern.split('*');if(!path.startsWith(parts[0]))return false;let offset=parts[0].length;
  if(parts.length===1)return !end||offset===path.length;
  for(let i=1;i<parts.length;i++){const part=parts[i];if(i===parts.length-1&&end)return path.endsWith(part)&&path.length-part.length>=offset;const found=path.indexOf(part,offset);if(found<0)return false;offset=found+part.length;}return true;
 }).sort((a,b)=>b.path.replace(/[*$]/g,'').length-a.path.replace(/[*$]/g,'').length||Number(b.allow)-Number(a.allow));
 return matches[0]?.allow??true;
}
export async function crawlWebsite(value:string,reader=readPublicPage,scope:'origin'|'path'='origin'){
 const start=websiteUrl(value),signal=AbortSignal.timeout(20000);let robots='';
 try{robots=(await reader(new URL('/robots.txt',start),start.origin,signal)).body;}catch(error){if(signal.aborted)throw error;/* Missing or unavailable robots must not silently permit a crawl. */throw Error('The website’s robots.txt could not be checked. Make it publicly accessible before syncing.');}
 const root=start.pathname.replace(/\/$/,'');const inScope=(url:URL)=>scope==='origin'||!root||url.pathname===root||url.pathname.startsWith(root+'/');
 const pending=[start.href],seen=new Set<string>(),pages:WebsitePage[]=[];
 while(pending.length&&seen.size<8&&!signal.aborted){
  const next=pending.shift()!;if(seen.has(next))continue;seen.add(next);const url=websiteUrl(next);if(!robotsAllows(robots,url.pathname))continue;
  try{const response=await reader(url,start.origin,signal);if(!inScope(response.url)||!robotsAllows(robots,response.url.pathname))continue;const page=extractPage(response.body,response.url);if(page.text.length>=80)pages.push(page);
   for(const match of response.body.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)){try{const link=new URL(match[1],response.url);link.hash='';if(link.origin!==start.origin||!inScope(link)||link.search||/\.(?:pdf|zip|png|jpe?g|gif|svg|css|js)$/i.test(link.pathname)||/(?:^|\/)(?:login|sign-in|sign-up|auth|admin|account|checkout|cart)(?:\/|$)/i.test(link.pathname))continue;websiteUrl(link.href);if(!seen.has(link.href)&&pending.length<30)pending.push(link.href);}catch{}}
  }catch(error){if(!pages.length)throw error;}
 }
 if(!pages.length)throw Error('No readable public content was found. Try a documentation or product page.');return {url:start.href,pages};
}

/** Public Mintlify traffic only. Never forward application cookies or authentication. */
export function documentationPath(path:string){return path==='/docs'||path.startsWith('/docs/')||path==='/_mintlify'||path.startsWith('/_mintlify/')||path==='/mintlify-assets'||path.startsWith('/mintlify-assets/')||path==='/api/request';}
export function documentationOrigin(value=process.env.MINTLIFY_ORIGIN){
 if(!value)return null;
 try{const url=new URL(value);if(url.protocol!=='https:'||!/^[-a-z0-9]+\.mintlify\.site$/.test(url.hostname)||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)return null;return url.origin;}catch{return null;}
}
export function documentationDestination(path:string,search:string,origin:string){
 if(!documentationPath(path))throw new Error('Not a documentation path');
 return new URL((path==='/api/request'?'/_mintlify/api/request':path)+search,origin);
}
export function documentationRequestHeaders(input:Headers,origin:string){
 const headers=new Headers();
 for(const name of ['accept','accept-language','content-type','user-agent','range','if-none-match','if-modified-since','rsc','next-router-state-tree','next-router-prefetch','next-router-segment-prefetch','next-url','x-nextjs-data','purpose','sec-purpose']){const value=input.get(name);if(value)headers.set(name,value);}
 headers.set('origin',origin);
 return headers;
}

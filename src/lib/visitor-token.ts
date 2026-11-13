/**
 * One anonymous visitor token per workspace, kept in local storage.
 *
 * The token is generated in the browser before the first request so that
 * parallel page loads all present the same credential. When the server mints
 * the token instead, every concurrent request creates a separate guest identity
 * and the visitor's votes and comments split across several identities.
 */
const memory=new Map<string,string>();
const storageKey=(workspaceId:string)=>'ent-visitor:'+workspaceId;

function generate():string{
 const bytes=new Uint8Array(32);
 if(typeof crypto!=='undefined'&&typeof crypto.getRandomValues==='function')crypto.getRandomValues(bytes);
 else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
 return Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
}

export function visitorToken(workspaceId:string):string{
 if(typeof window==='undefined')return '';
 const key=storageKey(workspaceId);
 let stored:string|undefined;
 try{stored=window.localStorage.getItem(key)??undefined;}catch{}
 if(stored&&/^[a-f0-9]{64}$/.test(stored))return stored;
 const cached=memory.get(key);
 if(cached)return cached;
 const token=generate();
 memory.set(key,token);
 try{window.localStorage.setItem(key,token);}catch{}
 return token;
}

export function rememberVisitorToken(workspaceId:string,token:string|undefined):void{
 if(!token||!/^[a-f0-9]{64}$/.test(token))return;
 const key=storageKey(workspaceId);
 memory.set(key,token);
 try{window.localStorage.setItem(key,token);}catch{}
}

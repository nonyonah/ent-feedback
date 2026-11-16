/** Preserve pg's current certificate verification when its SSL aliases change. */
export function databaseConnectionUrl(value:string,{direct=false}:{direct?:boolean}={}){
 const url=new URL(value);
 const mode=url.searchParams.get('sslmode');
 if(url.searchParams.get('uselibpqcompat')!=='true'&&['prefer','require','verify-ca'].includes(mode??''))url.searchParams.set('sslmode','verify-full');
 // Session state / DDL tests must never use Neon's transaction pooler.
 if(direct&&url.hostname.endsWith('.neon.tech'))url.hostname=url.hostname.replace('-pooler.','.');
 return url.href;
}

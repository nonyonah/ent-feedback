export function isSameOriginRequest(request:Pick<Request,'headers'>){
 const origin=request.headers.get('origin');
 if(!origin)return false;
 const forwarded=request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
 const host=forwarded||request.headers.get('host');
 if(!host)return false;
 try{const url=new URL(origin);return url.host===new URL(url.protocol+'//'+host).host;}catch{return false;}
}

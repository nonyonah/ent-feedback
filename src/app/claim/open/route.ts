import {NextResponse} from 'next/server';
import {getServerEnv} from '@/server/env';
import {claimCookie,lookupPreview,tokenPattern} from '@/server/preview-claims';
import {trackServerAnalytics} from '@/lib/analytics/server';

const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
export function GET(){
  const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Opening preview</title><p>Opening your preview…</p><noscript>Enable JavaScript to open this claim link.</noscript><script>
const token=location.hash.slice(1);history.replaceState(null,'',location.pathname);
fetch('/claim/open',{method:'POST',headers:{'Content-Type':'text/plain'},body:token}).then(r=>{if(!r.ok)throw Error();location.replace('/claim')}).catch(()=>document.querySelector('p').textContent='Could not open this preview. Reopen the original link to try again.');
</script></html>`;
  return new Response(html,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"}});
}
export async function POST(request:Request){
  const origin=getServerEnv().NEXT_PUBLIC_APP_URL;
  if(request.headers.get('origin')!==origin)return new Response(null,{status:403,headers});
  const token=await request.text();
  const preview=tokenPattern.test(token)?await lookupPreview(token):null;
  const response=new NextResponse(null,{status:204,headers});
  response.cookies.set(claimCookie,preview?token:'',{httpOnly:true,secure:origin.startsWith('https:'),sameSite:'lax',path:'/claim',maxAge:preview?1800:0});
  if(preview)trackServerAnalytics('claim_link_opened',{}, {boardId:preview.boardId});
  return response;
}

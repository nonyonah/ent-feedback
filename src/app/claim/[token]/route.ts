import {NextResponse, type NextRequest} from 'next/server';
import {getServerEnv} from '@/server/env';
import {claimCookie,lookupPreview,tokenPattern} from '@/server/preview-claims';
import {trackServerAnalytics} from '@/lib/analytics/server';

const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};

// Compatibility for links that carry the token in the path. Canonical links put it
// in the fragment, which never reaches an access log; a token is single use anyway.
export async function GET(_:NextRequest,{params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const origin=getServerEnv().NEXT_PUBLIC_APP_URL;
  const preview=tokenPattern.test(token)?await lookupPreview(token):null;
  const response=NextResponse.redirect(new URL('/claim',origin),{status:307,headers});
  if(!preview)return response;
  response.cookies.set(claimCookie,token,{httpOnly:true,secure:origin.startsWith('https:'),sameSite:'lax',path:'/claim',maxAge:1800});
  trackServerAnalytics('claim_link_opened',{},{boardId:preview.boardId});
  return response;
}

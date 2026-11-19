import {readRoadmapUnsubscribe} from '@/lib/roadmap-unsubscribe';
import {getServerEnv} from '@/server/env';
import {getDb} from '@/server/db/client';
import {voterEmailOptouts} from '@/server/db/schema';
export async function GET(request:Request){
 const claim=readRoadmapUnsubscribe(new URL(request.url).searchParams.get('token')??'',getServerEnv().EMAIL_UNSUBSCRIBE_SECRET??'');const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'"};
 if(!claim)return new Response('This unsubscribe link is unavailable.',{status:400,headers});
 try{await getDb().insert(voterEmailOptouts).values({...claim,email:claim.email.toLowerCase()}).onConflictDoNothing();return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed · Ent</title><body style="font:16px/1.6 system-ui;max-width:440px;margin:80px auto;padding:24px"><h1>You’re unsubscribed.</h1><p>You won’t receive shipped updates for this workspace.</p></body></html>',{headers});}catch{return new Response('Your preference could not be saved. Please retry.',{status:503,headers});}
}
export const POST=GET;

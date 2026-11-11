import {eq} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {lifecycleEmailState} from '@/server/db/schema';
import {verifyLifecycleUnsubscribe} from '@/server/emails/unsubscribe';
import {escapeEmailHtml} from '@/server/emails/templates';
const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
function valid(url:URL){return verifyLifecycleUnsubscribe(url.searchParams.get('user')??'',url.searchParams.get('token')??'',process.env.EMAIL_UNSUBSCRIBE_SECRET??'');}
function page(content:string,status=200){return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email preferences · Ent</title><body style="font:16px/1.6 system-ui,sans-serif;color:#212529;max-width:440px;margin:80px auto;padding:24px">${content}</body></html>`,{status,headers});}
// A mail scanner opening a link must not change preferences. Confirmation is POST only.
export function GET(request:Request){const url=new URL(request.url);if(!valid(url))return page('<h1>This link is unavailable.</h1><p>Please use the link in your latest email.</p>',400);return page(`<h1>Stop setup and return emails?</h1><p>Your feedback notifications won’t change.</p><form method="post" action="${escapeEmailHtml(url.pathname+url.search)}"><button style="background:#212529;color:white;border:0;border-radius:10px;padding:12px 18px;font:inherit;cursor:pointer">Stop these emails</button></form>`);}
export async function POST(request:Request){const url=new URL(request.url);if(!valid(url))return page('<h1>This link is unavailable.</h1>',400);try{await getDb().update(lifecycleEmailState).set({optedOutAt:new Date()}).where(eq(lifecycleEmailState.userId,url.searchParams.get('user')!));return page('<h1>You’re unsubscribed.</h1><p>You won’t receive setup or return reminders. Your feedback notifications haven’t changed.</p>');}catch{return page('<h1>We couldn’t save that.</h1><p>Please try again shortly.</p>',503);}}

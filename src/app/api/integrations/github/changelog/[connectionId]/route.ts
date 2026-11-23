import {and,eq} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {changelogEntries,githubChangelogConnections,githubChangelogReceipts} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
import {unseal} from '@/server/integration-crypto';
import {boundedBody} from '@/server/connected-apps/security';
import {githubChangelogDraft,validGithubSignature} from '@/lib/github-changelog';

export async function POST(request:Request,{params}:{params:Promise<{connectionId:string}>}){
 const parsed=z.string().uuid().safeParse((await params).connectionId);if(!parsed.success)return new Response('Not found',{status:404});
 try{
  const db=getDb();const [connection]=await db.select().from(githubChangelogConnections).where(eq(githubChangelogConnections.id,parsed.data));if(!connection)return new Response('Not found',{status:404});
  const key=getServerEnv().INTEGRATION_ENCRYPTION_KEY;if(!key)return new Response('Unavailable',{status:503});
  const {secret}=z.object({secret:z.string()}).parse(unseal(connection.encryptedSecret,key,connection.workspaceId+':github-changelog'));
  let body:string;try{body=await boundedBody(request,1048576);}catch{return new Response('Payload too large',{status:413});}
  if(!validGithubSignature(body,request.headers.get('x-hub-signature-256')??'',secret))return new Response('Unauthorized',{status:401});
  const event=request.headers.get('x-github-event');if(event==='ping')return Response.json({received:true});if(event!=='pull_request')return Response.json({received:true});
  let payload:unknown;try{payload=JSON.parse(body);}catch{return new Response('Invalid payload',{status:400});}
  const draft=githubChangelogDraft(payload,connection.repository);if(!draft)return Response.json({received:true});
  await db.transaction(async tx=>{
   const [active]=await tx.select().from(githubChangelogConnections).where(and(eq(githubChangelogConnections.id,connection.id),eq(githubChangelogConnections.encryptedSecret,connection.encryptedSecret))).for('update');if(!active)return;
   const [receipt]=await tx.insert(githubChangelogReceipts).values({connectionId:active.id,pullRequestId:draft.id}).onConflictDoNothing().returning();if(!receipt)return;
   // A suffix based on the PR's immutable ID keeps repeated titles distinct.
   const suffix='-github-'+draft.id;const slug=draft.slug.slice(0,80-suffix.length).replace(/-+$/,'')+suffix;
   await tx.insert(changelogEntries).values({workspaceId:active.workspaceId,title:draft.title,body:draft.body,slug,category:draft.category,status:'draft',authorUserId:active.createdByUserId});
  });
  return Response.json({received:true});
 }catch{return Response.json({error:'Event could not be accepted.'},{status:503});}
}

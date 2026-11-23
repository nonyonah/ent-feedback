import {and,eq} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/server/db/client';
import {changelogEntries,githubAppChangelogConnections,githubAppChangelogReceipts} from '@/server/db/schema';
import {getServerEnv} from '@/server/env';
import {boundedBody} from '@/server/connected-apps/security';
import {githubChangelogDraft,validGithubSignature} from '@/lib/github-changelog';
const envelope=z.object({action:z.string().optional(),installation:z.object({id:z.number().int().positive()}),repository:z.object({id:z.number().int().positive(),full_name:z.string()}).optional(),repositories_removed:z.array(z.object({id:z.number().int().positive()})).optional()});
export async function POST(request:Request){
 const secret=getServerEnv().GITHUB_APP_WEBHOOK_SECRET;if(!secret)return new Response('Unavailable',{status:503});let body:string;try{body=await boundedBody(request,1048576);}catch{return new Response('Payload too large',{status:413});}
 if(!validGithubSignature(body,request.headers.get('x-hub-signature-256')??'',secret))return new Response('Unauthorized',{status:401});
 const kind=request.headers.get('x-github-event');if(kind==='ping')return Response.json({received:true});let payload:unknown;try{payload=JSON.parse(body);}catch{return new Response('Invalid payload',{status:400});}const parsed=envelope.safeParse(payload);if(!parsed.success)return new Response('Invalid payload',{status:400});
 try{const data=parsed.data,db=getDb(),installationId=String(data.installation.id);
  if(kind==='installation'&&(data.action==='deleted'||data.action==='suspend')){await db.delete(githubAppChangelogConnections).where(eq(githubAppChangelogConnections.installationId,installationId));return Response.json({received:true});}
  if(kind==='installation_repositories'&&data.action==='removed'){for(const removed of data.repositories_removed??[])await db.delete(githubAppChangelogConnections).where(and(eq(githubAppChangelogConnections.installationId,installationId),eq(githubAppChangelogConnections.repositoryId,String(removed.id))));return Response.json({received:true});}
  if(kind!=='pull_request'||!data.repository)return Response.json({received:true});
  const repository=data.repository;const draft=githubChangelogDraft(payload,repository.full_name);if(!draft)return Response.json({received:true});
  await db.transaction(async tx=>{const [connection]=await tx.select().from(githubAppChangelogConnections).where(and(eq(githubAppChangelogConnections.installationId,installationId),eq(githubAppChangelogConnections.repositoryId,String(repository.id)))).for('update');if(!connection)return;const [receipt]=await tx.insert(githubAppChangelogReceipts).values({connectionId:connection.id,pullRequestId:draft.id}).onConflictDoNothing().returning();if(!receipt)return;const suffix='-github-'+draft.id;const slug=draft.slug.slice(0,80-suffix.length).replace(/-+$/,'')+suffix;await tx.insert(changelogEntries).values({workspaceId:connection.workspaceId,title:draft.title,body:draft.body,slug,category:draft.category,status:'draft',authorUserId:connection.createdByUserId});});return Response.json({received:true});
 }catch{return Response.json({error:'Event could not be accepted.'},{status:503});}
}

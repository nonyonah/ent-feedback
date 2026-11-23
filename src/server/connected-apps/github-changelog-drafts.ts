import 'server-only';
import {randomBytes} from 'node:crypto';
import {changelogEntries,githubAppChangelogReceipts} from '@/server/db/schema';
import type {Transaction} from '@/server/db/client';
import type {githubChangelogDraft} from '@/lib/github-changelog';

type Draft=NonNullable<ReturnType<typeof githubChangelogDraft>>;
/** Caller must hold the connection row lock. The receipt and draft commit together. */
export async function saveGithubChangelogDraft(tx:Transaction,connection:{id:string;workspaceId:string;createdByUserId:string|null},draft:Draft,mergedAt?:string){
 const [receipt]=await tx.insert(githubAppChangelogReceipts).values({connectionId:connection.id,pullRequestId:draft.id}).onConflictDoNothing().returning({id:githubAppChangelogReceipts.pullRequestId});
 if(!receipt)return false;
 const suffix='-github-'+draft.id;
 for(let attempt=0;attempt<2;attempt++){
  const extra=attempt?'-'+randomBytes(5).toString('hex'):'';
  const slug=draft.slug.slice(0,80-suffix.length-extra.length).replace(/-+$/,'')+suffix+extra;
  const [entry]=await tx.insert(changelogEntries).values({workspaceId:connection.workspaceId,title:draft.title,body:draft.body,slug,category:draft.category,status:'draft',authorUserId:connection.createdByUserId,...(mergedAt?{createdAt:new Date(mergedAt),updatedAt:new Date(mergedAt)}:{})}).onConflictDoNothing({target:[changelogEntries.workspaceId,changelogEntries.slug]}).returning({id:changelogEntries.id});
  if(entry)return true;
 }
 throw Error('Could not allocate a changelog URL');
}

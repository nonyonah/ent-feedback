import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {getDb} from '@/server/db/client';
import {boards,feedback,jobs,statusHistory,users,votes,workspaceAiSettings,workspaceMembers,workspaces} from '@/server/db/schema';
import {enqueueShippedChangelog,processShippedChangelogJob} from '@/server/changelog/ai-jobs';
import {enqueueClassification,processClassificationJob} from '@/server/ai/classification-jobs';
import {processWeeklySummaries} from '@/server/ai/weekly-jobs';
import {generateWeeklySummary,mondayUtc} from '@/server/ai/weekly-summary';
import {loadClassificationSuggestionAction,loadWeeklyFeedbackSummaryAction,suggestFeedbackClassificationAction,suggestPriorityHintsAction,summarizeRecentFeedbackAction} from '@/server/actions/ai-feedback';
import {saveAiSettingsAction} from '@/server/actions/ai-settings';
declare const global:typeof globalThis&{chatEnv:Record<string,string>;chatUser:typeof users.$inferSelect|null};
export async function run(){
 const db=getDb();Object.assign(global.chatEnv,{AI_BASE_URL:'https://ai.invalid/v1',AI_API_KEY:'fixture',AI_MODEL:'fixture'});
 const [user]=await db.insert(users).values({clerkUserId:randomUUID()}).returning();global.chatUser=user;
 const [workspace]=await db.insert(workspaces).values({name:'AI disabled fixture',handle:'ai-disabled-fixture'}).returning();
 await db.insert(workspaceMembers).values({workspaceId:workspace.id,userId:user.id,role:'owner'});
 const [board]=await db.insert(boards).values({workspaceId:workspace.id,name:'Board',handle:'board'}).returning();
 const [post]=await db.insert(feedback).values({workspaceId:workspace.id,boardId:board.id,title:'Shipped request',body:'Details',status:'shipped'}).returning();
 const lastWeek=new Date(mondayUtc(new Date()).getTime()-86400000);
 const [oldPost]=await db.insert(feedback).values({workspaceId:workspace.id,boardId:board.id,title:'Last week request',body:'Details',category:'bug',createdAt:lastWeek}).returning();
 await db.insert(votes).values({workspaceId:workspace.id,feedbackId:oldPost.id,userId:user.id,createdAt:lastWeek});
 await db.insert(statusHistory).values({workspaceId:workspace.id,feedbackId:oldPost.id,actorUserId:user.id,newStatus:'shipped',createdAt:lastWeek});
 await db.insert(workspaceAiSettings).values({workspaceId:workspace.id,feedbackEnabled:true,githubEnabled:true});
 await db.transaction(async tx=>{await enqueueClassification(tx,workspace.id,post.id);await enqueueShippedChangelog(tx,workspace.id,post.id,user.id);});
 assert.equal((await db.select().from(jobs)).length,0,'no new AI jobs are queued even when a saved setting is enabled');
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('AI provider must not be called');};
 try{
  const end=mondayUtc(new Date());const metrics=await generateWeeklySummary(workspace.id,new Date(end.getTime()-7*86400000),end);assert.equal(metrics.count,1);
  assert.equal((await processClassificationJob()).configured,false);assert.equal((await processShippedChangelogJob()).configured,false);assert.equal((await processWeeklySummaries()).configured,true);
  assert.equal((await suggestFeedbackClassificationAction(workspace.id,post.id)).ok,false);assert.equal((await suggestPriorityHintsAction(workspace.id)).ok,false);assert.equal((await summarizeRecentFeedbackAction(workspace.id)).ok,true);
  const saved=await loadClassificationSuggestionAction(workspace.id,post.id),weekly=await loadWeeklyFeedbackSummaryAction(workspace.id);assert.ok(saved.ok&&saved.data===null);assert.ok(weekly.ok&&weekly.data);assert.equal(weekly.data.count,1);assert.deepEqual(weekly.data.points,['1 new request: 1 bug report.','1 vote cast.','1 request marked shipped.','Most voted: Last week request (1).']);
  assert.equal((await saveAiSettingsAction(workspace.id,{feedbackEnabled:true,githubEnabled:false})).ok,false);
 }finally{globalThis.fetch=original;}
 console.log('PASS: AI features are paused; weekly metrics run without a provider.');
}

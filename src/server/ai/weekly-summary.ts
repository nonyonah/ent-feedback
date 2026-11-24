import 'server-only';
import {and,desc,eq,gte,isNull,lt,sql} from 'drizzle-orm';
import {getDb} from '@/server/db/client';
import {feedback,statusHistory,votes} from '@/server/db/schema';

export function mondayUtc(date:Date){const day=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));day.setUTCDate(day.getUTCDate()-((day.getUTCDay()+6)%7));return day;}

/** Facts from the selected period; no feedback content is sent to a model. */
export async function generateWeeklySummary(workspaceId:string,since:Date,until:Date){
 const db=getDb();
 const active=and(eq(feedback.workspaceId,workspaceId),isNull(feedback.deletedAt),isNull(feedback.mergedIntoId));
 const voteCount=sql<number>`count(${votes.id})::int`;
 const [categories,ranked,voteTotals,shipped]=await Promise.all([
  db.select({category:feedback.category,count:sql<number>`count(*)::int`}).from(feedback).where(and(active,gte(feedback.createdAt,since),lt(feedback.createdAt,until))).groupBy(feedback.category),
  db.select({id:feedback.id,title:feedback.title,count:voteCount}).from(votes).innerJoin(feedback,and(eq(feedback.id,votes.feedbackId),eq(feedback.workspaceId,votes.workspaceId))).where(and(active,gte(votes.createdAt,since),lt(votes.createdAt,until))).groupBy(feedback.id,feedback.title).orderBy(desc(voteCount),feedback.id).limit(3),
  db.select({count:voteCount}).from(votes).innerJoin(feedback,and(eq(feedback.id,votes.feedbackId),eq(feedback.workspaceId,votes.workspaceId))).where(and(active,gte(votes.createdAt,since),lt(votes.createdAt,until))),
  db.select({count:sql<number>`count(distinct ${statusHistory.feedbackId})::int`}).from(statusHistory).innerJoin(feedback,and(eq(feedback.id,statusHistory.feedbackId),eq(feedback.workspaceId,statusHistory.workspaceId))).where(and(active,eq(statusHistory.newStatus,'shipped'),gte(statusHistory.createdAt,since),lt(statusHistory.createdAt,until))),
 ]);
 const count=categories.reduce((total,row)=>total+row.count,0),totalVotes=voteTotals[0]?.count??0;
 const labels={feedback:['feedback post','feedback posts'],bug:['bug report','bug reports'],feature_request:['feature request','feature requests'],question:['question','questions']};
 const breakdown=categories.sort((a,b)=>a.category.localeCompare(b.category)).map(row=>`${row.count} ${labels[row.category][row.count===1?0:1]}`).join(', ');
 const points=[`${count} new ${count===1?'request':'requests'}${breakdown?`: ${breakdown}`:''}.`,`${totalVotes} ${totalVotes===1?'vote':'votes'} cast.`,`${shipped[0]?.count??0} ${shipped[0]?.count===1?'request':'requests'} marked shipped.`];
 if(ranked.length)points.push(`Most voted: ${ranked.slice(0,3).map(row=>`${row.title.slice(0,160)} (${row.count})`).join('; ')}.`);
 return {points,count,truncated:false};
}

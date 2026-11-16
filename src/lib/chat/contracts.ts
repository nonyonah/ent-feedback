// Temporarily paused for the human-support release. Enforced on the server.
export const CHAT_AI_REPLIES_ENABLED = false;
import {z} from 'zod';
import {detectTopics} from './topics';
import {operationsSchema,defaultOperations} from './availability';
export const suggestionSchema=z.object({title:z.string().trim().min(4).max(160),description:z.string().trim().min(1).max(3000)}).strict();
export const assistantSchema=z.object({answer:z.string().trim().min(1).max(4000),needs_human:z.boolean(),confidence:z.number().min(0).max(1),source_ids:z.array(z.string().max(100)).max(12),suggest_idea:suggestionSchema.nullish()}).strict();
export const sendSchema=z.object({requestId:z.uuid(),body:z.string().trim().min(1).max(3000),escalate:z.boolean().optional(),images:z.array(z.uuid()).max(3).default([])}).strict();
export const settingsSchema=z.object({enabled:z.boolean(),operations:operationsSchema.default(defaultOperations)}).strict();
export const slackSettingsSchema=z.object({slackEscalations:z.boolean(),slackFollowups:z.boolean(),slackFeedback:z.boolean(),slackStatuses:z.boolean()}).strict();
export type Idea=z.infer<typeof suggestionSchema>;
export type ChatMessage={sequence:number;id:string;role:'visitor'|'assistant'|'team';body:string;createdAt:string;sourceIds:string[];images?:string[];suggestion:Idea|null};
export type ChatPresentation={greeting:string;replyTime:'automatic'|'day'|'days'|'week';details:'none'|'optional'|'required';email:boolean;name:boolean};
export type ChatWidgetConfiguration={enabled:boolean;presentation?:ChatPresentation;availability?:{available:boolean;message:string};operators?:{id:string;name:string;avatarUrl:string|null}[]};
export type ChatSnapshot={teamReadSequence?:number;visitorReadSequence?:number;hasName?:boolean;presentation?:ChatPresentation;emailCollection?:'none'|'optional'|'required';id:string;status:'open'|'escalated'|'resolved';mode:'ai'|'human';topicIds?:string[];availability?:{available:boolean;message:string};hasEmail:boolean;messages:ChatMessage[];cursor:string|null;hasMore:boolean;generating:boolean;links:{feedbackId:string;title:string}[]};
export const HANDOFF="I’d like to get you the right help. I’m passing this to the team—you can leave your email below so they can reply.";
export function safeAssistant(raw:unknown,allowedIds:Set<string>){const parsed=assistantSchema.safeParse(raw);if(!parsed.success)return {answer:HANDOFF,needs_human:true,confidence:0,source_ids:[],suggest_idea:null};const a=parsed.data;const grounded=a.source_ids.length>0&&a.source_ids.every(id=>allowedIds.has(id));if(a.needs_human||a.confidence<0.75||!grounded)return {...a,answer:HANDOFF,needs_human:true,source_ids:[]};return a;}
export function scrubSource(text:string,limit=1800){return text.replace(/\b(?:sk|pk|whsec|phc)_[a-zA-Z0-9_-]{12,}\b/g,'[credential removed]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email removed]').replace(/(?:\+?\d[\d ()-]{8,}\d)/g,'[number removed]').slice(0,Math.min(20000,limit));}
export function rankSources<T extends {text:string;score:number}>(query:string,sources:T[]){const terms=[...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)??[])];const topics=detectTopics(query);return sources.map(s=>({...s,relevance:terms.reduce((n,t)=>n+(s.text.toLowerCase().includes(t)?1:0),0)+(topics.some(topic=>detectTopics(s.text).includes(topic))?1:0)})).filter(s=>s.relevance>0).sort((a,b)=>b.relevance-a.relevance||b.score-a.score).slice(0,10);}

export function friendlyReply(text:string){
 const value=text.trim();
 if(/^(?:hi|hello|hey|good morning|good afternoon|good evening)[!. ]*$/i.test(value))return 'Hi! I’m happy to help. What would you like to know?';
 if(/^(?:thanks|thank you|thanks a lot|thank you so much)[!. ]*$/i.test(value))return 'You’re welcome! Is there anything else I can help with?';
 return null;
}

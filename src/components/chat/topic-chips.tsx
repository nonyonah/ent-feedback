import {CHAT_TOPICS,topicLabel} from '@/lib/chat/topics';
export function TopicChips({ids=[],limit=3}:{ids?:string[];limit?:number}){
 const known=ids.filter(id=>CHAT_TOPICS.some(topic=>topic.id===id)).slice(0,limit);
 if(!known.length)return null;
 return <span aria-label="Conversation topics" className="flex min-w-0 flex-wrap gap-1.5">{known.map(id=><span key={id} className="inline-flex shrink-0 items-center rounded-full bg-control-quiet px-2 py-0.5 text-xs font-medium text-muted-foreground">{topicLabel(id)}</span>)}</span>;
}

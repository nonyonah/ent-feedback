'use client';
import {CHAT_AI_REPLIES_ENABLED} from '@/lib/chat/contracts';
import {AttachmentPreview} from '@/components/feedback/composer-tools';
import {Fragment,useEffect,useRef} from 'react';
import type {ChatMessage as Message,Idea} from '@/lib/chat/contracts';
import {Avatar,AvatarFallback} from '@/components/ui/avatar';
import {Button} from '@/components/ui/button';
import {ChatConversation} from './chat-conversation';
import {ChatMessage} from './chat-message';
import {ChatMessageText} from './chat-message-text';
import {ChatTypingIndicator} from './chat-typing-indicator';
import {ChatDatePill} from './chat-date-pill';
import {useChatScroll} from './hooks/use-chat-scroll';

export function MessageList({messages,generating,onIdea,variant='widget',active=true,readThrough=0,onRead}:{readThrough?:number;onRead?:(sequence:number)=>Promise<void>;messages:Message[];generating?:boolean;onIdea?:(idea:Idea)=>void;variant?:'widget'|'dashboard';active?:boolean}){
 const scroll=useChatScroll({itemCount:messages.length,layoutKey:Number(Boolean(generating)),active});
 const acknowledge=useRef(onRead);useEffect(()=>{acknowledge.current=onRead;},[onRead]);
 const acknowledged=useRef(0);
 useEffect(()=>{
  const viewport=scroll.viewportRef.current;if(!active||!viewport||!onRead)return;
  let pending=false;let disposed=false;
  async function check(){if(disposed||pending||document.hidden)return;const bounds=viewport!.getBoundingClientRect();if(bounds.height<=0)return;const visible=Array.from(viewport!.querySelectorAll<HTMLElement>('[data-read-sequence]')).filter(node=>{const box=node.getBoundingClientRect();return box.bottom>bounds.top&&box.bottom<=bounds.bottom+1;});const sequence=Math.max(0,...visible.map(node=>Number(node.dataset.readSequence)));if(sequence<=acknowledged.current)return;pending=true;try{await acknowledge.current?.(sequence);acknowledged.current=sequence;}catch{/* Retry on the next poll or visibility change. */}finally{pending=false;}}
  const observer=new IntersectionObserver(()=>void check(),{root:viewport,threshold:[0,1]});viewport.querySelectorAll('[data-read-sequence]').forEach(node=>observer.observe(node));document.addEventListener('visibilitychange',check);viewport.addEventListener('scroll',check);void check();return()=>{disposed=true;observer.disconnect();viewport.removeEventListener('scroll',check);document.removeEventListener('visibilitychange',check);};
 },[messages,active,onRead,scroll.viewportRef]);
 const author=(message:Message)=>message.role==='visitor'?'Visitor':message.role==='assistant'?'AI assistant':'Team';
 const own=(message:Message)=>variant==='widget'?message.role==='visitor':message.role!=='visitor';
 const sameDay=(a:Message,b:Message)=>new Date(a.createdAt).toDateString()===new Date(b.createdAt).toDateString();
 return <ChatConversation scroll={scroll} label="Conversation messages" jumpLabel="Latest messages" live="off" contentClassName="py-4"><div className="mx-auto w-full max-w-2xl"><span role="status" className="sr-only">{messages.length?messages.length+' messages in this conversation.':''}</span>
  {!messages.length&&<div className="py-8"><h3 className="text-base font-semibold tracking-tight">How can we help?</h3><p className="mt-2 text-[13px] leading-6 text-muted-foreground">Ask a product question or leave a message for the team.</p>{CHAT_AI_REPLIES_ENABLED&&<p className="mt-3 text-xs leading-5 text-muted-foreground">AI answers use this workspace’s website, documentation and public feedback.</p>}</div>}
  {messages.map((message,index)=>{
   const previous=messages[index-1],next=messages[index+1];const newDay=!previous||!sameDay(previous,message);const grouped=Boolean(previous&&!newDay&&previous.role===message.role);const lastInGroup=!next||next.role!==message.role||!sameDay(message,next);const outgoing=own(message);
   return <Fragment key={message.id}>{newDay&&<div className="pb-4 pt-2"><ChatDatePill className="static border-0 bg-control-quiet text-xs shadow-none backdrop-blur-none">{new Date(message.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</ChatDatePill></div>}
    <ChatMessage data-read-sequence={!outgoing&&message.role!=='assistant'?message.sequence:undefined} side={outgoing?'outgoing':'incoming'} author={author(message)} grouped={grouped} className={grouped?'pt-1':'pt-4 first:pt-0'} avatar={<Avatar className="size-7"><AvatarFallback seed={message.role}/></Avatar>} bubbleProps={{className:outgoing?'bg-primary text-primary-foreground':'bg-control-quiet text-foreground'}} footer={<>{lastInGroup&&<><span>{outgoing?author(message):null}</span><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time></>}{lastInGroup&&outgoing&&message.role!=='assistant'&&<span>{message.sequence<=readThrough?'Read':'Sent'}</span>}{message.sourceIds.length>0&&<span>· {message.sourceIds.length} sources</span>}{message.suggestion&&onIdea&&<Button variant="ghost" size="sm" className="h-auto whitespace-normal px-1 py-1 text-xs" onClick={()=>onIdea(message.suggestion!)}>Review feature request</Button>}</>}>
     <ChatMessageText text={message.body} className="text-[13px] leading-6"/>{Boolean(message.images?.length)&&<div className="pt-2"><AttachmentPreview images={message.images!}/></div>}
    </ChatMessage>
   </Fragment>;
  })}
  <ChatTypingIndicator visible={Boolean(generating)&&active} label="Preparing a reply…" className="pt-4"/>
 </div></ChatConversation>;
}

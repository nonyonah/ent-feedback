'use client';

import {ErrorNotice} from '@/components/ui/error-notice';
import {uploadChatImages,releaseChatImages} from '@/lib/chat/upload-client';
import {CHAT_AI_REPLIES_ENABLED} from '@/lib/chat/contracts';
import {conversationTime} from '@/lib/chat/relative-time';
import {TopicChips} from './topic-chips';
import {useEffect,useRef,useState} from 'react';
import {useRouter,useSearchParams,usePathname} from 'next/navigation';
import Link from 'next/link';
import {ChatIcon,TrayIcon,MessagesIcon} from '@/components/icons';
import {useProject} from '@/components/feedback/project-provider';
import {useSidebar,SidebarTrigger,SidebarGroup,SidebarGroupLabel,SidebarMenu,SidebarMenuItem,SidebarMenuButton} from '@/components/ui/sidebar';
import {Button} from '@/components/ui/button';
import {Avatar,AvatarFallback} from '@/components/ui/avatar';
import {ChatComposer} from './chat-composer';
import {Skeleton} from '@/components/ui/skeleton';
import {MessageList} from './message-list';
import {IdeaDialog} from './idea-dialog';
import {ConversationSearch} from './conversation-search';
import {EmptyIllustration} from '@/components/feedback/empty-illustration';
import {unwrap,useChatPolling} from '@/lib/chat/client';
import {listConversationsAction,loadConversationAction,replyConversationAction,changeConversationAction,markConversationReadAction,countUnreadConversationsAction} from '@/server/actions/chat';
import type {ChatSnapshot,ChatMessage,Idea} from '@/lib/chat/contracts';
type Row=Awaited<ReturnType<typeof listConversationsAction>> extends infer R?R extends {ok:true;data:infer D}?D:never:never;
export function ConversationsInbox(){
 const {project,projects,switchProject}=useProject();const params=useSearchParams();const requested=params.get('workspace');const conversation=params.get('conversation');const router=useRouter();
 const valid=Boolean(requested&&projects?.some(p=>p.id===requested));
 useEffect(()=>{if(requested&&valid){if(project.id!==requested)switchProject(requested);router.replace('/dashboard/conversations'+(conversation?'?conversation='+encodeURIComponent(conversation):''));}},[requested,valid,project.id,switchProject,conversation,router]);
 if(requested&&!valid)return <ErrorNotice className="m-6">This conversation’s workspace is not available to your account.</ErrorNotice>;
 if(requested&&project.id!==requested)return <div className="p-6"><Skeleton className="h-20 w-full"/></div>;
 const filter=conversationFilter(params.get('view'));
 return <ScopedInbox key={project.id+filter} filter={filter}/>;
}
type ConversationFilter='queue'|'open'|'all';
function conversationFilter(value:string|null):ConversationFilter{return value==='queue'||value==='open'?value:'all';}
const conversationViews=[{id:'queue',label:'Queue',Icon:TrayIcon},{id:'open',label:'Open',Icon:ChatIcon},{id:'all',label:'All',Icon:MessagesIcon}] as const;
function ScopedInbox({filter}:{filter:ConversationFilter}){
 const {project}=useProject();const [rows,setRows]=useState<Row>([]);const [loaded,setLoaded]=useState(false);const query=useSearchParams().get('conversation');const [selected,setSelected]=useState<string|null>(query);const [mobileDetail,setMobileDetail]=useState(Boolean(query));
 const [now,setNow]=useState(0);
 useEffect(()=>{const update=()=>setNow(Date.now());update();const timer=setInterval(update,30000);return()=>clearInterval(timer);},[]);
 const visibleRows=rows;
 const poll=useChatPolling(async signal=>{const data=unwrap(await listConversationsAction(project.id,filter));if(signal.aborted)return;setRows(data);setLoaded(true);},true,5000);
 return <div className="flex min-h-0 flex-1"><section aria-label="Conversations" className={'flex w-full shrink-0 flex-col border-r border-border/60 lg:w-[300px] xl:w-[320px] '+(mobileDetail?'hidden lg:flex':'')}><header className="flex min-h-14 shrink-0 items-center gap-3 px-4 py-2"><SidebarTrigger className="md:hidden"/><h1 className="text-[13px] font-medium tracking-[-0.135px]">{conversationViews.find(view=>view.id===filter)?.label}</h1><span className="ml-auto text-xs tabular-nums text-muted-foreground">{visibleRows.length}</span></header><div className="px-4 pb-4"><ConversationSearch items={rows} loading={!loaded} error={poll.error} onSelect={id=>{setSelected(id);setMobileDetail(true);}}/></div><div className="min-h-0 flex-1 overflow-y-auto p-2.5">{!loaded&&!poll.error&&Array.from({length:5},(_,i)=><div key={i} className="space-y-2 p-3"><Skeleton className="h-4 w-3/4"/><Skeleton className="h-3 w-1/2"/></div>)}{visibleRows.map(row=><ConversationRow key={row.id} now={now} row={row} selected={selected===row.id} onSelect={()=>{setSelected(row.id);setMobileDetail(true);}}/>)}{loaded&&!visibleRows.length&&<div className="px-4 py-10 text-center"><EmptyIllustration className="mb-4"/><p className="text-sm font-medium">{filter==='queue'?'Queue is clear':filter==='open'?'No open conversations':'No conversations yet'}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{filter==='queue'?'Conversations needing your team will appear here.':filter==='open'?'New conversations will appear here.':'Enable chat in your widget to hear from visitors.'}</p><Button variant="outline" size="sm" className="mt-4" render={<Link href="/dashboard/settings/chat"/>}>Chat settings</Button></div>}{poll.error&&<ErrorNotice  className="p-3 text-xs text-foreground">{poll.error}<Button size="sm" variant="ghost" onClick={poll.retry}>Retry</Button></ErrorNotice>}</div></section><section aria-label="Selected conversation" className={'min-w-0 flex-1 flex-col '+(mobileDetail?'flex':'hidden lg:flex')}>{selected?<TeamConversation key={project.id+selected} workspaceId={project.id} id={selected} onBack={()=>setMobileDetail(false)} onChange={poll.retry}/>:<div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"><EmptyIllustration className="mb-4"/><h2 className="text-sm font-medium">Select a conversation</h2><p className="text-xs text-muted-foreground">Read, reply, or hand it back to the assistant.</p></div>}</section></div>;
}
function TeamConversation({workspaceId,id,onBack,onChange}:{workspaceId:string;id:string;onBack:()=>void;onChange:()=>void}){
 const [state,setState]=useState<ChatSnapshot|null>(null);const [messages,setMessages]=useState<ChatMessage[]>([]);const cursor=useRef<string|null>(null);const [body,setBody]=useState('');const [images,setImages]=useState<string[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [idea,setIdea]=useState<Idea|null>(null);const request=useRef<{body:string;requestId:string;images:string[]}|null>(null);const read=useRef(false);const lastReadCursor=useRef<string|null>(null);
 const poll=useChatPolling(async signal=>{let more=true;while(more&&!signal.aborted){const next=unwrap(await loadConversationAction(workspaceId,id,cursor.current??undefined));if(signal.aborted)return;setState(next);cursor.current=next.cursor;setMessages(current=>[...new Map([...current,...next.messages].map(m=>[m.id,m])).values()].sort((a,b)=>a.sequence-b.sequence));more=next.hasMore;}if((!read.current||cursor.current!==lastReadCursor.current)&&!signal.aborted){unwrap(await markConversationReadAction(workspaceId,id));read.current=true;lastReadCursor.current=cursor.current;onChange();}});
 async function action(value:'resolve'|'human'|'ai'){setBusy(true);setError('');try{unwrap(await changeConversationAction(workspaceId,id,value));poll.retry();onChange();}catch(e){setError(e instanceof Error?e.message:'This change could not be saved.');}finally{setBusy(false);}}
 async function reply(){if((!body.trim()&&!images.length)||busy)return;setBusy(true);setError('');try{const uploaded=await uploadChatImages(workspaceId,id,images);const text=body.trim()||'Image attachment';if(request.current?.body!==text||JSON.stringify(request.current.images)!==JSON.stringify(uploaded))request.current={body:text,requestId:crypto.randomUUID(),images:uploaded};unwrap(await replyConversationAction(workspaceId,id,request.current));releaseChatImages(id,images);setBody('');setImages([]);request.current=null;poll.retry();onChange();}catch(e){setError(e instanceof Error?e.message:'Your reply could not be sent.');}finally{setBusy(false);}}
 return <><header className="flex min-h-14 flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2"><Button variant="ghost" size="sm" className="lg:hidden" onClick={onBack}>Back</Button><h2 className="mr-auto text-sm font-medium">{!CHAT_AI_REPLIES_ENABLED||state?.mode==='human'?'Team conversation':'AI conversation'}</h2>{state&&<><TopicChips ids={state.topicIds}/><ConversationStatus status={state.status}/></>}<Button hidden={!CHAT_AI_REPLIES_ENABLED} disabled={busy||!state} variant="outline" size="sm" onClick={()=>void action(state?.mode==='ai'?'human':'ai')}>{state?.mode==='ai'?'Take over':'Return to AI'}</Button><Button disabled={busy||!state||state.status==='resolved'} variant="outline" size="sm" onClick={()=>void action('resolve')}>{state?.status==='resolved'?'Resolved':'Resolve'}</Button></header>{state?.links.length? <div className="flex flex-wrap gap-2 border-b border-border/60 px-4 py-2">{state.links.map(link=><Link className="text-xs underline underline-offset-4" key={link.feedbackId} href={'/dashboard?request='+link.feedbackId}>{link.title}</Link>)}</div>:null}{!state&&!poll.error?<div aria-label="Loading conversation" aria-busy="true" className="min-h-0 flex-1 space-y-5 overflow-hidden p-5"><Skeleton className="h-16 w-3/4"/><Skeleton className="ml-auto h-12 w-2/3"/></div>:<MessageList variant="dashboard" messages={messages} generating={state?.generating} onIdea={setIdea}/>}<div className="px-4">{(error||poll.error)&&<ErrorNotice  className="pb-3 text-xs text-foreground">{error||poll.error}<Button size="sm" variant="ghost" onClick={poll.retry}>Refresh</Button></ErrorNotice>}</div><ChatComposer value={body} onChange={setBody} onSend={()=>void reply()} busy={busy} error={Boolean(error)} disabled={!state} label="Reply as the team" actionLabel="Send reply" images={images} onImagesChange={setImages}/>{idea&&<IdeaDialog idea={idea} conversation={{id}} onClose={()=>{setIdea(null);poll.retry();}}/>}</>;
}
export function ConversationsNavigation(){const {project}=useProject();return <ActiveConversationsNavigation key={project.id}/>;}
function ActiveConversationsNavigation(){
 const {project}=useProject();const active=usePathname()==='/dashboard/conversations';const filter=conversationFilter(useSearchParams().get('view'));const {setOpenMobile}=useSidebar();const [count,setCount]=useState(0);
 useChatPolling(async signal=>{const data=unwrap(await countUnreadConversationsAction(project.id));if(!signal.aborted)setCount(data);},true,15000);
 return <SidebarGroup data-tour="conversations" className="p-0"><SidebarGroupLabel className="mb-1.5 h-auto px-2 text-[11px] font-semibold uppercase leading-4 tracking-[0.5px] text-muted-foreground">Conversations</SidebarGroupLabel><SidebarMenu className="gap-px">{conversationViews.map(view=><SidebarMenuItem key={view.id}><SidebarMenuButton className="h-11 gap-2.5 rounded-xl px-2 text-[13px] font-medium tracking-[-0.065px] text-muted-foreground hover:bg-sidebar-accent/60 data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground md:h-[30px]" isActive={active&&filter===view.id} aria-current={active&&filter===view.id?'page':undefined} render={<Link prefetch={true} href={'/dashboard/conversations?view='+view.id}/>} onClick={()=>setOpenMobile(false)}><view.Icon className="size-[15px] shrink-0"/><span>{view.label}</span>{view.id==='all'&&count>0&&<span aria-label={count+' unread conversations'} className="ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center rounded-[5px] bg-primary px-1 text-[11px] font-medium leading-none tabular-nums text-primary-foreground">{count}</span>}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroup>;
}

function ConversationStatus({status}:{status:ChatSnapshot['status']}){
 const label=status==='resolved'?'Resolved':status==='escalated'?'Queued':'In progress';
 return <span className="inline-flex shrink-0 items-center gap-1.5 h-5 rounded-full bg-control-quiet px-2 text-[13px] font-medium leading-4 text-foreground"><span aria-hidden="true" className={'size-1.5 rounded-full '+(status==='resolved'?'bg-emerald-500':status==='escalated'?'bg-amber-500':'bg-blue-500')}/>{label}</span>;
}

function ConversationRow({row,selected,onSelect,now}:{row:Row[number];selected:boolean;onSelect:()=>void;now:number}){
 const date=new Date(row.lastActivityAt);
 const validDate=Number.isFinite(date.getTime());
 return <button onClick={onSelect} aria-pressed={selected} className={'mb-1 flex min-h-[74px] w-full items-center gap-1.5 rounded-[10px] px-2.5 py-3 text-start outline-none hover:bg-control-quiet/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring '+(selected?'bg-control-quiet':'')}>
  <Avatar className="mt-0.5 size-8" aria-hidden="true"><AvatarFallback seed={row.email??row.id}/></Avatar>
  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
   <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-[13px] font-medium leading-5 tracking-[-0.065px]">{row.name??row.email??'Visitor'}</span>{row.unread&&<span aria-label="Unread" className="size-1.5 shrink-0 rounded-full bg-primary"/>}</span>
   <span className="truncate text-[13px] font-medium leading-5 text-muted-foreground">{row.preview||'New conversation'}</span>
  </span>
  <span className="flex h-11.5 shrink-0 flex-col items-end gap-1.5">
   {validDate&&<time dateTime={date.toISOString()} title={date.toLocaleString()} className="text-[11px] font-medium leading-5 tabular-nums text-muted-foreground">{now?conversationTime(row.lastActivityAt,now):'Now'}</time>}
   <ConversationStatus status={row.status}/>
  </span>
 </button>;
}

"use client";
import {captureAnalytics} from "@/lib/analytics";

import * as React from 'react';
import {usePathname} from 'next/navigation';
import {useUser} from '@clerk/nextjs';
import {useProject} from '@/components/feedback/project-provider';
import {loadFeedbackAction,loadWorkspaceFeedbackAction,mutateFeedbackAction,type FeedbackCommand} from '@/server/actions/feedback';
import {getTrendingIds} from '@/lib/feedback-sort';
import {createMutationQueue} from '@/lib/mutation-queue';
import {createFeedbackUploader} from '@/lib/feedback-uploads';
import {toastManager} from '@/components/ui/toast';
import type {FeedbackItemData,FeedbackStatus,FeedbackCategory} from '@/lib/feedback-data';

type MutationData=Extract<Awaited<ReturnType<typeof mutateFeedbackAction>>,{ok:true}>['data'];
type NewFeedbackInput={category?:FeedbackCategory;title:string;description:string;images?:string[];email?:string;name?:string;channel?:'board'|'widget'};
type FeedbackContextValue={
 trendingIds:ReadonlySet<string>;items:FeedbackItemData[];loading:boolean;error:string;pending:boolean;retry:()=>void;
 vote:(id:string)=>void;
 toggleFollow:(id:string)=>Promise<void>;
 addFeedback:(input:NewFeedbackInput)=>Promise<FeedbackItemData>;
 addComment:(id:string,body:string,images?:string[],parentCommentId?:string)=>Promise<void>;
 toggleCommentLike:(id:string,commentId:string)=>void;
 updateStatus:(id:string,status:FeedbackStatus)=>void;
 deleteItem:(id:string)=>void;
 updateCategory:(id:string,category:FeedbackCategory)=>Promise<void>;
 classify:(id:string,category:FeedbackCategory,tagIds:string[])=>Promise<void>;
};
const FeedbackContext=React.createContext<FeedbackContextValue|null>(null);
const isId=(value:string)=>/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);
export function FeedbackProvider({children}:{children:React.ReactNode}){
 const {project,activeBoard,workspaceReady,publicUser}=useProject();const {user,isLoaded}=useUser();
 const pathname=usePathname();const workspaceInbox=pathname.startsWith('/dashboard');
 const wid=project.id,bid=activeBoard?.id??'';const key=wid+':'+(workspaceInbox?'inbox':bid)+':'+(user?.id??'guest');
 const valid=pathname!=="/"&&pathname!=="/landing-v2"&&workspaceReady&&isLoaded&&isId(wid)&&isId(bid);
 const [snapshot,setSnapshot]=React.useState<{key:string;items:FeedbackItemData[]}>({key:'',items:[]});
 const [failure,setFailure]=React.useState<{key:string;message:string}>({key:'',message:''});
 const uploader=React.useRef<ReturnType<typeof createFeedbackUploader>|null>(null);
 if(uploader.current === null){uploader.current=createFeedbackUploader();}
 const retries=React.useRef(new Map<string,string>());
 const queue=React.useRef(createMutationQueue());
 const queued=React.useRef(new Map<string,Promise<MutationData>>());
 const queuedCount=React.useRef(0);
 const [pending,setPending]=React.useState(false);const busy=React.useRef(false);const token=React.useRef<string|undefined>(undefined);const scope=React.useRef(key);const generation=React.useRef(0);
 React.useLayoutEffect(()=>{scope.current=key;},[key]);
 const items=snapshot.key===key?snapshot.items:[];
 const failureMessage=failure.key===key?failure.message:'';
 const error=snapshot.key===key?'':failureMessage;
 const loading=valid&&snapshot.key!==key&&!error;
 const readBoardId=workspaceInbox?'':bid;
 const reload=React.useCallback(async(cancelled:()=>boolean=()=>false)=>{
  if(!valid)return;const version=++generation.current;
  let saved:string|undefined;
  try{saved=localStorage.getItem('ent-visitor:'+wid)??undefined;}catch{}
  try{
   const result=await (workspaceInbox?loadWorkspaceFeedbackAction(wid):loadFeedbackAction(wid,readBoardId,saved));
   if(cancelled()||busy.current||scope.current!==key||generation.current!==version)return;
   if(!result.ok)throw Error(result.error.message);
   token.current=result.data.guestToken;
   if(result.data.guestToken){try{localStorage.setItem('ent-visitor:'+wid,result.data.guestToken);}catch{}}
   setFailure({key,message:''});setSnapshot({key,items:result.data.items});
  }catch(error){if(!cancelled()&&scope.current===key&&generation.current===version)setFailure({key,message:error instanceof Error?error.message:'Feedback could not be loaded. Try again.'});}
 },[valid,key,wid,readBoardId,workspaceInbox]);
 React.useEffect(()=>{
  const controller=new AbortController();
  // Skip an already-cleaned-up Strict Mode pass before starting visitor bootstrap.
  queueMicrotask(()=>{if(!controller.signal.aborted)void reload(()=>controller.signal.aborted);});
  return()=>controller.abort();
 },[reload]);
 React.useEffect(()=>{
  const refresh=()=>{if(!busy.current&&document.visibilityState==='visible')void reload();};
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  const changed=(event:Event)=>{if(event instanceof StorageEvent?event.key==='ent-feedback-updated:'+wid:(event as CustomEvent).detail===wid)refresh();};
  window.addEventListener('storage',changed);window.addEventListener('ent-feedback-updated',changed);
  const timer=window.setInterval(refresh,15000);
  return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('storage',changed);window.removeEventListener('ent-feedback-updated',changed);window.clearInterval(timer);};
 },[reload,wid]);
 function retry(){setFailure({key,message:''});void reload();}
 function mutate(input:FeedbackCommand):Promise<MutationData>{
  const fingerprint=key+(input.type==='create'?':'+bid:'')+JSON.stringify(input),existing=queued.current.get(fingerprint);
  if(existing)return existing;
  queuedCount.current++;setPending(true);
  const task=queue.current.run(async()=>{
   if(scope.current!==key)throw Error('The workspace changed. Return to the original workspace to try again.');
   return executeMutation(input);
  }).finally(()=>{queued.current.delete(fingerprint);queuedCount.current--;setPending(queuedCount.current>0);});
  queued.current.set(fingerprint,task);
  return task;
 }
 async function executeMutation(input:FeedbackCommand){
  if(!valid||snapshot.key!==key)throw Error('Wait for this board to load, then try again.');
  const targetBoard=input.type==='create'?bid:items.find(item=>item.id===input.id)?.boardId??bid;
  const fingerprint=key+(input.type==='create'?':'+bid:'')+JSON.stringify(input);
  let command=input;
  if(input.type==='create'||input.type==='comment'){
   const requestId=retries.current.get(fingerprint)??crypto.randomUUID();
   retries.current.set(fingerprint,requestId);
   if(retries.current.size>20)retries.current.delete(retries.current.keys().next().value!);
   command={...input,requestId};
  }
  busy.current=true;generation.current++;
  try{
   if(command.type==='create'||command.type==='comment'){const images=await uploader.current!.upload(command.images,{workspaceId:wid,boardId:targetBoard,actorKey:key+":"+command.requestId,guestToken:token.current});if(scope.current!==key)throw Error('The board changed. Return to your draft to submit it.');command={...command,images};}
   const result=await new Promise<Awaited<ReturnType<typeof mutateFeedbackAction>>>((resolve,reject)=>React.startTransition(async()=>{try{resolve(await mutateFeedbackAction(wid,targetBoard,command,token.current,workspaceInbox));}catch(error){reject(error);}}));
   if(!result.ok)throw Error(Object.values(result.error.fieldErrors??{})[0]?.[0]??result.error.message);
   retries.current.delete(fingerprint);
   const surface=workspaceInbox?'dashboard':'public_board';
   if(command.type==='create')captureAnalytics('feedback_submitted',{surface,feedback_type:command.category??'feedback',has_attachment:Boolean(command.images?.length)});
   if(command.type==='comment')captureAnalytics('comment_submitted',{surface,is_reply:Boolean(command.parentCommentId),has_attachment:Boolean(command.images?.length)});
   if(command.type==='vote')captureAnalytics('vote_changed',{surface,active:command.active});
   if(command.type==='create'||command.type==='comment')uploader.current!.clear({workspaceId:wid,boardId:targetBoard,actorKey:key+':'+command.requestId});
   if(scope.current===key)setSnapshot({key,items:result.data.items});
   try{localStorage.setItem('ent-feedback-updated:'+wid,crypto.randomUUID());}catch{}
   window.dispatchEvent(new CustomEvent('ent-feedback-updated',{detail:wid}));
   return result.data;
  }finally{busy.current=false;}
 }
 function report(operation:Promise<unknown>,title='Change wasn’t saved'){void operation.catch(error=>toastManager.add({title,description:error instanceof Error?error.message:'Try again.',type:'error'}));}
 async function addFeedback(input:NewFeedbackInput){
  const result=await mutate({type:'create',category:input.category,channel:input.channel,title:input.title,description:input.description,name:input.name,email:input.email,anonymous:!publicUser,images:input.images});
  const created=result.items.find(item=>item.id===result.createdId);if(!created)throw Error('Feedback was saved. Refresh the board to view it.');return created;
 }
 const value:FeedbackContextValue={trendingIds:getTrendingIds(items),items,loading,error,pending,retry,
  vote:id=>{const item=items.find(item=>item.id===id);if(item)report(mutate({type:'vote',id,active:!item.voted}),'Vote wasn’t saved');},
  toggleFollow:async id=>{const item=items.find(item=>item.id===id);if(item)await mutate({type:'follow',id,active:!item.following});},
  addFeedback,addComment:async(id,body,images,parentCommentId)=>{await mutate({type:'comment',id,body,images,parentCommentId});},
  toggleCommentLike:(id,commentId)=>{const comment=items.find(item=>item.id===id)?.comments.find(comment=>comment.id===commentId);if(comment)report(mutate({type:'reaction',id,commentId,active:!comment.liked}),'Reaction wasn’t saved');},
  updateStatus:(id,status)=>report(mutate({type:'status',id,status}),'Status wasn’t updated'),
  updateCategory:async(id,category)=>{await mutate({type:'category',id,category});},
  classify:async(id,category,tagIds)=>{await mutate({type:'classification',id,category,tagIds});},
  deleteItem:id=>report(mutate({type:'delete',id}),'Feedback wasn’t deleted'),
 };
 return <FeedbackContext.Provider value={value}>{valid&&failureMessage&&<div role={snapshot.key===key?"status":"alert"} className="flex flex-wrap items-center justify-center gap-3 border-b border-border px-4 py-3 text-sm"><span>{snapshot.key===key?"Couldn’t refresh feedback. Showing the last saved version. ":""}{failureMessage}</span><button type="button" disabled={pending} className="rounded-md underline underline-offset-4 focus-visible:outline-2" onClick={retry}>Retry loading feedback</button></div>}{children}</FeedbackContext.Provider>;
}
export function useFeedback(){const context=React.useContext(FeedbackContext);if(!context)throw Error('useFeedback must be used within a FeedbackProvider.');return context;}

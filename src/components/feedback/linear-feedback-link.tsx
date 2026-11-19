'use client';
import {useEffect,useState} from 'react';
import {useProject} from './project-provider';
import {LinearMark} from './app-logos';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {ActionButton} from '@/components/ui/action-button';
import {Dialog,DialogPopup,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {toastManager} from '@/components/ui/toast';
import {loadFeedbackLinearLinkAction,linkFeedbackLinearAction} from '@/server/actions/connected-apps';
import {unwrap} from '@/lib/chat/client';
type Data=Extract<Awaited<ReturnType<typeof loadFeedbackLinearLinkAction>>,{ok:true}>['data'];
export function LinearFeedbackLink({feedbackId}:{feedbackId:string}){
 const {project}=useProject();const [data,setData]=useState<Data|null>(null),[open,setOpen]=useState(false),[existing,setExisting]=useState(''),[pending,setPending]=useState(false);
 useEffect(()=>{let active=true;void loadFeedbackLinearLinkAction(project.id,feedbackId).then(r=>{if(active)setData(r.ok?r.data:null);});return()=>{active=false;};},[project.id,feedbackId]);
 if(!data?.available)return null;
 async function link(){setPending(true);try{const result=unwrap(await linkFeedbackLinearAction({workspaceId:project.id,feedbackId,...(existing.trim()?{existing:existing.trim()}:{} )}));setData({available:true,link:result});setOpen(false);toastManager.add({type:'success',title:'Linear issue linked'});}catch(e){toastManager.add({type:'error',title:e instanceof Error?e.message:'Issue could not be linked'});}finally{setPending(false);}}
 return <div className="mt-2">{data.link?<Button variant="ghost" size="sm" render={<a href={data.link.url} target="_blank" rel="noopener noreferrer"/>}><LinearMark className="size-3.5"/>{data.link.identifier}</Button>:<Button size="sm" variant="secondary" onClick={()=>setOpen(true)}><LinearMark className="size-3.5"/>Send to Linear</Button>}<Dialog open={open} onOpenChange={v=>{if(!pending)setOpen(v);}}><DialogPopup className="max-w-sm"><div className="p-6"><DialogTitle>Send to Linear</DialogTitle><DialogDescription className="mt-2">Create an issue from this feedback, or link one from your connected team.</DialogDescription><div className="mt-5 space-y-2"><Label htmlFor="linear-existing">Existing issue (optional)</Label><Input id="linear-existing" placeholder="ENG-123" value={existing} onChange={e=>setExisting(e.target.value)} maxLength={100}/></div></div><DialogFooter><Button variant="secondary" disabled={pending} onClick={()=>setOpen(false)}>Cancel</Button><ActionButton state={pending?'pending':'idle'} pendingLabel="Linking…" onClick={()=>void link()}>{existing.trim()?'Link issue':'Create issue'}</ActionButton></DialogFooter></DialogPopup></Dialog></div>;
}

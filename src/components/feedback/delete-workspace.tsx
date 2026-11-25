'use client';
import * as React from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ErrorNotice} from '@/components/ui/error-notice';
import {Dialog,DialogTrigger,DialogHeader,DialogPopup,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {SettingGroup,SettingRow} from '@/components/feedback/settings-layout';
import {deleteWorkspaceAction} from '@/server/actions/workspaces';

export function DeleteWorkspace({workspaceId,name}:{workspaceId:string;name:string}){
 const router=useRouter();const [open,setOpen]=React.useState(false),[confirmation,setConfirmation]=React.useState(''),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');const id=React.useId();
 async function remove(){setBusy(true);setError('');try{const result=await deleteWorkspaceAction({workspaceId,confirmation});if(!result.ok)throw Error(result.error.message);router.push('/dashboard');router.refresh();}catch(reason){setError(reason instanceof Error?reason.message:'Workspace could not be deleted.');setBusy(false);}}
 return <SettingGroup title="Workspace"><SettingRow title="Delete workspace" description="Permanently delete this workspace and its feedback, conversations, and changelog."><Dialog open={open} onOpenChange={next=>{if(!busy){setOpen(next);if(!next){setConfirmation('');setError('');}}}}><DialogTrigger render={<Button variant="destructive-outline" size="sm"/>}>Delete workspace</DialogTrigger><DialogPopup bottomStickOnMobile={false}><DialogHeader><DialogTitle>Delete {name}?</DialogTitle><DialogDescription>This permanently deletes the workspace for everyone. Disconnect its integrations and end any active subscription first. This cannot be undone.</DialogDescription></DialogHeader><div className="space-y-2 px-6 pb-4"><label htmlFor={id} className="text-sm font-medium">Type {name} to confirm</label><Input id={id} value={confirmation} onChange={event=>setConfirmation(event.target.value)} autoComplete="off" disabled={busy}/>{error&&<ErrorNotice>{error}</ErrorNotice>}</div><DialogFooter><Button variant="secondary" disabled={busy} onClick={()=>setOpen(false)}>Cancel</Button><Button variant="destructive" loading={busy} disabled={busy||confirmation!==name} onClick={()=>void remove()}>Delete workspace</Button></DialogFooter></DialogPopup></Dialog></SettingRow></SettingGroup>;
}

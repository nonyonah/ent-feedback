'use client';
import * as React from 'react';
import {SidebarTrigger} from '@/components/ui/sidebar';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {ActionButton} from '@/components/ui/action-button';
import {ErrorNotice} from '@/components/ui/error-notice';
import {Skeleton} from '@/components/ui/skeleton';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Dialog,DialogPopup,DialogHeader,DialogTitle,DialogDescription,DialogFooter,DialogClose} from '@/components/ui/dialog';
import {toastManager} from '@/components/ui/toast';
import {EmptyState} from '@/components/feedback/empty-state';
import {PlusIcon,PencilSimpleIcon,TrashIcon,EyeIcon,EyeOffIcon} from '@/components/icons';
import {useProject} from '@/components/feedback/project-provider';
import {changelogBodyMaxLength,changelogTitleMaxLength,formatChangelogDate,type ChangelogEntry} from '@/lib/changelog';
import {listChangelogEntriesAction,createChangelogEntryAction,updateChangelogEntryAction,setChangelogEntryPublishedAction,deleteChangelogEntryAction} from '@/server/actions/changelog';

type Draft={id:string|null;title:string;body:string};

function sortEntries(list:ChangelogEntry[]){
  return [...list].sort((a,b)=>(b.publishedAt??'').localeCompare(a.publishedAt??'')||b.updatedAt.localeCompare(a.updatedAt));
}
function message(error:unknown,fallback:string){return error instanceof Error?error.message:fallback;}

export function DashboardChangelog(){
  const {project}=useProject();
  const editable=project.role==='owner'||project.role==='admin';
  const [snapshot,setSnapshot]=React.useState<{workspaceId:string;entries:ChangelogEntry[];error:string}|null>(null);
  const [attempt,reload]=React.useReducer(value=>value+1,0);
  const [draft,setDraft]=React.useState<Draft|null>(null);
  const [formError,setFormError]=React.useState('');
  const [saving,setSaving]=React.useState<'save'|'publish'|null>(null);
  const [publishing,setPublishing]=React.useState<string[]>([]);
  const [deleting,setDeleting]=React.useState<ChangelogEntry|null>(null);
  const [deleteError,setDeleteError]=React.useState('');
  const [removing,setRemoving]=React.useState(false);
  const uid=React.useId();

  // A snapshot carries its workspace so switching workspaces never shows another tenant's entries.
  const loaded=snapshot?.workspaceId===project.id?snapshot:null;
  const entries=loaded?.entries??null;
  const loadError=loaded?.error??'';

  React.useEffect(()=>{
    let canceled=false;
    void listChangelogEntriesAction(project.id).then(result=>{
      if(canceled)return;
      setSnapshot({workspaceId:project.id,entries:result.ok?sortEntries(result.data):[],error:result.ok?'':result.error.message});
    }).catch(error=>{if(!canceled)setSnapshot({workspaceId:project.id,entries:[],error:message(error,'The changelog couldn’t be loaded.')});});
    return()=>{canceled=true;};
  },[project.id,attempt]);

  function commit(update:(entries:ChangelogEntry[])=>ChangelogEntry[]){setSnapshot(current=>current&&current.workspaceId===project.id?{...current,entries:update(current.entries)}:current);}
  function replace(entry:ChangelogEntry){commit(current=>sortEntries([entry,...current.filter(row=>row.id!==entry.id)]));}
  function edit(entry:ChangelogEntry){setFormError('');setDraft({id:entry.id,title:entry.title,body:entry.body});}
  function create(){setFormError('');setDraft({id:null,title:'',body:''});}

  async function submit(mode:'save'|'publish'){
    if(!draft||saving)return;
    setFormError('');setSaving(mode);
    try{
      const input={title:draft.title,body:draft.body};
      const result=draft.id?await updateChangelogEntryAction(project.id,draft.id,input):await createChangelogEntryAction(project.id,input);
      if(!result.ok)throw new Error(result.error.fieldErrors?.title?.[0]??result.error.fieldErrors?.body?.[0]??result.error.message);
      let entry=result.data;
      if(mode==='publish'){
        const published=await setChangelogEntryPublishedAction(project.id,entry.id,true);
        if(!published.ok)throw new Error(published.error.message);
        entry=published.data;
      }
      replace(entry);setDraft(null);
      toastManager.add({type:'success',title:mode==='publish'?'Changelog entry published':'Changelog entry saved'});
    }catch(error){setFormError(message(error,'The entry wasn’t saved. Try again.'));}
    finally{setSaving(null);}
  }

  async function togglePublished(entry:ChangelogEntry){
    if(publishing.includes(entry.id))return;
    setPublishing(current=>[...current,entry.id]);
    try{
      const result=await setChangelogEntryPublishedAction(project.id,entry.id,!entry.publishedAt);
      if(!result.ok)throw new Error(result.error.message);
      replace(result.data);
      toastManager.add({type:'success',title:result.data.publishedAt?'Entry published':'Entry moved back to draft'});
    }catch(error){toastManager.add({type:'error',title:'Publish state wasn’t saved',description:message(error,'Try again.')});}
    finally{setPublishing(current=>current.filter(id=>id!==entry.id));}
  }

  async function remove(){
    if(!deleting||removing)return;
    setDeleteError('');setRemoving(true);
    try{
      const result=await deleteChangelogEntryAction(project.id,deleting.id);
      if(!result.ok)throw new Error(result.error.message);
      commit(current=>current.filter(row=>row.id!==deleting.id));
      setDeleting(null);
      toastManager.add({type:'success',title:'Entry deleted'});
    }catch(error){setDeleteError(message(error,'The entry couldn’t be deleted. Try again.'));}
    finally{setRemoving(false);}
  }

  const formValid=Boolean(draft?.title.trim()&&draft?.body.trim());

  return <section aria-label="Changelog" className="flex min-h-0 flex-1 flex-col">
    <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 px-4 py-4">
      <div className="flex items-center gap-2">
        <span className="md:hidden"><SidebarTrigger/></span>
        <h1 className="text-[13px] font-medium leading-5 tracking-[-0.135px]">Changelog</h1>
      </div>
      {editable&&<Button size="sm" className="text-[13px]" onClick={create}><PlusIcon className="size-3.5"/>New entry</Button>}
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
      {loadError?<ErrorNotice className="mt-3">{loadError} <Button variant="link" size="sm" className="h-auto p-0 text-[13px]" onClick={reload}>Try again</Button></ErrorNotice>
        :!entries?<div aria-busy="true" aria-label="Loading changelog" className="mt-3 space-y-2">{[1,2,3].map(id=><div key={id} className="space-y-3 rounded-[13px] bg-card p-3.5"><Skeleton className="h-4 w-2/5"/><Skeleton className="h-3 w-4/5"/></div>)}</div>
        :!entries.length?<EmptyState className="py-16" title="No changelog yet" description={editable?'Publish an update to tell people what shipped.':'Published updates will appear here.'}/>
        :<ul className="mt-1 space-y-2">{entries.map(entry=><li key={entry.id} className="rounded-[13px] bg-card p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="min-w-0 truncate text-[13px] font-medium leading-5">{entry.title}</h2>
                {entry.publishedAt?<Badge variant="info" size="sm">Published {formatChangelogDate(entry.publishedAt)}</Badge>:<Badge variant="outline" size="sm">Draft</Badge>}
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{entry.body}</p>
            </div>
            {editable&&<div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon-sm" aria-label={'Edit '+entry.title} title="Edit" onClick={()=>edit(entry)}><PencilSimpleIcon/></Button>
              <Button variant="ghost" size="icon-sm" aria-label={(entry.publishedAt?'Unpublish ':'Publish ')+entry.title} title={entry.publishedAt?'Unpublish':'Publish'} disabled={publishing.includes(entry.id)} onClick={()=>void togglePublished(entry)}>{entry.publishedAt?<EyeOffIcon/>:<EyeIcon/>}</Button>
              <Button variant="ghost" size="icon-sm" aria-label={'Delete '+entry.title} title="Delete" onClick={()=>{setDeleteError('');setDeleting(entry);}}><TrashIcon/></Button>
            </div>}
          </div>
        </li>)}</ul>}
    </div>

    <Dialog open={Boolean(draft)} onOpenChange={open=>{if(!open&&!saving)setDraft(null);}}>
      <DialogPopup className="max-w-[520px]" showCloseButton={!saving}>
        <form onSubmit={event=>{event.preventDefault();void submit('save');}}>
          <fieldset disabled={Boolean(saving)} className="contents">
            <DialogHeader className="gap-1 pe-14 pb-0">
              <DialogTitle className="text-[14px] font-semibold leading-5 tracking-[-0.15px]">{draft?.id?'Edit entry':'New changelog entry'}</DialogTitle>
              <DialogDescription className="text-[13px] leading-[1.45]">Drafts stay private until you publish them.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 px-6 pb-6 pt-5">
              <div className="grid gap-1.5">
                <label htmlFor={uid+'-title'} className="text-xs font-medium text-foreground/80">Title</label>
                <Input id={uid+'-title'} autoFocus required maxLength={changelogTitleMaxLength} placeholder="Faster board search" value={draft?.title??''} onChange={event=>setDraft(current=>current?{...current,title:event.target.value}:current)} className="h-9 rounded-[10px] max-sm:h-11"/>
              </div>
              <div className="grid gap-1.5">
                <label htmlFor={uid+'-body'} className="text-xs font-medium text-foreground/80">Details</label>
                <Textarea id={uid+'-body'} required rows={8} maxLength={changelogBodyMaxLength} placeholder={'What changed and why it matters.\n\nLeave a blank line between paragraphs.'} value={draft?.body??''} onChange={event=>setDraft(current=>current?{...current,body:event.target.value}:current)} className="min-h-40 text-[13px]"/>
              </div>
              {formError&&<ErrorNotice className="text-xs">{formError}</ErrorNotice>}
            </div>
            <DialogFooter className="flex-row justify-end rounded-b-2xl bg-foreground/[0.02] py-3.5">
              <DialogClose render={<Button type="button" variant="secondary" size="sm" className="h-9 rounded-full px-3.5 text-[13px]"/>}>Cancel</DialogClose>
              <ActionButton type="button" variant="secondary" size="sm" className="h-9 rounded-full px-3.5 text-[13px]" state={saving==='save'?'pending':formError?'error':'idle'} pendingLabel="Saving…" disabled={Boolean(saving)||!formValid} onClick={()=>void submit('save')}>{draft?.id?'Save changes':'Save draft'}</ActionButton>
              {!draft?.id&&<ActionButton type="button" size="sm" className="h-9 rounded-full px-3.5 text-[13px]" state={saving==='publish'?'pending':formError?'error':'idle'} pendingLabel="Publishing…" disabled={Boolean(saving)||!formValid} onClick={()=>void submit('publish')}>Publish</ActionButton>}
            </DialogFooter>
          </fieldset>
        </form>
      </DialogPopup>
    </Dialog>

    <Dialog open={Boolean(deleting)} onOpenChange={open=>{if(!open&&!removing)setDeleting(null);}}>
      <DialogPopup className="max-w-sm" showCloseButton={!removing}>
        <div className="p-6">
          <DialogTitle>Delete {deleting?.title}?</DialogTitle>
          <DialogDescription className="mt-2">This permanently removes the entry, including any published copy on your public changelog. This can’t be undone.</DialogDescription>
          {deleteError&&<ErrorNotice className="mt-4">{deleteError}</ErrorNotice>}
        </div>
        <DialogFooter>
          <Button variant="secondary" disabled={removing} onClick={()=>setDeleting(null)}>Cancel</Button>
          <ActionButton variant="destructive" pendingLabel="Deleting entry…" retryLabel="Retry deleting" state={removing?'pending':deleteError?'error':'idle'} disabled={removing} onClick={()=>void remove()}>Delete entry</ActionButton>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  </section>;
}

'use client';
import * as React from 'react';
import editorStyles from './changelog-editor.module.css';
import {SidebarTrigger} from '@/components/ui/sidebar';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {ActionButton} from '@/components/ui/action-button';
import {ErrorNotice} from '@/components/ui/error-notice';
import {Skeleton} from '@/components/ui/skeleton';
import {Input} from '@/components/ui/input';
import {Select,SelectTrigger,SelectValue,SelectPopup,SelectItem} from '@/components/ui/select';
import {Dialog,DialogPopup,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {toastManager} from '@/components/ui/toast';
import {EmptyState} from '@/components/feedback/empty-state';
import {ChangelogBody} from '@/components/changelog/changelog-body';
import {GithubChangelogSetup} from '@/components/changelog/github-changelog-setup';
import {McpDraftProposals} from '@/components/changelog/mcp-draft-proposals';
import {changelogPlainText} from '@/lib/changelog-markdown';
import {ChangelogComposer,ChangelogCover} from '@/components/changelog/changelog-composer';
import {PublishDatePicker} from '@/components/changelog/publish-date-picker';
import {InboxSearchTrigger} from '@/components/feedback/inbox-search-trigger';
import {PlusIcon,PencilSimpleIcon,TrashIcon,EyeIcon,EyeOffIcon,XIcon,ClockIcon,GearSixIcon,MagnifyingGlassIcon,ArrowLeftIcon} from '@/components/icons';
import {useProject} from '@/components/feedback/project-provider';
import {changelogCategories,changelogCategoryLabels,changelogSlugMaxLength,changelogStatusLabels,changelogTitleMaxLength,formatChangelogDate,slugifyChangelogTitle,type ChangelogCategory,type ChangelogEntry,type ChangelogFeedbackLink,type ChangelogStatus} from '@/lib/changelog';
import {listChangelogEntriesAction,saveChangelogEntryAction,setChangelogEntryStatusAction,deleteChangelogEntryAction} from '@/server/actions/changelog';
import {searchChangelogRequestsAction,suggestChangelogFromFeedbackAction} from '@/server/actions/changelog';
import {Popover,PopoverTrigger,PopoverPopup} from '@/components/ui/popover';
import {SettingGroup} from '@/components/feedback/settings-layout';
import {features} from '@/lib/features';
import {Tooltip,TooltipTrigger,TooltipPopup} from '@/components/ui/tooltip';

type Draft={coverImage:string|null;id:string|null;title:string;slug:string;slugEdited:boolean;summary:string;body:string;category:ChangelogCategory;feedback:ChangelogFeedbackLink[];scheduledFor:string};
type Filter='all'|ChangelogStatus;

const emptyDraft: Draft={coverImage:null,id:null,title:'',slug:'',slugEdited:false,summary:'',body:'',category:'new-feature',feedback:[],scheduledFor:''};

function sortEntries(list:ChangelogEntry[]){
  return [...list].sort((a,b)=>(b.publishedAt??b.scheduledFor??b.updatedAt).localeCompare(a.publishedAt??a.scheduledFor??a.updatedAt));
}
function message(error:unknown,fallback:string){return error instanceof Error?error.message:fallback;}
const statusTone=(status:ChangelogStatus)=>status==='published'?'success':status==='scheduled'?'warning':'secondary';
const statusDot=(status:ChangelogStatus)=>status==='published'?'bg-success':status==='scheduled'?'bg-warning':'bg-muted-foreground/50';
function StatusBadge({status,label}:{status:ChangelogStatus;label:string}){
  return <Badge variant={statusTone(status)} size="sm"><span aria-hidden="true" className={'size-1.5 shrink-0 rounded-full '+statusDot(status)}/>{label}</Badge>;
}
function toLocalInput(value:string|null){
  if(!value)return '';
  const date=new Date(value);
  const offset=new Date(date.getTime()-date.getTimezoneOffset()*60000);
  return offset.toISOString().slice(0,16);
}

export function DashboardChangelog(){
  const {project}=useProject();
  const workspaceRef=React.useRef(project.id);
  React.useLayoutEffect(()=>{workspaceRef.current=project.id;},[project.id]);
  const editable=project.role==='owner'||project.role==='admin';
  const [snapshot,setSnapshot]=React.useState<{workspaceId:string;entries:ChangelogEntry[];error:string}|null>(null);
  const [attempt,reload]=React.useReducer(value=>value+1,0);
  const [filter,setFilter]=React.useState<Filter>('all');
  const [query,setQuery]=React.useState('');
  const [draft,setDraft]=React.useState<Draft|null>(null);
  const [formError,setFormError]=React.useState('');
  const [saving,setSaving]=React.useState<'save'|'publish'|'schedule'|null>(null);
  const [generating,setGenerating]=React.useState(false);
  const [uploads,setUploads]=React.useState({cover:false,content:false});
  const uploading=uploads.cover||uploads.content;
  const [settingsOpen,setSettingsOpen]=React.useState(false);
  const [preview,setPreview]=React.useState(false);
  const [working,setWorking]=React.useState<string[]>([]);
  const [deleting,setDeleting]=React.useState<ChangelogEntry|null>(null);
  const [leaving,setLeaving]=React.useState(false);
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

  const visible=React.useMemo(()=>{
    if(!entries)return null;
    const search=query.trim().toLowerCase();
    return entries.filter(entry=>(filter==='all'||entry.status===filter)&&(!search||entry.title.toLowerCase().includes(search)));
  },[entries,filter,query]);

  function commit(update:(entries:ChangelogEntry[])=>ChangelogEntry[]){setSnapshot(current=>current&&current.workspaceId===project.id?{...current,entries:update(current.entries)}:current);}
  function replace(entry:ChangelogEntry){commit(current=>sortEntries([entry,...current.filter(row=>row.id!==entry.id)]));}
  function edit(entry:ChangelogEntry){
    setFormError('');setPreview(false);
    setDraft({coverImage:entry.coverImage??null,id:entry.id,title:entry.title,slug:entry.slug,slugEdited:true,summary:entry.summary??'',body:entry.body,category:entry.category,feedback:entry.feedback,scheduledFor:toLocalInput(entry.scheduledFor)});
  }
  function create(){setFormError('');setPreview(false);setDraft({...emptyDraft});}

  async function suggestDraft(){
    if(!draft||generating||draft.title.trim()||draft.body.trim()||!draft.feedback.length)return;
    const original=draft,workspace=project.id;
    setGenerating(true);setFormError('');
    try{
      const result=await suggestChangelogFromFeedbackAction(workspace,original.feedback.map(item=>item.id));
      if(!result.ok)throw Error(result.error.message);
      setDraft(current=>workspaceRef.current===workspace&&current===original?{...current,title:result.data.title,slug:slugifyChangelogTitle(result.data.title),body:result.data.body}:current);
    }catch(error){if(workspaceRef.current===workspace)setFormError(message(error,'The AI draft could not be generated.'));}
    finally{setGenerating(false);}
  }

  const formValid=Boolean(draft?.title.trim()&&draft?.body.trim()&&!uploading);

  async function persist(mode:'save'|'publish'|'schedule'){
    if(!draft||saving||uploading)return;
    setFormError('');
    if(mode==='schedule'&&!draft.scheduledFor){setFormError('Pick a date and time to schedule this entry.');return;}
    setSaving(mode);
    try{
      const input={coverImage:draft.coverImage,title:draft.title,slug:draft.slug.trim()||undefined,summary:draft.summary.trim()||undefined,body:draft.body,category:draft.category,feedbackIds:draft.feedback.map(item=>item.id)};
      const saved=await saveChangelogEntryAction(project.id,draft.id,input);
      if(!saved.ok)throw new Error(saved.error.fieldErrors?.title?.[0]??saved.error.fieldErrors?.body?.[0]??saved.error.fieldErrors?.slug?.[0]??saved.error.message);
      let entry=saved.data;
      if(mode!=='save'){
        const status=mode==='publish'?'published':'scheduled';
        const next=await setChangelogEntryStatusAction(project.id,entry.id,{status,at:mode==='schedule'?new Date(draft.scheduledFor).toISOString():null});
        if(!next.ok)throw new Error(next.error.message);
        entry=next.data;
      }
      replace(entry);setDraft(null);
      toastManager.add({type:'success',title:mode==='publish'?'Entry published':mode==='schedule'?'Entry scheduled':'Entry saved'});
    }catch(error){setFormError(message(error,'The entry wasn’t saved. Try again.'));}
    finally{setSaving(null);}
  }

  async function setStatus(entry:ChangelogEntry,status:ChangelogStatus){
    if(working.includes(entry.id))return;
    setWorking(current=>[...current,entry.id]);
    try{
      const result=await setChangelogEntryStatusAction(project.id,entry.id,{status,at:null});
      if(!result.ok)throw new Error(result.error.message);
      replace(result.data);
      toastManager.add({type:'success',title:status==='published'?'Entry published':'Entry moved back to draft'});
    }catch(error){toastManager.add({type:'error',title:'Status wasn’t saved',description:message(error,'Try again.')});}
    finally{setWorking(current=>current.filter(id=>id!==entry.id));}
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

  return <section aria-label="Changelog" className="flex min-h-0 flex-1 flex-col">
    <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
      <span className="md:hidden"><SidebarTrigger/></span>
      <h1 className="text-[13px] font-medium tracking-[-0.135px]">Changelog</h1>
      {entries&&<span aria-label={entries.length+' entries'} className="text-[13px] tabular-nums text-muted-foreground">{entries.length}</span>}
      {editable&&<div className="ms-auto flex flex-wrap items-center gap-2"><McpDraftProposals key={project.id} workspaceId={project.id} onReviewed={reload}/><GithubChangelogSetup workspaceId={project.id} onImported={reload}/><Button size="sm" className="text-[13px]" onClick={create}><PlusIcon className="size-3.5"/>New entry</Button></div>}
    </header>
    <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-3">
      <Select items={[{value:'all',label:'All statuses'},{value:'published',label:'Published'},{value:'scheduled',label:'Scheduled'},{value:'draft',label:'Drafts'}]} value={filter} onValueChange={value=>value&&setFilter(value as Filter)}>
        <SelectTrigger aria-label="Filter by status" className="h-8 w-40 rounded-lg text-[13px]"><SelectValue/></SelectTrigger>
        <SelectPopup data-changelog-control><SelectItem value="all">All statuses</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="draft">Drafts</SelectItem></SelectPopup>
      </Select>
      <Input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search titles" aria-label="Search changelog titles" className="h-8 w-full max-w-56 rounded-lg text-[13px]"/>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
      {loadError?<ErrorNotice className="mt-3">{loadError} <Button variant="link" size="sm" className="h-auto p-0 text-[13px]" onClick={reload}>Try again</Button></ErrorNotice>
        :!visible?<div aria-busy="true" aria-label="Loading changelog" className="mt-3 space-y-2">{[1,2,3].map(id=><div key={id} className="space-y-3 rounded-[13px] bg-card p-3.5"><Skeleton className="h-4 w-2/5"/><Skeleton className="h-3 w-4/5"/></div>)}</div>
        :!visible.length?<EmptyState className="py-16" title={entries?.length?'No entries match':'No changelog yet'} description={editable?(entries?.length?'Try a different status or search.':'Publish an update to tell people what shipped.'):'Published updates will appear here.'}/>
        :<ul aria-label="Changelog entries" className="mt-1 overflow-hidden rounded-xl border border-border/60 bg-card">{visible.map(entry=><li key={entry.id} className="border-b border-border/60 p-4 last:border-b-0">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="min-w-0 break-words text-[14px] font-semibold leading-5">{entry.title}</h2>
                <StatusBadge status={entry.status} label={changelogStatusLabels[entry.status]+(entry.status==='published'&&entry.publishedAt?' · '+formatChangelogDate(entry.publishedAt):entry.status==='scheduled'&&entry.scheduledFor?' · '+formatChangelogDate(entry.scheduledFor):'')}/>
                <Badge variant="outline" size="sm" className="border-0 bg-control-quiet text-muted-foreground">{changelogCategoryLabels[entry.category]}</Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
                {entry.summary?<span className="line-clamp-2 min-w-0">{entry.summary}</span>:<span className="line-clamp-2 min-w-0">{changelogPlainText(entry.body)}</span>}
                {entry.feedback.length>0&&<span>· {entry.feedback.length} linked {entry.feedback.length===1?'request':'requests'}</span>}
                {entry.author&&<span>· {entry.author.name}</span>}
              </div>
            </div>
            {editable&&<div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon-sm" aria-label={'Edit '+entry.title} title="Edit" onClick={()=>edit(entry)}><PencilSimpleIcon/></Button>
              {entry.status==='published'
                ?<Button variant="ghost" size="icon-sm" aria-label={'Unpublish '+entry.title} title="Unpublish" disabled={working.includes(entry.id)} onClick={()=>void setStatus(entry,'draft')}><EyeOffIcon/></Button>
                :<Button variant="ghost" size="icon-sm" aria-label={'Publish '+entry.title} title="Publish" disabled={working.includes(entry.id)} onClick={()=>void setStatus(entry,'published')}><EyeIcon/></Button>}
              <Button variant="ghost" size="icon-sm" aria-label={'Delete '+entry.title} title="Delete" onClick={()=>{setDeleteError('');setDeleting(entry);}}><TrashIcon/></Button>
            </div>}
          </div>
        </li>)}</ul>}
    </div>

    {draft&&<section aria-label="Changelog editor" className={editorStyles.editor+" fixed inset-0 z-40 flex flex-col bg-background"}>
      <form onSubmit={event=>{event.preventDefault();void persist('save');}} className="flex min-h-0 flex-1 flex-col">
        <header data-material="toolbar" className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border/60 px-4 py-3 sm:py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Button type="button" variant="ghost" size="icon-sm" className="size-8 shrink-0" aria-label="Back to changelog" title="Back to changelog" disabled={Boolean(saving)||uploading} onClick={()=>setLeaving(true)}><ArrowLeftIcon className="size-4"/></Button>
            <span className="text-[13px] font-medium tracking-[-0.135px]">Changelog</span>
            <span className="text-[13px] text-muted-foreground" aria-hidden="true">/</span>
            <span className="truncate text-[13px] text-muted-foreground">{draft.id?'Edit update':'New draft'}</span>
          </div>
          <div className="flex w-full shrink-0 items-center justify-end gap-1.5 sm:w-auto">
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2.5 text-[13px] text-muted-foreground" aria-pressed={preview} onClick={()=>setPreview(value=>!value)}>{preview?'Write':'Preview'}</Button>
              <Button type="button" variant="ghost" size="icon-sm" className="size-8" aria-label="Post settings" title="Post settings" aria-pressed={settingsOpen} aria-expanded={settingsOpen} aria-controls={uid+'-settings'} onClick={()=>setSettingsOpen(value=>!value)}><GearSixIcon className="size-4"/></Button>
              <ActionButton type="button" variant="outline" size="sm" className="h-8 px-3 text-[13px] shadow-none" state={saving==='save'?'pending':formError?'error':'idle'} pendingLabel="Saving…" disabled={Boolean(saving)||!formValid} onClick={()=>void persist('save')}>{draft?.id?'Save changes':'Save draft'}</ActionButton>
              {draft?.scheduledFor&&<ActionButton type="button" variant="outline" size="sm" className="h-8 px-3 text-[13px] shadow-none" state={saving==='schedule'?'pending':'idle'} pendingLabel="Scheduling…" disabled={Boolean(saving)||!formValid} onClick={()=>void persist('schedule')}><ClockIcon className="size-3.5"/>Schedule</ActionButton>}
              <ActionButton type="button" size="sm" className="h-8 px-3 text-[13px]" state={saving==='publish'?'pending':'idle'} pendingLabel="Publishing…" disabled={Boolean(saving)||!formValid} onClick={()=>void persist('publish')}>Publish now</ActionButton>

          </div>
        </header>
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {preview ? <div className="min-w-0 flex-1 overflow-y-auto bg-background px-4 pb-20 pt-9 sm:px-8">
            <div className="mx-auto w-full max-w-[720px]">
              <p className="text-[13px] text-muted-foreground">Changelog <span aria-hidden="true">/</span> {draft.title||'Untitled update'}</p>
              <article className="mt-6">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5"><span className="text-[11px] font-medium uppercase leading-4 tracking-[0.07em] text-muted-foreground">Preview</span><span className="inline-flex items-center rounded-full bg-control-quiet px-2 py-0.5 text-[11px] font-medium leading-4 text-muted-foreground">{changelogCategoryLabels[draft.category]}</span></div>
                <h1 className="mt-2.5 break-words text-[26px] font-semibold leading-9 tracking-[-0.4px] sm:text-[30px] sm:leading-10">{draft.title||'Untitled update'}</h1>
                {draft.summary&&<p className="mt-2.5 text-[15px] leading-7 text-muted-foreground sm:text-[16px]">{draft.summary}</p>}
                <div className="mt-5">{draft.coverImage&&<img src={draft.coverImage} alt="" className="mb-6 aspect-[2/1] w-full rounded-lg object-cover"/>}{draft.body.trim()?<ChangelogBody markdown={draft.body}/>:<p className="text-[13px] text-muted-foreground">Your update will appear here.</p>}</div>
                {draft.feedback.length>0&&<div className="mt-7 rounded-[10px] bg-control-quiet px-4 py-3"><p className="text-[11px] font-medium uppercase leading-4 tracking-[0.07em] text-muted-foreground">Requested by your users</p><ul className="mt-1.5 space-y-1">{draft.feedback.map(item=><li key={item.id} className="text-[13px] leading-5 text-foreground/80 underline decoration-border underline-offset-2">{item.title}</li>)}</ul></div>}
              </article>
            </div>
          </div> : <fieldset disabled={Boolean(saving)} className={"min-w-0 flex-1 overflow-y-auto"+(settingsOpen?" md:pr-[360px]":"")}>
            <div className="mx-auto w-full max-w-[760px] px-6 py-10 md:px-12 md:py-16">
              <ChangelogCover onBusyChange={busy=>setUploads(current=>({...current,cover:busy}))} workspaceId={project.id} value={draft.coverImage} onChange={coverImage=>setDraft(current=>current?{...current,coverImage}:current)} onError={setFormError}/>
              {features.feedbackAi&&!draft.title.trim()&&!draft.body.trim()&&<div className="mb-4"><Tooltip><TooltipTrigger render={<Button type="button" variant="outline" size="sm" loading={generating} aria-disabled={generating||!draft.feedback.length} className={!draft.feedback.length?'opacity-50':''} onClick={()=>void suggestDraft()}/>}>Draft from linked requests</TooltipTrigger><TooltipPopup className="max-w-64">Link shipped requests in post settings first. AI suggestions need review before publishing.</TooltipPopup></Tooltip></div>}
              <div className="grid gap-1.5">
                <label htmlFor={uid+'-title'} className="sr-only">Title</label>
                <textarea rows={2} id={uid+'-title'} autoFocus required maxLength={changelogTitleMaxLength} placeholder="Untitled update" value={draft?.title??''} onChange={event=>setDraft(current=>current?{...current,title:event.target.value,slug:current.slugEdited?current.slug:slugifyChangelogTitle(event.target.value)}:current)} className="field-sizing-content min-h-[1.5em] w-full resize-none border-0 bg-transparent px-0 py-2 text-[32px] font-semibold leading-tight tracking-tight outline-none placeholder:text-muted-foreground/60 sm:text-[40px]"/>
              </div>
              <label htmlFor={uid+'-body'} className="sr-only">Content</label>
              <ChangelogComposer onBusyChange={busy=>setUploads(current=>({...current,content:busy}))} id={uid+'-body'} value={draft.body} workspaceId={project.id} onChange={body=>setDraft(current=>current?{...current,body}:current)} onError={setFormError}/>

              {formError&&<ErrorNotice className="mt-4 text-xs">{formError}</ErrorNotice>}
            </div>
          </fieldset>}
            <aside id={uid+'-settings'} data-open={settingsOpen} inert={!settingsOpen} aria-hidden={!settingsOpen} aria-label="Post settings" className={editorStyles.settings+" absolute inset-y-0 right-0 z-10 w-full max-w-[360px] overflow-y-auto border-s border-border/60 bg-background p-4"}>
              <div className="mb-6 flex items-center justify-between px-4"><h2 className="text-[14px] font-medium">Post settings</h2><Button type="button" variant="ghost" size="icon-sm" aria-label="Close post settings" onClick={()=>{setSettingsOpen(false);document.querySelector<HTMLButtonElement>('button[aria-label="Post settings"]')?.focus();}}><XIcon/></Button></div>
              <fieldset disabled={Boolean(saving)} className="space-y-8">
                <SettingGroup title="Release details">
                  <div className="space-y-6 p-4">
                    <div className="space-y-3">
                      <label htmlFor={uid+'-category'} className="block text-[13px] font-medium">Category</label>
                      <Select items={changelogCategories.map(value=>({value,label:changelogCategoryLabels[value]}))} value={draft.category} onValueChange={value=>setDraft(current=>current&&value?{...current,category:value as ChangelogCategory}:current)}>
                        <SelectTrigger id={uid+'-category'} aria-label="Category" className="h-9 w-full text-[13px] shadow-none"><SelectValue/></SelectTrigger>
                        <SelectPopup data-changelog-control>{changelogCategories.map(value=><SelectItem key={value} value={value}>{changelogCategoryLabels[value]}</SelectItem>)}</SelectPopup>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <label htmlFor={uid+'-slug'} className="block text-[13px] font-medium">Slug</label>
                      <Input id={uid+'-slug'} maxLength={changelogSlugMaxLength} placeholder="your-update" value={draft.slug} onChange={event=>setDraft(current=>current?{...current,slug:event.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-'),slugEdited:true}:current)} className="h-9 w-full font-mono text-[13px] shadow-none"/>
                      <p className="break-all text-xs leading-5 text-muted-foreground">/changelog/{draft.slug||'your-update'}</p>
                    </div>
                  </div>
                </SettingGroup>
                <SettingGroup title="Publication">
                  <div className="space-y-4 p-4">
                    <div className="flex items-center justify-between gap-3 text-[13px]"><span className="text-muted-foreground">Current status</span><StatusBadge status={entries?.find(entry=>entry.id===draft.id)?.status??'draft'} label={changelogStatusLabels[entries?.find(entry=>entry.id===draft.id)?.status??'draft']}/></div>
                    <div className="space-y-3">
                      <label htmlFor={uid+'-when'} className="block text-[13px] font-medium">Publish date</label>
                      <PublishDatePicker id={uid+'-when'} value={draft.scheduledFor} onChange={scheduledFor=>setDraft(current=>current?{...current,scheduledFor}:current)}/>
                      <p className="text-xs leading-5 text-muted-foreground">Choose a future time, then select Schedule in the toolbar. Uses your device’s timezone.</p>
                      {draft.scheduledFor&&<Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={()=>setDraft(current=>current?{...current,scheduledFor:''}:current)}>Clear date</Button>}
                    </div>
                  </div>
                </SettingGroup>
                <SettingGroup title={<span className="flex items-center justify-between"><span>Linked requests</span><span className="font-normal tabular-nums text-muted-foreground">{draft.feedback.length}/20</span></span>}>
                  <div className="space-y-3 p-4">
                    <FeedbackPicker excluded={draft.feedback.map(item=>item.id)} onPick={item=>setDraft(current=>current&&current.feedback.length<20&&!current.feedback.some(row=>row.id===item.id)?{...current,feedback:[...current.feedback,item]}:current)}/>
                    {draft.feedback.length?<ul className="space-y-1">{draft.feedback.map(item=><li key={item.id} className="flex min-h-10 items-center gap-2 rounded-lg bg-control-quiet px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-[13px]" title={item.title}>{item.title}</span>
                      <Button type="button" size="icon-sm" variant="ghost" className="size-6 shrink-0" aria-label={'Unlink '+item.title} onClick={()=>setDraft(current=>current?{...current,feedback:current.feedback.filter(row=>row.id!==item.id)}:current)}><XIcon className="size-3.5"/></Button>
                    </li>)}</ul>:<p className="text-xs leading-5 text-muted-foreground">Connect this update to the requests it delivers. Linking does not change their status.</p>}
                  </div>
                </SettingGroup>
              </fieldset>
            </aside>
        </div>
      </form>
    </section>}

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

    <Dialog open={leaving} onOpenChange={setLeaving}>
      <DialogPopup className="p-5">
        <div className="pe-8">
          <DialogTitle>Leave this draft?</DialogTitle>
          <DialogDescription className="mt-2">Your unsaved changes to this update will be lost. Saved drafts stay in your changelog.</DialogDescription>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={()=>setLeaving(false)}>Keep editing</Button>
          <Button variant="destructive" onClick={()=>{setLeaving(false);setDraft(null);}}>Discard changes</Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  </section>;
}

function FeedbackPicker({excluded,onPick}:{excluded:string[];onPick:(item:ChangelogFeedbackLink)=>void}){
  const {project}=useProject();
  const [open,setOpen]=React.useState(false);
  const [query,setQuery]=React.useState('');
  const [page,setPage]=React.useState(0);
  const [retry,setRetry]=React.useState(0);
  const [snapshot,setSnapshot]=React.useState<{workspaceId:string;query:string;page:number;items:ChangelogFeedbackLink[];nextOffset:number|null;error:string}|null>(null);

  React.useEffect(()=>{
    if(!open)return;
    let canceled=false;
    const timer=setTimeout(()=>{
      void searchChangelogRequestsAction(project.id,{query,offset:page}).then(result=>{
        if(canceled)return;
        setSnapshot(current=>({
          workspaceId:project.id,query,page,
          items:result.ok?[...(page>0&&current?.workspaceId===project.id&&current.query===query?current.items:[]),...result.data.items.map(item=>({...item,votes:0}))]:[],
          nextOffset:result.ok?result.data.nextOffset:null,
          error:result.ok?'':result.error.message,
        }));
      }).catch(()=>{if(!canceled)setSnapshot({workspaceId:project.id,query,page,items:[],nextOffset:null,error:'Requests could not be loaded. Try again.'});});
    },query?200:0);
    return()=>{canceled=true;clearTimeout(timer);};
  },[open,query,page,project.id,retry]);

  const ready=snapshot?.workspaceId===project.id&&snapshot.query===query&&snapshot.page===page;
  const items=snapshot?.workspaceId===project.id&&snapshot.query===query?snapshot.items:[];
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger render={<InboxSearchTrigger label="Link requests" trailing={<PlusIcon className="size-3.5 shrink-0"/>}/>}/>
    <PopoverPopup data-changelog-control align="end" className="w-[320px] max-w-[calc(100vw-32px)] p-1.5">
      <div className="mb-1 flex items-center gap-2 border-b border-border/60 px-2 pb-2 pt-1">
        <MagnifyingGlassIcon className="size-4 shrink-0 text-muted-foreground"/>
        <input autoFocus aria-label="Search requests" placeholder="Search requests…" value={query} onChange={event=>{setQuery(event.target.value);setPage(0);}} className="h-8 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"/>
      </div>
      <div className="max-h-72 overflow-y-auto" aria-busy={!ready}>
        {items.map(item=><button key={item.id} type="button" disabled={excluded.includes(item.id)||excluded.length>=20} onClick={()=>onPick(item)} className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-[13px] outline-none hover:bg-control-quiet focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50">
          <span className="min-w-0 truncate">{item.title}</span><span className="shrink-0 text-xs text-muted-foreground">{excluded.includes(item.id)?'Linked':<PlusIcon className="size-3.5"/>}</span>
        </button>)}
        {!ready&&<p className="px-2 py-3 text-xs text-muted-foreground">Loading requests…</p>}
        {ready&&snapshot.error&&<ErrorNotice className="p-2 text-xs">{snapshot.error}<Button type="button" variant="link" size="sm" onClick={()=>setRetry(value=>value+1)}>Retry</Button></ErrorNotice>}
        {ready&&!snapshot.error&&!items.length&&<p className="px-2 py-3 text-xs text-muted-foreground">No requests found.</p>}
        {ready&&snapshot.nextOffset!==null&&<Button type="button" variant="ghost" size="sm" className="mt-1 w-full" onClick={()=>setPage(snapshot.nextOffset!)}>Load more</Button>}
      </div>
    </PopoverPopup>
  </Popover>;
}

'use client';
import {UpcomingIntegrations} from './upcoming-integrations';
import {SlackMark} from './app-logos';
import {LoadFailure} from '@/components/ui/load-failure';
import {SettingsActions} from '@/components/feedback/settings-layout';


import {ErrorNotice} from '@/components/ui/error-notice';
import {useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useProject} from './project-provider';
import {SettingsPage,SettingGroup,SettingRow} from './settings-layout';
import {Button} from '@/components/ui/button';
import {ActionButton} from '@/components/ui/action-button';
import {Switch} from '@/components/ui/switch';
import {Skeleton} from '@/components/ui/skeleton';
import {toastManager} from '@/components/ui/toast';
import {connectIntegrationAction,disconnectIntegrationAction,loadWorkspaceSlackSettingsAction,saveWorkspaceSlackSettingsAction} from '@/server/actions/integrations';
import {unwrap} from '@/lib/chat/client';

type Data=Awaited<ReturnType<typeof loadWorkspaceSlackSettingsAction>> extends infer R?R extends {ok:true;data:infer D}?D:never:never;
const events=[
 {key:'slackFeedback',title:'Board posts and replies',description:'Feedback, bugs and feature requests, including replies and images.'},
 {key:'slackStatuses',title:'Status changes',description:'Progress updates for feedback boards and live conversations.'},
 {key:'slackEscalations',title:'Conversation handoffs',description:'When a visitor needs your team in live chat.'},
 {key:'slackFollowups',title:'Conversation messages and replies',description:'Visitor messages and team replies, including emoji and images.'},
] as const;

export function WorkspaceIntegrationsSettings(){const {project}=useProject();return <WorkspaceIntegrationsContent key={project.id} workspaceId={project.id}/>;}
function WorkspaceIntegrationsContent({workspaceId}:{workspaceId:string}){
 const query=useSearchParams();
 const [data,setData]=useState<Data|null>(null);const [draft,setDraft]=useState<Data['settings']|null>(null);
 const [error,setError]=useState('');const [actionError,setActionError]=useState('');const [pending,setPending]=useState<'save'|'connect'|'disconnect'|null>(null);const [reload,setReload]=useState(0);
 useEffect(()=>{let cancelled=false;void loadWorkspaceSlackSettingsAction(workspaceId).then(result=>{if(cancelled)return;try{const next=unwrap(result);setData(next);setDraft(current=>current??next.settings);setError('');}catch(e){setError(e instanceof Error?e.message:'Integrations could not be loaded.');}}).catch(()=>{if(!cancelled)setError('Integrations could not be loaded.');});return()=>{cancelled=true;};},[workspaceId,reload]);
 const dirty=Boolean(data&&draft&&JSON.stringify(data.settings)!==JSON.stringify(draft));
 async function act(action:'save'|'connect'|'disconnect'){
  if(pending)return;setPending(action);setActionError('');let navigating=false;
  try{
   if(action==='connect'){const result=unwrap(await connectIntegrationAction({provider:'slack',workspaceId,returnTo:'/dashboard/settings/integrations'}));window.location.assign(result.url);navigating=true;return;}
   if(action==='disconnect'){unwrap(await disconnectIntegrationAction({provider:'slack',workspaceId}));setData(current=>current?{...current,slack:{connected:false,label:'',repliesReady:false}}:current);toastManager.add({type:'success',title:'Slack disconnected'});}
   if(action==='save'&&draft){unwrap(await saveWorkspaceSlackSettingsAction(workspaceId,draft));setData(current=>current?{...current,settings:draft}:current);toastManager.add({type:'success',title:'Slack preferences saved'});}
  }catch(e){const message=e instanceof Error?e.message:'Slack settings could not be updated.';setActionError(message);toastManager.add({type:'error',title:message});}finally{if(!navigating)setPending(null);}
 }
 return <SettingsPage title="Integrations"><div className="flex flex-col gap-8">
  <p className="px-4 text-sm leading-6 text-muted-foreground">Connect your workspace tools. One Slack connection serves all boards and live chat.</p>
  {!data&&!error&&<Skeleton className="h-48 w-full"/>}
  {error&&<LoadFailure resource="integrations" refresh={Boolean(data)} onRetry={()=>{setError('');setReload(value=>value+1);}}/>}
  {data?.deliveryIssue&&<ErrorNotice>{data.deliveryIssue}<Button size="sm" variant="secondary" onClick={()=>setReload(value=>value+1)}>Refresh status</Button></ErrorNotice>}
  {data&&draft&&<fieldset disabled={Boolean(pending)||!data.canManage} className="contents">
   <SettingGroup title="Slack"><SettingRow title={<span className="inline-flex items-center gap-2 align-middle"><SlackMark className="size-[18px]"/>Slack</span>} description={data.slack.connected?(data.slack.label||'Connected to this workspace'):'Choose a channel to receive board and live chat notifications.'}>
    <div className="flex flex-wrap gap-2"><ActionButton size="sm" variant={data.slack.connected?'secondary':'default'} state={pending==='connect'?'pending':'idle'} pendingLabel="Connecting…" onClick={()=>void act('connect')}>{data.slack.connected?'Change channel':'Connect Slack'}</ActionButton>{data.slack.connected&&<ActionButton size="sm" variant="destructive-outline" state={pending==='disconnect'?'pending':'idle'} pendingLabel="Disconnecting…" onClick={()=>void act('disconnect')}>Disconnect</ActionButton>}</div>
   </SettingRow>
   {query.get('connection')==='slack'&&query.get('result')==='error'&&<ErrorNotice  className="px-4 pb-4 text-sm text-foreground">Slack authorization did not finish. Reconnect to try again.</ErrorNotice>}
   {data.canManage&&data.slack.connected&&!data.slack.repliesReady&&<SettingRow title="Enable Slack replies" description="Add the Slack signing secret and reconnect to grant reply permissions."><ActionButton size="sm" variant="secondary" state={pending==='connect'?'pending':'idle'} pendingLabel="Reconnecting…" onClick={()=>void act('connect')}>Reconnect Slack</ActionButton></SettingRow>}
   {events.map(({key,title,description})=><div key={key} className="border-t border-border/60"><SettingRow title={title} description={description}><Switch disabled={!data.slack.connected} aria-label={title} checked={draft[key]} onCheckedChange={checked=>setDraft({...draft,[key]:checked})}/></SettingRow></div>)}
   </SettingGroup>
   <SettingsActions parentGap={32}><p className="mr-auto text-xs text-muted-foreground">{!data.canManage?'Workspace admins manage integrations.':dirty?'Unsaved changes':!data.slack.connected?'Notifications start when Slack is connected.':''}</p><Button size="sm" variant="ghost" disabled={!dirty} onClick={()=>{setDraft(data.settings);setActionError('');}}>Discard</Button><ActionButton size="sm" disabled={!dirty} state={pending==='save'?'pending':actionError?'error':'idle'} retryLabel="Retry saving" pendingLabel="Saving…" onClick={()=>void act('save')}>Save changes</ActionButton></SettingsActions>
  </fieldset>}
  <UpcomingIntegrations key={workspaceId} workspaceId={workspaceId}/>
 </div></SettingsPage>;
}

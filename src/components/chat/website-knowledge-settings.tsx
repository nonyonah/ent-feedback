'use client';

import {CHAT_AI_REPLIES_ENABLED} from '@/lib/chat/contracts';
import {ErrorNotice} from '@/components/ui/error-notice';
import {useState} from 'react';
import {Input} from '@/components/ui/input';
import {ActionButton} from '@/components/ui/action-button';
import {SettingGroup} from '@/components/feedback/settings-layout';
import {syncChatWebsiteAction,removeChatWebsiteAction} from '@/server/actions/chat';
import {toastManager} from '@/components/ui/toast';
import {unwrap} from '@/lib/chat/client';

type Website={url:string;pageCount:number;syncedAt:string}|null;
export function WebsiteKnowledgeSettings({workspaceId,website,canManage,onUpdated,kind='website'}:{workspaceId:string;kind?:'website'|'documentation';website:Website;canManage:boolean;onUpdated:()=>void}){
 const name=kind==='documentation'?'Documentation':'Website';const actionName=kind==='documentation'?'documentation':'website';
 const [url,setUrl]=useState(website?.url??'');const [pending,setPending]=useState<'sync'|'remove'|null>(null);const [error,setError]=useState('');
 async function submit(remove=false){setPending(remove?'remove':'sync');setError('');try{if(remove){unwrap(await removeChatWebsiteAction(workspaceId,kind));setUrl('');}else unwrap(await syncChatWebsiteAction(workspaceId,url.trim(),kind));toastManager.add({type:'success',title:remove?name+' removed':name+' synced'});onUpdated();}catch(e){const message=e instanceof Error?e.message:'Website knowledge could not be updated.';setError(message);}finally{setPending(null);}}
 return <SettingGroup title={name+' knowledge'}>{!CHAT_AI_REPLIES_ENABLED&&<p className="px-4 pt-4 text-sm text-muted-foreground">Unavailable while AI replies are paused. Saved sources are retained.</p>}<fieldset disabled={!CHAT_AI_REPLIES_ENABLED||!canManage||Boolean(pending)} className="space-y-4 p-4 disabled:opacity-60"><p className="text-[13px] leading-6 text-muted-foreground">{kind==='documentation'?'Connect your public help center, guides or API documentation, even on a separate domain. The assistant reads up to 8 pages within the documentation path.':'Add your product website. The assistant reads public content from up to 8 pages on the same domain.'}</p><label className="block space-y-2 text-[13px]"><span>{name} URL</span><Input type="url" aria-label={'Knowledge '+actionName+' URL'} placeholder={kind==='documentation'?'https://docs.your-product.com':'https://your-product.com'} maxLength={2000} value={url} onChange={e=>setUrl(e.target.value)}/></label>{website&&<p className="break-words text-xs leading-5 text-muted-foreground">{website.pageCount} pages synced · {new Date(website.syncedAt).toLocaleDateString()}. Sync again after updating this source.</p>}<p className="text-xs leading-5 text-muted-foreground">Pages must be publicly readable without JavaScript or a login. Your site’s robots.txt rules are respected. Import only content you want the assistant to use in public replies.</p>{error&&<ErrorNotice  className="text-[13px] text-foreground">{error}</ErrorNotice>}<div className="flex justify-end gap-2">{website&&<ActionButton variant="ghost" size="sm" state={pending==='remove'?'pending':'idle'} pendingLabel="Removing…" onClick={()=>void submit(true)}>Remove {actionName}</ActionButton>}<ActionButton size="sm" state={pending==='sync'?'pending':error?'error':'idle'} pendingLabel={'Reading '+actionName+'…'} retryLabel="Retry sync" disabled={!url.trim()} onClick={()=>void submit()}>Sync {actionName}</ActionButton></div></fieldset></SettingGroup>;
}

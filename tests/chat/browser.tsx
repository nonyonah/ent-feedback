import {useState} from 'react';
import {TrialCardNotice} from '@/components/feedback/trial-card-notice';
import {createRoot} from 'react-dom/client';
import {RequestSearch} from '@/components/feedback/request-search';
import {Widget} from '@/components/feedback/widget';
import {ChatSettings} from '@/components/chat/chat-settings';
import {ConversationsInbox} from '@/components/chat/conversations-inbox';
import {SidebarProvider} from '@/components/ui/sidebar';
import {ToastProvider} from '@/components/ui/toast';
function TrialPreview(){const [open,setOpen]=useState(false);return <><button onClick={()=>setOpen(true)}>Start free trial</button><TrialCardNotice open={open} onOpenChange={setOpen} interval="monthly" onContinue={()=>{const target=window as unknown as {fixture:{trialCheckouts?:number}};target.fixture.trialCheckouts=(target.fixture.trialCheckouts??0)+1;}}/></>;}
const view=new URLSearchParams(location.search).get('screen');
createRoot(document.getElementById('root')!).render(<ToastProvider>{view==='trial-notice'?<TrialPreview/>:view==='request-search'?<RequestSearch dashboard items={[]}/>:view==='settings'?<ChatSettings/>:view==='inbox'?<SidebarProvider className="h-svh"><ConversationsInbox/></SidebarProvider>:<Widget defaultOpen/>}</ToastProvider>);

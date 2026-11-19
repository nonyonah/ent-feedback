import {DeleteBoardDialog} from '@/components/feedback/delete-board-dialog';
import {RegistrationWizard} from '@/components/feedback/registration-wizard';
import {TeamSettings} from '@/components/feedback/team-settings';
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
function DeleteBoardPreview(){const [open,setOpen]=useState(false);return <><button onClick={()=>setOpen(true)}>Open board deletion</button><DeleteBoardDialog board={open?{id:'33333333-3333-4333-8333-333333333333',projectId:'11111111-1111-4111-8111-111111111111',name:'Product feedback',slug:'product',color:'#737373',description:''}:null} onClose={()=>setOpen(false)}/></>;}
const view=new URLSearchParams(location.search).get('screen');
createRoot(document.getElementById('root')!).render(<ToastProvider>{view==='delete-board'?<DeleteBoardPreview/>:view==='onboarding-team'?<RegistrationWizard initialStep={2} initialWorkspace={{id:'11111111-1111-4111-8111-111111111111',name:'Acme workspace',handle:'acme',website:null}}/>:view==='team'?<TeamSettings/>:view==='trial-notice'?<TrialPreview/>:view==='request-search'?<RequestSearch dashboard items={[]}/>:view==='settings'?<ChatSettings/>:view==='inbox'?<SidebarProvider className="h-svh"><ConversationsInbox/></SidebarProvider>:<Widget defaultOpen/>}</ToastProvider>);

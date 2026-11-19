import "driver.js/dist/driver.css";
import {FeedbackProvider} from '@/components/feedback/feedback-provider';
import {ShareView} from "@/components/feedback/share-view";
import {DashboardBoards} from "@/components/feedback/dashboard-boards";
import {DashboardSettings} from '@/components/feedback/dashboard-settings';
import {AccountSettings} from '@/components/feedback/account-settings';
import {WidgetSettingsView} from '@/components/feedback/widget-settings-view';
import {WorkspaceIntegrationsSettings} from '@/components/feedback/workspace-integrations-settings';
import {BillingSettings} from '@/components/feedback/billing-settings';
import {UpcomingIntegrations} from '@/components/feedback/upcoming-integrations';
import {BoardView} from '@/components/feedback/board-view';
import {SiteHeader} from '@/components/feedback/site-header';
import {Roadmap} from '@/components/roadmap/roadmap';
import {FeedbackForm} from '@/components/feedback/feedback-form';
import {DashboardRequestDetail} from '@/components/feedback/dashboard-request-detail';
import {DeleteBoardDialog} from '@/components/feedback/delete-board-dialog';
import {RegistrationWizard} from '@/components/feedback/registration-wizard';
import {TeamSettings} from '@/components/feedback/team-settings';
import {PublicAttribution} from '@/components/feedback/public-attribution';
import {useState,type ReactNode} from 'react';
import {TrialCardNotice} from '@/components/feedback/trial-card-notice';
import {createRoot} from 'react-dom/client';
import {RequestSearch} from '@/components/feedback/request-search';
import {Widget} from '@/components/feedback/widget';
import {ChatSettings} from '@/components/chat/chat-settings';
import {ConversationsInbox} from '@/components/chat/conversations-inbox';
import {DashboardSidebar} from '@/components/feedback/dashboard-sidebar';
import {SidebarTrigger,SidebarProvider} from '@/components/ui/sidebar';
import {ToastProvider} from '@/components/ui/toast';
function TrialPreview(){const [open,setOpen]=useState(false);return <><button onClick={()=>setOpen(true)}>Start free trial</button><TrialCardNotice open={open} onOpenChange={setOpen} interval="monthly" onContinue={()=>{const target=window as unknown as {fixture:{trialCheckouts?:number}};target.fixture.trialCheckouts=(target.fixture.trialCheckouts??0)+1;}}/></>;}
function PublicShell({children}:{children:ReactNode}){return <div className="flex min-h-svh flex-col"><SiteHeader/>{children}<PublicAttribution/></div>;}
function DeleteBoardPreview(){const [open,setOpen]=useState(false);return <><button onClick={()=>setOpen(true)}>Open board deletion</button><DeleteBoardDialog board={open?{id:'33333333-3333-4333-8333-333333333333',projectId:'11111111-1111-4111-8111-111111111111',name:'Product feedback',slug:'product',color:'#737373',description:''}:null} onClose={()=>setOpen(false)}/></>;}
function FeedbackAttachmentPreview(){return <div className="relative flex h-svh min-w-0 flex-col"><DashboardRequestDetail boardName="Product feedback" boardUrl="/p/acme/boards/product" onBack={()=>{}} item={{id:'33333333-3333-4333-8333-333333333333',boardId:'33333333-3333-4333-8333-333333333333',title:'Feedback with screenshots',description:'Please look at these screenshots.',author:'Visitor',initials:'',createdAt:'Now',createdOrder:1,status:'open',category:'bug',votes:0,voted:false,images:['data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="#6699cc"/></svg>')],comments:[]}}/></div>;}
const view=new URLSearchParams(location.search).get('screen');
createRoot(document.getElementById('root')!).render(<ToastProvider>{view==='dashboard-sidebar'?<SidebarProvider className="h-dvh min-h-0"><DashboardSidebar view="requests" filter="all" onFilterChange={()=>{}} onCopyLink={()=>{}} copied={false}/><SidebarTrigger/></SidebarProvider>:view==='public-anonymous'?<FeedbackProvider><BoardView/></FeedbackProvider>:view==='share'?<ShareView/>:view==='boards'?<SidebarProvider><DashboardBoards/></SidebarProvider>:view==='settings-branding'?<DashboardSettings section="branding"/>:view==='settings-account'?<AccountSettings/>:view==='settings-widget'?<WidgetSettingsView/>:view==='settings-integrations'?<WorkspaceIntegrationsSettings/>:view==='settings-billing'?<BillingSettings/>:view==='integrations'?<main className="mx-auto flex max-w-[760px] flex-col gap-8 px-6 py-8"><UpcomingIntegrations workspaceId="11111111-1111-4111-8111-111111111111"/></main>:view==='public-board'?<PublicShell><BoardView/></PublicShell>:view==='public-roadmap'?<PublicShell><main className="mx-auto flex min-h-[60svh] w-full max-w-5xl flex-col pb-8 pt-9"><Roadmap/></main></PublicShell>:view==='roadmap'?<SidebarProvider><div className="flex h-svh min-w-0 flex-1"><Roadmap admin={new URLSearchParams(location.search).has('admin')}/></div></SidebarProvider>:view==='feedback-form'?<FeedbackForm/>:view==='feedback-attachments'?<FeedbackAttachmentPreview/>:view==='delete-board'?<DeleteBoardPreview/>:view==='onboarding-team'?<RegistrationWizard initialStep={2} initialWorkspace={{id:'11111111-1111-4111-8111-111111111111',name:'Acme workspace',handle:'acme',website:null}}/>:view==='team'?<TeamSettings/>:view==='trial-notice'?<TrialPreview/>:view==='request-search'?<RequestSearch dashboard items={[]}/>:view==='settings'?<ChatSettings/>:view==='inbox'?<SidebarProvider className="h-svh"><ConversationsInbox/></SidebarProvider>:<Widget defaultOpen/>}</ToastProvider>);

'use client';
import {useState} from 'react';
import {useUser} from '@clerk/nextjs';
import {useProject} from './project-provider';
import {visitorToken} from '@/lib/visitor-token';
import {resendFeedbackVerificationAction} from '@/server/actions/feedback';
import {Button} from '@/components/ui/button';
import {ErrorNotice} from '@/components/ui/error-notice';
export function GuestEmailNotice({feedbackId,hasEmail}:{feedbackId:string;hasEmail:boolean}){
 const {user}=useUser();const {project}=useProject();const [busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState('');
 if(user||!hasEmail)return null;
 return <div className="space-y-2 text-center text-xs leading-5 text-muted-foreground"><p role="status">{sent?'Verification email sent. Check your inbox.':'Check your inbox to confirm your email for replies and updates.'}</p><Button variant="ghost" size="sm" loading={busy} disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const result=await resendFeedbackVerificationAction(project.id,feedbackId,visitorToken(project.id));if(!result.ok)throw Error(result.error.message);setSent(true);}catch(e){setError(e instanceof Error?e.message:'Verification could not be sent.');}finally{setBusy(false);}}}>Resend link</Button>{error&&<ErrorNotice>{error}</ErrorNotice>}</div>;
}

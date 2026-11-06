// WorkspaceGate renders this segment after authenticated workspace bootstrap.
export const instant = false;

import {DashboardLoading} from "@/components/feedback/dashboard-loading";
import { Suspense } from "react";
import { DashboardView } from "@/components/feedback/dashboard-view";
import { STATUS_ORDER, type FeedbackStatus } from "@/lib/feedback-data";
export const metadata={title:"Feedback inbox · Ent Feedback"};
async function Inbox({searchParams}:{searchParams:Promise<{status?:string}>}){const {status}=await searchParams;return <DashboardView initialFilter={STATUS_ORDER.includes(status as FeedbackStatus)?status as FeedbackStatus:"all"}/>;}
export default function Page({searchParams}:{searchParams:Promise<{status?:string}>}){return <Suspense fallback={<DashboardLoading/>}><Inbox searchParams={searchParams}/></Suspense>;}

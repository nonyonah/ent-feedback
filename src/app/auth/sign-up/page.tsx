import { redirect } from "next/navigation";

import {authIntent} from "@/lib/auth-flow";
import { safeRedirectPath } from "@/lib/safe-redirect";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[];intent?:string|string[] }>;
}) {
  const params=await searchParams;
  const intent=authIntent(params.intent);
  const next = safeRedirectPath(params.next,intent==="public"?"/":"/dashboard/boards");
  const query = "&"+new URLSearchParams({intent,next}).toString();

  redirect(`/auth?mode=signup${query}`);
}

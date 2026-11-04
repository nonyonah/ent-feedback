"use client";
import * as React from "react";
import Link from "next/link";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell, PreviewNote } from "@/components/feedback/page-shell";
import { ProjectNav } from "@/components/feedback/project-nav";
import { BoardPicker, NoBoard } from "@/components/feedback/board-context";
import { useProject } from "@/components/feedback/project-provider";
import { boardHref } from "@/lib/project-links";
const subscribe=()=>()=>{};
export function ShareView(){
 const {project,activeBoard}=useProject();
 const origin=React.useSyncExternalStore(subscribe,()=>window.location.origin,()=>"");
 const [message,setMessage]=React.useState("");
 async function copy(value:string){try{await navigator.clipboard.writeText(value);setMessage("Link copied. Ready to share.");}catch{setMessage("Select the address and copy it manually.");}}
 const path=activeBoard?boardHref(project,activeBoard):"/project";
 return <PageShell eyebrow={project.name} title="Invite the first conversation." description="Your board is ready for customers. Give them a direct link or bring feedback into your product." wide><ProjectNav/>{!activeBoard?<NoBoard/>:<><BoardPicker/><div className="grid gap-5 sm:grid-cols-2">{[["Board link","Let customers browse, vote, and join the conversation.",path],["Direct submission","Make it easy to share an idea from a help menu or email.",path+"/submit"]].map(([title,description,href])=><section key={href} className="rounded-lg border p-5"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p><Input className="mt-5" aria-label={title} value={origin+href} readOnly onFocus={event=>event.target.select()}/><div className="mt-4 flex gap-2"><Button variant="outline" onClick={()=>void copy(origin+href)}><CopyIcon weight="bold"/>Copy link</Button><Button variant="ghost" render={<Link href={href}/>}>Open page</Button></div></section>)}</div><p role="status" className="mt-3 text-xs text-muted-foreground">{message}</p><section className="mt-6 flex flex-wrap items-center justify-between gap-5 rounded-lg border bg-muted/20 p-5"><div><h2 className="font-semibold">Meet customers where they work.</h2><p className="mt-2 text-sm text-muted-foreground">Install the widget to collect feedback inside your app.</p></div><Button render={<Link href="/install"/>}>Set up the widget</Button></section><div className="mt-6"><PreviewNote>These links work within this frontend session. Saved projects and publicly shared boards will become permanent when the backend is connected.</PreviewNote></div></>}</PageShell>;
}

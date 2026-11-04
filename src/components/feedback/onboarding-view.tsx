"use client";
import * as React from "react";
import Link from "next/link";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageShell, PreviewNote } from "@/components/feedback/page-shell";
import { projectTheme, useProject } from "@/components/feedback/project-provider";
import { ProjectNav } from "@/components/feedback/project-nav";
import { cn } from "@/lib/utils";

export function OnboardingView({ settings = false, initialReady = false }: { settings?: boolean; initialReady?: boolean }) {
  const {project,updateProject,createProject}=useProject();
  const [draft,setDraft]=React.useState(settings || initialReady ? project : {...project,name:"",slug:"",description:"",logo:"",accent:"#262626"});
  const [step,setStep]=React.useState(1);
  const [ready,setReady]=React.useState(initialReady);
  const [saved,setSaved]=React.useState(false);
  const [logoError,setLogoError]=React.useState("");
  const colors=["#262626","#525252","#737373","#7c3aed","#be185d","#047857"];
  function update(key:keyof typeof draft,value:string){setDraft({...draft,[key]:value});setSaved(false);}
  function upload(file?:File) {
    if(!file)return;
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>2*1024*1024){setLogoError("Choose a PNG, JPEG, or WebP image under 2 MB.");return;}
    setLogoError("");const reader=new FileReader();reader.onload=()=>update("logo",String(reader.result));reader.readAsDataURL(file);
  }
  if(ready)return <PageShell eyebrow="A home for your product" title="Your project is ready." description="Next, create a feedback board inside your project. Each board has its own ideas and conversations."><div className="rounded-xl border p-6 sm:p-8"><span className="flex size-12 items-center justify-center rounded-full bg-status-shipped-bg text-status-shipped-fg"><CheckIcon weight="bold" className="size-6"/></span><h2 className="mt-5 text-xl font-semibold">{draft.name}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Projects bring your boards together. Start with product feedback, feature requests, or another conversation that matters to your customers.</p><div className="mt-6 flex flex-wrap gap-2"><Button render={<Link href="/project"/>}>Open project<ArrowRightIcon weight="bold"/></Button><Button variant="outline" render={<Link href="/project/boards/new"/>}>Create a feedback board</Button></div></div><div className="mt-5"><PreviewNote/></div></PageShell>;
  return <PageShell eyebrow={settings?"Your project":"A home for good ideas"} title={settings?"Make it feel like you.":"Let’s create your project."} description={settings?"A few thoughtful details help customers recognize your space.":"Your project is the home for your feedback boards. Give it a name and make it yours."}>
    {settings&&<ProjectNav/>}{!settings&&<ol aria-label="Setup progress" className="mb-8 flex gap-6 text-xs">{["Your project","Make it yours"].map((name,i)=><li key={name} aria-current={step===i+1?"step":undefined} className={cn("flex items-center gap-2",step===i+1?"font-medium text-foreground":"text-muted-foreground")}><span className={cn("flex size-6 items-center justify-center rounded-full border",step>i+1&&"border-primary bg-primary text-primary-foreground")}>{step>i+1?<CheckIcon weight="bold"/>:i+1}</span>{name}</li>)}</ol>}
    <form onSubmit={e=>{e.preventDefault();if(!settings&&step===1){setStep(2);return;}if(settings){updateProject(draft);setSaved(true);}else{createProject(draft);setReady(true);}}} className="flex flex-col gap-6">
      {(settings||step===1)&&<div className="flex flex-col gap-5 rounded-lg border p-5 sm:p-6"><Field><FieldLabel htmlFor="project-name">Project name</FieldLabel><Input id="project-name" value={draft.name} onChange={e=>update("name",e.target.value)} required maxLength={60} placeholder="Your product name"/><FieldDescription>The name your customers will see.</FieldDescription></Field><Field><FieldLabel htmlFor="project-slug">Project handle</FieldLabel><Input id="project-slug" value={draft.slug} onChange={e=>update("slug",e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))} pattern="[a-z0-9-]+" required maxLength={40}/><FieldDescription>Letters, numbers, and hyphens. Used to identify your project.</FieldDescription></Field><Field><FieldLabel htmlFor="project-description">Project description</FieldLabel><Textarea id="project-description" value={draft.description} onChange={e=>update("description",e.target.value)} maxLength={200}/><FieldDescription>A short description of your product or workspace.</FieldDescription></Field></div>}
      {(settings||step===2)&&<div className="flex flex-col gap-6 rounded-lg border p-5 sm:p-6"><Field><FieldLabel htmlFor="project-logo">Project logo</FieldLabel><div className="flex items-center gap-4"><Avatar className="size-12 rounded-lg"><AvatarImage src={draft.logo}/><AvatarFallback>{draft.name.slice(0,2).toUpperCase()}</AvatarFallback></Avatar><Input type="file" id="project-logo" accept="image/png,image/jpeg,image/webp" onChange={e=>upload(e.target.files?.[0])}/></div><FieldDescription>PNG, JPEG, or WebP. Up to 2 MB.</FieldDescription>{logoError&&<p role="alert" className="text-xs text-destructive-foreground">{logoError}</p>}{draft.logo&&<Button variant="ghost" type="button" size="sm" onClick={()=>update("logo","")}>Remove logo</Button>}</Field><Field><FieldLabel htmlFor="project-accent">Accent color</FieldLabel><ToggleGroup aria-label="Accent palette" className="flex-wrap gap-2" value={[draft.accent]} onValueChange={values=>{if(values[0])update("accent",values[0]);}}>{colors.map(color=><ToggleGroupItem key={color} value={color} aria-label={"Use accent "+color} className="size-11 rounded-full p-0"><span className="flex size-7 items-center justify-center rounded-full text-white" style={{background:color}}>{draft.accent===color&&<CheckIcon weight="bold"/>}</span></ToggleGroupItem>)}</ToggleGroup><Input id="project-accent" type="color" className="max-w-24" value={draft.accent} onChange={e=>update("accent",e.target.value)}/></Field><div className="rounded-lg border p-4" style={projectTheme(draft.accent)}><p className="text-xs text-muted-foreground">Live preview</p><h2 className="mt-3 text-lg font-semibold">{draft.name||"Your project"}</h2><p className="mt-1 text-sm text-muted-foreground">{draft.description}</p><p className="mt-4 text-xs text-muted-foreground">Your feedback boards will live inside this project.</p></div></div>}
      <div className="flex items-center justify-between gap-3">{!settings&&step===2?<Button type="button" variant="outline" onClick={()=>setStep(1)}>Back</Button>:<span/>}<Button type="submit">{settings?(saved?"Changes saved":"Save changes"):step===1?"Continue":"Create project"}<ArrowRightIcon weight="bold" data-icon="inline-end"/></Button></div>
      {saved&&<p role="status" className="text-sm text-status-shipped-fg">Your project preview has been updated.</p>}
      <PreviewNote/>
    </form>
  </PageShell>;
}

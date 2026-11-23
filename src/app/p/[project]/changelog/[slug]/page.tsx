import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getPublicWorkspace} from '@/server/public-workspace';
import {readPublishedChangelogEntry} from '@/server/changelog/service';
import {Avatar,AvatarFallback,AvatarImage} from '@/components/ui/avatar';
import {ChangelogBody} from '@/components/changelog/changelog-body';
import {changelogCategoryLabels,changelogDayLabel} from '@/lib/changelog';
import {changelogHref,feedbackHref} from '@/lib/project-links';
import {changelogPlainText} from '@/lib/changelog-markdown';
export const instant=false;

async function load(project:string,slug:string){
  const workspace=await getPublicWorkspace(project);
  if(!workspace)return null;
  const entry=await readPublishedChangelogEntry(workspace.project.id,slug);
  return entry?{workspace,entry}:null;
}

export async function generateMetadata({params}:{params:Promise<{project:string;slug:string}>}):Promise<Metadata>{
  const {project,slug}=await params;
  const data=await load(project,slug);
  if(!data)return {};
  const title=data.entry.title+' · '+data.workspace.project.name;
  const description=(data.entry.summary??changelogPlainText(data.entry.body)).slice(0,200);
  const canonical=changelogHref(data.workspace.project)+'/'+encodeURIComponent(data.entry.slug);
  return {title,description,alternates:{canonical},openGraph:{title,description,type:'article',publishedTime:data.entry.publishedAt??undefined},twitter:{card:'summary',title,description}};
}

export default async function Page({params}:{params:Promise<{project:string;slug:string}>}){
 const {project,slug}=await params;
 const data=await load(project,slug);if(!data)notFound();
 const {workspace,entry}=data;
 return <main id="public-content" className="mx-auto w-full max-w-[720px] flex-1 px-4 pb-20 pt-9 sm:px-8">
  <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground"><Link href={changelogHref(workspace.project)} className="rounded-md transition-colors hover:text-foreground">Changelog</Link><span aria-hidden="true">/</span><span className="truncate">{entry.title}</span></nav>
  <article className="mt-6">
   <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
    <time dateTime={entry.publishedAt??undefined} className="text-[11px] font-medium uppercase leading-4 tracking-[0.07em] text-muted-foreground">{entry.publishedAt?changelogDayLabel(entry.publishedAt):''}</time>
    <span className="inline-flex items-center rounded-full bg-control-quiet px-2 py-0.5 text-[11px] font-medium leading-4 text-muted-foreground">{changelogCategoryLabels[entry.category]}</span>
   </div>
   <h1 className="mt-2.5 text-[26px] font-semibold leading-9 tracking-[-0.4px] sm:text-[30px] sm:leading-10">{entry.title}</h1>
   {entry.summary&&<p className="mt-2.5 text-[15px] leading-7 text-muted-foreground sm:text-[16px]">{entry.summary}</p>}
   <div className="mt-5">{entry.coverImage&&<img src={entry.coverImage} alt="" loading="lazy" className="mb-6 aspect-[2/1] w-full rounded-lg object-cover"/>}<ChangelogBody markdown={entry.body}/></div>
   {entry.feedback.length>0&&<div className="mt-7 rounded-[10px] bg-control-quiet px-4 py-3">
    <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.07em] text-muted-foreground">Requested by your users</p>
    <ul className="mt-1.5 space-y-1">{entry.feedback.map(item=><li key={item.id}><Link href={feedbackHref(workspace.project,item.id)} className="text-[13px] leading-5 text-foreground/80 underline decoration-border underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground/40">{item.title}</Link></li>)}</ul>
   </div>}
   {entry.author&&<div className="mt-7 flex items-center gap-2.5 border-t border-border/60 pt-5"><Avatar className="size-6"><AvatarImage src={entry.author.avatarUrl??undefined} alt=""/><AvatarFallback seed={entry.author.name}/></Avatar><span className="text-[13px] text-muted-foreground">{entry.author.name}</span>{entry.publishedAt&&<span className="text-[13px] text-muted-foreground">· {new Date(entry.publishedAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})}</span>}</div>}
  </article>
 </main>;
}

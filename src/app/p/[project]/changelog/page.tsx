import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getPublicWorkspace} from '@/server/public-workspace';
import {readPublishedChangelog} from '@/server/changelog/service';
import {Avatar,AvatarFallback,AvatarImage} from '@/components/ui/avatar';
import {EmptyState} from '@/components/feedback/empty-state';
import {ChangelogBody} from '@/components/changelog/changelog-body';
import {ChangelogTimeline} from '@/components/changelog/changelog-timeline';
import {changelogCategoryLabels,changelogDayLabel,groupChangelogByMonth} from '@/lib/changelog';
import {changelogHref,feedbackHref} from '@/lib/project-links';
export const instant=false;

export async function generateMetadata({params}:{params:Promise<{project:string}>}):Promise<Metadata>{
  const workspace=await getPublicWorkspace((await params).project);
  if(!workspace)return {};
  const title='Changelog · '+workspace.project.name;
  const description='Product updates, improvements and fixes from '+workspace.project.name+'.';
  const canonical=changelogHref(workspace.project);
  return {title,description,alternates:{canonical},openGraph:{title,description,type:'website'},twitter:{card:'summary',title,description}};
}

export default async function Page({params}:{params:Promise<{project:string}>}){
 const workspace=await getPublicWorkspace((await params).project);if(!workspace)notFound();
 const entries=await readPublishedChangelog(workspace.project.id);
 const months=groupChangelogByMonth(entries);
 const path=changelogHref(workspace.project);
 return <main id="public-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-9 sm:px-8">
  <header className="pb-10"><h1 className="text-[24px] font-semibold leading-8 tracking-[-0.4px]">Changelog</h1><p className="mt-1.5 text-[14px] leading-6 text-muted-foreground">What’s new in {workspace.project.name}.</p></header>
  {months.length?<ChangelogTimeline months={months.map(month=>({key:month.key,label:month.label,entries:month.entries.map(entry=>({slug:entry.slug,title:entry.title,day:entry.publishedAt?changelogDayLabel(entry.publishedAt):''}))}))}>
   {months.map(month=><section key={month.key} id={month.key} aria-labelledby={month.key+'-heading'} className="scroll-mt-28">
    <h2 id={month.key+'-heading'} className="sr-only">{month.label}</h2>
    {month.entries.map(entry=><article key={entry.id} id={entry.slug} data-changelog-entry={entry.slug} aria-labelledby={entry.slug+'-title'} className="scroll-mt-56 border-b border-border/60 pb-10 pt-8 first:pt-0 md:scroll-mt-28 sm:pb-12">
     <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <time dateTime={entry.publishedAt??undefined} className="text-[11px] font-medium uppercase leading-4 tracking-[0.07em] text-muted-foreground">{entry.publishedAt?changelogDayLabel(entry.publishedAt):''}</time>
      <span className="inline-flex items-center rounded-full bg-control-quiet px-2 py-0.5 text-[11px] font-medium leading-4 text-muted-foreground">{changelogCategoryLabels[entry.category]}</span>
     </div>
     <h3 id={entry.slug+'-title'} className="mt-2.5 text-[22px] font-semibold leading-8 tracking-[-0.3px] sm:text-[24px] sm:leading-9"><Link href={path+'/'+encodeURIComponent(entry.slug)} className="rounded-md outline-none transition-colors hover:text-foreground/70 focus-visible:ring-2 focus-visible:ring-ring">{entry.title}</Link></h3>
     {entry.summary&&<p className="mt-2 text-[15px] leading-7 text-muted-foreground sm:text-[16px]">{entry.summary}</p>}
     <div className="mt-3">{entry.coverImage&&<img src={entry.coverImage} alt="" loading="lazy" className="mb-6 aspect-[2/1] w-full rounded-lg object-cover"/>}<ChangelogBody markdown={entry.body}/></div>
     {entry.feedback.length>0&&<div className="mt-6 rounded-[10px] bg-control-quiet px-4 py-3">
      <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.07em] text-muted-foreground">Requested by your users</p>
      <ul className="mt-1.5 space-y-1">{entry.feedback.map(item=><li key={item.id}><Link href={feedbackHref(workspace.project,item.id)} className="text-[13px] leading-5 text-foreground/80 underline decoration-border underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground/40">{item.title}</Link></li>)}</ul>
     </div>}
     {entry.author&&<div className="mt-6 flex items-center gap-2.5"><Avatar className="size-6"><AvatarImage src={entry.author.avatarUrl??undefined} alt=""/><AvatarFallback seed={entry.author.name}/></Avatar><span className="text-[13px] text-muted-foreground">{entry.author.name}</span>{entry.publishedAt&&<span className="text-[13px] text-muted-foreground">· {new Date(entry.publishedAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})}</span>}</div>}
    </article>)}
   </section>)}
  </ChangelogTimeline>:<EmptyState className="py-16" title="No changelog yet" description="Updates will appear here once they’re published."/>}
 </main>;
}

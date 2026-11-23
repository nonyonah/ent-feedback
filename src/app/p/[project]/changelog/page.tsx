import {notFound} from 'next/navigation';
import {getPublicWorkspace} from '@/server/public-workspace';
import {readPublishedChangelog} from '@/server/changelog/service';
import {changelogParagraphs,formatChangelogDate} from '@/lib/changelog';
import {EmptyState} from '@/components/feedback/empty-state';
export const instant=false;
export default async function Page({params}:{params:Promise<{project:string}>}){
 const workspace=await getPublicWorkspace((await params).project);if(!workspace)notFound();
 const entries=await readPublishedChangelog(workspace.project.id);
 return <main id="public-content" className="mx-auto flex min-h-[60svh] w-full max-w-5xl flex-col pb-8 pt-9">
  <header className="px-4 pb-5 pt-3 sm:px-8"><h1 className="text-[24px] font-semibold leading-8 tracking-tight">Changelog</h1><p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">What’s new in {workspace.project.name}.</p></header>
  {entries.length?<ol className="space-y-3 px-4 pb-4 sm:px-8">{entries.map(entry=><li key={entry.id}><article id={entry.id} className="scroll-mt-28 rounded-[16px] bg-control-quiet p-5 sm:p-6">
   <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h2 className="text-[15px] font-semibold leading-6 tracking-[-0.15px]">{entry.title}</h2>{entry.publishedAt&&<time dateTime={entry.publishedAt} className="text-xs text-muted-foreground">{formatChangelogDate(entry.publishedAt)}</time>}</div>
   <div className="mt-3 space-y-3 text-[13px] leading-6 text-muted-foreground">{changelogParagraphs(entry.body).map((paragraph,index)=><p key={index} className="whitespace-pre-line">{paragraph}</p>)}</div>
  </article></li>)}</ol>:<EmptyState className="py-16" title="No changelog yet" description="Updates will appear here once they’re published."/>}
 </main>;
}

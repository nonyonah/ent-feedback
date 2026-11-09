import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getPublicWorkspace} from '@/server/public-workspace';
import {PublicWorkspaceBoundary} from '@/components/feedback/public-workspace-boundary';
export const instant=false;
export default async function Layout({params,children}:{params:Promise<{project:string}>;children:React.ReactNode}){const {project}=await params;const workspace=await getPublicWorkspace(project);if(!workspace)notFound();return <PublicWorkspaceBoundary project={workspace.project} boards={workspace.boards} widget={workspace.widget}>{children}{!workspace.project.hideAttribution&&<footer className="flex justify-center px-4 pb-5 pt-2"><Link href="/" className="rounded-md bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">Powered by Ent Feedback</Link></footer>}</PublicWorkspaceBoundary>;}

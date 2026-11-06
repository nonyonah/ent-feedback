import {notFound} from 'next/navigation';
import {getPublicWorkspace} from '@/server/public-workspace';
import {PublicWorkspaceBoundary} from '@/components/feedback/public-workspace-boundary';
export const instant=false;
export default async function Layout({params,children}:{params:Promise<{project:string}>;children:React.ReactNode}){const {project}=await params;const workspace=await getPublicWorkspace(project);if(!workspace)notFound();return <PublicWorkspaceBoundary project={workspace.project} boards={workspace.boards} widget={workspace.widget}>{children}</PublicWorkspaceBoundary>;}

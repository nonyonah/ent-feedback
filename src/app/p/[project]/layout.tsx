import {notFound} from 'next/navigation';
import {getPublicWorkspace} from '@/server/public-workspace';
import {PublicAttribution} from '@/components/feedback/public-attribution';
import {PublicWorkspaceBoundary} from '@/components/feedback/public-workspace-boundary';
export const instant=false;
export async function generateMetadata({params}:{params:Promise<{project:string}>}){
  const workspace=await getPublicWorkspace((await params).project);
  return workspace?.project.previewId?{robots:{index:false,follow:false}}:{};
}
export default async function Layout({params,children}:{params:Promise<{project:string}>;children:React.ReactNode}){const {project}=await params;const workspace=await getPublicWorkspace(project);if(!workspace)notFound();return <PublicWorkspaceBoundary project={workspace.project} boards={workspace.boards} widget={workspace.widget}><div className="flex min-h-0 flex-1 flex-col [&>main]:flex-1">{children}{!workspace.project.hideAttribution&&<PublicAttribution/>}</div></PublicWorkspaceBoundary>;}

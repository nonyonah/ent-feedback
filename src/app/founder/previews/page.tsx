import {notFound} from 'next/navigation';
import {requireFounder,listPreviews} from '@/server/preview-claims';
import {ServiceError} from '@/server/result';
import {PreviewManager} from './preview-manager';
export const instant=false;
export const metadata={title:'Founder previews',robots:{index:false,follow:false}};
export default async function Page(){
  try{await requireFounder();}catch(e){if(e instanceof ServiceError&&(e.code==='unauthenticated'||e.code==='forbidden'))notFound();throw e;}
  const rows=await listPreviews();
  return <main className="mx-auto my-14 w-full max-w-2xl space-y-6 px-6"><h1 className="text-2xl font-semibold">Founder previews</h1><PreviewManager rows={rows}/></main>;
}

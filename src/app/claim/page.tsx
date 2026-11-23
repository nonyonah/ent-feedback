import {cookies} from 'next/headers';
import {auth} from '@clerk/nextjs/server';
import {claimCookie,lookupPreview,unavailable} from '@/server/preview-claims';
import {ClaimButton} from './claim-button';
export const instant=false;
export const metadata={title:'Claim a board',robots:{index:false,follow:false}};
export default async function Page(){
  const token=(await cookies()).get(claimCookie)?.value??'';
  const preview=await lookupPreview(token);
  const {userId}=await auth();
  return <main className="mx-auto my-24 w-full max-w-lg space-y-5 px-6"><h1 className="text-2xl font-semibold">{preview?preview.product:'Preview unavailable'}</h1>{preview?<><p>Your feedback board is ready. You can view it before making it yours.</p><p><a className="underline" href={'/p/'+preview.handle+'/boards/'+preview.board}>View the public preview</a></p>{userId?<ClaimButton/>:<a className="underline" href="/auth?next=%2Fclaim">Claim this board</a>}</>:<p>{unavailable} Ask the founder for a fresh link.</p>}</main>;
}

'use client';
import {useTransition} from 'react';
import Link from 'next/link';
import {Button} from '@/components/ui/button';
export default function ContinueError({reset}:{error:Error&{digest?:string};reset:()=>void}){
 const [pending,startTransition]=useTransition();
 return <main className="flex min-h-svh items-center justify-center bg-background px-6"><div className="w-full max-w-sm text-center"><h1 className="text-sm font-semibold">We couldn’t finish signing you in</h1><p role="alert" className="mt-3 text-sm leading-6 text-muted-foreground">Your sign-in session is still here. The account connection is temporarily unavailable.</p><div className="mt-6 flex justify-center gap-2"><Button loading={pending} onClick={()=>startTransition(()=>reset())}>Try again</Button><Button variant="outline" render={<Link href="/"/>}>Return home</Button></div></div></main>;
}

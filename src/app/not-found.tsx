import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound(){return <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col items-center px-4 py-24 text-center"><p className="text-xs text-muted-foreground">404 · A little off the beaten path</p><h1 className="mt-4 text-2xl font-semibold">This page isn’t here.</h1><p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">Let’s head back to where the ideas are.</p><Button className="mt-6" render={<Link href="/"/>}>Back to feedback</Button></main>;}

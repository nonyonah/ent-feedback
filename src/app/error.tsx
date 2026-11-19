"use client";
import {LoadFailure} from '@/components/ui/load-failure';
export default function ErrorPage({retry}:{error:unknown;retry:()=>void}){return <main className="mx-auto w-full max-w-[720px] px-4 py-16"><LoadFailure resource="this page" onRetry={retry}/></main>;}

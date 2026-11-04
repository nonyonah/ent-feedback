"use client";
import { BoardState } from "@/components/feedback/board-states";
export default function ErrorPage({retry}:{error:unknown;retry:()=>void}){return <main className="mx-auto w-full max-w-[720px] px-4 py-16"><BoardState kind="error" onRetry={retry}/></main>;}

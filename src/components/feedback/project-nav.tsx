"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
export function ProjectNav() {
  const path=usePathname();
  return <nav aria-label="Project navigation" className="mb-8 flex gap-5 overflow-x-auto border-b text-sm">{[["/project","Boards"],["/project-settings","Appearance"],["/share","Share"],["/install","Widget"]].map(([href,label])=><Link key={href} href={href} aria-current={path===href?"page":undefined} className={cn("min-h-11 shrink-0 border-b-2 border-transparent py-3 text-muted-foreground hover:text-foreground",path===href&&"border-primary font-medium text-foreground")}>{label}</Link>)}</nav>;
}

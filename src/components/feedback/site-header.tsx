"use client";

import * as React from "react";
import Link from "next/link";
import { boardHref } from "@/lib/project-links";
import { usePathname } from "next/navigation";
import { ChatTextIcon as MessageSquareTextIcon } from "@phosphor-icons/react/dist/ssr/ChatText";
import { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { MagnifyingGlassIcon as SearchIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { UserCircleIcon } from "@phosphor-icons/react/dist/ssr/UserCircle";
import { Menu, MenuTrigger, MenuPopup, MenuGroup, MenuGroupLabel, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SubmitDialog } from "@/components/feedback/submit-dialog";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { useProject } from "@/components/feedback/project-provider";

function BoardSearch(): React.ReactElement {
  const { items } = useFeedback();
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const results = query.trim() ? items.filter((item) => (item.title + " " + item.description).toLowerCase().includes(query.trim().toLowerCase())) : items;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button aria-label="Search feedback" size="icon-sm" variant="ghost" className="min-h-11 min-w-11 sm:min-h-7 sm:min-w-7" />}><SearchIcon weight="bold" /></DialogTrigger>
      <DialogPopup>
        <DialogHeader><DialogTitle>Search feedback</DialogTitle><DialogDescription>Find an idea or join an existing conversation.</DialogDescription></DialogHeader>
        <DialogPanel className="flex flex-col gap-3">
          <Input aria-label="Search ideas" type="search" placeholder="Search ideas…" value={query} onChange={(event) => setQuery(event.target.value)} />
          <p aria-live="polite" className="text-xs text-muted-foreground">{results.length} {results.length === 1 ? "result" : "results"}</p>
          <ul className="flex flex-col gap-1">{results.map((item) => <li key={item.id}><Link onClick={() => setOpen(false)} className="block rounded-md p-3 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring" href={"/items/" + item.id}>{item.title}</Link></li>)}</ul>
          {results.length === 0 && <p className="py-4 text-sm text-muted-foreground">No ideas match your search. Try a different phrase.</p>}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}

function PublicSiteHeader(): React.ReactElement {
  const { project, activeBoard } = useProject();
  const pathname = usePathname();
  const publicHref = activeBoard ? boardHref(project,activeBoard) : "/project";

  function toggleTheme(): void {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem("ent-theme", nextDark ? "dark" : "light");
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/75 backdrop-blur-[12px]">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-3 px-4 sm:gap-6">
        <Link className="flex shrink-0 items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring" href={publicHref}>
          {project.logo ? <Avatar className="size-8 rounded-lg"><AvatarImage src={project.logo}/><AvatarFallback>{project.name.slice(0,2)}</AvatarFallback></Avatar> : <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"><MessageSquareTextIcon weight="bold" aria-hidden="true" className="size-4" /></span>}
          <span className="max-w-28 truncate text-sm font-semibold tracking-tight sm:max-w-64">{project.name === "Ent Feedback" ? <>Ent <span className="hidden text-muted-foreground sm:inline">Feedback</span></> : project.name}</span>
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
          <BoardSearch />
          <Button aria-label="Toggle color theme" className="min-h-11 min-w-11 sm:min-h-7 sm:min-w-7" onClick={toggleTheme} size="icon-sm" variant="ghost"><MoonIcon weight="bold" className="dark:hidden" /><SunIcon weight="bold" className="hidden dark:block" /></Button>
          <Menu><MenuTrigger render={<Button aria-label="Your account and project" className="min-h-11 min-w-11 sm:min-h-7 sm:min-w-7" size="icon-sm" variant="ghost"/>}><UserCircleIcon weight="bold"/></MenuTrigger><MenuPopup align="end"><MenuGroup><MenuGroupLabel>Your activity</MenuGroupLabel><MenuItem render={<Link href={"/auth?next="+encodeURIComponent(pathname||publicHref)}/>}>Sign in with email</MenuItem><MenuItem render={<Link href="/following"/>}>Following</MenuItem><MenuItem render={<Link href="/preferences"/>}>Notifications</MenuItem></MenuGroup><MenuSeparator/><MenuGroup><MenuGroupLabel>Your project</MenuGroupLabel><MenuItem render={<Link href="/project"/>}>Project overview</MenuItem><MenuItem render={<Link href="/share"/>}>Share a board</MenuItem><MenuItem render={<Link href="/dashboard"/>}>Feedback inbox</MenuItem><MenuItem render={<Link href="/project-settings"/>}>Project appearance</MenuItem><MenuItem render={<Link href="/install"/>}>Install the widget</MenuItem><MenuItem render={<Link href="/onboarding"/>}>Create a project</MenuItem></MenuGroup><MenuSeparator/><MenuGroup><MenuItem render={<Link href="/design"/>}>All design previews</MenuItem></MenuGroup></MenuPopup></Menu>
          {activeBoard ? <SubmitDialog trigger={<Button size="sm" className="min-h-11 sm:min-h-7"><PlusIcon weight="bold" data-icon="inline-start" /><span className="hidden sm:inline">Submit feedback</span><span className="sm:hidden">Submit</span></Button>} /> : <Button size="sm" render={<Link href="/project/boards/new"/>}>Create board</Button>}
        </div>
      </div>
    </header>
  );
}

function RouteHeader(): React.ReactElement | null {
  const pathname = usePathname();
  return pathname && ["/dashboard", "/embed", "/widget-preview", "/auth", "/onboarding"].some(prefix => pathname.startsWith(prefix)) ? null : <PublicSiteHeader />;
}

export function SiteHeader(): React.ReactElement {
  React.useEffect(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem("ent-theme"); } catch {}
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", stored ? stored === "dark" : prefersDark);
  }, []);
  return <React.Suspense fallback={null}><RouteHeader /></React.Suspense>;
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageShell, PreviewNote } from "@/components/feedback/page-shell";
export default function Page(){return <PageShell eyebrow="A quieter inbox" title="You’re off the list." description="You won’t receive updates for this post. You can always follow it again if you change your mind."><div className="flex flex-wrap gap-3"><Button render={<Link href="/"/>}>Back to feedback</Button><Button variant="outline" render={<Link href="/preferences"/>}>Manage notifications</Button></div><div className="mt-6"><PreviewNote>Unsubscribe confirmation preview. No email subscriptions have been changed.</PreviewNote></div></PageShell>;}

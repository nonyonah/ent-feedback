import Link from "next/link";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
const groups = [
  { title: "The conversation", description: "The public side of your product.", items: [
    ["/","Public board","Your redesigned board with voting, filters, and sorting."],
    ["/items/guest-voting","Post & conversation","Details, replies, likes, and the author sidebar."],
    ["/submit","Share an idea","The full submission flow with similar requests."],
    ["/following","Following","Posts followed in this browser."],
    ["/preview/following","Following · populated","A sample list of followed posts."],
    ["/preferences","Notifications","Email and post-update preferences."],
    ["/preferences/unsubscribed","Unsubscribed","The quiet end of a notification journey."],
  ]},
  { title: "A simple way in", description: "Email sign-in, without the extra ceremony.", items: [
    ["/auth","Email sign-in","One field, one secure link."],
    ["/auth/check-email","Check your inbox","Resend and change-email actions."],
    ["/auth/verified","Verified","A clear return to the conversation."],
    ["/auth/expired","Expired link","A gentle route back to sign-in."],
    ["/auth/error","Verification error","A recoverable error state."],
    ["/preview/auth-sending","Sending link","The request-in-progress state."],
  ]},
  { title: "Make it yours", description: "From a blank board to your first conversation.", items: [
    ["/onboarding","First project setup","Name, introduction, logo, and accent color."],
    ["/preview/onboarding-ready","Your project is ready","Create a board inside your new project."],
    ["/project","Project overview","Your boards and the next setup steps."],
    ["/project/boards/new","Create a board","A separate flow inside the project."],
    ["/share","Share your board","Public board links and direct submission."],
    ["/project-settings","Project appearance","Edit your project and see a live preview."],
    ["/dashboard","Feedback inbox","The existing admin screen, ready for your redesign."],
  ]},
  { title: "Inside your product", description: "A small, thoughtful place to leave feedback.", items: [
    ["/install","Widget installation","Snippet, setup instructions, and live preview."],
    ["/widget-preview","Widget in a host app","Try the launcher, board, and submit flow."],
    ["/embed","Embedded board","The standalone, iframe-ready panel."],
    ["/preview/widget-submit","Widget submission","Review the narrow submission layout directly."],
  ]},
  { title: "The little moments", description: "Every state deserves the same care.", items: [
    ["/preview/submission-similar","Similar ideas","Suggestions before someone posts a duplicate."],
    ["/preview/submission-success","Idea submitted","A clear and reassuring confirmation."],
    ["/preview/submission-sending","Posting an idea","A protected in-progress form."],
    ["/preview/submission-invalid","Validation","Inline guidance beside each field."],
    ["/preview/submission-error","Submission error","Keep the draft and offer a retry."],
    ["/preview/board-empty","Empty board","An invitation to share the first idea."],
    ["/preview/board-no-results","No results","A useful way back to the conversation."],
    ["/preview/board-loading","Loading","Skeletons with familiar proportions."],
    ["/preview/board-error","Connection error","Recover without losing your place."],
    ["/this-page-is-missing","Missing page","A friendly 404."],
  ]},
];
export default function DesignIndex() {
  return <main className="mx-auto w-full max-w-[1040px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
    <div className="max-w-xl"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ent · Screen collection</p><h1 className="mt-4 text-3xl font-semibold tracking-tight">A little feedback. Every little detail.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">A home for all the screens we’re shaping together. Open a page, try the interactions, and make it yours.</p><p className="mt-3 text-xs leading-5 text-muted-foreground">Frontend previews use sample data. Email delivery, authentication, and shared persistence are waiting for the backend. Use the moon in the header to review dark mode.</p></div>
    <nav aria-label="Screen categories" className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-b pb-5">{groups.map((group,i)=><a key={group.title} href={"#screens-"+i} className="text-xs font-medium text-muted-foreground hover:text-foreground">{group.title}</a>)}</nav>
    <div className="flex flex-col gap-12 pt-10">{groups.map((group,i)=><section id={"screens-"+i} key={group.title} className="scroll-mt-24"><h2 className="text-xl font-semibold">{group.title}</h2><p className="mt-1 text-sm text-muted-foreground">{group.description}</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{group.items.map(([href,title,description])=><Link key={href} href={href} className="group flex min-h-32 flex-col rounded-lg border bg-card p-5 outline-none transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold">{title}</h3><ArrowUpRightIcon weight="bold" aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-hover:text-primary"/></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p><span className="mt-auto pt-3 text-[11px] text-muted-foreground">{href}</span></Link>)}</div></section>)}</div>
  </main>;
}

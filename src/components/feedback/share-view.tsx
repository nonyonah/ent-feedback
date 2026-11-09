"use client";
import {XMark as XLogoIcon,LinkedInMark as LinkedinLogoIcon,FacebookMark as FacebookLogoIcon,RedditMark as RedditLogoIcon} from "@/components/feedback/app-logos";

import { LinkIcon, CopyIcon, ArrowUpRightIcon } from "@/components/icons";
import * as React from "react";
import { useProject } from "@/components/feedback/project-provider";
import { NoBoard } from "@/components/feedback/board-context";
import { boardHref } from "@/lib/project-links";
import {workspaceDomainAddress,workspaceBaseDomain} from "@/lib/workspace-domain";
const subscribe = () => () => {};
export function ShareView() {
  const {
    project,
    activeBoard
  } = useProject();
  const origin = React.useSyncExternalStore(subscribe, () => window.location.origin, () => "");
  const [message, setMessage] = React.useState("");
  const path = activeBoard ? boardHref(project, activeBoard) : "/dashboard/boards";
  const domainReady=Boolean(workspaceBaseDomain());
  const url = domainReady?workspaceDomainAddress(project.slug,"/boards/"+encodeURIComponent(activeBoard?.slug??"")):origin+path;
  const text = "We’re building " + project.name + " with you. Share an idea, vote on requests, and help shape what comes next: " + url;
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const snippet = '<script src="' + origin + '/widget.js" data-project="' + project.slug + '" data-board="' + (activeBoard?.slug ?? '') + '" defer></script>';
  const direct = '<a href="' + escape(url + '/submit') + '">Share feedback</a>';
  const visitorCode = 'Visitor details are configured in Widget settings.\n' + origin + '/dashboard/settings/widget';
  const social = {
    X: 'https://x.com/intent/tweet?text=' + encodeURIComponent(text),
    LinkedIn: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url),
    Facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url),
    Reddit: 'https://www.reddit.com/submit?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent('Share feedback for ' + project.name)
  };
  const mail = (subject: string, body: string) => 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(label);
    } catch {
      setMessage('Select the text and copy it manually.');
    }
  }
  if (!activeBoard) return <NoBoard />;
  return <div className="[font-synthesis:none] wrap-anywhere w-full min-h-full bg-[var(--dashboard-body)] antialiased text-xs/4">
      <div className="w-full max-w-3xl py-10 px-6 sm:px-8 mx-auto">
        <div className="mb-8">
          <div className="text-[14px] leading-[150%] wrap-normal font-sans font-semibold text-foreground">
            Collect feedback
          </div>
          <div className="text-[13px] leading-[142.857%] mt-1 wrap-normal font-sans text-muted-foreground">
            Get {project.name} in front of your users.
          </div>
        </div>
        <div className="mb-8 p-6 rounded-[18px] overflow-clip relative bg-background/80 dark:bg-card border border-solid border-border/60">
          <LinkIcon aria-hidden="true" style={{
            height: '112px',
            width: '112px',
            opacity: '0.05',
            position: 'absolute',
            right: '-16px',
            top: '50%',
            overflow: 'clip',
            translate: '0px -50%'
          }} />
          <div className="text-[13px] leading-[142.857%] relative font-sans font-semibold text-foreground">Your workspace board</div>
          <div className="mt-1 wrap-normal max-w-109.5 relative font-sans font-medium text-muted-foreground text-[13px]/5">
            Share it with your users, drop it in your docs, or link it from your website.
          </div>
          <div className="mt-2 flex w-full min-w-0 items-center relative">
            <div className="h-fit w-full min-w-0">
              <a dir="ltr" className="block max-w-full break-all font-sans font-medium text-primary-text text-sm leading-5 [unicode-bidi:isolate]" href={path} aria-label={domainReady?"Open workspace domain":"Preview board while domain setup is pending"}>{url}</a>
            </div>
          </div>
          {!domainReady&&<p className="mt-2 text-xs leading-5 text-muted-foreground">Share this link to open your feedback board.</p>}
          <div className="relative mt-4 flex min-w-0 flex-wrap items-start gap-2">
            <button data-slot="button" className="flex min-h-7 min-w-0 max-w-full items-center justify-center gap-1.5 rounded-2xl border border-primary bg-primary px-2.25 py-1 text-center text-primary-foreground shadow-sm" type={"button"} onClick={() => void copy(url, "Board link copied")}>
              <CopyIcon style={{
                height: '16px',
                flexShrink: '0',
                width: '16px',
                marginRight: '-2px',
                marginLeft: '-2px',
                opacity: '0.8',
                overflow: 'clip'
              }} />
              <div className="min-w-0 whitespace-normal break-words text-center font-sans text-[13px] font-medium leading-5 text-primary-foreground">
                Copy link
              </div>
            </button>
            <a className="relative inline-flex min-h-7 min-w-0 max-w-full items-center justify-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring" href={path}>
              <div className="inline-block text-[13px] leading-[142.857%] w-max wrap-normal relative font-sans font-medium text-foreground">
                {domainReady?"Visit":"Preview"}
              </div>
              <ArrowUpRightIcon style={{
                height: '16px',
                flexShrink: '0',
                width: '16px',
                marginRight: '-2px',
                marginLeft: '-2px',
                opacity: '0.8',
                overflow: 'clip',
                position: 'relative'
              }} />
            </a>
          </div>
        </div>
        <div className="mb-6 min-h-4" role={"status"} aria-live={"polite"}>{message}</div>
        <div className="flex flex-col gap-10">
          <div className="scroll-mbs-8 scroll-mt-8">
            <div className="mb-10">
              <div className="text-[13px] tracking-[0.44px] uppercase leading-[150%] wrap-normal font-sans font-medium text-muted-foreground">
                Share on social
              </div>
              <div className="text-[13px] mt-1 leading-[150%] wrap-normal font-sans font-medium text-muted-foreground">
                Announce your board where your users already are.
              </div>
              <div className="flex flex-col mt-5 gap-2">
                <div className="grid grid-cols-[repeat(2,minmax(0px,1fr))] gap-x-8 gap-y-6">
                  <a className="items-start flex gap-3" href={social["X"]} target={"_blank"} rel={"noopener noreferrer"}>
                    <XLogoIcon style={{
                      height: '28px',
                      flexShrink: '0',
                      width: '28px',
                      overflow: 'clip'
                    }} />
                    <div className="basis-[0%] grow">
                      <div className="text-[13px] leading-[150%] wrap-normal font-sans font-semibold text-foreground">
                        X
                      </div>
                      <div className="text-[13px] mt-0.5 leading-[150%] wrap-normal font-sans font-medium text-muted-foreground">
                        Post to your followers.
                      </div>
                    </div>
                    <ArrowUpRightIcon style={{
                      height: '12px',
                      flexShrink: '0',
                      width: '12px',
                      marginTop: '4px',
                      overflow: 'clip'
                    }} />
                  </a>
                  <a className="items-start flex gap-3" href={social["LinkedIn"]} target={"_blank"} rel={"noopener noreferrer"}>
                    <LinkedinLogoIcon style={{
                      height: '28px',
                      flexShrink: '0',
                      width: '28px',
                      overflow: 'clip'
                    }} />
                    <div className="basis-[0%] grow">
                      <div className="text-[13px] leading-[150%] wrap-normal font-sans font-semibold text-foreground">
                        LinkedIn
                      </div>
                      <div className="text-[13px] mt-0.5 leading-[150%] wrap-normal font-sans font-medium text-muted-foreground">
                        Share with your network.
                      </div>
                    </div>
                    <ArrowUpRightIcon style={{
                      height: '12px',
                      flexShrink: '0',
                      width: '12px',
                      marginTop: '4px',
                      overflow: 'clip'
                    }} />
                  </a>
                  <a className="items-start flex gap-3" href={social["Facebook"]} target={"_blank"} rel={"noopener noreferrer"}>
                    <FacebookLogoIcon style={{
                      height: '28px',
                      flexShrink: '0',
                      width: '28px',
                      overflow: 'clip'
                    }} />
                    <div className="basis-[0%] grow">
                      <div className="text-[13px] leading-[150%] wrap-normal font-sans font-semibold text-foreground">
                        Facebook
                      </div>
                      <div className="text-[13px] mt-0.5 leading-[150%] wrap-normal font-sans font-medium text-muted-foreground">
                        Post to a page or group.
                      </div>
                    </div>
                    <ArrowUpRightIcon style={{
                      height: '12px',
                      flexShrink: '0',
                      width: '12px',
                      marginTop: '4px',
                      overflow: 'clip'
                    }} />
                  </a>
                  <a className="items-start flex gap-3" href={social["Reddit"]} target={"_blank"} rel={"noopener noreferrer"}>
                    <RedditLogoIcon style={{
                      height: '28px',
                      flexShrink: '0',
                      width: '28px',
                      overflow: 'clip'
                    }} />
                    <div className="basis-[0%] grow">
                      <div className="text-[13px] leading-[150%] wrap-normal font-sans font-semibold text-foreground">
                        Reddit
                      </div>
                      <div className="text-[13px] mt-0.5 leading-[150%] wrap-normal font-sans font-medium text-muted-foreground">
                        Share in a subreddit.
                      </div>
                    </div>
                    <ArrowUpRightIcon style={{
                      height: '12px',
                      flexShrink: '0',
                      width: '12px',
                      marginTop: '4px',
                      overflow: 'clip'
                    }} />
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="mb-10" id={"widget-embed"}>
            <div className="text-[13px] tracking-[0.44px] uppercase leading-[150%] wrap-normal font-sans font-medium text-muted-foreground">
              Widget embed
            </div>
            <div className="text-[13px] mt-1 leading-[150%] wrap-normal font-sans font-medium text-muted-foreground">
              One snippet to collect feedback right inside your app.
            </div>
            <div className="flex flex-col mt-5 gap-2">
              <div>
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="items-center flex flex-wrap mb-2 gap-2">
                      <div className="items-center flex justify-center rounded-full shrink-0 bg-foreground/10 size-5">
                        <div className="text-[13px] leading-[150%] wrap-normal font-sans font-semibold text-muted-foreground">
                          1
                        </div>
                      </div>
                      <div className="text-[13px] leading-[150%] wrap-normal font-sans font-medium text-foreground/80">Widget loader</div>
                      <div className="text-[13px] leading-[150%] wrap-normal font-sans font-medium text-muted-foreground">Load {project.name}</div>
                    </div>
                    <div className="rounded-xl overflow-clip relative bg-muted/70">
                      <div className="flex">
                        <div className="flex flex-col p-3 bg-muted border-r border-r-solid border-r-border/60">{snippet.split("\n").map((_, index) => <div key={index} className="text-[13px] leading-[162.5%] font-mono text-muted-foreground">{index + 1}</div>)}</div>
                        <div className="basis-[0%] grow pr-16 pl-3 overflow-x-auto py-3">
                          <div className="text-[13px] leading-[162.5%] min-w-0 whitespace-pre-wrap break-all wrap-normal font-[ui-monospace,'SFMono-Regular','SF_Mono','Menlo','Consolas','Liberation_Mono',monospace] text-foreground/80">{snippet}</div>
                        </div>
                      </div>
                      <div className="pointer-events-none absolute rounded-xl [box-shadow:#0000000D_0px_0px_0px_1px_inset] inset-0" />
                      <button data-slot="button" className="absolute right-2 text-center top-2 content-center py-1 px-2 rounded-md [backdrop-filter:blur(8px)] border border-border bg-popover shadow-xs" type={"button"} aria-label={"Copy installation snippet"} onClick={() => void copy(snippet, "Code copied")}>
                        <div className="text-[13px] leading-[150%] text-center wrap-normal font-sans font-medium text-muted-foreground">
                          Copy
                        </div>
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="items-center flex flex-wrap mb-2 gap-2">
                      <div className="items-center flex justify-center rounded-full shrink-0 bg-foreground/10 size-5">
                        <div className="text-[13px] leading-[150%] wrap-normal font-sans font-semibold text-muted-foreground">
                          2
                        </div>
                      </div>
                      <div className="text-[13px] leading-[150%] wrap-normal font-sans font-medium text-foreground/80">Direct feedback link</div>
                      <div className="text-[13px] leading-[150%] wrap-normal font-sans font-medium text-muted-foreground">Add a shortcut to your app</div>
                    </div>
                    <div className="rounded-xl overflow-clip relative bg-muted/70">
                      <div className="flex">
                        <div className="flex flex-col p-3 bg-muted border-r border-r-solid border-r-border/60">{direct.split("\n").map((_, index) => <div key={index} className="text-[13px] leading-[162.5%] font-mono text-muted-foreground">{index + 1}</div>)}</div>
                        <div className="basis-[0%] grow pr-16 pl-3 overflow-x-auto py-3">
                          <div className="text-[13px] leading-[162.5%] min-w-0 whitespace-pre-wrap break-all wrap-normal font-[ui-monospace,'SFMono-Regular','SF_Mono','Menlo','Consolas','Liberation_Mono',monospace] text-foreground/80">{direct}</div>
                        </div>
                      </div>
                      <div className="pointer-events-none absolute rounded-xl [box-shadow:#0000000D_0px_0px_0px_1px_inset] inset-0" />
                      <button data-slot="button" className="absolute right-2 text-center top-2 content-center py-1 px-2 rounded-md [backdrop-filter:blur(8px)] border border-border bg-popover shadow-xs" type={"button"} aria-label={"Copy direct feedback link"} onClick={() => void copy(direct, "Code copied")}>
                        <div className="text-[13px] leading-[150%] text-center wrap-normal font-sans font-medium text-muted-foreground">
                          Copy
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-5 border-t border-t-solid border-t-[#E5E5E566]">
                  <div className="items-center flex flex-wrap mb-2 gap-2">
                    <div className="py-0.5 px-1.5 rounded-md bg-muted">
                      <div className="text-[13px] leading-[150%] wrap-normal font-sans font-medium text-muted-foreground">
                        Optional
                      </div>
                    </div>
                    <div className="text-[13px] leading-[150%] wrap-normal font-sans font-medium text-foreground/80">Visitor details</div>
                  </div>
                  <div className="text-[13px] mb-3 leading-[150%] wrap-normal font-sans font-medium text-muted-foreground">Choose whether to collect a name or email in Widget settings.</div>
                  <div className="rounded-xl overflow-clip relative bg-muted/70">
                    <div className="flex">
                      <div className="flex flex-col p-3 bg-muted border-r border-r-solid border-r-border/60">{visitorCode.split("\n").map((_, index) => <div key={index} className="text-[13px] leading-[162.5%] font-mono text-muted-foreground">{index + 1}</div>)}</div>
                      <div className="basis-[0%] grow pr-16 pl-3 overflow-x-auto py-3">
                        <div className="text-[13px] leading-[162.5%] min-w-0 whitespace-pre-wrap break-all wrap-normal font-[ui-monospace,'SFMono-Regular','SF_Mono','Menlo','Consolas','Liberation_Mono',monospace] text-foreground/80">{visitorCode}</div>
                      </div>
                    </div>
                    <div className="pointer-events-none absolute rounded-xl [box-shadow:#0000000D_0px_0px_0px_1px_inset] inset-0" />
                    <button data-slot="button" className="absolute right-2 text-center top-2 content-center py-1 px-2 rounded-md [backdrop-filter:blur(8px)] border border-border bg-popover shadow-xs" type={"button"} aria-label={"Copy visitor details instructions"} onClick={() => void copy(visitorCode, "Code copied")}>
                      <div className="text-[13px] leading-[150%] text-center wrap-normal font-sans font-medium text-muted-foreground">
                        Copy
                      </div>
                    </button>
                  </div>
                </div>
                <div className="items-center flex mt-4 gap-3">
                  <button data-slot="button" className="items-center flex shrink-0 justify-center min-h-7 text-center py-0.75 px-2.25 rounded-2xl gap-1.5 [box-shadow:#FFFFFF29_0px_1px_0px_inset,#1717173D_0px_1px_2px] bg-primary text-primary-foreground border border-solid border-primary" type={"button"} onClick={() => void copy(snippet + "\n\n" + direct, "Installation code copied")}>
                    <div className="text-[13px] leading-[142.857%] text-center w-max wrap-normal font-sans font-medium text-[#FAFAFA]">
                      Copy all
                    </div>
                  </button>
                  <a className="items-center flex shrink-0 justify-center min-h-7 py-0.75 px-2.25 rounded-2xl gap-1.5 bg-background border border-solid border-border" href={mail("Install feedback widget", snippet + "\n\n" + direct)}>
                    <div className="text-[13px] leading-[142.857%] w-max wrap-normal font-sans font-medium text-foreground">
                      Send to your developer
                    </div>
                  </a>
                  <a className="text-[13px] leading-[150%] wrap-normal font-sans font-medium text-muted-foreground" href={"/dashboard/settings/widget"}>
                    View docs →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>;
}

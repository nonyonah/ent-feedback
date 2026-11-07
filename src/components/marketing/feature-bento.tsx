import {Button} from '@/components/ui/button';
import {Avatar,AvatarFallback} from '@/components/ui/avatar';
import {Textarea} from '@/components/ui/textarea';
import {StatusLabel} from '@/components/feedback/status-label';
import {FeedbackTypeLabel} from '@/components/feedback/feedback-type-label';
import {ArrowUpIcon,ChatCircleIcon,AttachmentIcon,SmileIcon,PlusIcon} from '@/components/icons';
import s from './landing-page.module.css';

export function FeatureBento(){return <div className={s.bentoGrid}>
 <article className={`${s.bentoCard} ${s.collectCard}`}>
  <div className={s.bentoCopy}><h3>A home for every idea.</h3><p>Feedback, bugs, and requests. Easy to share, all in one place.</p></div>
  <div className={`${s.bentoVisual} ${s.collectVisual}`} aria-hidden="true" inert>
   <div className={s.formSnippet}>
    <div className={s.snippetMeta}><span className={s.boardChip}>Product feedback</span><span className={s.typeChip}><FeedbackTypeLabel category="feature_request"/></span></div>
    <h4>What if we could save our views?</h4><p>I keep coming back to the same filters. It would be great to pick up where I left off.</p>
    <div className={s.snippetFooter}><span className={s.composerIcons}><AttachmentIcon size={16}/><SmileIcon size={16}/></span><Button size="sm" className="rounded-lg"><PlusIcon/>Submit feedback</Button></div>
   </div>
  </div>
 </article>
 <article className={`${s.bentoCard} ${s.signalCard}`}>
  <div className={s.bentoCopy}><h3>Let the good ideas rise.</h3><p>Votes and conversations show what resonates.</p></div>
  <div className={`${s.bentoVisual} ${s.signalVisual}`} aria-hidden="true" inert><div className={s.inboxSnippet}>
   {[
    ['Save custom views','48','12','planned'],
    ['Dark mode for the board','32','8','shipped'],
    ['Drag and drop uploads','27','5','in-progress'],
   ].map(([title,votes,comments,status],index)=><div className={s.inboxRow} key={title}><Button size="sm" variant={index===0?'default':'outline'} className="h-auto min-h-10 flex-col gap-0 rounded-lg px-2 py-1 text-xs"><ArrowUpIcon className="size-3"/>{votes}</Button><div><strong>{title}</strong><span>{index===0&&<em>Trending</em>}<StatusLabel status={status as 'planned'|'shipped'|'in-progress'} iconOnly/><ChatCircleIcon size={12}/>{comments}</span></div></div>)}
  </div></div>
 </article>
 <article className={`${s.bentoCard} ${s.organizeCard}`}>
  <div className={s.bentoCopy}><h3>A little more order.</h3><p>Types and tags keep the details in focus.</p></div>
  <div className={`${s.bentoVisual} ${s.organizeVisual}`} aria-hidden="true" inert><div className={s.organizeSnippet}><span className={s.snippetLabel}>Type</span><div className={s.typeOptions}>{(['feedback','bug','feature_request'] as const).map(category=><span className={s.typeOption} key={category}><FeedbackTypeLabel category={category}/></span>)}</div><div className={s.snippetDivider}/><span className={s.snippetLabel}>Tags</span><div className={s.tagRow}><span>Usability</span><span>Dashboard</span><span><PlusIcon size={12}/> Add tag</span></div></div></div>
 </article>
 <article className={`${s.bentoCard} ${s.conversationCard}`}>
  <div className={s.bentoCopy}><h3>Keep people in the loop.</h3><p>Reply with context. Show how an idea moves forward.</p></div>
  <div className={`${s.bentoVisual} ${s.conversationVisual}`} aria-hidden="true" inert><div className={s.conversationSnippet}>
   <div className={s.commentSnippet}><Avatar className="size-7"><AvatarFallback seed="Jamie"/></Avatar><div><strong>Jamie <span>Team · 1h ago</span></strong><p>We’re exploring saved views. Thanks for helping shape what comes next!</p></div></div>
   <div className={s.statusSnippet}><span className={s.timelineDot}/><span>Jamie changed the status to</span><StatusLabel status="planned"/></div>
   <div className={s.composerSnippet}><Textarea unstyled readOnly value="" placeholder="Add a comment or share more context…" className="min-h-10 resize-none text-xs"/><div className={s.snippetFooter}><span className={s.composerIcons}><AttachmentIcon size={15}/><SmileIcon size={15}/></span><Button size="sm" className="rounded-lg">Comment</Button></div></div>
  </div></div>
 </article>
 </div>;}

'use client';

import * as React from 'react';
import {MarketingHeader} from './marketing-header';
import {billingPlan} from '@/lib/billing';
import typeStyles from './marketing-type.module.css';
import Link from 'next/link';
import {Button} from '@/components/ui/button';
import {Tabs,TabsList,TabsTab,TabsPanel} from '@/components/ui/tabs';
import {BrandLogo} from '@/components/feedback/brand-logo';
import {CheckIcon} from '@/components/icons';
import s from './pricing-page.module.css';

const signup='/auth?mode=signup&intent=workspace';
const included=['5 feedback boards','Unlimited posts and voters','No Powered by badge','Embeddable feedback widget','Votes, comments, and replies','Feedback types and custom tags','Statuses and progress history','Search and trending requests','Workspace logo, colors, and theme','In-app and email notifications'];
const questions=[
 ['What does one subscription cover?','One workspace: a home for your product’s boards, feedback, and conversations. The price is per workspace, rather than per person who leaves feedback.'],
 ['Do my users need to pay?','No. The subscription is for the workspace owner. People who submit feedback, vote, or comment do not need their own paid subscription.'],
 ['Can I embed it in my app?','Yes. Install the widget on your website so people can browse and submit feedback without leaving your product. Your public board is also available as a shareable link.'],
 ['How do I manage my subscription?','Open Settings → Billing in your workspace to manage your payment method, invoices, or cancellation through our secure billing portal.'],
 ['Are there any usage limits?','Free includes 2 boards with unlimited posts and voters, plus a small Powered by badge. Essentials includes 5 boards and removes the badge. Attachment size and request-rate limits apply to both plans.'],
 ['Is there a free trial?','Yes. Start with a 14-day trial. A card is required at checkout, but you aren’t charged until the trial ends. Cancel before then to avoid the first charge.'],
];

export function PricingPage(){
 const [annual,setAnnual]=React.useState(false);
 return <main className={`${typeStyles.typeSystem} ${s.page}`} id="top">
  <MarketingHeader page="pricing"/>
  <div className={s.content}>
   <section className={s.intro}><div><h1>Start free.<br/><span>Grow with good ideas.</span></h1><p>Everything you need to listen, organize, and respond. One simple home for your product’s feedback.</p></div><div className={s.introMascot} aria-hidden="true"><BrandLogo/><span>Good ideas welcome.</span></div></section>
   <Tabs value={annual?'yearly':'monthly'} onValueChange={value=>setAnnual(value==='yearly')} className={s.billingTabs}>
    <div className={s.billingRow}><TabsList size="sm" aria-label="Billing period"><TabsTab value="monthly">Monthly</TabsTab><TabsTab value="yearly">Yearly</TabsTab></TabsList><span>Save $14 yearly</span></div>
    <TabsPanel value={annual?'yearly':'monthly'}>
   <section className={s.planGrid} aria-label="Subscription plan">
    <article className={s.plan}><div className={s.planTop}><h2>Essentials</h2><span>One workspace</span></div><p className={s.price}>${annual?'5.83':'7'}<span> / month</span></p><p className={s.billingNote}>{annual?'$70 billed yearly. Save $14 per year.':'$7 billed monthly.'}</p><div className={s.rule}/><p className={s.includeLabel}>All the essentials, together.</p><ul>{included.map(feature=><li key={feature}><CheckIcon aria-hidden="true" size={15}/>{feature}</li>)}</ul><Button size="lg" render={<Link href={signup+'&next='+encodeURIComponent('/dashboard/settings/billing?interval='+(annual?'yearly':'monthly'))}/>}>Start for free</Button><p className={s.draft}>{billingPlan.trialDays}-day free trial · Card required.</p></article>
    <div className={s.valueGrid}><article><span className={s.number}>FREE</span><h2>A home for your first ideas.</h2><p>2 boards, unlimited posts and voters, and a small Powered by badge. No card required.</p><Button variant="outline" render={<Link href={signup}/>}>Get started free</Button></article><article><span className={s.number}>02</span><h2>Understand what matters.</h2><p>Votes, tags, and conversations give you the context to choose what comes next.</p></article><article><span className={s.number}>03</span><h2>Keep people in the loop.</h2><p>Reply with context and share progress, from an open suggestion to a shipped improvement.</p></article></div>
   </section></TabsPanel></Tabs>
   <section className={s.faq} aria-labelledby="questions"><div className={s.faqHeading}><h2 id="questions">A few things to know.</h2><p>Clear answers before you get started.</p></div><div className={s.faqGrid}>{questions.map(([title,body])=><article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></section>
  </div>
  <footer className={s.footer}><div><Link href="/" aria-label="Ent Feedback home"><BrandLogo/></Link><p>A little feedback.<br/>A better way forward.</p></div><nav aria-label="Footer navigation"><Link href="/">Product</Link><Link href="/pricing" aria-current="page">Pricing</Link><Link href="/auth?intent=workspace">Log in</Link><Link href={signup}>Create a workspace</Link></nav><span>© {new Date().getUTCFullYear()} Ent Feedback</span></footer>
 </main>;
}

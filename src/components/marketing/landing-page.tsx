'use client';

import * as React from 'react';
import {MarketingHeader} from './marketing-header';
import typeStyles from './marketing-type.module.css';
import Link from 'next/link';
import Image from 'next/image';
import {Button} from '@/components/ui/button';
import {FeatureBento,ConversationPreview} from './feature-bento';
import {BrandLogo} from '@/components/feedback/brand-logo';
import {XIcon, ArrowSquareOutIcon} from '@/components/icons';
import styles from './landing-page.module.css';

const signup='/auth?mode=signup&intent=workspace';

export function LandingPage({composition="centered"}:{composition?:"centered"|"split"}){
 const screen=React.useRef<HTMLDialogElement>(null);
 const landing=React.useRef<HTMLElement>(null);
 React.useEffect(()=>{
  const root=landing.current;
  if(!root || !('IntersectionObserver' in window))return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const animations=new Set<Animation>();
  const observer=new IntersectionObserver(entries=>{
   for(const entry of entries){
    if(!entry.isIntersecting)continue;
    observer.unobserve(entry.target);
    const animation=entry.target.animate([
     {opacity:0,transform:reduced.matches?'none':'translateY(10px)'},
     {opacity:1,transform:reduced.matches?'none':'translateY(0)'},
    ],{duration:reduced.matches?125:420,delay:reduced.matches?0:Number((entry.target as HTMLElement).dataset.motionDelay || 0),easing:getComputedStyle(root).getPropertyValue('--ease-out').trim(),fill:'backwards'});
    animations.add(animation);
    animation.finished.then(()=>animations.delete(animation)).catch(()=>{});
   }
  },{threshold:0.12});
  root.querySelectorAll('[data-reveal]').forEach(element=>observer.observe(element));
  const stop=()=>{if(reduced.matches)animations.forEach(animation=>animation.cancel());};
  reduced.addEventListener('change',stop);
  return()=>{observer.disconnect();animations.forEach(animation=>animation.cancel());reduced.removeEventListener('change',stop);};
 },[]);
 React.useEffect(()=>{let frame=0;let freeze:HTMLStyleElement|null=null;const observer=new MutationObserver(()=>{freeze?.remove();cancelAnimationFrame(frame);freeze=document.createElement('style');freeze.textContent='*,*::before,*::after{transition:none !important}';document.head.appendChild(freeze);void document.documentElement.offsetHeight;frame=requestAnimationFrame(()=>{freeze?.remove();freeze=null;});});observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});return()=>{observer.disconnect();cancelAnimationFrame(frame);freeze?.remove();};},[]);

 return <main id="top" ref={landing} className={`${typeStyles.typeSystem} ${styles.landing} ${composition==="split"?styles.split:""}`}>
  <MarketingHeader page="product"/>
  <section className={styles.hero}>
   <h1>Build what your<br/> users need.</h1>
   <p className={styles.intro}>Collect ideas, bugs, and requests in one place. Understand what matters, and keep your users in the loop.</p>
   <div className={styles.ctas}><Button size="lg" render={<Link href={signup}/>}>Get started</Button><Button size="lg" variant="outline" render={<a href="#product"/>}>Explore the product</Button></div>
  </section>
  <section id="product" className={styles.previewWrap} aria-label="Ent Feedback product preview">
   <div className={styles.plainPreview}>
    <div className={styles.productImage}>
     <Image className={styles.productLight} src="/marketing/dashboard-light-6627da19.webp" width={2880} height={1880} sizes="(max-width: 600px) 200vw, (max-width: 800px) 100vw, 1120px" alt="Ent Feedback dashboard showing the request inbox, votes, tags, and a feedback conversation." loading="eager"/>
     <Image className={styles.productDark} src="/marketing/dashboard-dark-791ef852.webp" width={2880} height={1880} sizes="(max-width: 600px) 200vw, (max-width: 800px) 100vw, 1120px" alt="Ent Feedback dashboard in dark mode showing requests and a feedback conversation." loading="eager"/>
    </div>
    <Button variant="outline" size="icon" className={styles.previewExpand} aria-label="View full product screenshot" onClick={()=>screen.current?.showModal()}><ArrowSquareOutIcon/></Button>
   </div>
  </section>
  <dialog ref={screen} className={styles.imageDialog} aria-label="Full Ent Feedback product screenshot" onClick={event=>{if(event.target===event.currentTarget)screen.current?.close();}}><Button variant="outline" size="icon" aria-label="Close product screenshot" onClick={()=>screen.current?.close()}><XIcon/></Button><div className={styles.productImage}><Image className={styles.productLight} src="/marketing/dashboard-light-6627da19.webp" width={2880} height={1880} sizes="95vw" alt="Full Ent Feedback dashboard with sample feedback"/><Image className={styles.productDark} src="/marketing/dashboard-dark-791ef852.webp" width={2880} height={1880} sizes="95vw" alt="Full Ent Feedback dashboard in dark mode with sample feedback"/></div></dialog>
  <section id="features" className={styles.features}>
   <div className={styles.featureHeading} data-reveal><h2>Less scattered feedback.<br/> A clearer way forward.</h2><p>Give people a place to speak up. Give your team the context to act.</p></div>
   <FeatureBento/>
  </section>
  <section id="conversation" className={styles.progressStory} data-reveal>
   <div className={styles.storyCopy}><p className={styles.sectionLabel}>Close the loop</p><h2>Keep the conversation<br/> moving forward.</h2><p>Acknowledge an idea, ask a question, or share an update. Replies and status changes keep everyone on the same page.</p></div>
   <div className={styles.progressMedia} aria-hidden="true" inert><ConversationPreview/></div>
  </section>
  <section className={styles.finalCta} data-reveal><div className={styles.bannerCopy}><h2>Good ideas are out there.<br/><span>Give them a way in.</span></h2><p>A board for your users. A clearer picture for you.</p></div><Button size="lg" render={<Link href={signup}/>}>Create your workspace</Button><ul className={styles.ctaDetails}><li>Public feedback board</li><li>In-app widget</li><li>One place to respond</li></ul></section>
  <footer className={styles.footer}>
   <div className={styles.footerInner}><div className={styles.footerIdentity}><Link href="/" className={styles.brand} aria-label="Ent Feedback home"><BrandLogo/></Link><p className={styles.footerStatement}>A little feedback.<br/>A better way forward.</p><p>Ideas, conversations, and progress.<br/>All in one place.</p></div><nav aria-label="Product links"><h2>Product</h2><a href="#product">Overview</a><a href="#features">Features</a><Link href="/pricing">Pricing</Link></nav><nav aria-label="Account links"><h2>Account</h2><Link href="/auth?intent=workspace">Log in</Link><Link href={signup}>Sign up</Link></nav></div><div className={styles.footerBottom}><span>© {new Date().getUTCFullYear()} Ent Feedback</span><a href="#top">Back to top ↑</a></div>
  </footer>
 </main>;
}

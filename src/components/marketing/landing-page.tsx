'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {Button} from '@/components/ui/button';
import {FeatureBento} from './feature-bento';
import {BrandLogo} from '@/components/feedback/brand-logo';
import {XIcon, ArrowSquareOutIcon} from '@/components/icons';
import styles from './landing-page.module.css';

const signup='/auth?mode=signup&intent=workspace';

export function LandingPage({composition="centered"}:{composition?:"centered"|"split"}){
 const screen=React.useRef<HTMLDialogElement>(null);
 React.useEffect(()=>{let frame=0;let freeze:HTMLStyleElement|null=null;const observer=new MutationObserver(()=>{freeze?.remove();cancelAnimationFrame(frame);freeze=document.createElement('style');freeze.textContent='*,*::before,*::after{transition:none !important}';document.head.appendChild(freeze);void document.documentElement.offsetHeight;frame=requestAnimationFrame(()=>{freeze?.remove();freeze=null;});});observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});return()=>{observer.disconnect();cancelAnimationFrame(frame);freeze?.remove();};},[]);

 return <main className={`${styles.landing} ${composition==="split"?styles.split:""}`}>
  <header className={styles.header}>
   <Link href="/" className={styles.brand} aria-label="Ent Feedback home"><BrandLogo/></Link>
   <div className={styles.headerActions}><Button variant="ghost" render={<Link href="/auth?intent=workspace"/>}>Log in</Button><Button render={<Link href={signup}/>}>Sign up</Button></div>
  </header>
  <section className={styles.hero}>
   <div className={styles.heroWords}><p className={styles.eyebrow}><span/> A little closer to your users</p>
   <h1>Good ideas deserve<br/><span>a place to grow.</span></h1></div>
   <div className={styles.heroSupport}><p className={styles.intro}>A simple home for feedback, bugs, and feature requests.<br className={styles.desktopBreak}/> Build a little closer to your users.</p>
   <div className={styles.ctas}><Button size="lg" render={<Link href={signup}/>}>Get started</Button><Button size="lg" variant="ghost" render={<a href="#product"/>}>Explore the product</Button></div>
</div>
  </section>
  <section id="product" className={styles.previewWrap} aria-label="Ent Feedback product preview">
   <div className={styles.plainPreview}>
    <div className={styles.productImage}>
     <Image className={styles.productLight} src="/marketing/dashboard-light.webp" width={2880} height={1880} sizes="(max-width: 520px) 230vw, (max-width: 800px) 125vw, (max-width: 1280px) 100vw, 1120px" alt="The actual Ent Feedback dashboard: request inbox, votes, tags, conversation, and status history." loading="eager"/>
     <Image className={styles.productDark} src="/marketing/dashboard-dark.webp" width={2880} height={1880} sizes="(max-width: 520px) 230vw, (max-width: 800px) 125vw, (max-width: 1280px) 100vw, 1120px" alt="The actual Ent Feedback dashboard in dark mode: request inbox, votes, tags, conversation, and status history." loading="eager"/>
    </div>
    <Button variant="outline" size="icon" className={styles.previewExpand} aria-label="View full product screenshot" onClick={()=>screen.current?.showModal()}><ArrowSquareOutIcon/></Button>
   </div>
  </section>
  <dialog ref={screen} className={styles.imageDialog} aria-label="Full Ent Feedback product screenshot" onClick={event=>{if(event.target===event.currentTarget)screen.current?.close();}}><Button variant="outline" size="icon" aria-label="Close product screenshot" onClick={()=>screen.current?.close()}><XIcon/></Button><div className={styles.productImage}><Image className={styles.productLight} src="/marketing/dashboard-light.webp" width={2880} height={1880} sizes="95vw" alt="Full Ent Feedback dashboard with sample feedback"/><Image className={styles.productDark} src="/marketing/dashboard-dark.webp" width={2880} height={1880} sizes="95vw" alt="Full Ent Feedback dashboard in dark mode with sample feedback"/></div></dialog>
  <section id="features" className={styles.features}>
   <div className={styles.featureHeading}><h2>Simple tools. Better conversations.</h2><p>Collect the idea. Understand the need. Keep things moving.</p></div>
   <FeatureBento/>
  </section>
  <section className={styles.finalCta}><div className={styles.bannerCopy}><h2>Your next good idea<br/>is someone’s <span>“what if.”</span></h2><p>Give it a place to grow.</p></div><Button size="lg" render={<Link href={signup}/>}>Create your workspace <span aria-hidden>↗</span></Button></section>
  <footer className={styles.footer}><Link href="/" className={styles.brand}><BrandLogo/><span>Ent Feedback</span></Link><p>A little feedback goes a long way.</p><Link href={composition==="split"?"/":"/landing-v2"}>Compare layouts <span aria-hidden>↗</span></Link></footer>
 </main>;
}

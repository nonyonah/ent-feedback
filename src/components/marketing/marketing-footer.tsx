import Link from 'next/link';
import {BrandLogo} from '@/components/feedback/brand-logo';
import s from './marketing-footer.module.css';

export function MarketingFooter({onLandingPage=false}:{onLandingPage?:boolean}){
 const home=onLandingPage?'':'/';
 return <footer className={s.footer}>
  <div className={s.inner}>
   <div className={s.identity}><Link href="/" className={s.brand} aria-label="Ent Feedback home"><BrandLogo/></Link><p className={s.statement}>A little feedback.<br/>A better way forward.</p><p className={s.description}>Ideas, conversations, and progress.<br/>All in one place.</p></div>
   <nav aria-label="Product links"><h2>Product</h2><a href={home+'#product'}>Overview</a><a href={home+'#features'}>Features</a><Link href="/pricing">Pricing</Link></nav>
   <nav aria-label="Account links"><h2>Account</h2><Link href="/auth?intent=workspace">Log in</Link><Link href="/auth?mode=signup&intent=workspace">Sign up</Link></nav>
   <nav aria-label="Company links"><h2>Company</h2><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:nonyonah@gmail.com">Contact</a></nav>
  </div>
  <div className={s.bottom}><span>© {new Date().getUTCFullYear()} Ent Feedback</span><a href="#top">Back to top ↑</a></div>
 </footer>;
}

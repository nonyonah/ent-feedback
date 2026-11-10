import Link from 'next/link';
import {Button} from '@/components/ui/button';
import {BrandLogo} from '@/components/feedback/brand-logo';
import s from './marketing-header.module.css';

export function MarketingHeader({page,showFeatures=false}:{page:'product'|'pricing';showFeatures?:boolean}){
 return <header className={s.header}><Link href="/" aria-label="Ent Feedback home" className={s.logo}><BrandLogo/></Link><nav className={s.navigation} aria-label="Main navigation">{showFeatures&&<a href="#features">Features</a>}<Link href="/pricing" aria-current={page==='pricing'?'page':undefined}>Pricing</Link></nav><div className={s.actions}><Button variant="ghost" render={<Link href="/auth?intent=workspace"/>}>Log in</Button><Button render={<Link href="/auth?mode=signup&intent=workspace"/>}>Sign up</Button></div></header>;
}

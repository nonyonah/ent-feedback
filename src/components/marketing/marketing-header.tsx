'use client';
import * as React from 'react';
import Link from 'next/link';
import {Menu,MenuTrigger,MenuPopup,MenuItem,MenuSeparator} from '@/components/ui/menu';
import {Button} from '@/components/ui/button';
import {BrandLogo} from '@/components/feedback/brand-logo';
import s from './marketing-header.module.css';

export function MarketingHeader({page,showFeatures=false}:{page:'product'|'pricing';showFeatures?:boolean}){
 const [open,setOpen]=React.useState(false);
 return <header className={s.header}><Link href="/" aria-label="Ent Feedback home" className={s.logo}><BrandLogo/></Link><nav className={s.navigation} aria-label="Main navigation">{showFeatures&&<a href="#features">Features</a>}<Link href="/pricing" aria-current={page==='pricing'?'page':undefined}>Pricing</Link><a href="/docs">Docs</a></nav><div className={s.actions}><Button variant="ghost" render={<Link href="/auth?intent=workspace"/>}>Log in</Button><Button render={<Link href="/auth?mode=signup&intent=workspace"/>}>Sign up</Button></div><div className={s.mobileMenu}><Menu open={open} onOpenChange={setOpen}><MenuTrigger render={<Button variant="ghost" size="icon" className={s.menuButton} data-open={open} aria-label={open?"Close navigation":"Open navigation"}/>}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path className={s.menuLineTop} d="M4 7h16"/><path className={s.menuLineMiddle} d="M4 12h16"/><path className={s.menuLineBottom} d="M4 17h16"/></svg></MenuTrigger><MenuPopup align="end" sideOffset={8} className={s.menuPopup} aria-label="Main navigation">{showFeatures&&<MenuItem render={<Link href="/#features"/>}>Features</MenuItem>}<MenuItem render={<Link href="/pricing"/>}>Pricing</MenuItem><MenuItem render={<a href="/docs"/>}>Docs</MenuItem><MenuSeparator/><MenuItem render={<Link href="/auth?intent=workspace"/>}>Log in</MenuItem><MenuItem render={<Link href="/auth?mode=signup&intent=workspace"/>}>Sign up</MenuItem></MenuPopup></Menu></div></header>;
}

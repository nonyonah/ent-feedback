import type {Metadata} from 'next';
import {LandingPage} from '@/components/marketing/landing-page';
export const metadata:Metadata={title:'Ent Feedback — Good ideas deserve a place to grow',description:'Collect feedback, find the signal, and keep the conversation moving. A little closer to your users.'};
export default function LandingV2(){return <LandingPage composition="split"/>;}

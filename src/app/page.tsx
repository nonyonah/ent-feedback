import type {Metadata} from 'next';
import {LandingPage} from '@/components/marketing/landing-page';
export const metadata:Metadata={title:'Ent Feedback — Good ideas deserve a place to grow',description:'A home for your users’ ideas, bugs, and feedback. Collect feedback, understand demand, and keep everyone in the loop.'};
export default function Home(){return <LandingPage/>;}

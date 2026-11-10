import type {Metadata} from 'next';
import {LegalPage} from '@/components/marketing/legal-page';
export const metadata:Metadata={title:'Terms — Ent Feedback',description:'Terms for using Ent Feedback, operated by Rift Labs.'};
export default function Page(){return <LegalPage kind="terms"/>;}

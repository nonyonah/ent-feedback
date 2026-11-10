import type {Metadata} from 'next';
import {LegalPage} from '@/components/marketing/legal-page';
export const metadata:Metadata={title:'Privacy — Ent Feedback',description:'How Rift Labs handles information when you use Ent Feedback.'};
export default function Page(){return <LegalPage kind="privacy"/>;}

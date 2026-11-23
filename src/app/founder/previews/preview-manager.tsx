'use client';
import {useState,useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {newPreview,changePreview} from './actions';
import {boardTemplateIds} from '@/lib/board-templates';

export function PreviewManager({rows}:{rows:{id:string;name:string;prospect:string|null;status:string}[]}){
  const [link,setLink]=useState(''),[message,setMessage]=useState('');
  const [pending,start]=useTransition();
  return <><form className="space-y-3" action={async form=>{
    setLink('');setMessage('');
    try{const r=await newPreview(form);if(r.ok)setLink(r.data);else setMessage(r.error.message);}catch{setMessage('Preview creation failed.');}
  }}><label className="block">Product name<Input name="product" required maxLength={80}/></label><label className="block">Prospect name (optional)<Input name="prospect" maxLength={80}/></label><label className="block">Template <select name="template">{boardTemplateIds.map(id=><option key={id}>{id}</option>)}</select></label><Button type="submit">Create preview</Button></form>
  {link&&<section className="space-y-2"><p>Copy this claim link now. It won’t be shown again.</p><Input aria-label="Claim link" value={link} readOnly/><Button onClick={async()=>{try{await navigator.clipboard.writeText(link);setMessage('Link copied.');}catch{setMessage('Select and copy the link above.');}}}>Copy link</Button></section>}
  <p role="status">{message}</p><h2 className="text-lg font-semibold">Previews</h2>{!rows.length&&<p>No previews yet.</p>}<ul>{rows.map(row=><li className="space-y-2 border-b py-3" key={row.id}><p>{row.name}{row.prospect?' · '+row.prospect:''} — {row.status}</p>{row.status!=='Claimed'&&<div className="flex gap-2">{(['extend','delete'] as const).map(action=><Button key={action} variant="outline" disabled={pending} onClick={()=>{if(action==='delete'&&!confirm('Delete this unclaimed preview?'))return;start(async()=>{try{const r=await changePreview(row.id,action);setMessage(r.ok?'Preview updated.':r.error.message);if(r.ok&&action==='delete')setLink('');}catch{setMessage('Could not update the preview.');}});}}>{action==='extend'?'Extend 7 days':'Delete'}</Button>)}</div>}</li>)}</ul></>;
}

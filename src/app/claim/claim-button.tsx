'use client';
import {useRouter} from 'next/navigation';
import {useState,useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {acceptPreview} from './actions';

export function ClaimButton(){
  const router=useRouter();
  const [pending,start]=useTransition();
  const [error,setError]=useState('');
  return <><Button disabled={pending} onClick={()=>start(async()=>{
    try{
      const result=await acceptPreview();
      if(!result.ok){setError(result.error.message);return;}
      try{localStorage.setItem('ent-active-workspace:'+result.data.user,result.data.id);}catch{}
      router.push('/dashboard/boards');
      router.refresh();
    }catch{setError('Unable to claim this board. Please try again.');}
  })}>{pending?'Claiming…':'Claim this board'}</Button><p role="status">{error}</p></>;
}

'use client';
import * as React from 'react';
import {Calendar} from '@/components/ui/calendar';
import {Popover,PopoverTrigger,PopoverPopup} from '@/components/ui/popover';
import {SelectButton} from '@/components/ui/select';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';

export function formatPublishDate(value:string){
  return new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value));
}

function localDateTime(date:Date,time:string){
  return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')+'T'+time;
}

export function PublishDatePicker({id,value,onChange}:{id:string;value:string;onChange:(value:string)=>void}){
  const [open,setOpen]=React.useState(false);
  const [day,setDay]=React.useState<Date>();
  const [time,setTime]=React.useState('09:00');
  const [hint,setHint]=React.useState('Choose a date and time');
  const timeId=React.useId();
  React.useEffect(()=>{
    let active=true;
    queueMicrotask(()=>{
      if(!active)return;
      const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);tomorrow.setHours(9,0,0,0);
      setHint(formatPublishDate(localDateTime(tomorrow,'09:00')));
    });
    return()=>{active=false;};
  },[]);
  return <Popover open={open} onOpenChange={next=>{
    if(next){setDay(value?new Date(value):undefined);setTime(value?value.slice(11,16):'09:00');}
    setOpen(next);
  }}>
    <PopoverTrigger render={<SelectButton id={id} aria-label="Publish date" className="h-9 w-full text-[13px] shadow-none"/>}>
      <span className={value?'text-foreground':'text-muted-foreground'}>{value?formatPublishDate(value):hint}</span>
    </PopoverTrigger>
    <PopoverPopup data-changelog-control align="end" className="w-[320px] max-w-[calc(100vw-32px)]">
      <Calendar mode="single" selected={day} defaultMonth={value?new Date(value):undefined} onSelect={setDay}/>
      <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
        <label htmlFor={timeId} className="block text-[13px] font-medium">Time</label>
        <Input id={timeId} type="time" value={time} onChange={event=>setTime(event.target.value)} className="h-9 w-full"/>
        <Button type="button" size="sm" className="h-8 w-full text-[13px]" disabled={!day||!/^\d{2}:\d{2}$/.test(time)} onClick={()=>{if(day){onChange(localDateTime(day,time));setOpen(false);}}}>Set date</Button>
      </div>
    </PopoverPopup>
  </Popover>;
}

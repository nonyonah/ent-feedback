'use client';
import {useEffect,useRef} from 'react';
import {useProject} from '@/components/feedback/project-provider';
import {useChatPolling} from '@/lib/chat/client';
import {heartbeatOperatorAction} from '@/server/actions/chat';

export function OperatorPresence(){
 const {project}=useProject();const activity=useRef(0);
 useEffect(()=>{activity.current=Date.now();const active=()=>{activity.current=Date.now();};window.addEventListener('pointerdown',active);window.addEventListener('keydown',active);window.addEventListener('focus',active);window.addEventListener('wheel',active,{passive:true});return()=>{window.removeEventListener('pointerdown',active);window.removeEventListener('keydown',active);window.removeEventListener('focus',active);window.removeEventListener('wheel',active);};},[]);
 useChatPolling(async()=>{if(document.hasFocus()&&Date.now()-activity.current<300000)await heartbeatOperatorAction(project.id);},Boolean(project.id),30000,project.id);
 return null;
}

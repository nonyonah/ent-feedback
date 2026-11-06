"use client";

import * as React from "react";
import {CheckIcon} from "@/components/icons";
import {Field,FieldLabel} from "@/components/ui/field";
import {InputGroup,InputGroupInput,InputGroupAddon} from "@/components/ui/input-group";
import {checkWorkspaceAvailabilityAction} from "@/server/actions/workspaces";
import {defaultWorkspaceBaseDomain,workspaceBaseDomain,validNewWorkspaceDomain} from "@/lib/workspace-domain";

type Availability = {name:string;handle:string;nameAvailable:boolean;handleAvailable:boolean;error?:string};
export function WorkspaceIdentityFields({name,handle,onNameChange,onHandleChange,readOnly=false,idPrefix="workspace"}:{name:string;handle:string;onNameChange:(value:string)=>void;onHandleChange:(value:string)=>void;readOnly?:boolean;idPrefix?:string}) {
  const [result,setResult]=React.useState<Availability|null>(null);
  const nameValid=name.trim().length>=2;
  const domainValid=validNewWorkspaceDomain(handle);
  React.useEffect(()=>{
    if(readOnly||(!nameValid&&!domainValid))return;
    let active=true;
    const timer=setTimeout(()=>{
      void checkWorkspaceAvailabilityAction({name,handle}).then(response=>{
        if(!active)return;
        setResult(response.ok?{name,handle,...response.data}:{name,handle,nameAvailable:false,handleAvailable:false,error:response.error.message});
      }).catch(()=>{if(active)setResult({name,handle,nameAvailable:false,handleAvailable:false,error:"Couldn’t check availability. Please try again."});});
    },400);
    return()=>{active=false;clearTimeout(timer);};
  },[name,handle,nameValid,domainValid,readOnly]);
  // Never display a stale success while a changed value is being checked.
  const checked=result?.name===name&&result.handle===handle?result:null;
  const nameAvailable=readOnly||Boolean(nameValid&&checked?.nameAvailable&&!checked.error);
  const domainAvailable=readOnly||Boolean(domainValid&&checked?.handleAvailable&&!checked.error);
  const suffix=workspaceBaseDomain()??defaultWorkspaceBaseDomain;
  function message(kind:"name"|"domain") {
    if(readOnly)return "";
    if(kind==='name'&&!name.trim())return "Enter your workspace name.";
    if(kind==='domain'&&!handle)return "At least 5 characters. Letters, numbers and dashes.";
    if(kind==='name'&&!nameValid)return "Enter at least 2 characters.";
    if(kind==='domain'&&!domainValid)return handle.length<5?"Use at least 5 characters before the domain suffix.":"Use lowercase letters, numbers and dashes. This domain may be reserved.";
    if(!checked)return "Checking availability…";
    if(checked.error)return checked.error;
    return (kind==='name'?nameAvailable:domainAvailable)?"Available":kind==='name'?"This workspace name is already taken.":"This workspace domain is already taken.";
  }
  return <>
    <Field>
      <FieldLabel htmlFor={`${idPrefix}-name`}>Workspace name</FieldLabel>
      <div className="flex w-full items-center gap-2.5">
      <InputGroup className="flex-1">
        <InputGroupInput id={`${idPrefix}-name`} autoFocus required minLength={2} maxLength={60} value={name} readOnly={readOnly} placeholder="My Product" aria-describedby={`${idPrefix}-name-status`} aria-invalid={nameValid&&checked&&!checked.error&&!nameAvailable?true:undefined} onChange={event=>onNameChange(event.target.value)}/>
      </InputGroup>
      <span className="flex size-5 shrink-0 items-center justify-center">{nameAvailable&&<span role="img" aria-label="Workspace name available" className="flex size-5 items-center justify-center rounded-full bg-green-600 text-white"><CheckIcon className="size-3.5"/></span>}</span>
      </div>
      <p id={`${idPrefix}-name-status`} role="status" className={`text-xs leading-5 ${nameAvailable?'text-green-700 dark:text-green-400':'text-muted-foreground'}`}>{message('name')}</p>
    </Field>
    <Field>
      <FieldLabel htmlFor={`${idPrefix}-domain`}>Workspace domain</FieldLabel>
      <div className="flex w-full items-center gap-2.5">
      <InputGroup className="flex-1">
        <InputGroupInput id={`${idPrefix}-domain`} required minLength={readOnly?2:5} maxLength={40} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={handle} readOnly={readOnly} placeholder="my-product" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby={`${idPrefix}-domain-status`} aria-invalid={domainValid&&checked&&!checked.error&&!domainAvailable?true:undefined} onChange={event=>onHandleChange(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))}/>
        <InputGroupAddon align="inline-end" className="shrink-0 gap-2 text-xs text-muted-foreground"><span>.{suffix}</span></InputGroupAddon>
      </InputGroup>
      <span className="flex size-5 shrink-0 items-center justify-center">{domainAvailable&&<span role="img" aria-label="Workspace domain available" className="flex size-5 items-center justify-center rounded-full bg-green-600 text-white"><CheckIcon className="size-3.5"/></span>}</span>
      </div>
      <p id={`${idPrefix}-domain-status`} role="status" className={`text-xs leading-5 ${domainAvailable?'text-green-700 dark:text-green-400':'text-muted-foreground'}`}>{message('domain')}</p>
    </Field>
  </>;
}

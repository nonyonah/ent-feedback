'use client';
import * as React from 'react';
import styles from './changelog-editor.module.css';
import {changelogBodyMaxLength} from '@/lib/changelog';
import {changelogBlocks,findChangelogCommand,insertChangelogBlock} from '@/lib/changelog-blocks';
import {renderChangelogDocument,serializeChangelogDocument} from '@/lib/changelog-rich-text';

export async function uploadChangelogImage(workspaceId:string,file:File){
  if(file.size>2*1024*1024)throw new Error('Choose an image under 2 MB.');
  const form=new FormData();form.set('workspaceId',workspaceId);form.set('file',file);
  const response=await fetch('/api/changelog/images',{method:'POST',body:form});
  const result=await response.json();
  if(!response.ok||!result.ok)throw new Error(result.error?.message??'Image upload failed. Try again.');
  return result.data as {url:string;width:number;height:number};
}

type Command={element:HTMLElement;start:number;end:number;query:string;top:number;left:number};

export function ChangelogVisualComposer({id,value,onChange,workspaceId,onError,onBusyChange}:{id:string;value:string;onChange:(value:string)=>void;workspaceId:string;onError:(message:string)=>void;onBusyChange:(busy:boolean)=>void}){
  const root=React.useRef<HTMLDivElement>(null);
  const fileInput=React.useRef<HTMLInputElement>(null);
  const lastValue=React.useRef<string|null>(null);
  const insertion=React.useRef<{element:HTMLElement;kind:string}|null>(null);
  const [command,setCommand]=React.useState<Command|null>(null);
  const [selected,setSelected]=React.useState(0);
  const [uploading,setUploading]=React.useState(false);
  const options=changelogBlocks.filter(block=>block.name.toLowerCase().includes(command?.query.toLowerCase()??''));
  const menuId=React.useId();

  React.useLayoutEffect(()=>{
    if(!root.current||value===lastValue.current)return;
    root.current.replaceChildren(renderChangelogDocument(value));
    root.current.dataset.empty=String(!value.trim());
    lastValue.current=value;
  },[value]);

  function commit(){
    const editor=root.current;if(!editor)return;
    const next=serializeChangelogDocument(editor);
    if(next.length>changelogBodyMaxLength){onError('Keep the update under '+changelogBodyMaxLength+' characters.');return;}
    lastValue.current=next;editor.dataset.empty=String(!next.trim());onChange(next);
  }
  function focus(element:HTMLElement,atEnd=true){
    root.current?.focus();const selection=window.getSelection(),range=document.createRange();
    range.selectNodeContents(element);range.collapse(!atEnd);selection?.removeAllRanges();selection?.addRange(range);
  }
  function currentBlock(){
    const selection=window.getSelection();if(!selection?.anchorNode||!root.current?.contains(selection.anchorNode))return null;
    if(selection.anchorNode.nodeType===Node.TEXT_NODE&&selection.anchorNode.parentElement===root.current){
      const text=selection.anchorNode,offset=selection.anchorOffset,paragraph=document.createElement('p');
      root.current.insertBefore(paragraph,text);paragraph.append(text);
      const range=document.createRange();range.setStart(text,Math.min(offset,text.textContent?.length??0));range.collapse(true);selection.removeAllRanges();selection.addRange(range);
    }
    const node=selection.anchorNode.nodeType===Node.TEXT_NODE?selection.anchorNode.parentElement:selection.anchorNode as HTMLElement;
    const element=node?.closest<HTMLElement>('p,h2,h3,li,blockquote,pre,div');
    return element===root.current?root.current.firstElementChild as HTMLElement:element??null;
  }
  function detect(){
    const element=currentBlock(),selection=window.getSelection();
    if(!element||!selection?.rangeCount){setCommand(null);return;}
    const range=selection.getRangeAt(0),prefix=range.cloneRange();prefix.selectNodeContents(element);prefix.setEnd(range.endContainer,range.endOffset);
    const match=findChangelogCommand(prefix.toString(),prefix.toString().length);
    if(!match){setCommand(null);return;}
    const rect=range.getBoundingClientRect(),blockRect=element.getBoundingClientRect(),editorRect=root.current!.getBoundingClientRect();
    setCommand({...match,element,top:(rect.height?rect.bottom:blockRect.bottom)-editorRect.top+8,left:Math.min(Math.max(0,rect.left-editorRect.left),Math.max(0,editorRect.width-288))});setSelected(0);
  }
  function choose(name:string){
    if(!command)return;
    const element=command.element;
    const remaining=insertChangelogBlock(element.textContent??'',command.start,command.end,'').value;
    if(name==='Image'||name==='GIF'){
      insertion.current={element,kind:name};
      if(fileInput.current){fileInput.current.accept=name==='GIF'?'image/gif':'image/png,image/jpeg,image/webp,image/gif';fileInput.current.click();}
      setCommand(null);return;
    }
    let replacement:HTMLElement;
    if(name==='Divider'){
      const divider=document.createElement('hr'),paragraph=document.createElement('p');paragraph.append(document.createElement('br'));
      element.replaceWith(divider,paragraph);focus(paragraph);setCommand(null);commit();return;
    }
    if(name==='Bullet list'||name==='Numbered list'){
      replacement=document.createElement(name==='Bullet list'?'ul':'ol');
      const item=document.createElement('li');item.textContent=remaining;if(!remaining)item.append(document.createElement('br'));replacement.append(item);
    }else if(name==='Code block'){
      replacement=document.createElement('pre');const code=document.createElement('code');code.textContent=remaining;if(!remaining)code.append(document.createElement('br'));replacement.append(code);
    }else{
      replacement=document.createElement(name==='Heading'?'h2':name==='Subheading'?'h3':name==='Quote'?'blockquote':'p');
      replacement.textContent=remaining;if(!remaining)replacement.append(document.createElement('br'));
    }
    if(element.tagName==='LI'){
      element.replaceChildren(replacement);if(element.parentElement?.children.length===1)element.parentElement.replaceWith(replacement);
    }else element.replaceWith(replacement);
    focus(['PRE','UL','OL'].includes(replacement.tagName)?replacement.firstElementChild as HTMLElement:replacement);setCommand(null);commit();
  }

  return <div className="relative min-h-[50svh]">
    <div ref={root} id={id} role="textbox" aria-label="Content" aria-multiline="true" aria-controls={command?menuId:undefined} aria-activedescendant={command&&options.length?menuId+'-'+selected:undefined} contentEditable={!uploading} suppressContentEditableWarning data-placeholder="write or press / for blocks" data-empty="true" className={styles.writing} onInput={()=>{commit();detect();}} onClick={detect} onKeyUp={event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key))detect();}} onBlur={event=>{if(!(event.relatedTarget instanceof Node)||!document.getElementById(menuId)?.contains(event.relatedTarget))setCommand(null);}} onPaste={event=>{
      event.preventDefault();const selection=window.getSelection();if(!selection?.rangeCount)return;
      const range=selection.getRangeAt(0);range.deleteContents();
      const text=document.createTextNode(event.clipboardData.getData('text/plain'));range.insertNode(text);range.setStartAfter(text);range.collapse(true);selection.removeAllRanges();selection.addRange(range);commit();detect();
    }} onKeyDown={event=>{
      if(command){
        if(event.key==='Escape'){event.preventDefault();setCommand(null);return;}
        if(options.length&&(event.key==='ArrowDown'||event.key==='ArrowUp')){event.preventDefault();const next=(selected+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;setSelected(next);document.getElementById(menuId+'-'+next)?.scrollIntoView({block:'nearest',behavior:'instant'});return;}
        if(options.length&&event.key==='Enter'){event.preventDefault();choose(options[selected].name);return;}
      }
      if(event.key==='Enter'&&currentBlock()?.tagName==='PRE'){
        event.preventDefault();const selection=window.getSelection();if(!selection?.rangeCount)return;
        const range=selection.getRangeAt(0),pre=currentBlock()!,code=pre.firstElementChild??pre,newline=document.createTextNode('\n');
        range.deleteContents();range.insertNode(newline);
        const trailing=document.createRange();trailing.setStartAfter(newline);trailing.setEnd(code,code.childNodes.length);
        const next=document.createRange();
        // A trailing newline has no line box, so Chrome puts the caret in front of it; a filler break gives the new line somewhere to sit.
        if(trailing.toString().trim()){next.setStart(newline,1);}
        else{const filler=document.createElement('br');code.append(filler);next.setStartBefore(filler);}
        next.collapse(true);selection.removeAllRanges();selection.addRange(next);commit();return;
      }
      if(event.key==='Enter'&&!event.shiftKey){
        const element=currentBlock();
        if(element&&['H2','H3','BLOCKQUOTE'].includes(element.tagName)){
          event.preventDefault();const paragraph=document.createElement('p'),selection=window.getSelection();
          if(selection?.rangeCount){const current=selection.getRangeAt(0),tail=document.createRange();tail.selectNodeContents(element);tail.setStart(current.endContainer,current.endOffset);paragraph.append(tail.extractContents());}
          if(!paragraph.childNodes.length)paragraph.append(document.createElement('br'));
          element.after(paragraph);focus(paragraph,false);commit();
        }
      }
    }}/>
    {command&&<div style={{top:command.top,left:command.left}} className={styles.blocks+' absolute z-20 w-72 max-w-full rounded-xl bg-background p-1.5 shadow-lg'} onMouseDown={event=>event.preventDefault()}>
      <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">Blocks{command.query?' · '+command.query:''}</p>
      <div id={menuId} role="listbox" aria-label="Blocks" className="max-h-72 overflow-y-auto">
        {options.map((block,index)=><button id={menuId+'-'+index} key={block.name} role="option" aria-selected={selected===index} type="button" className={'flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-2 text-left text-[13px] hover:bg-control-quiet '+(selected===index?'bg-control-quiet':'')} onPointerMove={()=>setSelected(index)} onClick={()=>choose(block.name)}><span>{block.name}</span><span className="text-xs text-muted-foreground">{block.hint}</span></button>)}
        {!options.length&&<p className="p-2 text-xs text-muted-foreground">No matching blocks</p>}
      </div>
    </div>}
    {uploading&&<p role="status" className="text-xs text-muted-foreground">Uploading image…</p>}
    <input ref={fileInput} type="file" hidden aria-label="Upload content image" onChange={async event=>{
      const file=event.target.files?.[0];event.target.value='';const target=insertion.current;if(!file||!target)return;
      setUploading(true);onBusyChange(true);
      try{
        const uploaded=await uploadChangelogImage(workspaceId,file),image=document.createElement('img');
        image.src=uploaded.url;image.alt=target.kind;image.width=uploaded.width;image.height=uploaded.height;image.contentEditable='false';
        const paragraph=document.createElement('p');paragraph.append(document.createElement('br'));target.element.replaceWith(image,paragraph);requestAnimationFrame(()=>focus(paragraph));commit();
      }catch(error){onError(error instanceof Error?error.message:'Image upload failed.');}
      finally{setUploading(false);onBusyChange(false);}
    }}/>
  </div>;
}

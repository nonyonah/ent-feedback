'use client';
import * as React from 'react';
import {Button} from '@/components/ui/button';
import {uploadChangelogImage} from './changelog-visual-composer';
export {ChangelogVisualComposer as ChangelogComposer} from './changelog-visual-composer';

export function ChangelogCover({workspaceId,value,onChange,onError,onBusyChange}:{workspaceId:string;value:string|null;onChange:(value:string|null)=>void;onError:(message:string)=>void;onBusyChange:(busy:boolean)=>void}){
  const input=React.useRef<HTMLInputElement>(null);
  const [uploading,setUploading]=React.useState(false);
  return <div className="mb-6">
    {value&&<img src={value} alt="Post cover" className="mb-3 aspect-[2/1] w-full rounded-lg object-cover"/>}
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" size="sm" className="-ms-2 text-muted-foreground" disabled={uploading} onClick={()=>input.current?.click()}><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" className="size-4"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="m3 14 4-4 3 3 3-5 4 6"/><circle cx="7" cy="7" r="1"/></svg>{uploading?'Uploading…':value?'Change cover':'Add cover'}</Button>
      {value&&<Button type="button" variant="ghost" size="sm" onClick={()=>onChange(null)}>Remove</Button>}
    </div>
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden aria-label="Upload cover image" onChange={async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;setUploading(true);onBusyChange(true);try{const image=await uploadChangelogImage(workspaceId,file);onChange(image.url);}catch(error){onError(error instanceof Error?error.message:'Cover upload failed.');}finally{setUploading(false);onBusyChange(false);}}}/>
  </div>;
}

// Only replace Ent's review action for the exact source message.
export function completedSlackBlocks(blocks:Record<string,unknown>[],messageId:string){
 let changed=false;
 const next=blocks.map(block=>{
  const accessory=block.accessory as {action_id?:string;url?:string}|undefined;
  if(accessory?.action_id!=='ent_chat_review_feature'||!accessory.url)return block;
  let source:string|null;try{source=new URL(accessory.url).searchParams.get('suggest');}catch{return block;}
  if(source!==messageId)return block;
  changed=true;
  return {type:'section',text:{type:'plain_text',text:'✓ Added to board — this feature request is ready for review in Ent.'}};
 });
 return changed?next:null;
}

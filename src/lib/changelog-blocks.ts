export const changelogBlocks=[
  {name:'Text',hint:'Start writing',text:''},
  {name:'Heading',hint:'H2',text:'## '},
  {name:'Subheading',hint:'H3',text:'### '},
  {name:'Bullet list',hint:'Unordered list',text:'- '},
  {name:'Numbered list',hint:'Ordered list',text:'1. '},
  {name:'Quote',hint:'Highlight a thought',text:'> '},
  {name:'Code block',hint:'Code snippet',text:'```\n\n```'},
  {name:'Divider',hint:'Separate sections',text:'---\n\n'},
  {name:'Image',hint:'Upload an image',text:''},
  {name:'GIF',hint:'Upload a GIF',text:''},
] as const;

export function findChangelogCommand(text:string,caret:number){
  const start=text.lastIndexOf('\n',Math.max(0,caret-1))+1;
  const match=/^\/([a-z0-9 ]*)$/i.exec(text.slice(start,caret));
  return match?{start,end:caret,query:match[1]}:null;
}

export function insertChangelogBlock(value:string,start:number,end:number,text:string){
  return {value:value.slice(0,start)+text+value.slice(end),caret:start+(text.startsWith('```\n')?4:text.length)};
}

import {parseChangelogMarkdown,safeChangelogHref,type ChangelogInline} from '@/lib/changelog-markdown';

function inlineNodes(nodes:ChangelogInline[]):Node[]{
  return nodes.map(node=>{
    if(node.type==='text')return document.createTextNode(node.text);
    if(node.type==='image'){
      const image=document.createElement('img');image.src=node.src;image.alt=node.alt;image.contentEditable='false';return image;
    }
    const element=document.createElement(node.type==='strong'?'strong':node.type==='em'?'em':node.type==='code'?'code':'a');
    if(node.type==='link')element.setAttribute('href',node.href);
    if(node.type==='code')element.textContent=node.text;
    else element.append(...inlineNodes(node.children));
    return element;
  });
}

export function renderChangelogDocument(markdown:string):DocumentFragment{
  const fragment=document.createDocumentFragment();
  for(const block of parseChangelogMarkdown(markdown)){
    if(block.type==='divider'){fragment.append(document.createElement('hr'));continue;}
    if(block.type==='list'){
      const list=document.createElement(block.ordered?'ol':'ul');
      for(const item of block.items){const li=document.createElement('li');li.append(...inlineNodes(item));list.append(li);}
      fragment.append(list);continue;
    }
    if(block.type==='code'){
      const pre=document.createElement('pre'),code=document.createElement('code');code.textContent=block.text;
      if(block.language)pre.dataset.language=block.language;
      pre.append(code);fragment.append(pre);continue;
    }
    const element=document.createElement(block.type==='heading'?(block.level===3?'h3':'h2'):block.type==='quote'?'blockquote':'p');
    element.append(...inlineNodes(block.children));fragment.append(element);
  }
  if(!fragment.childNodes.length){const paragraph=document.createElement('p');paragraph.append(document.createElement('br'));fragment.append(paragraph);}
  return fragment;
}

function inlineMarkdown(node:Node):string{
  if(node.nodeType===Node.TEXT_NODE)return node.textContent??'';
  if(!(node instanceof HTMLElement))return '';
  const children=Array.from(node.childNodes).map(inlineMarkdown).join('');
  switch(node.tagName){
    case 'BR':return '\n';
    case 'STRONG':case 'B':return '**'+children+'**';
    case 'EM':case 'I':return '*'+children+'*';
    case 'CODE':return '`'+children+'`';
    case 'A':{const href=safeChangelogHref(node.getAttribute('href')??'');return href?'['+children+']('+href+')':children;}
    case 'IMG':{const src=safeChangelogHref(node.getAttribute('src')??'');return src?'!['+(node.getAttribute('alt')??'Image').replace(/[\[\]]/g,'')+']('+src+')':'';}
    default:return children;
  }
}

function blockMarkdown(node:Node):string{
  if(!(node instanceof HTMLElement))return inlineMarkdown(node);
  const content=Array.from(node.childNodes).map(inlineMarkdown).join('').replace(/\n$/,'');
  switch(node.tagName){
    case 'IMG':return inlineMarkdown(node);
    case 'H1':case 'H2':return '## '+content;
    case 'H3':return '### '+content;
    case 'BLOCKQUOTE':return content.split('\n').map(line=>'> '+line).join('\n');
    case 'PRE':return '```'+(node.dataset.language??'')+'\n'+(node.textContent??'')+'\n```';
    case 'UL':case 'OL':return Array.from(node.children).map((li,index)=>(node.tagName==='UL'?'- ':String(index+1)+'. ')+Array.from(li.childNodes).map(inlineMarkdown).join('')).join('\n');
    case 'HR':return '---';
    case 'DIV':return Array.from(node.children).some(child=>['DIV','P','H2','H3','UL','OL','PRE','BLOCKQUOTE'].includes(child.tagName))?Array.from(node.childNodes).map(blockMarkdown).join('\n\n'):content;
    default:return content;
  }
}

export function serializeChangelogDocument(root:HTMLElement):string{
  return Array.from(root.childNodes).map(blockMarkdown).join('\n\n').trimEnd();
}

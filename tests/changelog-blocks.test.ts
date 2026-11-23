import {test} from 'node:test';
import assert from 'node:assert/strict';
import {changelogBlocks,findChangelogCommand,insertChangelogBlock} from '../src/lib/changelog-blocks';
import {parseChangelogMarkdown} from '../src/lib/changelog-markdown';

test('slash commands only match the current line and preserve surrounding text',()=>{
  const value='Before\n/heading\nAfter';
  const command=findChangelogCommand(value,15)!;
  assert.deepEqual(command,{start:7,end:15,query:'heading'});
  assert.equal(insertChangelogBlock(value,command.start,command.end,'## ').value,'Before\n## \nAfter');
  for(const value of ['https://example.com/','some /text','/not!'])assert.equal(findChangelogCommand(value,value.length),null);
});

test('all ten requested block commands exist',()=>{
  assert.deepEqual(changelogBlocks.map(block=>block.name),['Text','Heading','Subheading','Bullet list','Numbered list','Quote','Code block','Divider','Image','GIF']);
});

test('every text block inserts content that renders as its intended block',()=>{
  const samples={Text:['Notes','paragraph'],Heading:['## Notes','heading'],Subheading:['### Notes','heading'],'Bullet list':['- Notes','list'],'Numbered list':['1. Notes','list'],Quote:['> Notes','quote'],'Code block':['```\nconst x=1;\n```','code'],Divider:['---\n\n','divider']} as const;
  for(const [name,[content,type]] of Object.entries(samples)){
    const block=changelogBlocks.find(block=>block.name===name)!;
    const inserted=insertChangelogBlock('/test',0,5,block.text);
    assert.equal(inserted.value,block.text);
    assert.equal(parseChangelogMarkdown(content)[0].type,type);
    if(name==='Code block')assert.equal(inserted.caret,4);
  }
  const h2=parseChangelogMarkdown('## Notes')[0],h3=parseChangelogMarkdown('### Notes')[0];
  assert.equal(h2.type==='heading'&&h2.level,2);
  assert.equal(h3.type==='heading'&&h3.level,3);
});

test('uploaded image and GIF URLs render as image nodes',()=>{
  for(const alt of ['Image','GIF']){
    const blocks=parseChangelogMarkdown('!['+alt+'](/api/changelog/images/11111111-1111-4111-8111-111111111111)');
    assert.equal(blocks[0].type==='paragraph'&&blocks[0].children[0].type,'image');
  }
});

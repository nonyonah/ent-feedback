import {test} from 'node:test';
import assert from 'node:assert/strict';
import {changelogInputSchema} from '../src/lib/changelog';
import {parseChangelogMarkdown,changelogPlainText} from '../src/lib/changelog-markdown';

test('divider blocks separate paragraphs without entering plain text summaries',()=>{
  const content='Before\n---\nAfter';
  assert.deepEqual(parseChangelogMarkdown(content).map(block=>block.type),['paragraph','divider','paragraph']);
  assert.equal(changelogPlainText(content),'Before After');
});

test('cover images only accept internal changelog upload URLs',()=>{
  const input={title:'Release',body:'Notes'};
  assert.equal(changelogInputSchema.safeParse({...input,coverImage:'/api/changelog/images/11111111-1111-4111-8111-111111111111'}).success,true);
  assert.equal(changelogInputSchema.safeParse({...input,coverImage:null}).success,true);
  for(const coverImage of ['javascript:alert(1)','https://example.com/cover.png','/api/attachments/id']){
    assert.equal(changelogInputSchema.safeParse({...input,coverImage}).success,false);
  }
});

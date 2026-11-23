import assert from 'node:assert/strict';
import {test} from 'node:test';
import {changelogEntryVisibleAt,changelogInputSchema,changelogParagraphs,changelogStatusLabels,formatChangelogDate,groupChangelogByMonth,slugifyChangelogTitle,toChangelogEntry,type ChangelogEntry} from '../src/lib/changelog';
import {changelogPlainText,parseChangelogMarkdown,safeChangelogHref} from '../src/lib/changelog-markdown';
import {analyticsEvents} from '../src/lib/analytics-events';

const row={id:'e1',slug:'launch',title:'Launch',summary:'Ship notes',body:'Body',category:'improvement' as const,status:'published' as const,authorName:'Nonso Onah',authorAvatarUrl:'https://example.com/a.png',publishedAt:new Date('2026-11-02T10:00:00Z'),scheduledFor:null,createdAt:new Date('2026-11-01T10:00:00Z'),updatedAt:new Date('2026-11-02T10:00:00Z')};

test('changelog entries accept 1-120 title, 1-5000 body and a known category',()=>{
 assert.deepEqual(changelogInputSchema.parse({title:'  Faster search  ',body:' Boards load quicker now. '}),{title:'Faster search',body:'Boards load quicker now.',category:'new-feature',feedbackIds:[]});
 assert.equal(changelogInputSchema.parse({title:'Title',body:'Body',category:'bug-fix'}).category,'bug-fix');
 assert.equal(changelogInputSchema.safeParse({title:'Title',body:'Body',category:'release'}).success,false);
 assert.equal(changelogInputSchema.parse({title:'Title',body:'Body',summary:'  One line  '}).summary,'One line');
 assert.equal(changelogInputSchema.safeParse({title:'Title',body:'Body',summary:'y'.repeat(301)}).success,false);
});

test('changelog slugs are generated from titles and stay url safe',()=>{
 assert.equal(slugifyChangelogTitle('Faster board search!'),'faster-board-search');
 assert.equal(slugifyChangelogTitle('  Crème brûlée & friends  '),'creme-brulee-friends');
 assert.equal(slugifyChangelogTitle('***'),'update');
 assert.equal(slugifyChangelogTitle('x'.repeat(120)).length,80);
});

test('changelog bodies render as plain-text paragraphs',()=>{
 assert.deepEqual(changelogParagraphs('Shipped search.\n\nFaster boards.\n\n\n  Fewer bugs.  '),['Shipped search.','Faster boards.','Fewer bugs.']);
 assert.deepEqual(changelogParagraphs('One line\nwraps inside the paragraph.'),['One line\nwraps inside the paragraph.']);
 assert.deepEqual(changelogParagraphs('<script>alert(1)</script>'),['<script>alert(1)</script>']);
});

test('markdown keeps headings, lists, quotes and code blocks as blocks',()=>{
 const blocks=parseChangelogMarkdown('# Notes\n\nIntro **bold** and *soft*.\n\n- one\n- two\n\n1. first\n\n> quoted\n\n```ts\nconst a=1;\n```');
 assert.deepEqual(blocks.map(block=>block.type),['heading','paragraph','list','list','quote','code']);
 assert.equal(blocks[0].type==='heading'&&blocks[0].level,1);
 assert.equal(blocks[4].type==='quote'&&blocks[4].children[0].type,'text');
 assert.equal(blocks[5].type==='code'&&blocks[5].text,'const a=1;');
});

test('markdown only links to safe targets',()=>{
 assert.equal(safeChangelogHref('https://example.com/a'),'https://example.com/a');
 assert.equal(safeChangelogHref('/items/abc'),'/items/abc');
 assert.equal(safeChangelogHref('javascript:alert(1)'),null);
 assert.equal(safeChangelogHref('//evil.example.com'),null);
 const blocks=parseChangelogMarkdown('[click](javascript:alert(1)) ![x](javascript:1)');
 assert.equal(blocks[0].type==='paragraph'&&blocks[0].children.some(node=>node.type==='link'),false);
 assert.equal(changelogPlainText('# Title\n\nBody **text**.'.replace(/\*\*/g,'')),'Title Body text.');
});

test('changelog rows serialize status, links and publication state for the client',()=>{
 const entry=toChangelogEntry({...row,feedback:[{id:'f1',title:'Dark mode',status:'shipped',votes:12}]});
 assert.equal(entry.publishedAt,'2026-11-02T10:00:00.000Z');
 assert.equal(entry.status,'published');
 assert.equal(entry.slug,'launch');
 assert.deepEqual(entry.author,{name:'Nonso Onah',avatarUrl:'https://example.com/a.png'});
 assert.equal(entry.feedback.length,1);
 assert.equal(entry.feedback[0].votes,12);
 assert.equal(toChangelogEntry({...row,id:'e2',authorName:null,authorAvatarUrl:null,publishedAt:null,status:'draft'}).publishedAt,null);
 assert.equal(toChangelogEntry({...row,id:'e3',authorName:null,authorAvatarUrl:null,publishedAt:null,status:'draft'}).author,null);
 assert.equal(formatChangelogDate('2026-11-02T23:30:00Z'),'November 2, 2026');
});

test('changelog entries group by month, newest first',()=>{
 const make=(slug:string,when:string):ChangelogEntry=>toChangelogEntry({...row,id:slug,slug,publishedAt:new Date(when)});
 const months=groupChangelogByMonth([make('c','2026-11-18T09:00:00Z'),make('b','2026-11-12T09:00:00Z'),make('a','2026-10-24T09:00:00Z')]);
 assert.deepEqual(months.map(month=>month.label),['November 2026','October 2026']);
 assert.deepEqual(months[0].entries.map(entry=>entry.slug),['c','b']);
 assert.deepEqual(months[1].entries.map(entry=>entry.slug),['a']);
});

test('scheduled entries stay hidden until their publication time',()=>{
 const now=new Date('2026-11-20T10:00:00Z');
 assert.equal(changelogEntryVisibleAt({status:'published',publishedAt:'2026-11-20T09:00:00.000Z'},now),true);
 assert.equal(changelogEntryVisibleAt({status:'published',publishedAt:'2026-11-20T11:00:00.000Z'},now),false);
 assert.equal(changelogEntryVisibleAt({status:'scheduled',publishedAt:'2026-11-20T09:00:00.000Z'},now),false);
 assert.equal(changelogEntryVisibleAt({status:'draft',publishedAt:null},now),false);
 assert.deepEqual(Object.values(changelogStatusLabels),['Draft','Scheduled','Published']);
});

test('changelog publishing has an analytics event',()=>{
 assert.ok(analyticsEvents.includes('changelog_published' as typeof analyticsEvents[number]));
});

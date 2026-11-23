import assert from 'node:assert/strict';
import {test} from 'node:test';
import {changelogInputSchema,changelogParagraphs,formatChangelogDate,toChangelogEntry} from '../src/lib/changelog';
import {analyticsEvents} from '../src/lib/analytics-events';

test('changelog entries accept 1-120 title and 1-5000 body characters',()=>{
 assert.deepEqual(changelogInputSchema.parse({title:'  Faster search  ',body:' Boards load quicker now. '}),{title:'Faster search',body:'Boards load quicker now.'});
 assert.equal(changelogInputSchema.safeParse({title:'   ',body:'Body'}).success,false);
 assert.equal(changelogInputSchema.safeParse({title:'x'.repeat(120),body:'Body'}).success,true);
 assert.equal(changelogInputSchema.safeParse({title:'x'.repeat(121),body:'Body'}).success,false);
 assert.equal(changelogInputSchema.safeParse({title:'Title',body:''}).success,false);
 assert.equal(changelogInputSchema.safeParse({title:'Title',body:'y'.repeat(5000)}).success,true);
 assert.equal(changelogInputSchema.safeParse({title:'Title',body:'y'.repeat(5001)}).success,false);
});

test('changelog bodies render as plain-text paragraphs',()=>{
 assert.deepEqual(changelogParagraphs('Shipped search.\n\nFaster boards.\n\n\n  Fewer bugs.  '),['Shipped search.','Faster boards.','Fewer bugs.']);
 assert.deepEqual(changelogParagraphs('One line\nwraps inside the paragraph.'),['One line\nwraps inside the paragraph.']);
 assert.deepEqual(changelogParagraphs('<script>alert(1)</script>'),['<script>alert(1)</script>']);
});

test('changelog rows serialize publication state for the client',()=>{
 const published=toChangelogEntry({id:'e1',title:'Launch',body:'Body',publishedAt:new Date('2026-11-02T10:00:00Z'),createdAt:new Date('2026-11-01T10:00:00Z'),updatedAt:new Date('2026-11-02T10:00:00Z')});
 assert.equal(published.publishedAt,'2026-11-02T10:00:00.000Z');
 assert.equal(published.updatedAt,'2026-11-02T10:00:00.000Z');
 assert.equal(toChangelogEntry({...published,id:'e2',publishedAt:null,createdAt:new Date(published.createdAt),updatedAt:new Date(published.updatedAt)}).publishedAt,null);
 assert.equal(formatChangelogDate('2026-11-02T23:30:00Z'),'November 2, 2026');
});

test('changelog publishing has an analytics event',()=>{
 assert.ok(analyticsEvents.includes('changelog_published' as typeof analyticsEvents[number]));
});

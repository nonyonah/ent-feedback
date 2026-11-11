import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyticsPage,safeAnalyticsProperties} from '../src/lib/analytics-events';
test('analytics groups paths without sending tenant, post IDs, or queries',()=>{
 assert.equal(analyticsPage('/p/private-workspace/items/secret-post'),'feedback_detail');
 assert.equal(analyticsPage('/p/private-workspace/boards/private-board'),'public_board');
 assert.equal(analyticsPage('/dashboard/settings/billing'),'settings');
 assert.equal(analyticsPage('/embed/anything'),null);
 assert.equal(analyticsPage('/widget-preview'),null);
});
test('analytics rejects content and automatic URL metadata, allowing only bounded properties',()=>{
 assert.deepEqual(safeAnalyticsProperties({page:'dashboard',surface:'dashboard',feedback_type:'bug',has_attachment:true,is_reply:false,active:true,interval:'monthly',title:'private feedback',email:'private@example.test',workspace_id:'secret',description:'private',images:['private-url'],token:'secret','$current_url':'https://test/?email=private','$referrer':'https://private'}),{page:'dashboard',surface:'dashboard',feedback_type:'bug',has_attachment:true,is_reply:false,active:true,interval:'monthly'});
 assert.deepEqual(safeAnalyticsProperties({page:'private',surface:'secret',feedback_type:'private',interval:'secret',active:'yes'}),{});
});

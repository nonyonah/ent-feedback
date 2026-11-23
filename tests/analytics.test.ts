import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyticsEvents,analyticsPage,safeAnalyticsProperties} from '../src/lib/analytics-events';
test('analytics groups paths without sending tenant, post IDs, or queries',()=>{
 assert.equal(analyticsPage('/private-workspace/items/secret-post'),null);
 assert.equal(analyticsPage('/private-workspace/changelog/update'),null);
 assert.equal(analyticsPage('/p/private-workspace/items/secret-post'),null);
  assert.equal(analyticsPage('/p/private-workspace/boards/private-board'),null);
  assert.equal(analyticsPage('/boards'),null);
  assert.equal(analyticsPage('/boards/public-board'),null);
  assert.equal(analyticsPage('/roadmap'),null);
  assert.equal(analyticsPage('/roadmap/public'),null);
  assert.equal(analyticsPage('/dashboard/settings/billing'),'settings');
 assert.equal(analyticsPage('/embed/anything'),null);
 assert.equal(analyticsPage('/widget-preview'),null);
 assert.equal(analyticsPage('/api/public/events'),null);
});
test('analytics rejects content and automatic URL metadata, allowing only bounded properties',()=>{
 assert.deepEqual(safeAnalyticsProperties({page:'dashboard',surface:'dashboard',source:'widget',feedback_type:'bug',has_attachment:true,has_screenshot:true,is_reply:false,active:true,is_external:true,interval:'monthly',method:'google',type:'slack',from:'open',to:'shipped',action:'reorder',origin_domain:'customer.example.com',title:'private feedback',email:'private@example.test',workspace_id:'secret',description:'private',images:['private-url'],token:'secret','$current_url':'https://test/?email=private','$referrer':'https://private'}),{page:'dashboard',surface:'dashboard',source:'widget',feedback_type:'bug',has_attachment:true,has_screenshot:true,is_reply:false,active:true,is_external:true,interval:'monthly',method:'google',type:'slack',from:'open',to:'shipped',action:'reorder',origin_domain:'customer.example.com'});
 assert.deepEqual(safeAnalyticsProperties({page:'private',surface:'secret',source:'secret',feedback_type:'private',interval:'secret',active:'yes',origin_domain:'javascript:alert(1)'}),{});
});
test('analytics event allowlist covers product and widget events',()=>{
 for(const event of ['signed_up','board_created','integration_enabled','status_changed','item_shipped','roadmap_edited','widget_loaded','widget_opened','widget_first_loaded','feedback_submitted','comment_added','vote_cast','roadmap_viewed','chat_started','chat_escalated','quick_tour_started','quick_tour_completed','quick_tour_skipped','docs_link_clicked'])assert.ok(analyticsEvents.includes(event as typeof analyticsEvents[number]));
});

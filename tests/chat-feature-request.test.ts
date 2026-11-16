import assert from 'node:assert/strict';
import {test} from 'node:test';
import {featureRequestSuggestion} from '../src/lib/chat/feature-request';
test('explicit product ideas become reviewable drafts without AI',()=>{
 for(const body of ['Please add CSV exports to the dashboard.','Could you support dark mode?','Feature request: a calendar view.','We would love a searchable inbox.']){
  const idea=featureRequestSuggestion(body);assert.ok(idea,body);assert.equal(idea.description,body);assert.ok(idea.title.length>=4&&idea.title.length<=160);
 }
 assert.equal(featureRequestSuggestion('Hello, can you help me sign in?'),null);
 assert.equal(featureRequestSuggestion('My payment is not working.'),null);
 assert.equal(featureRequestSuggestion("Please do not add this feature."),null);
 assert.equal(featureRequestSuggestion('Thanks!'),null);
 assert.ok(featureRequestSuggestion('Please add '+ 'export '.repeat(600))!.description.length<=3000);
});

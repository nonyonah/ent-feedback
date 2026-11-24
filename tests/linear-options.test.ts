import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadLinearTeams} from '@/server/connected-apps/linear';

test('loads Linear teams and workflow states across small pages',async()=>{
 const original=globalThis.fetch;const requests:string[]=[];
 globalThis.fetch=async(_input,init)=>{
  const {query,variables}=JSON.parse(String(init?.body));requests.push(query);
  const pageInfo=(hasNextPage:boolean,endCursor:string|null)=>({hasNextPage,endCursor});
  if(query.includes('EntTeams'))return Response.json({data:{teams:variables.after?{nodes:[{id:'team-2',name:'Second',states:{nodes:[],pageInfo:pageInfo(false,null)}}],pageInfo:pageInfo(false,null)}:{nodes:[{id:'team-1',name:'First',states:{nodes:[{id:'state-1',name:'Open',type:'unstarted'}],pageInfo:pageInfo(true,'states-1')}}],pageInfo:pageInfo(true,'teams-1')}}});
  assert.equal(variables.id,'team-1');assert.equal(variables.after,'states-1');
  return Response.json({data:{team:{states:{nodes:[{id:'state-2',name:'Done',type:'completed'}],pageInfo:pageInfo(false,null)}}}});
 };
 try{const teams=await loadLinearTeams('test');assert.deepEqual(teams.map(team=>team.id),['team-1','team-2']);assert.deepEqual(teams[0].states.nodes.map(state=>state.id),['state-1','state-2']);assert.equal(requests.length,3);assert.match(requests[0],/teams\(first:10/);assert.match(requests[0],/states\(first:50/);}finally{globalThis.fetch=original;}
});

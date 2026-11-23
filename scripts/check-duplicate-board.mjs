import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {createRequire} from "node:module";
import {build} from "esbuild";
import {drizzle} from "drizzle-orm/node-postgres";
import {Client} from "pg";

if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to a migrated test database.");
const client = new Client({connectionString: process.env.DATABASE_URL});
const events = [];
const actorId = randomUUID();
const compiled = await build({
  entryPoints: ["src/server/actions/duplicate-board.ts"], bundle: true, write: false,
  platform: "node", packages: "external", format: "cjs",
  plugins: [{name: "action-boundaries", setup(b) {
    b.onResolve({filter: /^(server-only|@\/server\/(auth|db\/client)|@\/lib\/analytics\/server)$/},
      args => ({path: args.path, namespace: "boundary"}));
    b.onLoad({filter: /.*/, namespace: "boundary"}, ({path}) => ({contents:
      path === "server-only" ? "" : path.endsWith("/auth") ? "export const requireAppUser=async()=>actor;" :
      path.endsWith("/client") ? "export const getDb=()=>database;" :
      "export const trackServerAnalytics=(event)=>events.push(event);"}));
  }}],
});
const out = {exports: {}};
await client.connect();
try {
  await drizzle(client).transaction(async tx => {
    Function("require","module","actor","database","events",compiled.outputFiles[0].text)(
      createRequire(import.meta.url), out, {id: actorId}, tx, events);
    const wid = randomUUID(), bid = randomUUID(), post = randomUUID(), comment = randomUUID();
    const q = (statement, params) => client.query(statement, params).then(result => result.rows);
    await q("insert into users(id,clerk_user_id) values($1,$2)", [actorId,"duplicate-" + actorId]);
    await q("insert into workspaces(id,handle,name) values($1,$2,'Example')", [wid, "fixture-" + wid]);
    await q("insert into workspace_members(workspace_id,user_id,role,status) values($1,$2,'owner','active')", [wid,actorId]);
    await q("insert into boards(id,workspace_id,handle,name,color,emoji,description) values($1,$2,'source','Source','#123456','S','Settings')", [bid,wid]);
    await q("insert into widget_settings(workspace_id,board_id,greeting) values($1,$2,'Welcome!')", [wid,bid]);
    await q("insert into feedback(id,workspace_id,board_id,title,body,author_user_id,starting_votes) values($1,$2,$3,'Item','Text',$4,4)", [post,wid,bid,actorId]);
    await q("insert into feedback(workspace_id,board_id,title,deleted_at) values($1,$2,'Deleted',now())", [wid,bid]);
    await q("insert into votes(workspace_id,feedback_id,user_id) values($1,$2,$3)", [wid,post,actorId]);
    await q("insert into comments(id,workspace_id,feedback_id,body,guest_name,guest_email) values($1,$2,$3,'Comment','Visitor','visitor@example.test')", [comment,wid,post]);
    await q("insert into comments(workspace_id,feedback_id,parent_comment_id,body,author_user_id) values($1,$2,$3,'Reply',$4)", [wid,post,comment,actorId]);
    const copy = (copyItems,copyEngagement,source = bid) => out.exports.duplicateBoardAction(wid,source,{name:"Source",copyItems,copyEngagement});
    assert.equal((await copy(false,true)).error.code,"validation");
    assert.equal((await copy(false,false,randomUUID())).error.code,"not_found");
    for (const [items,engagement] of [[false,false],[true,false],[true,true]]) {
      const result = await copy(items,engagement);
      assert.ok(result.ok, JSON.stringify(result));
      const {id,slug,color,emoji,description} = result.data;
      assert.notEqual(id,bid);
      assert.deepEqual([slug,color,emoji,description],["source-2","#123456","S","Settings"]);
      assert.equal((await q("select greeting from widget_settings where board_id=$1",[id]))[0].greeting,"Welcome!");
      const posts = await q("select * from feedback where board_id=$1",[id]);
      assert.equal(posts.length,Number(items));
      if (items) {
        const copied = posts[0];
        assert.notEqual(copied.id,post);
        assert.deepEqual([copied.title,copied.body,copied.author_user_id,copied.guest_email,copied.starting_votes],["Item","Text",null,null,engagement?5:0]);
        assert.equal((await q("select id from votes where feedback_id=$1",[copied.id])).length,0);
        const replies = await q("select * from comments where feedback_id=$1 order by body",[copied.id]);
        assert.equal(replies.length,engagement?2:0);
        if (engagement) {
          assert.equal(replies[1].parent_comment_id,replies[0].id);
          assert.deepEqual(replies.map(r=>[r.body,r.author_user_id,r.guest_name,r.guest_email]),[["Comment",null,null,null],["Reply",null,null,null]]);
        }
      }
      assert.equal((await copy(false,false)).error.code,"forbidden");
      await q("delete from boards where id=$1",[id]);
    }
    await q("update workspace_members set role='member' where workspace_id=$1",[wid]);
    assert.equal((await copy(true,true)).error.code,"forbidden");
    assert.deepEqual(events,Array(3).fill("board_duplicated"));
    tx.rollback();
  });
} catch (err) {
  if (err.constructor.name !== "TransactionRollbackError") throw err;
} finally { await client.end(); }
console.log("PASS board duplication: settings, all copy modes, privacy, reply mapping, limits, authorization and analytics.");

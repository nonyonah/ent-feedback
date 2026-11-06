import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import esbuild from 'esbuild';
import { PgDialect } from 'drizzle-orm/pg-core';
const loadModule = createRequire(import.meta.url);
const output = join(mkdtempSync(join(tmpdir(), 'ent-boards-')), 'actions.cjs');
const wid = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const dialect = new PgDialect();
const state = { boards: [], workspaces: [{ id: wid }, { id: other }], writes: 0, checks: [], locks: 0 };
function matches(row, predicate) {
  const { sql, params } = dialect.sqlToQuery(predicate);
  const columns = [...sql.matchAll(/"(?:boards|workspaces)"\."([^"]+)"\s*=\s*\$\d+/g)].map(m => m[1]);
  assert.equal(columns.length, params.length, sql);
  return columns.every((column, i) => row[column === 'workspace_id' ? 'workspaceId' : column] === params[i]);
}
function project(row, fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, column]) => [key, row[column.name === 'workspace_id' ? 'workspaceId' : column.name]]));
}
const db = {
  select(fields) { return { from(table) { const rows = () => table.id.table[Symbol.for('drizzle:Name')] === 'boards' ? state.boards : state.workspaces; return { where(predicate) { const result = () => rows().filter(r => matches(r, predicate)).map(r => project(r, fields)); return { then: (resolve, reject) => Promise.resolve(result()).then(resolve, reject), for: async mode => { assert.equal(mode, 'update'); state.locks++; return result(); }, orderBy: async () => result().sort((a, b) => state.boards.find(r => r.id === a.id).position - state.boards.find(r => r.id === b.id).position) }; } }; } }; },
  insert() { return { values(value) { return { returning: async fields => { const row = { ...value, id: `33333333-3333-4333-8333-${String(state.boards.length + 1).padStart(12, '0')}` }; state.boards.push(row); state.writes++; return [project(row, fields)]; } }; } }; },
  update() { return { set(value) { return { where(predicate) { const apply = () => { state.writes++; if (state.failWrite === state.writes) throw Error('Simulated DB write failure'); return state.boards.filter(row => matches(row, predicate)).map(row => Object.assign(row, value)); }; return { then: (resolve, reject) => Promise.resolve().then(apply).then(resolve, reject), returning: async fields => apply().map(row => project(row, fields)) }; } }; } }; },
  async transaction(fn) { const before = structuredClone(state.boards); try { return await fn(db); } catch (error) { state.boards = before; throw error; } },
};
globalThis.boardTest = { db, state, role: 'admin', authenticated: true };
await esbuild.build({ entryPoints: ['src/server/actions/boards.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: output, plugins: [{ name: 'boundaries', setup(b) {
  b.onResolve({ filter: /^(server-only|@\/server\/(auth|db\/client|services\/access))$/ }, a => ({ path: a.path, namespace: 'mock' }));
  b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ loader: 'js', resolveDir: process.cwd(), contents: a.path === 'server-only' ? '' : a.path.endsWith('/auth') ? `import {ServiceError} from '${process.cwd()}/src/server/result';export async function requireAppUser(){if(!global.boardTest.authenticated)throw new ServiceError('unauthenticated','Sign in.');return {id:'actor'}}` : a.path.endsWith('/access') ? `import {ServiceError} from '${process.cwd()}/src/server/result';export async function requireWorkspaceRole(db,input){global.boardTest.state.checks.push(input);if(global.boardTest.role==='member')throw new ServiceError('forbidden','Admin required.');}` : 'export const getDb=()=>global.boardTest.db;' }));
} }] });
const actions = loadModule(output);
const first = await actions.createBoardAction(wid, { name: '  Feature request  ', color: '#6247aa', emoji: '🚀' });
assert.ok(first.ok); assert.equal(first.data.name, 'Feature request'); assert.equal(first.data.slug, 'feature-request'); assert.equal(first.data.emoji, '🚀');
const second = await actions.createBoardAction(wid, { name: 'Feature request', color: '#737373' });
assert.ok(second.ok); assert.equal(second.data.slug, 'feature-request-2');
assert.ok((await actions.createBoardAction(other, { name: 'Feature request', color: '#737373' })).ok);
assert.equal(state.boards.at(-1).handle, 'feature-request');
for (const name of ['A', '你好', 'a'.repeat(60)]) {
 const result = await actions.createBoardAction(other, { name, color: '#737373' });
 assert.ok(result.ok); assert.ok(result.data.slug.length >= 2 && result.data.slug.length <= 64);
}
let before = state.writes;
assert.equal((await actions.createBoardAction(wid, { name: ' ', color: '#6247aa' })).ok, false);
assert.equal((await actions.createBoardAction(wid, { name: 'Valid', color: 'red' })).ok, false);
assert.equal(state.writes, before);
const renamed = await actions.renameBoardAction(wid, first.data.id, 'Renamed');
assert.ok(renamed.ok); assert.equal(renamed.data.slug, first.data.slug);
assert.equal((await actions.renameBoardAction(other, first.data.id, 'Hijacked')).error.code, 'not_found');
const ids = [second.data.id, first.data.id];
assert.ok((await actions.reorderBoardsAction(wid, ids)).ok);
assert.equal(state.boards.find(row => row.id === second.data.id).position, 0);
before = state.writes;
for (const invalid of [[ids[0]], [ids[0], ids[0]], [ids[0], state.boards.find(row => row.workspaceId === other).id]]) assert.equal((await actions.reorderBoardsAction(wid, invalid)).ok, false);
assert.equal(state.writes, before);
const snapshot = structuredClone(state.boards);state.failWrite = state.writes + 2;
const oldError = console.error;console.error = () => {};
assert.equal((await actions.reorderBoardsAction(wid, ids.toReversed())).ok, false);
assert.deepEqual(state.boards, snapshot);state.failWrite = undefined;
for (const role of ['member', 'anonymous']) {
 globalThis.boardTest.role = role;globalThis.boardTest.authenticated = role !== 'anonymous';before = state.writes;
 for (const call of [() => actions.createBoardAction(wid, { name: 'No access', color: '#737373' }), () => actions.renameBoardAction(wid, ids[0], 'No access'), () => actions.reorderBoardsAction(wid, ids)]) assert.equal((await call()).ok, false);
 assert.equal(state.writes, before);
}
console.error = oldError;
assert.ok(state.checks.every(check => check.userId === 'actor' && check.minimumRole === 'admin'));
assert.ok(state.locks > 0);
console.log('PASS board actions: actor-bound admin checks, validation, unique scoped handles, stable rename URLs, cross-workspace isolation, exact reorder membership, rollback on partial write failure. In-memory DB boundary; PostgreSQL lock behavior not integration-tested.');

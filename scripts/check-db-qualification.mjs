// Read-only application-schema regression. No user data is printed or modified.
import assert from 'node:assert/strict';import {config} from 'dotenv';import {Client} from 'pg';import {drizzle} from 'drizzle-orm/node-postgres';import {getTableConfig} from 'drizzle-orm/pg-core';
import {users,workspaces,chatSettings} from '../src/server/db/schema.ts';
import {databaseConnectionUrl} from '../src/server/db/connection.ts';
config({path:'.env.local',quiet:true});
assert.equal(new URL(databaseConnectionUrl('postgres://fixture:fixture@example.test/db?sslmode=require')).searchParams.get('sslmode'),'verify-full');
assert.equal(getTableConfig(users).schema,'public');
const client=new Client({connectionString:databaseConnectionUrl(process.env.DATABASE_URL,{direct:true}),connectionTimeoutMillis:30000});
try{await client.connect();await client.query('begin');await client.query('set local search_path to pg_catalog');const db=drizzle(client);await db.select({id:users.id}).from(users).limit(1);await db.select({id:workspaces.id}).from(workspaces).limit(1);await db.select({id:chatSettings.workspaceId}).from(chatSettings).limit(1);await client.query('rollback');console.log('PASS: account, workspace and chat queries resolve public tables even with an incompatible search_path; TLS aliases preserve certificate verification.');}catch(e){console.error('Schema qualification check failed:',e.cause?.code??e.code??e.name);process.exitCode=1;}finally{await client.end();}

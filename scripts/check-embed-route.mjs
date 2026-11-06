import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import esbuild from 'esbuild';
import {createRequire} from 'node:module';
const loadModule = createRequire(import.meta.url);

async function run() {
  const output = join(mkdtempSync(join(tmpdir(), 'ent-embed-check-')), 'page.cjs');
  await esbuild.build({
    entryPoints: ['src/app/embed/page.tsx'], outfile: output,
    bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic',
    plugins: [{name:'embed-fixtures', setup(build) {
      build.onResolve({filter:/^(next\/navigation|@\/server\/public-workspace|@\/components\/feedback\/(public-workspace-boundary|embedded-board))$/}, args=>({path:args.path,namespace:'fixture'}));
      build.onLoad({filter:/.*/,namespace:'fixture'}, args=>({loader:'js',contents:
        args.path==='next/navigation' ? `export function notFound(){throw new Error('404')}` :
        args.path.endsWith('public-workspace') ? `export async function getPublicWorkspace(handle){global.embedLookups.push(handle);return handle==='acme-feedback'?global.embedWorkspace:null}` :
        args.path.endsWith('public-workspace-boundary') ? `export function PublicWorkspaceBoundary(){return null}` :
        `export function EmbeddedBoard(){return null}`
      }));
    }}]
  });
  const {default:Page} = loadModule(output);
  global.embedLookups = [];
  global.embedWorkspace = {
    project:{id:'tenant-id',name:'Acme',slug:'acme-feedback'},
    boards:[{id:'bugs-id',slug:'bugs'}],
    widget:{enabled:false,greeting:'Workspace-specific greeting'}
  };
  const result = await Page({searchParams:Promise.resolve({project:'acme-feedback',board:'bugs'})});
  assert.deepEqual(global.embedLookups,['acme-feedback']);
  assert.equal(result.props.project.id,'tenant-id');
  assert.deepEqual(result.props.widget,global.embedWorkspace.widget);
  assert.equal(result.props.children.props.boardSlug,'bugs');
  await assert.rejects(()=>Page({searchParams:Promise.resolve({project:'unknown-workspace'})}),/404/);
  const before = global.embedLookups.length;
  const missing = await Page({searchParams:Promise.resolve({})});
  assert.equal(missing.type,'main');
  assert.equal(global.embedLookups.length,before);
  console.log('PASS embed route: resolves requested tenant, passes saved widget settings and requested board, rejects unknown tenants, and handles a missing tenant without loading a default workspace. Mock lookup only.');
}
run().catch(error=>{console.error(error);process.exit(1)});

import {createRequire} from 'node:module';
const loadModule=createRequire(import.meta.url);
// Opt-in live test. Requires a local production server, PostgreSQL, R2 and Playwright.
const {chromium}=loadModule(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.LOCAL_APP_URL||'http://localhost:3100';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Run this fixture test against a local app server.');
const {config}=loadModule(process.cwd()+'/node_modules/dotenv');config({path:'.env.local',quiet:true});
const esbuild=loadModule(process.cwd()+'/node_modules/esbuild');const fs=loadModule('node:fs'),os=loadModule('node:os'),path=loadModule('node:path'),assert=loadModule('node:assert/strict');
(async()=>{
 const output=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'ent-live-public-')),'fixture.cjs');
 const entry=`import {randomUUID} from 'node:crypto';import {eq} from 'drizzle-orm';import {getDb,closeDb} from './src/server/db/client';import {workspaces,boards,attachments,feedback} from './src/server/db/schema';import {deleteImage} from './src/server/storage';let workspaceId;export async function setup(){const handle='browser-check-'+randomUUID();const [workspace]=await getDb().insert(workspaces).values({name:handle,handle}).returning();workspaceId=workspace.id;await getDb().insert(boards).values({workspaceId,name:'Test feedback',handle:'product'});return handle;}export async function verify(title){const posts=await getDb().select().from(feedback).where(eq(feedback.workspaceId,workspaceId));if(posts.length!==1||posts[0].title!==title)throw Error('Unexpected saved feedback');const images=await getDb().select().from(attachments).where(eq(attachments.workspaceId,workspaceId));if(images.length!==1||images[0].status!=='attached')throw Error('Attachment not persisted');}export async function cleanup(){try{if(workspaceId){const images=await getDb().select().from(attachments).where(eq(attachments.workspaceId,workspaceId));for(const image of images)await deleteImage(image.storageKey);await getDb().delete(workspaces).where(eq(workspaces.id,workspaceId));}}finally{await closeDb();}}`;
 await esbuild.build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,packages:'external',platform:'node',format:'cjs',outfile:output,banner:{js:`require=require('node:module').createRequire(${JSON.stringify(path.join(process.cwd(),'package.json'))});`},plugins:[{name:'marker',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'',loader:'js'}));}}]});
 const fixture=loadModule(output);let browser;let verified=false;
 try{
  const handle=await fixture.setup();browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(60000);
  await page.goto(base+'/p/'+handle+'/boards/product',{waitUntil:'domcontentloaded',timeout:120000});
  await page.getByRole('button',{name:'Submit feedback',exact:true}).first().click();const title='Live guest image feedback';await page.getByRole('textbox',{name:'Submission title',exact:true}).fill(title);await page.getByRole('textbox',{name:'Add details',exact:true}).fill('Verifying the actual server and object storage.');
  const sharp=loadModule(process.cwd()+'/node_modules/sharp');const image=await sharp({create:{width:2,height:2,channels:3,background:'#6247aa'}}).png().toBuffer();await page.getByLabel('Attachment files',{exact:true}).setInputFiles({name:'test.png',mimeType:'image/png',buffer:image});
  await page.getByRole('button',{name:'Create',exact:true}).click();await page.getByText('Your idea is on the board.',{exact:true}).waitFor();await fixture.verify(title);
  await page.getByRole('button',{name:'Back to feedback',exact:true}).click();await page.getByRole('link',{name:title,exact:true}).first().click();await page.getByRole('heading',{name:title,exact:true}).waitFor();await page.reload();await page.getByRole('heading',{name:title,exact:true}).waitFor();
  const attachment=page.locator('img[src*="/api/attachments/"]').first();await attachment.waitFor();await page.waitForFunction(()=>Array.from(document.images).some(img=>img.src.includes('/api/attachments/')&&img.complete&&img.naturalWidth>0));
  const comment=page.getByRole('textbox',{name:'Add a comment',exact:true});await comment.fill('Live guest comment');await page.getByRole('button',{name:'Comment',exact:true}).click();await page.getByText('Live guest comment',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);verified=true;
 }finally{if(browser)await browser.close();await fixture.cleanup();}
 if(verified)console.log('PASS live guest browser: actual public board, feedback with R2 image, persisted reload, served image and comment. Fixture workspace and objects cleaned up. No email recipients or Clerk accounts created.');
})().catch(error=>{console.error('Live public browser check failed:',error.message);process.exitCode=1});

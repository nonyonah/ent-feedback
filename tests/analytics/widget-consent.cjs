/* Runs against a local fixture; no requests are sent to a real analytics provider. */
const assert=require('node:assert/strict');const http=require('node:http');const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const received=[];const script=fs.readFileSync('public/widget.js');
 const server=http.createServer((req,res)=>{
  if(req.url==='/widget.js'){res.writeHead(200,{'content-type':'text/javascript'});res.end(script);return;}
  if(req.url==='/api/public/events'){let body='';req.on('data',chunk=>{body+=chunk});req.on('end',()=>{received.push(JSON.parse(body));res.writeHead(204);res.end();});return;}
  res.writeHead(200,{'content-type':'text/html'});res.end(req.url.startsWith('/embed')?'<!doctype html><title>widget</title>':'<!doctype html><script src="/widget.js" data-project="fixture" data-board="product" defer></script>');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{});
 try{
  const page=await browser.newPage();await page.goto(origin);await page.locator('#ent-feedback-widget').waitFor({state:'attached'});await page.waitForTimeout(300);
  assert.equal(received.length,0,'no analytics before consent');assert.equal(await page.evaluate(()=>localStorage.getItem('ent-analytics-visitor:fixture')),null,'no analytics identifier before consent');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('ent:analytics-consent',{detail:{granted:true}})));await page.waitForTimeout(400);
  assert.equal(received.filter(event=>event.type==='widget_loaded').length,1);assert.equal(received[0].consent,true);assert.ok(await page.evaluate(()=>localStorage.getItem('ent-analytics-visitor:fixture')));
  await page.getByRole('button',{name:'Submit feedback'}).click();await page.waitForTimeout(300);assert.equal(received.filter(event=>event.type==='widget_opened').length,1);
  const frame=page.frameLocator('#ent-feedback-panel');await frame.locator('title').waitFor({state:'attached'});await page.locator('#ent-feedback-panel').contentFrame().locator('body').evaluate(()=>parent.postMessage({type:'ent:analytics-event',event:'feedback_submitted'},location.origin));await page.waitForTimeout(300);assert.equal(received.filter(event=>event.type==='feedback_submitted').length,1);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('ent:analytics-consent',{detail:{granted:false}})));assert.equal(await page.evaluate(()=>localStorage.getItem('ent-analytics-visitor:fixture')),null);const count=received.length;
  await page.getByRole('button',{name:'Close feedback'}).click();await page.getByRole('button',{name:'Submit feedback'}).click();await page.waitForTimeout(300);assert.equal(received.length,count,'no analytics after consent withdrawal');
  const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(navigator,'globalPrivacyControl',{value:true}));const other=await blocked.newPage();await other.goto(origin);await other.locator('#ent-feedback-widget').waitFor({state:'attached'});await other.evaluate(()=>window.dispatchEvent(new CustomEvent('ent:analytics-consent',{detail:{granted:true}})));await other.waitForTimeout(300);assert.equal(await other.evaluate(()=>localStorage.getItem('ent-analytics-visitor:fixture')),null);assert.equal(received.length,count,'GPC blocks host consent');await blocked.close();
  console.log('PASS: widget analytics requires consent, respects withdrawal and privacy signals, and emits bounded activity.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error.message);process.exitCode=1});

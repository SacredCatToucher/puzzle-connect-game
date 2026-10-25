import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sha256} from './pages-assemble.mjs';
export async function checkBrowser(browser,{directory,base='http://pages.test/puzzle-connect-game/',live=false}={}){
  base=base.replace(/\/+$/,'')+'/';
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const manifest=JSON.parse(await readFile(join(directory,'_deployment.json'),'utf8'));
  if(!live)await page.route('http://pages.test/**',async route=>{
    const tail=new URL(route.request().url()).pathname.replace('/puzzle-connect-game/','');
    if(!['','index.html','beta/','beta/index.html','beta/build-info.json','_deployment.json'].includes(tail))return route.fulfill({status:404,body:'Not found'});
    const name=tail===''?'index.html':tail==='beta/'?'beta/index.html':tail;
    await route.fulfill({contentType:name.endsWith('.json')?'application/json':'text/html',body:await readFile(join(directory,name))});
  });
  let passed=0;
  const stable=await page.goto(base,{waitUntil:'networkidle'});assert.equal(stable.status(),200);
  assert.equal(sha256(await stable.body()),manifest.stableHtmlSha256);
  assert.equal(await page.title(),'拼圖連連 v0.5');assert.equal(await page.locator('.tile').count(),9);
  assert.equal(await page.locator('#show-numbers').count(),0);passed++;
  const beta=await page.goto(base+'beta/',{waitUntil:'networkidle'});assert.equal(beta.status(),200);
  assert.equal(sha256(await beta.body()),manifest.betaHtmlSha256);
  assert.equal(await page.locator('.tile').count(),9);assert.equal(await page.locator('#show-numbers').isChecked(),false);
  await page.locator('#show-numbers').check();assert.equal(await page.locator('.num:visible').count(),9);
  await page.locator('.tile').nth(0).click();await page.locator('.tile').nth(8).click();
  assert.equal(await page.locator('#moves').textContent(),'1');
  await page.reload();assert.equal(await page.locator('#show-numbers').isChecked(),true);
  assert.equal(errors.length,0);passed++;
  await context.close();return {pagesBrowserTests:passed,passed,failed:0,live};
}
export async function verifyPublic(base,directory){
  base=base.replace(/\/+$/,'')+'/';
  const manifest=JSON.parse(await readFile(join(directory,'_deployment.json'),'utf8'));
  let last;
  for(let attempt=0;attempt<18;attempt++){
    try{
      for(const [suffix,expected] of [['',manifest.stableHtmlSha256],['beta/',manifest.betaHtmlSha256]]){
        const response=await fetch(base+suffix+'?deployment='+manifest.workflowCommit,{cache:'no-store',signal:AbortSignal.timeout(15000)});
        assert.equal(response.status,200);assert.equal(sha256(Buffer.from(await response.arrayBuffer())),expected);
      }
      const info=await fetch(base+'beta/build-info.json?deployment='+manifest.workflowCommit,{cache:'no-store'});
      assert.equal(info.status,200);assert.equal((await info.json()).commit,manifest.betaCommit);return;
    }catch(error){last=error;await new Promise(r=>setTimeout(r,5000))}
  }
  throw last;
}
if(typeof process!=='undefined'&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const {createRequire}=await import('node:module'),require=createRequire(import.meta.url);
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
  const directory=join(process.cwd(),'_site'),live=!!process.env.PAGES_LIVE_URL;
  if(live)await verifyPublic(process.env.PAGES_LIVE_URL,directory);
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  try{console.log(await checkBrowser(browser,{directory,live,...(live?{base:process.env.PAGES_LIVE_URL}:{})}))}finally{await browser.close()}
}

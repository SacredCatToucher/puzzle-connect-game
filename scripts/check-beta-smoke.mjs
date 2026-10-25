import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export async function runSmoke(browser,html){
  let passed=0;
  for(const [width,height] of [[320,568],[390,844],[768,1024],[1280,900]]){
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.route('http://beta.test/**',r=>r.fulfill({contentType:'text/html',body:html}));
    await page.goto('http://beta.test/');
    assert.equal(await page.locator('#show-numbers').isChecked(),false);
    assert.equal(await page.locator('.num:visible').count(),0);
    // Exercise the actual FileReader upload flow, not a test-only photo assignment.
    await page.locator('#photo').setInputFiles({name:'test-photo.svg',mimeType:'image/svg+xml',
      buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#6af"/><circle cx="300" cy="300" r="240" fill="#fa6"/></svg>')});
    await page.waitForFunction(()=>document.querySelectorAll('.tile.photo').length===9);
    assert.equal(await page.locator('.tile.photo').count(),9);
    await page.locator('#show-numbers').check();assert.equal(await page.locator('.num:visible').count(),9);
    await page.locator('.tile').nth(0).click();await page.locator('.tile').nth(8).click();
    assert.equal(await page.locator('#moves').textContent(),'1');
    await page.locator('#numbers').click();assert.equal(await page.locator('.tile.photo').count(),0);
    await page.locator('#show-numbers').uncheck();await page.reload();
    assert.equal(await page.locator('#show-numbers').isChecked(),false);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow at '+width);
    assert.equal(errors.length,0);
    await page.close();passed++;
  }
  return {responsiveUploadTests:passed,passed,failed:0};
}
if(typeof process!=='undefined'&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{console.log(await runSmoke(browser,readFileSync(new URL('../index.html',import.meta.url),'utf8')))}finally{await browser.close()}
}

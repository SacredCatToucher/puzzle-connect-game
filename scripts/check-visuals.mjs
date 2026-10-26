import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export async function runBrowserTests(browser,html,{screenshot}={}){
  const page=await browser.newPage({viewport:{width:420,height:900}});
  let passed=0;const errors=[];const same=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));page.on('pageerror',e=>errors.push(String(e)));
  const hook='window.__visualTest={set(a,image=null,size=3){n=size;board=a.slice();photo=image;moves=0;selected=null;render()},state(){return {board:board.slice(),moves}}};';
  const instrumented=html.replace('reset();\n})();',hook+'reset();\n})();');
  assert.notEqual(instrumented,html,'test hook inserted only into test document');
  let document=instrumented;
  await page.route('http://puzzle.test/**',route=>route.fulfill({contentType:'text/html',body:document}));
  await page.goto('http://puzzle.test/');
  const test=async(name,fn)=>{await fn();passed++;};
  const goal=[0,1,2,3,4,5,6,7,8];
  const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><defs><linearGradient id="g"><stop stop-color="#ff7d45"/><stop offset="1" stop-color="#276ad9"/></linearGradient></defs><rect width="600" height="600" fill="url(#g)"/><path d="M0 0L600 600M0 600L600 0M0 300H600M300 0V600" stroke="#172338" stroke-width="6"/></svg>');
  const idle=()=>page.waitForFunction(()=>document.getElementById('board').dataset.motion==='idle');
  const set=async(a,img=image,n=3)=>{await idle();return page.evaluate(([a,img,n])=>window.__visualTest.set(a,img,n),[a,img,n])};
  const edges=()=>page.locator('.tile').evaluateAll(ts=>ts.map(t=>['top','right','bottom','left'].map(s=>t.style.getPropertyValue('--edge-'+s))));
  await test('numbers default off in both modes',async()=>{
    assert.equal(await page.locator('#show-numbers').isChecked(),false);
    assert.equal(await page.locator('.num:visible').count(),0);
    await set(goal);assert.equal(await page.locator('.num:visible').count(),0);
  });
  await test('checkbox toggles numbers without a game move; preference survives reload',async()=>{
    await page.locator('#show-numbers').check();assert.equal(await page.locator('.num:visible').count(),9);
    assert.equal((await page.evaluate(()=>window.__visualTest.state())).moves,0);
    await page.reload();assert.equal(await page.locator('#show-numbers').isChecked(),true);
    await page.locator('#show-numbers').uncheck();await page.reload();
    assert.equal(await page.locator('.num:visible').count(),0);
  });
  await test('solved group removes every internal border and all gaps',async()=>{
    await set(goal);const e=await edges();
    same(e[4],['0px','0px','0px','0px']);
    same(e[0],['2px','0px','0px','2px']);
    const geometry=await page.locator('#board').evaluate(b=>{
      const ts=[...b.children],r=ts.map(t=>t.getBoundingClientRect());
      return {gap:getComputedStyle(b).gap,dx:r[1].left-r[0].right,dy:r[3].top-r[0].bottom,radius:getComputedStyle(ts[4]).borderRadius,border:getComputedStyle(ts[4]).borderWidth};
    });
    assert.equal(geometry.gap,'0px');assert.ok(Math.abs(geometry.dx)<0.05&&Math.abs(geometry.dy)<0.05);
    assert.equal(geometry.radius,'0px');assert.equal(geometry.border,'0px');
  });
  await test('L group perimeter follows the actual cells and keeps concave edges',async()=>{
    // Correct tiles 0,1,3 form an L; remaining arrangement avoids extra links.
    await set([0,1,8,3,7,6,5,4,2]);const e=await edges();
    same(e[0],['2px','0px','0px','2px']);
    assert.equal(e[1][2],'2px');assert.equal(e[3][1],'2px');
  });
  await test('singleton and horizontal/vertical groups retain exposed borders',async()=>{
    await set(goal.toReversed());assert.ok((await edges()).every(e=>e.every(v=>v==='2px')));
    await set([0,1,2,8,7,6,5,4,3]);assert.equal((await edges())[1][1],'0px');
    await set([0,8,7,3,6,5,4,2,1]);assert.equal((await edges())[0][2],'0px');
  });
  await test('original click move reforms group and updates borders immediately',async()=>{
    await set([0,1,8,3,4,5,6,7,2]);
    await page.locator('.tile').nth(2).click();await page.locator('.tile').nth(8).click();await idle();
    same((await page.evaluate(()=>window.__visualTest.state())).board,goal);
    same((await edges())[4],['0px','0px','0px','0px']);
  });
  await test('real pointer drag clips a group and updates the split outline',async()=>{
    await set(goal);
    await page.evaluate(()=>{window.__firstTile=document.querySelector('.tile')});
    const a=await page.locator('.tile').nth(0).boundingBox(),b=await page.locator('.tile').nth(1).boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();await idle();
    const state=await page.evaluate(()=>window.__visualTest.state());
    same(state.board,[2,0,1,5,3,4,8,6,7]);assert.equal(state.moves,1);
    const e=await edges();assert.equal(e[0][1],'2px');assert.equal(e[1][3],'2px');
    assert.ok(await page.evaluate(()=>window.__firstTile===document.querySelector('.tile')),'no cell destruction on drag');
  });
  await test('image positioning remains continuous across merged cells',async()=>{
    await set(goal);const bg=await page.locator('.tile').evaluateAll(ts=>ts.map(t=>({size:t.style.backgroundSize,pos:t.style.backgroundPosition})));
    assert.ok(bg.every(t=>t.size==='300% 300%'));
    same(bg.slice(0,3).map(t=>t.pos),['0% 0%','50% 0%','100% 0%']);
    if(screenshot)await page.screenshot({path:screenshot,fullPage:true});
  });
  await test('4x4 and 6x6 merged edges update after size changes',async()=>{
    for(const n of [4,6]){await set(Array.from({length:n*n},(_,i)=>i),image,n);assert.equal(await page.locator('.tile').count(),n*n);same((await edges())[n+1],['0px','0px','0px','0px']);}
  });
  await test('single feature flag hides checkbox and labels even with saved preference',async()=>{
    await page.locator('#show-numbers').check();
    document=instrumented.replace('const ENABLE_NUMBER_DEBUG=true','const ENABLE_NUMBER_DEBUG=false');
    await page.reload();assert.equal(await page.locator('#number-debug').isVisible(),false);
    assert.equal(await page.locator('.num:visible').count(),0);
  });
  await test('no browser script errors',async()=>same(errors,[]));
  await page.close();return {browserTests:passed,passed,failed:0};
}
if(typeof process!=='undefined'&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{console.log(await runBrowserTests(browser,readFileSync(new URL('../index.html',import.meta.url),'utf8')))}finally{await browser.close()}
}

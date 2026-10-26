import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {move as ruleMove} from '../analysis/stage-a/model.mjs';
export async function runMotionTests(browser,html){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const hook='window.__motionTest={set(a,image=null){cancelMotion();n=3;board=a.slice();photo=image;moves=0;selected=null;render()},state(){return {board:board.slice(),moves,busy:motionBusy,motion:el.dataset.motion}}};window.__pointerTypes=[];el.addEventListener("pointerdown",e=>window.__pointerTypes.push(e.pointerType));';
  const document=html.replace('reset();\n})();',hook+'reset();\n})();');assert.notEqual(document,html);
  await page.route('http://motion.test/**',r=>r.fulfill({contentType:'text/html',body:document}));
  await page.goto('http://motion.test/');let passed=0;
  const same=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));
  const test=async(name,fn)=>{await fn();passed++;};
  const idle=()=>page.waitForFunction(()=>document.querySelector('#board').dataset.motion==='idle');
  const state=()=>page.evaluate(()=>window.__motionTest.state());
  const goal=[0,1,2,3,4,5,6,7,8],reverse=goal.toReversed();
  const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#6cf"/><path d="M0 0L600 600M0 600L600 0" stroke="#e75" stroke-width="20"/></svg>');
  const set=async a=>{await idle();await page.evaluate(([a,image])=>window.__motionTest.set(a,image),[a,image])};
  const rect=async i=>page.locator('#board .tile').nth(i).boundingBox();
  const center=r=>({x:r.x+r.width/2,y:r.y+r.height/2});
  const down=async i=>{const p=center(await rect(i));await page.mouse.move(p.x,p.y);await page.mouse.down();return p};
  const moveTo=async p=>{await page.mouse.move(p.x,p.y,{steps:5});await page.waitForFunction(()=>document.querySelector('#board').dataset.motion==='dragging');};
  const ghost=value=>page.locator('.motion-tile[data-value="'+value+'"]');
  await test('singleton follows pointer via transform without committing state',async()=>{
    await set(reverse);const origin=await rect(0),p=await down(0);await moveTo({x:p.x+43,y:p.y+29});
    await page.waitForFunction(()=>document.querySelector('.motion-tile')?.style.transform.includes('43px'));
    const r=await ghost(8).boundingBox();assert.ok(Math.abs(r.x-origin.x-43)<1&&Math.abs(r.y-origin.y-29)<1);
    same((await state()).board,reverse);assert.equal((await state()).moves,0);
    await page.mouse.up();await idle();
  });
  await test('release retains finger position; displaced tile animates to source',async()=>{
    await set(reverse);const original=await rect(0),target=await rect(8);await down(0);
    const p=center(target);await moveTo({x:p.x+18,y:p.y-12});
    await page.waitForTimeout(20);const release=await ghost(8).boundingBox();await page.mouse.up();
    const first=await ghost(8).evaluate(node=>{const a=node.getAnimations()[0],m=new DOMMatrix(a.effect.getKeyframes()[0].transform);return {x:parseFloat(node.style.left)+m.m41,y:parseFloat(node.style.top)+m.m42}});
    assert.ok(Math.abs(first.x-release.x)<1&&Math.abs(first.y-release.y)<1);
    assert.equal((await state()).motion,'settling');
    const displaced=await ghost(0).boundingBox();assert.ok(displaced.x>original.x&&displaced.y>original.y);
    await page.waitForTimeout(65);const midway=await ghost(0).boundingBox();assert.ok(midway.y<displaced.y&&midway.y>original.y);
    await idle();same((await state()).board,ruleMove(reverse,0,8));assert.equal((await state()).moves,1);
    assert.equal(await page.locator('.motion-tile').count(),0);
  });
  await test('invalid outside drop animates back without a move or horizontal overflow',async()=>{
    await set(reverse);await down(0);await moveTo({x:5,y:80});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.mouse.up();assert.equal((await state()).motion,'settling');await idle();
    same((await state()).board,reverse);assert.equal((await state()).moves,0);
  });
  await test('L group follows rigidly and lands using actual multi-tile rule',async()=>{
    const a=[0,1,8,3,7,6,5,4,2];await set(a);const r0=await rect(0),r1=await rect(1),r3=await rect(3);
    const p=await down(0);await moveTo({x:p.x+30,y:p.y+22});await page.waitForTimeout(20);
    const g0=await ghost(0).boundingBox(),g1=await ghost(1).boundingBox(),g3=await ghost(3).boundingBox();
    assert.ok(Math.abs((g1.x-g0.x)-(r1.x-r0.x))<0.1&&Math.abs((g3.y-g0.y)-(r3.y-r0.y))<0.1);
    assert.equal(await page.locator('.motion-tile').count(),3);
    const q=center(r1);await page.mouse.move(q.x,q.y);await page.mouse.up();await idle();
    same((await state()).board,ruleMove(a,0,1));
  });
  await test('clipped nine-tile group animates every identity to actual destination',async()=>{
    await set(goal);const rects=await page.locator('#board .tile').evaluateAll(ts=>ts.map(t=>{const r=t.getBoundingClientRect();return {x:r.x,y:r.y}}));
    await down(0);await moveTo(center(await rect(1)));await page.mouse.up();
    const after=ruleMove(goal,0,1);same((await state()).board,after);
    for(const value of goal){
      const from=goal.indexOf(value),to=after.indexOf(value);
      const end=await ghost(value).evaluate(node=>node.getAnimations().map(a=>a.effect.getKeyframes().at(-1).transform));
      // A dragged tile already at its final destination needs no settling animation.
      if(end.length)assert.ok(end[0].includes((rects[to].x-rects[from].x)+'px'));
    }
    await idle();same((await state()).board,after);
    assert.equal(await page.locator('#board .tile').nth(0).evaluate(t=>t.style.getPropertyValue('--edge-right')),'2px');
  });
  await test('extra input while settling cannot apply a second move',async()=>{
    await set(reverse);await down(0);await moveTo(center(await rect(8)));await page.mouse.up();
    await page.locator('#board .tile').nth(1).dispatchEvent('pointerdown',{pointerId:91,pointerType:'touch',clientX:100,clientY:250});
    await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerup',{pointerId:91,pointerType:'touch',clientX:200,clientY:300})));
    assert.equal((await state()).moves,1);await idle();
    await down(1);await moveTo(center(await rect(7)));await page.mouse.up();await idle();assert.equal((await state()).moves,2);
  });
  const cdp=await context.newCDPSession(page);
  await test('real touch events follow finger and commit the same rule result',async()=>{
    await set(reverse);const p=center(await rect(0)),q=center(await rect(8));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:q.x,y:q.y,id:1}]});
    await page.waitForFunction(()=>document.querySelector('#board').dataset.motion==='dragging');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await idle();
    same((await state()).board,ruleMove(reverse,0,8));
    assert.ok(await page.evaluate(()=>window.__pointerTypes.includes('touch')));
  });
  await test('touch cancellation returns current visuals and restores controls',async()=>{
    await set(reverse);const p=center(await rect(0));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+40,y:p.y+30,id:2}]});
    await page.waitForFunction(()=>document.querySelector('#board').dataset.motion==='dragging');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await idle();
    same((await state()).board,reverse);assert.equal((await state()).moves,0);
    assert.equal(await page.locator('#new').isEnabled(),true);
  });
  await test('reduced motion keeps direct dragging but skips settling animation',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});await set(reverse);
    await down(0);await moveTo(center(await rect(8)));await page.mouse.up();
    assert.equal((await state()).motion,'idle');assert.equal(await page.locator('.motion-tile').count(),0);
    same((await state()).board,ruleMove(reverse,0,8));await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await test('resize during drag cleans capture, visuals and input lock',async()=>{
    await set(reverse);const p=await down(0);await moveTo({x:p.x+40,y:p.y+30});
    await page.setViewportSize({width:320,height:700});await idle();await page.mouse.up();
    same((await state()).board,reverse);assert.equal(await page.locator('#new').isEnabled(),true);
  });
  await test('two-click exchange remains available',async()=>{
    await set(reverse);await page.locator('#board .tile').nth(0).click();await page.locator('#board .tile').nth(8).click();await idle();
    same((await state()).board,ruleMove(reverse,0,8));assert.equal((await state()).moves,1);
  });
  await test('mobile layouts keep zero gaps during group drag and final settle',async()=>{
    for(const width of [320,390,768]){
      await page.setViewportSize({width,height:900});await set(goal);const p=await down(0);await moveTo({x:p.x+31,y:p.y+19});await page.waitForTimeout(20);
      const gs=await page.locator('.motion-tile').evaluateAll(ts=>ts.map(t=>{const r=t.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}));
      assert.ok(Math.abs(gs[1].x-gs[0].x-gs[0].w)<0.1);
      assert.ok(Math.abs(gs[3].y-gs[0].y-gs[0].h)<0.1);
      await page.mouse.up();await idle();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
  });
  assert.equal(errors.length,0,errors.join('\n'));await context.close();
  return {motionTests:passed,passed,failed:0};
}
if(typeof process!=='undefined'&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const {createRequire}=await import('node:module'),require=createRequire(import.meta.url);
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{console.log(await runMotionTests(browser,readFileSync(new URL('../index.html',import.meta.url),'utf8')))}finally{await browser.close()}
}

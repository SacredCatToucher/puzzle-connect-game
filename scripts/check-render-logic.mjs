import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';
import {pathToFileURL} from 'node:url';
export function runTests(){
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const old=readFileSync(new URL('../analysis/stage-a/fixtures/v0.5.html',import.meta.url),'utf8');
  let passed=0;const test=(name,fn)=>{fn();passed++};
  const block=(s,start,end)=>s.slice(s.indexOf(start),s.indexOf(end));
  test('group and move/victory function bodies remain byte-identical',()=>{
    for(const [start,end] of [['function groups(a)','function shuffled()'],['function move(from,to)','function reset()']])
      assert.equal(block(html,start,end),block(old,start,end));
  });
  test('pointer presentation delegates final state changes to original move and cleans interruptions',()=>{
    for(const token of ['function onPuzzlePointerDown','function onPuzzlePointerMove','function finishPuzzlePointer','setPointerCapture','requestAnimationFrame(paintDrag)','move(from,to)','window.addEventListener("blur",cancelMotion)','window.addEventListener("resize",cancelMotion)'])assert.ok(html.includes(token),token);
  });
  test('all inline JavaScript parses',()=>{for(const [,source] of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new Script(source)});
  const start=html.indexOf('function tileEdges('),end=html.indexOf('\nwindow.addEventListener',start);
  const tileEdges=runInNewContext(html.slice(start,end)+';tileEdges');
  const mask=(gs,n)=>JSON.parse(JSON.stringify(tileEdges(gs,n)));
  test('arbitrary polyomino outlines match all neighbor memberships for n=3..6',()=>{
    for(const n of [3,4,5,6]){
      for(let shift=0;shift<10;shift++){
        const gs=[[],[],[]];for(let p=0;p<n*n;p++)gs[(p*p+Math.floor(p/n)+shift*p)%3].push(p);
        const edges=mask(gs,n),owners=[];gs.forEach((g,id)=>g.forEach(p=>owners[p]=id));
        for(let p=0;p<n*n;p++){
          const [t,r,b,l]=[p<n,p%n===n-1,p>=n*(n-1),p%n===0];
          assert.deepEqual(edges[p],{top:t||owners[p-n]!==owners[p],right:r||owners[p+1]!==owners[p],bottom:b||owners[p+n]!==owners[p],left:l||owners[p-1]!==owners[p]});
        }
      }
    }
  });
  test('CSS never allocates layout gap or layout border for merged cells',()=>{
    assert.ok(html.includes('gap:0;aspect-ratio:1'));assert.match(html,/\.tile::after(?:,[^{]+)?\{/);
    assert.ok(!html.includes('.tile.linked{box-shadow:'));assert.ok(html.includes('pointer-events:none'));
  });
  test('number preference defaults off, restores only 1, tolerates storage failure',()=>{
    const source=block(html,'function readNumberPreference()','let showNumbers=');
    for(const [value,want] of [[null,false],['0',false],['1',true],['invalid',false]])
      assert.equal(runInNewContext(source+';readNumberPreference()',{NUMBER_PREFERENCE_KEY:'key',localStorage:{getItem:()=>value}}),want);
    assert.equal(runInNewContext(source+';readNumberPreference()',{NUMBER_PREFERENCE_KEY:'key',localStorage:{getItem(){throw Error('denied')}}}),false);
  });
  return {renderLogicTests:passed,passed,failed:0};
}
if(typeof process!=='undefined'&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(runTests());

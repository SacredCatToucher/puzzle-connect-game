import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {groups,move,validate} from './model.mjs';
import {loadOracle,HTML_BLOB} from './oracle.mjs';

// This runner can be invoked by CLI or imported into a restricted JS runtime.
// Each named case throws on failure; the CLI therefore returns nonzero on failure.
export function runTests({log=console.log}={}) {
  const oracle=loadOracle(), goal=[0,1,2,3,4,5,6,7,8];
  const normalized=gs=>Array.from(gs,g=>Array.from(g).sort((a,b)=>a-b)).sort((a,b)=>a[0]-b[0]);
  const sizes=a=>groups(a).map(g=>g.length).sort((a,b)=>a-b);
  let passed=0,actionComparisons=0,groupComparisons=0;
  const test=(name,fn)=>{fn();passed++;log('PASS '+name);};
  function compare(a,from,to,expected) {
    const before=a.slice(), actual=move(a,from,to), original=oracle.move(a,from,to);
    assert.deepEqual(actual,original.board);
    assert.equal(original.moves,from===to?0:1);
    assert.deepEqual(a,before,'input must remain immutable');
    validate(actual);
    if(expected)assert.deepEqual(actual,expected);
    assert.deepEqual(normalized(groups(a)),normalized(oracle.groups(a)));groupComparisons++;
    assert.deepEqual(normalized(groups(actual)),normalized(oracle.groups(actual)));groupComparisons++;
    actionComparisons++;
    return actual;
  }
  test('singleton arbitrary nonadjacent swap',()=>{
    compare(goal.toReversed(),0,8,[0,7,6,5,4,3,2,1,8]);
  });
  test('whole three-cell group translation',()=>{
    compare([0,1,2,8,7,6,5,4,3],0,3,[8,7,6,0,1,2,5,4,3]);
  });
  test('overlapping target inside source group is allowed',()=>{
    compare(goal,0,1,[2,0,1,5,3,4,8,6,7]);
  });
  test('boundary clipping splits original group and refills displaced tiles',()=>{
    const a=compare(goal,0,1,[2,0,1,5,3,4,8,6,7]);
    assert.deepEqual(sizes(a),[3,6]);
  });
  test('diagonal extreme clipping retains only one translated source',()=>{
    compare(goal,0,8,[8,1,2,3,4,5,6,7,0]);
    compare(goal,8,0,[8,1,2,3,4,5,6,7,0]);
  });
  test('groups are recomputed and merge after singleton swap',()=>{
    const a=[0,1,8,3,4,5,6,7,2];
    assert.deepEqual(sizes(a),[1,1,7]);
    const b=compare(a,2,8,goal);
    assert.deepEqual(sizes(b),[9]);
    // Follow-up action must move the newly formed group, not the stale singleton.
    compare(b,2,1,[1,2,0,4,5,3,7,8,6]);
  });
  test('correct numeric adjacency cannot wrap board or goal rows',()=>{
    const a=[2,3,0,8,7,6,5,4,1];
    assert.ok(!groups(a).some(g=>g.includes(0)&&g.includes(1)));
    compare(a,0,1);
    assert.equal(groups(goal.toReversed()).length,9);
  });
  test('same-cell selection costs zero and leaves board unchanged',()=>{
    for(let p=0;p<9;p++)compare(goal,p,p,goal);
  });
  test('every source-target pair on fixed boundary fixtures',()=>{
    for(const a of [goal,goal.toReversed(),[0,1,2,8,7,6,5,4,3],[0,1,8,3,4,5,6,7,2]])
      for(let f=0;f<9;f++)for(let t=0;t<9;t++)compare(a,f,t);
  });
  let seed=20261026;const sampled=new Set();
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  test('1000 seeded shuffled boards, all 81 source-target selections each',()=>{
    // Bounded sample only: no all-permutation enumeration and no graph/BFS.
    for(let k=0;k<1000;k++) {
      const a=goal.slice();
      for(let j=8;j>0;j--) {const q=random()%(j+1);[a[j],a[q]]=[a[q],a[j]];}
      sampled.add(a.join(','));
      for(let f=0;f<9;f++)for(let t=0;t<9;t++)compare(a,f,t);
    }
  });
  test('analysis module rejects malformed input and out-of-board selections',()=>{
    assert.throws(()=>move(goal,0,9),RangeError);
    assert.throws(()=>move(goal,-1,0),RangeError);
    assert.throws(()=>move(goal,0,0.5),RangeError);
    assert.throws(()=>validate([0,0,1,2,3,4,5,6,7]),RangeError);
    assert.throws(()=>validate([0,1,2,3,4,5,6,7,9]),RangeError);
  });
  const result={scope:'A1 only',tests:passed,passed,failed:0,actionComparisons,groupComparisons,
    shuffledBoards:1000,distinctShuffledBoards:sampled.size,seed:20261026,indexHtmlGitBlob:HTML_BLOB};
  log(JSON.stringify(result,null,2));return result;
}
if(typeof process!=='undefined'&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) runTests();

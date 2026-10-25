import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {move} from './model.mjs';
import {loadOracle} from './oracle.mjs';
import {runTests as runA1} from './model.test.mjs';
import {STATE_COUNT,ACTIONS,rank,unrank,boardAt,containsTarget,runAudit,result} from './reversibility.mjs';
export function runTests({graph,log=console.log}={}) {
  const expected=JSON.parse(readFileSync(new URL('./a2-results.json',import.meta.url),'utf8'));
  let passed=0;
  const test=(name,fn)=>{fn();passed++;log('PASS '+name);};
  const a1=runA1({log:()=>{}});
  test('A1 regression suite remains green',()=>assert.equal(a1.passed,11));
  test('binary membership handles duplicates, self-loops and directed edges',()=>{
    const table=Uint32Array.from([1,1,2, 1,2,2, 2,2,2]);
    assert.ok(containsTarget(table,0,1,3));
    assert.ok(!containsTarget(table,1,0,3));
    assert.ok(containsTarget(table,1,1,3));
    assert.ok(!containsTarget(table,2,1,3));
  });
  // If no graph is supplied, this regenerates the entire graph and audit.
  // It performs no BFS, path or distance computation.
  const g=graph??runAudit({progress:log}).graph;
  const summary=result(g);
  test('full enumeration has exactly 9! distinct ranked permutations',()=>{
    assert.equal(g.boards.length,STATE_COUNT*9);
    for(let u=0;u<STATE_COUNT;u++){
      const a=boardAt(g,u);assert.equal(rank(a),u);assert.deepEqual(unrank(u),a);
    }
    assert.throws(()=>unrank(STATE_COUNT),RangeError);
  });
  test('all stored action targets are valid and sorted; independent edge counts',()=>{
    let unique=0,duplicates=0,asymmetric=0,weighted=0;
    for(let u=0;u<STATE_COUNT;u++){
      let previous=-1;
      for(let k=0;k<ACTIONS;k++){
        const v=g.targets[u*ACTIONS+k];
        assert.ok(v>=0&&v<STATE_COUNT&&v>=previous);
        if(v!==previous)unique++;else duplicates++;
        // Linear scan instead of production binary search to independently audit membership.
        let hasReturn=false;
        for(let j=0;j<ACTIONS;j++)if(g.targets[v*ACTIONS+j]===u){hasReturn=true;break;}
        if(!hasReturn){weighted++;if(v!==previous)asymmetric++;}
        previous=v;
      }
    }
    assert.equal(unique,summary.uniqueDirectedTransitions);
    assert.equal(duplicates,summary.duplicateActionTransitions);
    assert.equal(asymmetric,summary.irreversibleUniqueTransitions);
    assert.equal(weighted,summary.irreversibleActionTransitions);
  });
  test('stored successors equal public A1 move for 100 deterministic states',()=>{
    for(let i=0;i<100;i++){
      const u=(i*3571)%STATE_COUNT,a=boardAt(g,u),targets=[];
      for(let f=0;f<9;f++)for(let t=0;t<9;t++)if(f!==t)targets.push(rank(move(a,f,t)));
      targets.sort((a,b)=>a-b);
      assert.deepEqual(Array.from(g.targets.subarray(u*ACTIONS,(u+1)*ACTIONS)),targets);
    }
  });
  test('all counts and deterministic witness reproduce the recorded exhaustive result',()=>{
    assert.deepEqual(summary,expected);
    assert.equal(summary.totalActionTransitions,STATE_COUNT*72);
    assert.equal(summary.totalActionTransitions,summary.uniqueDirectedTransitions+summary.duplicateActionTransitions);
    assert.equal(summary.coverage,1);
    assert.ok(summary.irreversibleUniqueTransitions>0);
  });
  test('counterexample replays original index.html and all 72 returns fail',()=>{
    const o=loadOracle(),{A,B,action}=summary.witness;
    assert.deepEqual(o.move(A,action.from,action.to).board,B);
    let returns=0;
    for(let f=0;f<9;f++)for(let t=0;t<9;t++)if(f!==t){
      const b=o.move(B,f,t).board;assert.deepEqual(move(B,f,t),b);
      if(b.every((v,p)=>v===A[p]))returns++;
    }
    assert.equal(returns,0);
    assert.ok(!containsTarget(g.targets,rank(B),rank(A)));
  });
  test('a singleton swap has a real legal return (positive control)',()=>{
    const a=[8,7,6,5,4,3,2,1,0],b=move(a,0,8);
    assert.ok(containsTarget(g.targets,rank(a),rank(b)));
    assert.ok(containsTarget(g.targets,rank(b),rank(a)));
  });
  const report={a1Tests:a1.passed,a2Tests:passed,totalTests:a1.passed+passed,passed:a1.passed+passed,failed:0};
  log(JSON.stringify(report,null,2));return report;
}
if(typeof process!=='undefined'&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)runTests();

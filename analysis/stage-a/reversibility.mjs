// A2 only: enumerate states/operations and audit one-step reciprocity.
// No search, reachability or distance calculation.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {groups,moveWithGroup,move} from './model.mjs';

export const STATE_COUNT=362880, ACTIONS=72;
const factorial=[1,1,2,6,24,120,720,5040,40320,362880];
const pop=new Uint8Array(512);
for(let x=1;x<512;x++)pop[x]=pop[x>>1]+(x&1);
export function rank(a) {
  let used=0,r=0;
  for(let i=0;i<9;i++){r+=(a[i]-pop[used&((1<<a[i])-1)])*factorial[8-i];used|=1<<a[i];}
  return r;
}
export function unrank(r) {
  if(!Number.isInteger(r)||r<0||r>=STATE_COUNT)throw new RangeError('Invalid rank');
  const left=[0,1,2,3,4,5,6,7,8],a=[];
  for(let i=8;i>=0;i--){const k=Math.floor(r/factorial[i]);r%=factorial[i];a.push(left.splice(k,1)[0]);}
  return a;
}
export function enumerateStates() {
  const boards=new Uint8Array(STATE_COUNT*9);
  for(let u=0;u<STATE_COUNT;u++){
    const a=unrank(u);assert.equal(rank(a),u);boards.set(a,u*9);
  }
  return boards;
}
export function createAudit() {
  return {boards:enumerateStates(),targets:new Uint32Array(STATE_COUNT*ACTIONS),
    built:0,audited:0,uniqueEdges:0,duplicateActions:0,selfLoopActions:0,
    irreversibleEdges:0,irreversibleActions:0,witness:null};
}
export function boardAt(g,u){return Array.from(g.boards.subarray(u*9,u*9+9));}
export function buildRange(g,end=STATE_COUNT) {
  assert.ok(end>=g.built&&end<=STATE_COUNT);
  for(let u=g.built;u<end;u++){
    const a=boardAt(g,u),lookup=[];
    for(const component of groups(a))for(const p of component)lookup[p]=component;
    const targets=[];
    for(let from=0;from<9;from++)for(let to=0;to<9;to++)if(from!==to){
      const b=moveWithGroup(a,from,to,lookup[from]);
      let mask=0;
      for(const v of b){assert.ok(Number.isInteger(v)&&v>=0&&v<9);mask|=1<<v;}
      assert.equal(mask,511,'every action conserves all nine tiles');
      const v=rank(b);targets.push(v);if(v===u)g.selfLoopActions++;
    }
    targets.sort((a,b)=>a-b);
    let unique=0;
    for(let k=0;k<ACTIONS;k++)if(k===0||targets[k]!==targets[k-1])unique++;
    g.uniqueEdges+=unique;g.duplicateActions+=ACTIONS-unique;
    g.targets.set(targets,u*ACTIONS);
  }
  g.built=end;
}
export function containsTarget(table,source,target,width=ACTIONS) {
  let lo=0,hi=width-1;
  while(lo<=hi){
    const m=(lo+hi)>>1,v=table[source*width+m];
    if(v===target)return true;
    if(v<target)lo=m+1;else hi=m-1;
  }
  return false;
}
export function auditRange(g,end=STATE_COUNT) {
  assert.equal(g.built,STATE_COUNT,'build every outgoing action before auditing');
  assert.ok(end>=g.audited&&end<=STATE_COUNT);
  for(let u=g.audited;u<end;u++){
    for(let k=0;k<ACTIONS;){
      const v=g.targets[u*ACTIONS+k];let next=k+1;
      while(next<ACTIONS&&g.targets[u*ACTIONS+next]===v)next++;
      if(!containsTarget(g.targets,v,u)){
        g.irreversibleEdges++;g.irreversibleActions+=next-k;
        if(g.witness===null){
          const a=boardAt(g,u),b=boardAt(g,v);let action=null;
          for(let from=0;from<9&&!action;from++)for(let to=0;to<9;to++)
            if(from!==to&&rank(move(a,from,to))===v){action={from,to};break;}
          assert.ok(action);
          g.witness={fromRank:u,toRank:v,A:a,B:b,action,legalReturnActions:0};
        }
      }
      k=next;
    }
  }
  g.audited=end;
}
export function result(g) {
  assert.equal(g.built,STATE_COUNT);assert.equal(g.audited,STATE_COUNT);
  return {
    scope:'A2 one-step reversibility only',
    sourceCommit:'d7f2cb0dc78b0e4fa1cfde5a0bd6c96171db95f6',
    modelGitBlob:'d4d826145b954ea71465ff87d185ee4d13b76e34',
    indexHtmlGitBlob:'0314905c63e4b38b947e15335e9bfa7c3a26f3e1',
    states:STATE_COUNT,actionsPerState:ACTIONS,totalActionTransitions:STATE_COUNT*ACTIONS,
    uniqueDirectedTransitions:g.uniqueEdges,duplicateActionTransitions:g.duplicateActions,
    irreversibleUniqueTransitions:g.irreversibleEdges,irreversibleActionTransitions:g.irreversibleActions,
    selfLoopActions:g.selfLoopActions,ignoredSameCellSelections:STATE_COUNT*9,
    coveredStates:g.audited,coverage:g.audited/STATE_COUNT,witness:g.witness,
    typedArrayBytes:g.boards.byteLength+g.targets.byteLength
  };
}
export function runAudit({progress=console.log}={}) {
  const g=createAudit();
  for(let end=40000;g.built<STATE_COUNT;end+=40000){
    buildRange(g,Math.min(end,STATE_COUNT));progress('built '+g.built+'/'+STATE_COUNT);
  }
  for(let end=40000;g.audited<STATE_COUNT;end+=40000){
    auditRange(g,Math.min(end,STATE_COUNT));progress('audited '+g.audited+'/'+STATE_COUNT);
  }
  return {graph:g,summary:result(g)};
}
if(typeof process!=='undefined'&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(runAudit().summary,null,2));

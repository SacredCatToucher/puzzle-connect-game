import {runInNewContext} from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const BASE_COMMIT='aa3bc1a6b3b72f950b3cfea7235e6ee5df58e343';
export const HTML_BLOB='0314905c63e4b38b947e15335e9bfa7c3a26f3e1';
export function loadOracle(file=new URL('../../index.html',import.meta.url)) {
  const html=readFileSync(file,'utf8');
  const blob=createHash('sha1').update('blob '+Buffer.byteLength(html)+'\0').update(html).digest('hex');
  if(blob!==HTML_BLOB) throw Error('index.html differs from audited v0.5 blob: '+blob);
  // Extract the actual untouched function bodies, not a second handwritten model.
  const gs=html.slice(html.indexOf('function groups(a)'),html.indexOf('function shuffled()'));
  const mv=html.slice(html.indexOf('function move(from,to)'),html.indexOf('function reset()'));
  if(!gs.startsWith('function groups(a)')||!mv.startsWith('function move(from,to)')) throw Error('Extraction failed');
  return runInNewContext('(function(){const n=3; let board,moves,selected; const $=()=>({textContent:""}); const render=()=>{};'+gs+mv+
    ';return {groups:a=>groups(a),move:(a,from,to)=>{board=a.slice();moves=0;move(from,to);return {board,moves}}}})()',{}, {timeout:1000});
}

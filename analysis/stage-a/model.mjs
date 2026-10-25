// Offline 3x3 state-transition model. Not imported by the shipped game.
export function validate(a) {
  if (a.length!==9 || new Set(a).size!==9 || a.some(v=>!Number.isInteger(v)||v<0||v>8))
    throw new RangeError('Expected a permutation of 0..8');
}
// Connected cells with equal (goal row - current row, goal column - current column).
// This independently expresses the original directional neighbor test.
export function groups(a) {
  const seen=new Uint8Array(9), out=[];
  const row=a.map((v,p)=>Math.floor(v/3)-Math.floor(p/3));
  const col=a.map((v,p)=>v%3-p%3);
  for(let i=0;i<9;i++) if(!seen[i]) {
    const g=[], stack=[i]; seen[i]=1;
    while(stack.length) {
      const p=stack.pop();g.push(p);
      for(const j of [p-3,p+3,p%3? p-1:-1,p%3<2?p+1:-1])
        if(j>=0&&j<9&&!seen[j]&&row[j]===row[p]&&col[j]===col[p]) {seen[j]=1;stack.push(j);}
    }
    out.push(g);
  }
  return out;
}
export function moveWithGroup(a, from, to, g) {
  const b=a.slice();
  if(from===to) return b; // no increment in the UI
  if(g.length===1) { [b[from],b[to]]=[b[to],b[from]];return b; }
  const dr=Math.floor(to/3)-Math.floor(from/3), dc=to%3-from%3;
  let sources=0,destinations=0;
  for(const p of g) {
    const r=Math.floor(p/3)+dr,c=p%3+dc;
    if(r>=0&&r<3&&c>=0&&c<3) {
      const q=r*3+c;sources|=1<<p;destinations|=1<<q;b[q]=a[p];
    }
  }
  const vacated=[],displaced=[];
  for(let p=0;p<9;p++) {
    if((sources&(1<<p))&&!(destinations&(1<<p))) vacated.push(p);
    if((destinations&(1<<p))&&!(sources&(1<<p))) displaced.push(a[p]);
  }
  for(let i=0;i<vacated.length;i++) b[vacated[i]]=displaced[i];
  return b;
}
export function move(a,from,to) {
  validate(a);
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||from>8||to<0||to>8) throw new RangeError('Invalid cell');
  return moveWithGroup(a,from,to,groups(a).find(g=>g.includes(from)));
}

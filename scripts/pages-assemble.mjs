import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export const gitBlob=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
export function validateConfig(c){
  assert.equal(typeof c.deploy,'boolean');
  for(const key of ['stableCommit','betaCommit','stableHtmlGitBlob','betaHtmlGitBlob'])assert.match(c[key],/^[a-f0-9]{40}$/);
  assert.match(c.betaHtmlSha256,/^[a-f0-9]{64}$/);return c;
}
export async function assemble(root,toolCommit='local-test'){
  const c=validateConfig(JSON.parse(await readFile(join(root,'.github/pages-beta.json'),'utf8')));
  const stable=await readFile(join(root,'stable-source/index.html'));
  const beta=await readFile(join(root,'beta-source/index.html'));
  assert.equal(gitBlob(stable),c.stableHtmlGitBlob,'stable homepage differs from approved v0.5');
  assert.equal(gitBlob(beta),c.betaHtmlGitBlob,'beta differs from pinned game commit');
  assert.equal(sha256(beta),c.betaHtmlSha256,'beta differs from already-built APK HTML');
  const out=join(root,'_site');await mkdir(join(out,'beta'),{recursive:true});
  await writeFile(join(out,'index.html'),stable);
  await writeFile(join(out,'beta/index.html'),beta);
  await writeFile(join(out,'.nojekyll'),'');
  const info={workflowCommit:toolCommit,stableCommit:c.stableCommit,stableHtmlGitBlob:c.stableHtmlGitBlob,
    stableHtmlSha256:sha256(stable),betaCommit:c.betaCommit,betaHtmlSha256:sha256(beta)};
  await writeFile(join(out,'_deployment.json'),JSON.stringify(info,null,2)+'\n');
  await writeFile(join(out,'beta/build-info.json'),JSON.stringify({channel:'beta',commit:c.betaCommit,htmlSha256:sha256(beta),workflowCommit:toolCommit},null,2)+'\n');
  return info;
}
if(typeof process!=='undefined'&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const root=process.cwd();
  if(process.argv[2]==='config'){
    const c=validateConfig(JSON.parse(await readFile('.github/pages-beta.json','utf8')));
    await appendFile(process.env.GITHUB_OUTPUT,[
      'enabled='+c.deploy,'stable='+c.stableCommit,'beta='+c.betaCommit,''
    ].join('\n'));
  }else console.log(await assemble(root,process.env.GITHUB_SHA));
}

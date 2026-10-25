import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {assemble,validateConfig} from './pages-assemble.mjs';
export async function runTests(root){
  const config=JSON.parse(await readFile(join(root,'.github/pages-beta.json'),'utf8'));
  let passed=0;const test=async(name,fn)=>{await fn();passed++};
  await test('assembly preserves homepage and APK game bytes at separate paths',async()=>{
    const info=await assemble(root,'test-workflow');
    assert.ok((await readFile(join(root,'_site/index.html'))).equals(await readFile(join(root,'stable-source/index.html'))));
    assert.ok((await readFile(join(root,'_site/beta/index.html'))).equals(await readFile(join(root,'beta-source/index.html'))));
    const manifest=JSON.parse(await readFile(join(root,'_site/beta/build-info.json'),'utf8'));
    assert.equal(manifest.commit,config.betaCommit);assert.equal(manifest.htmlSha256,config.betaHtmlSha256);
    assert.equal(info.stableCommit,config.stableCommit);
  });
  await test('stable tampering prevents artifact assembly',async()=>{
    const file=join(root,'stable-source/index.html'),original=await readFile(file);
    try{await writeFile(file,Buffer.concat([original,Buffer.from('tamper')]));await assert.rejects(()=>assemble(root),/stable homepage differs/)}
    finally{await writeFile(file,original)}
  });
  await test('beta tampering prevents artifact assembly',async()=>{
    const file=join(root,'beta-source/index.html'),original=await readFile(file);
    try{await writeFile(file,Buffer.concat([original,Buffer.from('tamper')]));await assert.rejects(()=>assemble(root),/beta differs/)}
    finally{await writeFile(file,original)}
  });
  await test('invalid commit hashes and string deploy values are rejected',async()=>{
    assert.throws(()=>validateConfig({...config,betaCommit:'main'}));
    assert.throws(()=>validateConfig({...config,deploy:'true'}));
  });
  // Rebuild after negative tests so the tested output remains the approved content.
  await assemble(root,'test-workflow');
  return {assemblyTests:passed,passed,failed:0};
}
if(typeof process!=='undefined'&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const source=process.cwd(),root=await mkdtemp(join(tmpdir(),'pages-assembly-test-'));
  await mkdir(join(root,'.github'));
  for(const name of ['stable-source','beta-source'])await cp(join(source,name),join(root,name),{recursive:true});
  await cp(join(source,'.github/pages-beta.json'),join(root,'.github/pages-beta.json'));
  console.log(await runTests(root));
}

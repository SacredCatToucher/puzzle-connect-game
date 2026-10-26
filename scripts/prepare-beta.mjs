import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const commit=process.env.GITHUB_SHA;
if(!/^[a-f0-9]{40}$/.test(commit??''))throw Error('GITHUB_SHA must identify the exact beta commit');
await mkdir('beta-site',{recursive:true});
await copyFile('index.html','beta-site/index.html');
const html=await readFile('index.html');
await writeFile('beta-site/build-info.json',JSON.stringify({
  channel:'beta',commit,htmlSha256:createHash('sha256').update(html).digest('hex'),
  androidApplicationId:'com.sacredcattoucher.puzzleconnect.beta.b15',androidVersionCode:3,
  note:'Website and APK must have identical index.html. This artifact is ready for independent hosting; it does not change stable Pages.'
},null,2)+'\n');
console.log('Prepared byte-identical beta-site/index.html for '+commit);

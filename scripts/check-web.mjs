import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
const html = readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert.ok(scripts.length, 'Missing inline script');
for (const [, source] of scripts) new Script(source, { filename: 'index.html:inline.js' });
for (const id of ['board','moves','groups','progress','new','photo','size']) {
  assert.ok(html.includes('id="'+id+'"'), 'Missing UI element: '+id);
}
assert.ok(html.includes('viewport'), 'Missing mobile viewport');
console.log('HTML prototype checks passed');

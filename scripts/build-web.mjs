import { mkdir, copyFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
// The Pages entry point remains the single source for both web and Android.
await mkdir('www', { recursive: true });
await copyFile('index.html', 'www/index.html');
assert.deepEqual(await readFile('www/index.html'), await readFile('index.html'));
console.log('Copied the unchanged web game to www/index.html');

import { readFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
const root=resolve(process.argv[2]||'.');
const manifest=JSON.parse(await readFile(resolve(root,'MIGRATION-MANIFEST.json'),'utf8'));
let failures=0;
for(const entry of manifest.files){
  const file=resolve(root,entry.path);
  if(!file.startsWith(root+sep))throw Error('Invalid manifest path');
  try{
    const digest=createHash('sha256');let bytes=0;
    for await(const chunk of createReadStream(file)){digest.update(chunk);bytes+=chunk.length;}
    if(bytes!==entry.bytes || digest.digest('hex')!==entry.sha256)throw Error('Digest mismatch');
  }catch{console.error(`Missing or changed: ${entry.path}`);failures++;}
}
console.log(`${manifest.files.length} files checked; ${failures} failures. Source: ${manifest.commit}`);
if(failures)process.exitCode=1;

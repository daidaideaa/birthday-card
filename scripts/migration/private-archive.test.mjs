import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
test('private migration authenticates before extraction and preserves exact bytes', () => {
  const temp=mkdtempSync(join(tmpdir(),'birthday-migration-'));
  try {
    const fixture=join(temp,'fixture.json'), plan=join(temp,'plan.json'), archive=join(temp,'private.enc'), password=join(temp,'password.txt');
    const content=Buffer.from('{"synthetic":"fixture — not a real key"}');
    writeFileSync(fixture,content);writeFileSync(plan,JSON.stringify({files:[{path:'settings/fixture.json',source:fixture}]}));
    const call=(...args)=>spawnSync(process.execPath,[resolve('scripts/migration/private-archive.mjs'),...args],{encoding:'utf8',input:existsSync(password)?readFileSync(password):''});
    assert.equal(call('encrypt',plan,archive,password).status,0);
    const out=join(temp,'restored');assert.equal(call('decrypt',archive,out).status,0);
    assert.deepEqual(readFileSync(join(out,'settings/fixture.json')),content);
    const next=join(temp,'next-private.enc');
    assert.equal(call('encrypt-with-password',plan,next).status,0);
    assert.notDeepEqual(readFileSync(next),readFileSync(archive),'same password uses fresh random salt and nonce');
    const nextOut=join(temp,'next-restored');
    assert.equal(call('decrypt',next,nextOut).status,0,'original password opens the new version');
    assert.deepEqual(readFileSync(join(nextOut,'settings/fixture.json')),content);
    assert.notEqual(call('decrypt',archive,out).status,0,'refuses to overwrite');
    const tampered=readFileSync(archive);tampered[tampered.length-1]^=1;writeFileSync(join(temp,'tampered.enc'),tampered);
    assert.notEqual(call('decrypt',join(temp,'tampered.enc'),join(temp,'bad')).status,0);
    assert.equal(existsSync(join(temp,'bad')),false,'tampering leaves no extracted data');
    writeFileSync(password,'incorrect');
    assert.notEqual(call('decrypt',archive,join(temp,'wrong')).status,0);
    assert.equal(existsSync(join(temp,'wrong')),false,'wrong password leaves no extracted data');
  } finally { rmSync(temp,{recursive:true,force:true}); }
});

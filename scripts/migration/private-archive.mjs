// Authenticated encryption for project credentials. No third-party dependencies.
// Never commit the password, decrypted directory, or the encryption input plan.
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
const MAGIC = Buffer.from('BIRTHDAY-PRIVATE-1\n');
const aad = Buffer.from('birthday-card project migration');
const derive = (password, salt) => scryptSync(password, salt, 32, { N:131072, r:8, p:1, maxmem:256*1024*1024 });
function safePath(root, name) {
  if (!name || /(^|[\\/])\.\.([\\/]|$)|^[\\/]|:/.test(name)) throw Error('Unsafe archive path');
  const file = resolve(root, name);
  if (!file.startsWith(resolve(root) + sep)) throw Error('Path outside output directory');
  return file;
}
async function absent(file) {
  try { await access(file); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
  throw Error('Output already exists; use a new destination.');
}
async function readPassword() {
  if (!process.stdin.isTTY) {
    let input=''; for await (const part of process.stdin) input+=part;
    return input.trim();
  }
  process.stdout.write('Archive password (hidden): ');
  process.stdin.setRawMode(true); process.stdin.resume();
  return await new Promise((done, reject) => {
    let value='';
    const finish=()=>{process.stdin.setRawMode(false);process.stdin.pause();process.stdin.off('data',read);process.stdout.write('\n');};
    const read=chunk=>{for(const c of chunk.toString()){
      if(c==='\u0003'){finish();reject(Error('Cancelled'));return;}
      if(c==='\r'||c==='\n'){finish();done(value);return;}
      if(c==='\u007f'||c==='\b')value=value.slice(0,-1);else if(c>=' ')value+=c;
    }};
    process.stdin.on('data',read);
  });
}
try {
  const [mode, input, output, passwordFile] = process.argv.slice(2);
  if (!input || !output) throw Error('Usage: node scripts/migration/private-archive.mjs decrypt private-settings.enc NEW_PRIVATE_DIRECTORY');
  if (mode === 'encrypt') {
    if (!passwordFile) throw Error('Password output path required');
    await absent(output); await absent(passwordFile);
    const plan=JSON.parse(await readFile(input,'utf8'));
    const files=[];
    for(const entry of plan.files){safePath('archive',entry.path);files.push({path:entry.path,data:(await readFile(entry.source)).toString('base64')});}
    const password=randomBytes(32).toString('base64url'),salt=randomBytes(32),iv=randomBytes(12);
    const cipher=createCipheriv('aes-256-gcm',derive(password,salt),iv);cipher.setAAD(aad);
    const encrypted=Buffer.concat([cipher.update(JSON.stringify({schema:1,files,notes:plan.notes})),cipher.final()]);
    await writeFile(output,Buffer.concat([MAGIC,salt,iv,cipher.getAuthTag(),encrypted]),{flag:'wx',mode:0o600});
    await writeFile(passwordFile,password+'\n',{flag:'wx',mode:0o600});
    console.log(`Encrypted ${files.length} project files. Password saved separately; do not upload it.`);
  } else if (mode === 'decrypt') {
    await absent(output);
    const blob=await readFile(input),n=MAGIC.length;
    if (!blob.subarray(0,n).equals(MAGIC) || blob.length<n+60) throw Error('Invalid archive');
    const password=await readPassword();
    const decipher=createDecipheriv('aes-256-gcm',derive(password,blob.subarray(n,n+32)),blob.subarray(n+32,n+44));
    decipher.setAAD(aad);decipher.setAuthTag(blob.subarray(n+44,n+60));
    // Authenticate every byte before creating files. Wrong passwords cannot leave partial secrets.
    const data=JSON.parse(Buffer.concat([decipher.update(blob.subarray(n+60)),decipher.final()]).toString());
    if(data.schema!==1 || !Array.isArray(data.files))throw Error('Invalid archive schema');
    const targets=data.files.map(e=>({file:safePath(output,e.path),bytes:Buffer.from(e.data,'base64')}));
    for(const target of targets){await mkdir(dirname(target.file),{recursive:true});await writeFile(target.file,target.bytes,{flag:'wx',mode:0o600});}
    console.log(`Restored ${targets.length} files into ${resolve(output)}. Live accounts and services were not modified.`);
  } else throw Error('Expected encrypt or decrypt');
} catch (error) { console.error(error.message); process.exitCode=1; }

import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import validator from 'gltf-validator';
const root='.asset-build/character-review/public/review-assets/characters-v1';
const manifest=JSON.parse(await readFile(`${root}/manifest.json`,'utf8'));
const files=[];
for(const [actor,poses] of Object.entries(manifest.characters))for(const pose of poses){
 const bytes=await readFile(`${root}/${pose.file}`);
 const report=await validator.validateBytes(new Uint8Array(bytes),{uri:pose.file,maxIssues:30});
 files.push({...pose,actor,sha256:createHash('sha256').update(bytes).digest('hex'),errors:report.issues.numErrors,warnings:report.issues.numWarnings,messages:report.issues.messages});
 console.log(`${pose.file}: ${(bytes.length/1048576).toFixed(2)} MiB, errors ${report.issues.numErrors}, warnings ${report.issues.numWarnings}`);
}
await mkdir('.asset-build/character-review/validation',{recursive:true});
await writeFile('.asset-build/character-review/validation/gltf.json',JSON.stringify(files,null,2));
await mkdir('assets/review',{recursive:true});
await writeFile('assets/review/characters-v1.json',JSON.stringify({version:'characters-v1',kind:'static-character-inspection-poses',reviewOnly:true,visualApproval:'pending',runtimeChoreography:false,delivery:{app:'GitHub Pages',media:'Cloudflare R2 via existing media endpoint',published:false},sources:[{character:'snow',creator:'Blender Foundation / Blender Studio',url:'https://studio.blender.org/characters/snow/v4/',license:'CC-BY-4.0'},{character:'rain',creator:'Blender Foundation / Blender Studio',url:'https://studio.blender.org/characters/rain/v3/',license:'CC-BY-4.0'}],files:files.map(f=>Object.fromEntries(Object.entries(f).filter(([key])=>key!=='messages')))},null,2));
if(files.some(f=>f.errors))process.exitCode=1;

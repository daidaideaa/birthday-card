import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import validator from 'gltf-validator';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
const version=process.argv[2]||'characters-v2';
if(!/^characters-v[12]$/.test(version))throw Error('Unknown character version');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const root=`.asset-build/character-review/public/review-assets/${version}`;
const manifest=JSON.parse(await readFile(`${root}/manifest.json`,'utf8'));
const files=[];
for(const [actor,poses] of Object.entries(manifest.characters))for(const pose of poses){
 const bytes=await readFile(`${root}/${pose.file}`);
 // Khronos does not decode EXT_meshopt_compression. Validate actual decoded
 // accessors too, not merely the compressed container's metadata.
 const decoded=await io.read(`${root}/${pose.file}`);
 for(const extension of decoded.getRoot().listExtensionsUsed())if(extension.extensionName==='EXT_meshopt_compression')extension.dispose();
 const report=await validator.validateBytes(await io.writeBinary(decoded),{uri:pose.file,maxIssues:30});
 files.push({...pose,actor,sha256:createHash('sha256').update(bytes).digest('hex'),errors:report.issues.numErrors,warnings:report.issues.numWarnings,messages:report.issues.messages});
 console.log(`${pose.file}: ${(bytes.length/1048576).toFixed(2)} MiB, errors ${report.issues.numErrors}, warnings ${report.issues.numWarnings}`);
}
await mkdir('.asset-build/character-review/validation',{recursive:true});
await writeFile(`.asset-build/character-review/validation/${version}-gltf.json`,JSON.stringify(files,null,2));
await mkdir('assets/review',{recursive:true});
await writeFile(`assets/review/${version}.json`,JSON.stringify({version,kind:'static-character-inspection-poses',reviewOnly:true,visualApproval:'pending',runtimeChoreography:false,delivery:{app:'GitHub Pages compatible independent static preview',media:'GitHub migration release; production Cloudflare release unchanged',published:false},sources:[{character:'snow',creator:'Blender Foundation / Blender Studio',url:'https://studio.blender.org/characters/snow/v4/',license:'CC-BY-4.0'},{character:'rain',creator:'Blender Foundation / Blender Studio',url:'https://studio.blender.org/characters/rain/v3/',license:'CC-BY-4.0'}],files:files.map(f=>Object.fromEntries(Object.entries(f).filter(([key])=>key!=='messages')))},null,2));
if(files.some(f=>f.errors))process.exitCode=1;

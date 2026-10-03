import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.argv[2]||'http://127.0.0.1:5181/birthday-card/character-review.html';
const out='.asset-build/character-review/check';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--use-angle=d3d11']});
const report={base,checks:[],errors:[]};
for(const [name,viewport]of [['desktop',{width:1440,height:1050}],['mobile',{width:390,height:844}]]){
 const page=await browser.newPage({viewport,deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.url().includes('127.0.0.1')&&r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`)});
 await page.goto(base);await page.locator('[data-ready=true]').waitFor({timeout:60000});
 const click=async(name)=>{await page.getByRole('button',{name,exact:true}).click();await page.locator('[data-ready=true]').waitFor({timeout:60000});await page.waitForTimeout(250)};
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${out}/${name}-pair.png`});
 await click('女角色');await click('全身');await click('坐姿');await click('侧面');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${out}/${name}-seated.png`});
 await click('自然站姿');await click('脸与肩颈');await click('正面');await click('暮色光');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${out}/${name}-dusk.png`});
 await page.getByRole('button',{name:'第四章 · 角色稿',exact:true}).click();await page.waitForTimeout(600);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${out}/${name}-references.png`,fullPage:true});
 await page.getByRole('button',{name:'第三章 · 人物',exact:true}).click();await page.locator('[data-ready=true]').waitFor({timeout:60000});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 report.checks.push({viewport:name,loaded:true,tabReentry:true,overflow});if(overflow)report.errors.push(`${name} overflow`);
 await page.close();
}
await browser.close();await writeFile(`${out}/browser.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.errors.length)process.exitCode=1;

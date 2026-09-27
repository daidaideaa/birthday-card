import {chromium} from '@playwright/test';
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>console.log(e.message));
await page.goto('http://127.0.0.1:5181/birthday-card/character-review.html');await page.locator('[data-ready=true]').waitFor();
async function click(name){await page.getByRole('button',{name,exact:true}).click();await page.locator('[data-ready=true]').waitFor();await page.waitForTimeout(400);}
for(const [actor,label] of [['男角色','man'],['女角色','woman']]){
 await click(actor);await click('微笑');await click('四分之三');await page.screenshot({path:`.asset-build/character-review/web/${label}-smile.png`});
 await click('抬手');await page.screenshot({path:`.asset-build/character-review/web/${label}-hands.png`});
 await click('坐姿');await click('全身');await page.screenshot({path:`.asset-build/character-review/web/${label}-sitting.png`});
 await click('侧面');await page.screenshot({path:`.asset-build/character-review/web/${label}-sitting-side.png`});
 await click('自然站姿');await click('脸与肩颈');await click('正面');
}
await browser.close();

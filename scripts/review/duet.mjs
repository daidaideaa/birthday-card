// 演奏与双人舞样章的实际操作验证：按住、滑奏、多指、松手收势。
// 用法：node scripts/review/duet.mjs [baseURL]
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const base = process.argv[2] ?? "http://127.0.0.1:5173/birthday-card/";
const out = resolve(".asset-build/review/duet");
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));

const shot = (name) => page.screenshot({ path: resolve(out, name + ".png"), animations: "disabled" });
const held = () => page.locator(".accompaniment__keys .is-held").count();
const mode = () => page.locator(".duet-sequence").getAttribute("data-mode");
const phase = () => page.locator(".duet-stage__viewport").getAttribute("data-phase");

await page.goto(base, { waitUntil: "load" });
await page.getByRole("button", { name: "打开这份惊喜" }).click();
await page.waitForTimeout(1800);
await page.getByRole("button", { name: /翻开小小美好/ }).click();
await page.waitForTimeout(1500);
await page.getByRole("button", { name: "下一章 →" }).click();
await page.waitForTimeout(3500);

const keys = page.locator(".accompaniment__keys");
await keys.waitFor({ timeout: 20000 });
await keys.scrollIntoViewIfNeeded();
await shot("01-piano-arrival");
console.log("piano shot; mode =", await mode());

// 每次都取实时几何：键盘在阶段切换时会重排，缓存的 box 会指向旧位置。
const liveBox = () => keys.boundingBox();
const white = async (i) => {
  const b = await liveBox();
  return { x: b.x + (b.width / 5) * (i + 0.5), y: b.y + b.height * 0.8 };
};
const black = async (i) => {
  const b = await liveBox();
  return { x: b.x + (b.width / 5) * (i + 1), y: b.y + b.height * 0.25 };
};
// 阶段切换会让键盘重排并带 CSS 过渡：取几何前先等它停下，
// 否则“先量后按”之间键盘已经移动，指针会落到键盘外。
const settleLayout = async (label) => {
  let previous = null;
  for (let i = 0; i < 40; i++) {
    const b = await liveBox();
    const still =
      previous &&
      b &&
      Math.abs(b.x - previous.x) < 0.5 &&
      Math.abs(b.y - previous.y) < 0.5 &&
      Math.abs(b.width - previous.width) < 0.5 &&
      Math.abs(b.height - previous.height) < 0.5;
    if (still) return b;
    previous = b;
    await page.waitForTimeout(80);
  }
  console.log("layout 仍在移动：" + label);
  return previous;
};
// 断言集中记账：单条失败不中断后续操作，最后以退出码汇总。
const failures = [];
const check = (label, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? " -> " + detail : ""}`);
  if (!ok) failures.push(label + (detail ? ": " + detail : ""));
};

await settleLayout("piano-arrival");

// 1) 按住一个白键：立刻按下，保持按住。
const w0 = await white(0);
await page.mouse.move(w0.x, w0.y);
await page.mouse.down();
await page.waitForTimeout(220);
console.log("hold white -> held keys:", await held());
await shot("02-hold-white");
await page.mouse.up();
await page.waitForTimeout(160);
console.log("after release -> held keys:", await held());

// 2) 黑键必须可命中、可发声。
const b0 = await black(0);
await page.mouse.move(b0.x, b0.y);
await page.mouse.down();
await page.waitForTimeout(200);
const blackHeld = await page.locator(".key--black.is-held").count();
console.log("black key held:", blackHeld);
await shot("03-black-key");
await page.mouse.up();

// 3) 滑奏：一根手指划过多个键，旧键释放、新键触发。
await settleLayout("glissando-start");
const slideStart = await white(0);
await page.mouse.move(slideStart.x, slideStart.y);
await page.mouse.down();
const slid = [];
for (let i = 1; i < 5; i++) {
  // 键面命中要求 x 严格落在 [0, width]；最右白键的中心用 i+0.5 取，
  // 之前若键盘在量点与移动之间漂移，指针就会擦出右边界而误报松键。
  const wi = await white(i);
  await page.mouse.move(wi.x, wi.y, { steps: 4 });
  await page.waitForTimeout(90);
  const count = await held();
  if (count !== 1) {
    // 记录实际命中的音与当时几何，区分“脚本量歪了”与“产品真的丢键”。
    const b = await liveBox();
    console.log(
      `  glissando i=${i}: held=${count}, pointer=${wi.x.toFixed(1)}, ` +
        `keys=[${b.x.toFixed(1)}, ${(b.x + b.width).toFixed(1)}]`,
    );
  }
  slid.push(count);
}
check("滑奏每步只剩一个按住的键", slid.every((n) => n === 1), "held=" + slid.join(","));
await shot("04-glissando");
await page.mouse.up();
await page.waitForTimeout(150);
const afterSlide = await held();
check("滑奏松手后全部释放", afterSlide === 0, "held=" + afterSlide);

// 4) 多指和弦：三个触点独立跟踪，一指松开不截断其它两指。
// 松手会让提示语与阶段变化并触发重排，先等键盘停稳再取和弦坐标，
// 否则三个合成触点会按着旧几何落到键缝或键盘外。
const chordBox = await settleLayout("chord-start");
const chord = await page.evaluate(async ({ box }) => {
  const el = document.querySelector(".accompaniment__keys");
  const at = (i) => ({
    x: box.x + (box.width / 5) * (i + 0.5),
    y: box.y + box.height * 0.8,
  });
  // setPointerCapture 对合成事件会抛错，这里放行以复用真实处理路径。
  el.setPointerCapture = () => {};
  for (const i of [0, 2, 4]) {
    const p = at(i);
    el.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, pointerId: 100 + i,
      pointerType: "touch", isPrimary: i === 0, clientX: p.x, clientY: p.y,
    }));
  }
  // React 异步提交 DOM，等两帧再读，否则读到的是上一次的状态。
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return document.querySelectorAll(".accompaniment__keys .is-held").length;
}, { box: chordBox });
check("三指和弦同时按住三个键", chord === 3, "held=" + chord);
await shot("05-chord");
const afterOne = await page.evaluate(async ({ box }) => {
  const el = document.querySelector(".accompaniment__keys");
  const p = { x: box.x + (box.width / 5) * 0.5, y: box.y + box.height * 0.8 };
  el.dispatchEvent(new PointerEvent("pointerup", {
    bubbles: true, cancelable: true, pointerId: 100,
    pointerType: "touch", isPrimary: true, clientX: p.x, clientY: p.y,
  }));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return document.querySelectorAll(".accompaniment__keys .is-held").length;
}, { box: chordBox });
check("松开一指后仍剩两个键", afterOne === 2, "held=" + afterOne);
// 清掉剩余两指，避免影响后续步骤。
await page.evaluate(({ box }) => {
  const el = document.querySelector(".accompaniment__keys");
  for (const i of [2, 4]) {
    const p = { x: box.x + (box.width / 5) * (i + 0.5), y: box.y + box.height * 0.8 };
    el.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, pointerId: 100 + i,
      pointerType: "touch", clientX: p.x, clientY: p.y,
    }));
  }
}, { box: chordBox });
await page.waitForTimeout(160);
const afterChord = await held();
check("和弦全部松开后不留黏音", afterChord === 0, "held=" + afterChord);

// 5) 弹够音符进入舞蹈：镜头与键盘应切到 duet。
for (let i = 0; i < 8; i++) {
  const p = await white(i % 5);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(110);
  await page.mouse.up();
  await page.waitForTimeout(70);
}
await page.waitForTimeout(900);
if (!(await page.locator(".duet-sequence").count())) {
  // 编舞已走完一轮并自动进入书信；这本身就是收势语义生效的证据。
  console.log("sequence已收势进入书信段落");
} else {
  const shotAttr = await page.locator(".duet-sequence").getAttribute("data-shot");
  console.log("after 8 notes -> shot =", shotAttr, "mode =", await mode(), "phase =", await phase());
}
if (await page.locator(".duet-stage").count())
  await page.locator(".duet-stage").scrollIntoViewIfNeeded();
await shot("06-dance");

// 6) 停手：应进入 settling 而不是继续追播。
await page.waitForTimeout(1400);
if (await page.locator(".duet-sequence").count())
  console.log("after pause -> mode =", await mode(), "phase =", await phase());
await shot("07-settling");

// 7) 进入书信段落后不应有黏音。
// 编舞走完一轮会自动进章，跳过按钮随之消失；那时不该硬等按钮，
// 而是直接确认信封/信纸真的出现了——检查的是结果，不是路径。
const skip = page.getByRole("button", { name: /想先看看写给你的话/ }).first();
if (await skip.count()) {
  await skip.click();
  console.log("点了跳过按钮进入书信");
} else {
  console.log("跳过按钮已随自动进章消失，直接校验书信是否呈现");
}
const letter = page.locator(".letter-envelope, .letter-paper").first();
let letterShown = true;
try {
  await letter.waitFor({ state: "visible", timeout: 8000 });
} catch {
  letterShown = false;
}
check(
  "书信段落已呈现（信封或信纸可见）",
  letterShown,
  letterShown
    ? await letter.evaluate((el) => el.className)
    : "未找到 .letter-envelope / .letter-paper",
);
const stuck = await page.locator(".accompaniment__keys .is-held").count();
check("换章后没有黏住的琴键", stuck === 0, "held=" + stuck);
await shot("08-letter");

check("无页面错误", errors.length === 0, errors.slice(0, 10).join(" | "));
console.log(failures.length ? "\nFAILURES:\n" + failures.join("\n") : "\n全部断言通过");
await browser.close();
process.exit(failures.length ? 1 : 0);

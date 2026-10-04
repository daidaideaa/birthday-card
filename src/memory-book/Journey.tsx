import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { SandKit } from './vendor/sandkit/index.js';
import type { ShapeSource } from './vendor/sandkit/index.js';
import './journey.css';

type PlaceId = 'zhoukou' | 'tianjin' | 'beijing' | 'hongkong' | 'wuhan' | 'nanjing' | 'shanghai' | 'shenzhen';
type Place = { id: PlaceId; city: string; region: string; school?: string; motif: string; owner: 'her' | 'me' | 'both'; line: string; caption: string };
const PLACES: Place[] = [
  { id: 'zhoukou', city: '周口', region: '河南', motif: '古城门阙 · 沙颍河', owner: 'her', line: '你的故事，从河南周口开始。', caption: '还没有相遇的时候，世界已经在认真写你。' },
  { id: 'tianjin', city: '天津', region: '海河之畔', motif: '天津之眼 · 海河', owner: 'her', line: '后来，你走向了天津。', caption: '一座城，成为下一页的开头。' },
  { id: 'beijing', city: '北京', region: '求学的这一页', school: '中国政法大学', motif: '古都檐影', owner: 'her', line: '在北京，写下认真而明亮的一页。', caption: '中国政法大学，留在你的来路里。' },
  { id: 'hongkong', city: '香港', region: '越过山海', school: '香港科技大学', motif: '山海 · 维港帆影', owner: 'her', line: '从北京到香港，山海也成为书页。', caption: '香港科技大学，和更辽阔的远方。' },
  { id: 'shenzhen', city: '深圳', region: '南方的这一程', motif: '城市天际线 · 海湾', owner: 'her', line: '你的路，来到了深圳。', caption: '先把这一页留在这里，书还想讲另一条来路。' },
  { id: 'wuhan', city: '武汉', region: '湖北', motif: '黄鹤楼 · 长江', owner: 'me', line: '而我的故事，从湖北武汉开始。', caption: '另一页，另一条向前走的路。' },
  { id: 'nanjing', city: '南京', region: '求学的这一页', school: '东南大学', motif: '城门 · 梧桐', owner: 'me', line: '经过南京，也经过自己的春夏。', caption: '东南大学，是我来路中的一站。' },
  { id: 'shanghai', city: '上海', region: '继续向前', school: '上海交通大学', motif: '浦江 · 东方明珠', owner: 'me', line: '又从南京，走到了上海。', caption: '上海交通大学之后，这条路也写向了深圳。' },
  { id: 'shenzhen', city: '深圳', region: '同一座城，另一条来路', motif: '城市天际线 · 海湾', owner: 'me', line: '我的路，也终于写到了深圳。', caption: '曾经各自向前的我们，来到了同一座城。' },
  { id: 'shenzhen', city: '深圳', region: '两条来路，终于同页', motif: '中国地图 · 深圳相遇', owner: 'both', line: '各自走来的路，从这里开始并肩。', caption: '后来，在深圳，我遇见了你。' },
];
// Natural Earth 1:110m generalized geographic outline, public domain.
// Source: github.com/nvkelso/natural-earth-vector — ne_110m_admin_0_countries.geojson
// Equirectangular display at latitude 36.9 degrees; not a campus or navigation map.
const CHINA_OUTLINE = 'M650.7 736.5L639.2 731.1L638.8 716.1L645.7 708.1L661 703.2L669 703.6L672.1 710.3L666 718L662.7 728.1L650.7 736.5ZM241.6 313.9L240.5 303.9L250.1 299.3L237.5 268.9L265.3 262L272.4 258.1L282.5 226.7L310.3 232.5L318.1 224.6L318.8 207L330.4 205.4L341 193.7L346.5 192.3L350.2 204.5L362 213.8L381.9 220.4L391.6 234.5L386.2 254.9L391.2 262.5L407.9 265.5L426.7 267.9L443.6 278.8L452.3 280.8L458.7 296.9L466.9 307.3L482.3 306.9L511.2 310.8L529.8 308.4L543.7 311L564.4 321.6L581.3 321.6L587.5 327L603.8 317.6L626.4 311.6L647.4 310.9L663.8 304.8L673.8 295.4L683.6 289.5L681.3 283.7L676.9 277L684.2 265.7L692.1 267.3L706.5 270.8L720.4 261.6L741.8 254.8L752.1 243.2L761.9 238.2L782.2 235.9L793.3 237.9L794.8 231.7L782.1 219.4L770.9 213.8L760.1 220.3L746.3 217.6L738.4 219.8L734.8 212.6L744.7 195.1L751.5 182L768.3 188.6L788 177.5L787.9 169.8L800.5 151.2L808.3 145.6L808.2 136L800.5 131.8L812 123.1L829.4 119.9L848 119.5L869 124.7L881.2 131.1L889.9 148.8L895.1 156.3L900 167.1L905.2 184.2L929.6 189.8L946.2 202.2L951.8 218.7L973.1 218.7L985.2 211.8L1008.4 206.6L1001 222.4L995.6 228.8L990.8 248L981.4 265L964.4 261.9L952.4 268.1L956 283L954 303.7L946.9 304.2L947 313.1L937.9 302.8L932.4 312.6L910.7 320.1L912.9 329.3L900.8 328.7L894.2 323.2L884.5 335.6L869.1 345L857.7 356.3L838.1 361.3L827.8 369.5L812.8 374.3L820.2 366.2L817.3 359.4L828.4 347.6L821 338.4L808.8 344.6L793 356.8L784.3 368.1L770.6 368.9L763.5 377.1L770.8 388.9L782.3 391.8L782.8 399.7L793.8 404.8L809.5 392.3L822 399.1L831 399.5L833.3 408.7L813.5 413.6L806.9 423L793.3 431.8L786.1 444.1L801.2 453.7L806.7 470.9L815.2 486.9L824.7 500.4L824.5 513.4L815.7 518.2L819 527.5L827.3 532.9L825.1 547.2L821.6 561.1L813.8 562.6L803.5 581.6L792.2 604.5L779.2 625.4L759.9 641.6L740.5 656.3L724.7 658.3L716.1 666.1L711.3 660.4L703.4 669.1L683.8 677.9L669 680.5L664.2 699L656.5 700.1L652.8 687.4L656.1 680.6L637.3 675L630.7 677.8L616.6 673.3L609.9 666.2L612.2 656.1L599.4 652.9L592.6 646.3L580.7 655.7L567.1 657.7L555.9 657.6L548.4 661.9L541.1 664.4L543.2 684.4L535.8 684L534.5 679.9L534.1 672.6L523.8 677.7L517.8 674.5L507.4 667.9L511.4 653.4L502.6 650L499.2 633.9L484.5 636.8L486.1 616L499.4 601.4L500 587L499.6 573.6L493.4 569.4L488.8 559.1L480.6 560.4L465.5 557.8L470.2 550.5L463.6 539.6L453.7 546.9L441.9 542.6L425.8 553.8L413 566.8L401.8 569L395.6 564.3L388.2 563.9L378.2 559.8L370.7 564.3L361.4 577.3L360.2 563.5L351.7 567.2L335.4 565.5L319.5 561.4L308.2 553.8L297.3 550.3L292.6 541.9L284.7 539.4L270.6 528L259.4 522.6L253.6 526.8L234.1 514.6L220.3 503.5L216.4 484.2L226.5 486.5L226.9 477.6L221.4 468.6L222.8 454.4L207.7 433.9L184.7 426.8L180.6 413.3L170.2 405.2L167.7 400.2L165.6 390.2L166.1 383.4L157.6 379.4L153 381.1L149.5 365L153.4 360.9L151.5 356.9L164.9 348.6L174.5 345.2L189.4 347.5L194.7 336.3L212.6 334.3L217.6 327.3L239.7 317.8L241.6 313.9ZM822.9 628.1L814.5 656.2L808.5 670.5L801.1 655.7L799.5 642.8L807.7 625.6L818.9 612.3L825.3 617.5L822.9 628.1Z';
const ART_WIDTH = 1280;
const ART_HEIGHT = 850;
const LAST = PLACES.length - 1;
// Reading time is part of the film, independent of particle frame rate or WebGL.
// Arrival → a settled landmark → a second thought → sand carries us onward.
const SHOTS = [
  { duration: 10400, secondLine: 5700, zoom: [1, 1.065], pan: [-7, 4] },
  { duration: 9400, secondLine: 4900, zoom: [1.015, 1.06], pan: [8, -6] },
  { duration: 11600, secondLine: 6100, zoom: [1, 1.07], pan: [-5, 3] },
  { duration: 12000, secondLine: 6300, zoom: [1.065, 1.01], pan: [10, -9] },
  { duration: 9200, secondLine: 4800, zoom: [1.01, 1.045], pan: [-6, 5] },
  { duration: 11200, secondLine: 6100, zoom: [1, 1.07], pan: [6, -4] },
  { duration: 11600, secondLine: 6200, zoom: [1.01, 1.06], pan: [-5, 5] },
  { duration: 12000, secondLine: 6500, zoom: [1.06, 1.01], pan: [8, -7] },
  { duration: 9800, secondLine: 5200, zoom: [1.015, 1.055], pan: [-6, 3] },
  { duration: 16000, secondLine: 8900, zoom: [1, 1.025], pan: [0, 0] },
];
// Cities: Natural Earth ne_10m_populated_places_simple (public domain).
// The user confirmed Zhoukou, Henan, as her starting city.
const MAP_POINTS = [
  { id: 'zhoukou', label: '河南 · 周口', lon: 114.65, lat: 33.62, dx: -61, dy: -4 },
  { id: 'tianjin', label: '天津', lon: 117.196607, lat: 39.082772, dx: 31, dy: 10 },
  { id: 'beijing', label: '北京', lon: 116.394201, lat: 39.901720, dx: -30, dy: -28 },
  { id: 'hongkong', label: '香港', lon: 114.183064, lat: 22.306927, dx: 45, dy: 39 },
  { id: 'shenzhen', label: '深圳 · 相遇', lon: 114.061154, lat: 22.548097, dx: -71, dy: 22 },
  { id: 'wuhan', label: '武汉', lon: 114.268071, lat: 30.581977, dx: -44, dy: 2 },
  { id: 'nanjing', label: '南京', lon: 118.778029, lat: 32.051965, dx: -10, dy: -27 },
  { id: 'shanghai', label: '上海', lon: 121.434559, lat: 31.218398, dx: 39, dy: 13 },
];
const mapPosition = (point: { lon: number; lat: number }) => [140 + (point.lon - 73) * 14, 110 + (54 - point.lat) * 17.5];
const mapRoute = (ids: string[]) => ids.map((id, i) => `${i ? 'L' : 'M'}${mapPosition(MAP_POINTS.find((point) => point.id === id)!).join(' ')}`).join('');
const MAP_ROUTES = [mapRoute(['zhoukou', 'tianjin', 'beijing', 'hongkong', 'shenzhen']), mapRoute(['wuhan', 'nanjing', 'shanghai', 'shenzhen'])];
const MEETING = mapPosition(MAP_POINTS[4]);
type FallingGrain = { x: number; y: number; vx: number; vy: number; life: number; size: number; shade: number };

// SandKit is MIT licensed, Copyright (c) 2026 Linkly AI. The original distribution
// and full license are preserved in vendor/sandkit. Story and drawings are ours.
const DRAWING_PATHS: Record<PlaceId, string[]> = {
  zhoukou: ['M277 606H1020M382 553V353H897V553', 'M328 320Q438 330 640 246Q842 330 952 320', 'M85 661Q260 597 451 664T879 665T1200 651'],
  tianjin: ['M907 365A247 247 0 1 1 413 365A247 247 0 1 1 907 365', 'M500 662L660 365L820 662M240 604H1080', 'M100 724Q374 657 682 708T1200 700'],
  beijing: ['M355 461Q459 475 650 376Q841 475 945 461', 'M426 357Q515 365 650 283Q785 365 874 357', 'M240 639Q650 681 1050 639M282 674H1010'],
  hongkong: ['M35 530Q164 493 332 279Q403 302 524 446Q632 304 751 390Q927 236 1239 480', 'M262 587H1070', 'M549 654L691 684L757 642M643 650V451Q704 485 722 610L647 605'],
  wuhan: ['M400 532Q505 548 650 475Q795 548 900 532', 'M466 352Q555 368 650 295Q745 368 834 352', 'M81 671H1192M81 650H1192'],
  nanjing: ['M247 647V528H331V449H968V528H1041V647', 'M410 331Q514 341 650 266Q786 341 890 331', 'M202 711Q422 647 663 695T1106 711'],
  shanghai: ['M577 635L651 411V124M651 411L725 635', 'M832 635V309L864 280L897 309V635M941 633Q901 409 980 174Q960 411 1025 633', 'M108 677Q352 618 611 679T1193 674'],
  shenzhen: ['M689 635L708 253L752 121L795 253L814 635', 'M340 635V470Q399 445 424 340Q449 445 509 470V635', 'M87 679Q362 621 654 684T1193 673'],
};
function randomGenerator(seed: number) {
  let n = seed;
  return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
}
function stroke(ctx: CanvasRenderingContext2D, d: string, color = '#b69157', width = 1.6) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(new Path2D(d));
}
function fill(ctx: CanvasRenderingContext2D, d: string, color: string) {
  ctx.fillStyle = color; ctx.fill(new Path2D(d));
}
function tree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, seed: number) {
  const random = randomGenerator(seed);
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  fill(ctx, 'M-10 0Q-5-64-17-110Q-32-145-20-174Q-18-130 9-107Q4-77 14 0Z', '#8f7145');
  ['M0-70Q-39-98-67-110Q-110-117-134-144', 'M-2-89Q33-124 58-155Q91-173 130-176', 'M-15-117Q-58-157-53-208', 'M-16-125Q9-173 16-218', 'M-30-142Q-84-172-112-186', 'M10-111Q65-128 99-127Q132-129 154-151'].forEach((d) => stroke(ctx, d, '#b79760', 3.5));
  for (let i = 0; i < 275; i += 1) {
    const angle = random() * Math.PI * 2; const radius = Math.sqrt(random());
    ctx.fillStyle = '#af8950'; ctx.globalAlpha = .22 + random() * .6;
    ctx.beginPath(); ctx.ellipse(Math.cos(angle) * radius * 177, -170 + Math.sin(angle) * radius * 75, 3 + random() * 8, 2 + random() * 5, random() * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function water(ctx: CanvasRenderingContext2D, seed: number, low = 570, high = 730) {
  const random = randomGenerator(seed);
  for (let i = 0; i < 190; i += 1) {
    const y = low + random() * (high - low); const x = 80 + random() * 1100; const length = 5 + random() * 59;
    ctx.globalAlpha = .12 + (1 - Math.abs(x - 640) / 640) * .36;
    stroke(ctx, `M${x} ${y}q${length / 2} -2 ${length} 0`, '#ae8b56', .7 + random() * 1.6);
  }
  ctx.globalAlpha = 1;
}
function moon(ctx: CanvasRenderingContext2D, x = 800, y = 220, radius = 72) {
  ctx.save(); ctx.strokeStyle = '#b48f54'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(x, y, radius + 6, .5, 4.5); ctx.stroke();
  ctx.restore();
}
/** Original city silhouettes; the university names are separate from these regional images. */
function roof(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, rise: number) {
  const a = x - w / 2; const b = x + w / 2;
  const d = `M${a} ${y-16}Q${a+w*.18} ${y-2} ${x} ${y-rise}Q${b-w*.18} ${y-2} ${b} ${y-16}L${b-13} ${y+10}Q${x} ${y+27} ${a+13} ${y+10}Z`;
  ctx.save(); ctx.globalAlpha = .24; fill(ctx, d, '#a58853'); ctx.restore(); stroke(ctx, d, '#a58853', 3);
  stroke(ctx, `M${a+9} ${y+3}Q${x} ${y+18} ${b-9} ${y+3}`, '#a58853', 1.6);
  for (let i=1;i<18;i++) { const t=i/18; const xx=a+w*t; const top=y-rise*(1-Math.abs(t*2-1))**1.55; stroke(ctx, `M${xx} ${top+6}Q${xx-(x-xx)*.03} ${y} ${xx} ${y+9}`, '#a58853', .9); }
}
function colonnade(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, count: number) {
  ctx.save(); ctx.globalAlpha = .12; fill(ctx, `M${x-w/2} ${y}h${w}v${h}h${-w}Z`, '#a58853'); ctx.restore();
  for(let i=0;i<=count;i++) {
    const xx=x-w/2+w*i/count; stroke(ctx, `M${xx} ${y}v${h}`, '#a58853', 4.6);
    if(i<count) { const gap=w/count; stroke(ctx, `M${xx+8} ${y+10}h${gap-16}v${h-20}h${16-gap}ZM${xx+gap/2} ${y+11}v${h-22}`, '#a58853', 1); }
  }
  stroke(ctx, `M${x-w/2-13} ${y+h}h${w+26}m${-w-26} 8h${w+26}`, '#a58853', 2.5);
}
function pagoda(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, tiers: number) {
  ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale);
  for(let i=0;i<tiers;i++) {
    const yy=-i*88; const w=490-i*64;
    colonnade(ctx,0,yy-55,w*.68,65,6); roof(ctx,0,yy-62,w,72);
    stroke(ctx,`M${-w*.41} ${yy+8}h${w*.82}m${-w*.82} -14h${w*.82}`,'#a58853',2);
  }
  const tip=-(tiers-1)*88-138; stroke(ctx,`M0 ${tip+6}v-39M-9 ${tip-11}h18`,'#a58853',3); ctx.restore();
}
function tower(ctx: CanvasRenderingContext2D, x: number, bottom: number, w: number, h: number, top=0) {
  const y=bottom-h; const d=`M${x} ${bottom}V${y+top}L${x+w*.5} ${y}L${x+w} ${y+top}V${bottom}Z`;
  ctx.save(); ctx.globalAlpha=.2; fill(ctx,d,'#a58853'); ctx.restore(); stroke(ctx,d,'#a58853',2.4);
  for(let xx=x+9;xx<x+w-5;xx+=11) stroke(ctx,`M${xx} ${y+top+13}V${bottom-8}`,'#a58853',.7);
  for(let yy=y+top+22;yy<bottom;yy+=19) stroke(ctx,`M${x+3} ${yy}h${w-6}`,'#a58853',.65);
}
function drawSandArtwork(ctx: CanvasRenderingContext2D, id: PlaceId, owner: Place['owner']) {
  ctx.lineCap='round'; ctx.lineJoin='round';
  if(id==='shenzhen'&&owner==='both') {
    ctx.globalAlpha=.08; fill(ctx,CHINA_OUTLINE,'#a58853'); ctx.globalAlpha=1; stroke(ctx,CHINA_OUTLINE,'#a58853',3.1);
    MAP_POINTS.forEach(point=>{const [x,y]=mapPosition(point);ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle='#a58853';ctx.fill();}); return;
  }
  const random=randomGenerator(id.length*23);
  for(let i=0;i<1600;i++) {const x=random()*ART_WIDTH;const y=600+random()**.7*220;ctx.globalAlpha=.03+random()*.2;ctx.fillStyle='#a58853';const size=.5+random()*2.2;ctx.fillRect(x,y,size,size);}ctx.globalAlpha=1;
  if(id==='zhoukou') {
    moon(ctx,970,247,106);
    ctx.globalAlpha=.18;fill(ctx,'M300 600V548H390V350H895V548H994V600Z','#a58853');ctx.globalAlpha=1;
    for(const [x,w,h] of [[461,63,145],[639,109,198],[816,63,145]]) {
      stroke(ctx,`M${x-w/2} 598V${598-h+w/2}a${w/2} ${w/2} 0 0 1 ${w} 0V598`,'#a58853',3.5);
      stroke(ctx,`M${x-w/2-13} 598V${598-h+w/2}a${w/2+13} ${w/2+13} 0 0 1 ${w+26} 0V598`,'#a58853',1.1);
    }
    colonnade(ctx,640,358,498,49,10); roof(ctx,640,336,626,90); colonnade(ctx,640,252,210,55,4); roof(ctx,640,246,340,70);
    stroke(ctx,'M640 176V148M382 353V553M897 353V553M277 606H1020M277 617H1020','#a58853',3);
    water(ctx,94,675,817);stroke(ctx,'M85 661Q260 597 451 664T879 665T1200 651','#a58853',3);
    for(let i=0;i<20;i++) {const x=142+i*13;const y=728+Math.sin(i*.6)*14;stroke(ctx,`M${x} ${y}q-7-30 4-65`,'#a58853',1.6);for(let j=0;j<5;j++)stroke(ctx,`M${x+1} ${y-55+j*7}l-7-7m7 7 8-6`,'#a58853',2);}
  } else if(id==='tianjin') {
    const cx=660,cy=365,r=247;ctx.strokeStyle='#a58853';
    [r,r-12,25,10].forEach((radius,i)=>{ctx.lineWidth=i<2?3:2;ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();});
    for(let i=0;i<36;i++) {const a=i/36*Math.PI*2;const x=cx+Math.cos(a)*r;const y=cy+Math.sin(a)*r;stroke(ctx,`M${cx} ${cy}L${x} ${y}`,'#a58853',1.1);ctx.globalAlpha=.5;ctx.fillRect(x-6,y-3,12,9);ctx.globalAlpha=1;stroke(ctx,`M${x-7} ${y-5}h14v11h-14Z`,'#a58853',1.2);}
    stroke(ctx,'M500 662L660 365L820 662M240 604H1080','#a58853',6);fill(ctx,'M239 602H1080V622H239Z','#a58853');
    for(let x=262;x<1060;x+=24)stroke(ctx,`M${x} 591V603`,'#a58853',2);
    for(let x=300;x<1060;x+=146)stroke(ctx,`M${x} 623V688M${x} 643Q${x+71} 605 ${x+142} 643`,'#a58853',3);
    water(ctx,19,687,817);tree(ctx,1120,722,1.15,34);
  } else if(id==='beijing') {
    moon(ctx,995,230,111);
    for(let i=0;i<3;i++){const y=596+i*28;const w=692+i*83;stroke(ctx,`M${650-w/2} ${y}Q650 ${y+34} ${650+w/2} ${y}`,'#a58853',3);stroke(ctx,`M${650-w/2} ${y-13}Q650 ${y+17} ${650+w/2} ${y-13}`,'#a58853',1.5);for(let x=650-w/2;x<650+w/2;x+=32)stroke(ctx,`M${x} ${y-9}v-22`,'#a58853',2);}
    colonnade(ctx,650,491,458,98,12);roof(ctx,650,477,590,101);colonnade(ctx,650,387,320,75,10);roof(ctx,650,373,448,90);colonnade(ctx,650,287,207,71,8);roof(ctx,650,278,329,83);
    stroke(ctx,'M650 195V156M639 172H661','#a58853',3);
    for(let y=644;y<725;y+=12)stroke(ctx,`M${576-(y-644)*.65} ${y}H${724+(y-644)*.65}`,'#a58853',1.5);
    tree(ctx,1138,665,1.2,29);
  } else if(id==='hongkong') {
    moon(ctx,953,210,95);ctx.globalAlpha=.14;fill(ctx,'M35 530Q164 493 332 279Q403 302 524 446Q632 304 751 390Q927 236 1239 480V581H35Z','#a58853');ctx.globalAlpha=1;
    stroke(ctx,'M35 530Q164 493 332 279Q403 302 524 446Q632 304 751 390Q927 236 1239 480','#a58853',2.5);
    [[330,64,167],[411,53,206],[485,63,151],[785,63,244],[867,52,179],[944,55,127]].forEach(([x,w,h])=>tower(ctx,x,580,w,h,13));
    stroke(ctx,'M262 587H1070M788 363L848 557M847 363L788 557','#a58853',2);water(ctx,20,598,817);
    fill(ctx,'M549 654L691 684L757 642Q653 663 549 654Z','#a58853');stroke(ctx,'M549 654L691 684L757 642M643 650V451','#a58853',3);
    ctx.globalAlpha=.3;fill(ctx,'M646 459Q704 485 722 610L647 605Z','#a58853');ctx.globalAlpha=1;stroke(ctx,'M646 459Q704 485 722 610L647 605Z','#a58853',2);
    for(let y=488;y<609;y+=24)stroke(ctx,`M647 ${y}L${667+(y-488)*.45} ${y+9}`,'#a58853',2);
    stroke(ctx,'M634 493Q594 517 577 597L634 602Z','#a58853',2);
  } else if(id==='wuhan') {
    moon(ctx,1018,254,116);pagoda(ctx,650,611,.98,5);stroke(ctx,'M81 671H1192M81 650H1192','#a58853',3);
    for(let x=103;x<1180;x+=98)stroke(ctx,`M${x} 674V744M${x} 696Q${x+46} 650 ${x+96} 696`,'#a58853',3.7);
    for(let x=110;x<1180;x+=19)stroke(ctx,`M${x} 649V632`,'#a58853',1.5);
    water(ctx,91,740,825);tree(ctx,133,715,1.18,44);
  } else if(id==='nanjing') {
    moon(ctx,1000,229,111);ctx.globalAlpha=.22;fill(ctx,'M247 647V528H331V449H968V528H1041V647Z','#a58853');ctx.globalAlpha=1;
    stroke(ctx,'M247 647V528H331V449H968V528H1041V647M222 655H1063','#a58853',3.5);
    for(let row=0;row<10;row++){const y=468+row*18;stroke(ctx,`M336 ${y}H525M775 ${y}H963`,'#a58853',.8);for(let x=348+row%2*20;x<953;x+=44){if(x<526||x>777)stroke(ctx,`M${x} ${y}v-16`,'#a58853',.7);}}
    stroke(ctx,'M552 646V554a98 98 0 0 1 196 0V646M567 646V555a83 83 0 0 1 166 0V646','#a58853',4);
    colonnade(ctx,650,357,324,79,8);roof(ctx,650,347,480,81);colonnade(ctx,650,274,204,59,6);roof(ctx,650,266,360,66);stroke(ctx,'M650 200V169','#a58853',3);
    tree(ctx,122,696,1.6,89);tree(ctx,1118,701,1.37,96);stroke(ctx,'M202 711Q422 647 663 695T1106 711','#a58853',3);
  } else if(id==='shanghai') {
    moon(ctx,400,228,102);tower(ctx,407,635,78,156,6);tower(ctx,506,634,61,208,15);stroke(ctx,'M650 122V626','#a58853',3);
    [305,416].forEach((y,i)=>{const r=i?53:35;ctx.strokeStyle='#a58853';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(650,y,r,r*.8,0,0,Math.PI*2);ctx.stroke();for(let z=-2;z<=2;z++){ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(650,y+z*7,Math.sqrt(1-(z/4)**2)*r,5,0,0,Math.PI*2);ctx.stroke();}});
    stroke(ctx,'M627 454L576 636M674 454L725 636M637 279V184H663V279','#a58853',5);tower(ctx,756,635,55,261,24);tower(ctx,832,635,65,355,29);stroke(ctx,'M844 320H885V359H844Z','#a58853',3);
    ctx.globalAlpha=.3;fill(ctx,'M941 633Q901 409 980 174Q960 411 1025 633Z','#a58853');ctx.globalAlpha=1;stroke(ctx,'M941 633Q901 409 980 174Q960 411 1025 633ZM978 205Q925 427 980 627','#a58853',2.5);
    for(let y=307;y<621;y+=17)stroke(ctx,`M${934+Math.abs(440-y)*.02} ${y}h${34+Math.max(0,y-440)*.17}`,'#a58853',.7);
    stroke(ctx,'M180 653H1120','#a58853',2);water(ctx,102,672,817);
  } else {
    moon(ctx,1021,247,116);tower(ctx,512,635,76,211,9);tower(ctx,866,635,64,244,27);
    ctx.globalAlpha=.3;fill(ctx,'M689 635L708 253L752 121L795 253L814 635Z','#a58853');ctx.globalAlpha=1;stroke(ctx,'M689 635L708 253L752 121L795 253L814 635ZM752 124V634M708 253H795M710 268L794 621M794 268L709 621M700 423H804','#a58853',2.3);
    for(let y=287;y<634;y+=19)stroke(ctx,`M${706-(y-287)*.038} ${y}H${797+(y-287)*.038}`,'#a58853',.8);
    stroke(ctx,'M340 635V470Q399 445 424 340Q449 445 509 470V635M424 345V635','#a58853',2.5);for(let y=487;y<631;y+=17)stroke(ctx,`M345 ${y}H504`,'#a58853',.8);
    stroke(ctx,'M203 650H1100','#a58853',2);water(ctx,202,670,815);
  }
  ctx.globalCompositeOperation='destination-in';const edge=ctx.createRadialGradient(650,440,300,650,440,700);edge.addColorStop(0,'#000');edge.addColorStop(.78,'rgba(0,0,0,.94)');edge.addColorStop(1,'transparent');ctx.fillStyle=edge;ctx.fillRect(0,0,ART_WIDTH,ART_HEIGHT);ctx.globalCompositeOperation='source-over';
}
function makeArtwork(place: Place) {
  const painting = document.createElement('canvas'); painting.width = ART_WIDTH; painting.height = ART_HEIGHT;
  const context = painting.getContext('2d')!;
  drawSandArtwork(context, place.id, place.owner);
  context.globalCompositeOperation = 'source-in'; context.fillStyle = place.owner === 'me' ? '#eee0bf' : '#dfb775'; context.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);
  const line = document.createElement('canvas'); line.width = 800; line.height = Math.round(800 * ART_HEIGHT / ART_WIDTH);
  const ink = line.getContext('2d', { willReadFrequently: true })!;
  ink.fillStyle = '#fff'; ink.fillRect(0, 0, line.width, line.height); ink.filter = 'brightness(0)'; ink.drawImage(painting, 0, 0, line.width, line.height);
  return { line, painting };
}
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const shapeName = (index: number) => `${PLACES[index].owner}-${PLACES[index].id}`;
const sandColor = (index: number) => PLACES[index].owner === 'me' ? '#eee0bf' : '#dfb775';

export default function Journey({ onComplete, reducedMotion, active: sceneActive = true }: { onComplete: () => void; reducedMotion: boolean; active?: boolean }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [narration, setNarration] = useState(0);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [routesOpen, setRoutesOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sandRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLCanvasElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const mapKnotRef = useRef<SVGGElement>(null);
  const clockRef = useRef({ index: 0, local: 0, playing: true, exitMs: null as number | null });
  const controller = useRef<{ select: (index: number) => void; toggle: () => void; replay: () => void; finish: () => void; sync: () => void } | null>(null);
  const pointer = useRef({ x: -9999, y: -9999, down: false });
  const allowedRef = useRef(sceneActive);
  allowedRef.current = sceneActive && !routesOpen;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = useRef(false);
  const place = PLACES[active];
  useEffect(() => { controller.current?.sync(); }, [sceneActive, routesOpen]);

  useEffect(() => {
    const sand = sandRef.current; const drawing = drawingRef.current; const staticCanvas = fallbackRef.current; const stage = stageRef.current; const root = rootRef.current;
    const context = drawing?.getContext('2d'); const staticContext = staticCanvas?.getContext('2d');
    if (!sand || !drawing || !staticCanvas || !stage || !root || !context || !staticContext) return;
    let renderer: SandKit | null = null;
    let disposed = false; let frame = 0; let last = 0;
    let index = clockRef.current.index; let previous = index; let local = clockRef.current.local; let play = clockRef.current.playing; let exitMs = clockRef.current.exitMs;
    let usingStatic = reducedMotion; let loaded = false; let visible = true; let spoken = local >= SHOTS[index].secondLine ? 1 : 0; let entrancePending = !reducedMotion && local === 0;
    let width = 0; let height = 0; let brushUntil = 0;
    const flying: FallingGrain[] = [];
    const art = PLACES.map(makeArtwork); const rng = randomGenerator(7427);
    staticCanvas.style.opacity = '1';
    const shapes: ShapeSource[] = art.map(({ line }, i) => ({ name: shapeName(i), pinOnly: true, raster: () => ({ line: { w: line.width, h: line.height, data: line.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, line.width, line.height).data } }) }));
    const available = () => !disposed && !document.hidden && visible && allowedRef.current && loaded && !completedRef.current;
    const cancelFrame = () => { if (reducedMotion) clearTimeout(frame); else cancelAnimationFrame(frame); frame = 0; };
    const setPlayback = (value: boolean) => { play = value; clockRef.current.playing = value; setPlaying(value); };
    const fitArtwork = () => index === LAST ? Math.min(width / ART_WIDTH, height / ART_HEIGHT) : Math.min(width / (width < 700 ? 680 : 1120), height / 850, Math.min(width, height) * 2 / ART_WIDTH);
    const showStatic = () => {
      const fit = fitArtwork(); const blend = reducedMotion || previous === index ? 1 : clamp(local / 1700);
      staticContext.clearRect(0, 0, width, height); staticContext.save();
      staticContext.translate((width - ART_WIDTH * fit) / 2, (height - ART_HEIGHT * fit) / 2); staticContext.scale(fit, fit);
      if (blend < 1) { staticContext.globalAlpha = .9 * (1 - blend); staticContext.drawImage(art[previous].painting, 0, 0); }
      staticContext.globalAlpha = .9 * blend; staticContext.drawImage(art[index].painting, 0, 0); staticContext.restore();
    };
    const setComposition = () => {
      const fit = fitArtwork();
      void renderer?.setOptions({ pictureScale: fit * ART_WIDTH / Math.max(1, Math.min(width, height)), color: sandColor(index), colorDark: sandColor(index) });
      stage.style.setProperty('--map-width', `${fit * ART_WIDTH}px`); stage.style.setProperty('--map-height', `${fit * ART_HEIGHT}px`);
      showStatic();
    };
    const directShot = () => {
      const shot = SHOTS[index]; const progress = clamp(local / shot.duration); const ease = progress * progress * (3 - 2 * progress);
      const motion = width < 700 ? .65 : 1;
      const zoom = reducedMotion ? 1 : 1 + ((shot.zoom[0] - 1) + (shot.zoom[1] - shot.zoom[0]) * ease) * motion;
      const pan = reducedMotion ? 0 : (shot.pan[0] + (shot.pan[1] - shot.pan[0]) * ease) * motion;
      stage.style.setProperty('--journey-zoom', `${zoom}`); stage.style.setProperty('--journey-pan-x', `${pan}px`);
      stage.style.setProperty('--journey-pan-y', reducedMotion ? '0px' : `${Math.sin(progress * Math.PI) * -3 * motion}px`);
      const cue = local >= shot.secondLine ? 1 : 0;
      if (cue !== spoken) { spoken = cue; setNarration(cue); }
      const titleAlpha = reducedMotion ? 1 : clamp((local - 350) / 1000) * clamp((shot.duration - local) / 800);
      const captionAlpha = reducedMotion ? 1 : cue === 0 ? clamp((local - 1200) / 700) * clamp((shot.secondLine - local) / 500) : clamp((local - shot.secondLine) / 700) * clamp((shot.duration - local) / 850);
      root.style.setProperty('--journey-title-opacity', `${titleAlpha}`);
      root.style.setProperty('--journey-caption-opacity', `${captionAlpha}`);
      root.style.setProperty('--journey-turn-veil', `${!reducedMotion && index === 5 ? .55 * (1 - clamp(local / 2100)) : 0}`);
    };
    const select = (next: number) => {
      previous = index; index = Math.max(0, Math.min(LAST, next)); local = 0; exitMs = null; spoken = 0;
      clockRef.current = { index, local, playing: true, exitMs }; completedRef.current = false;
      setActive(index); setNarration(0); setLeaving(false); setRoutesOpen(false); setPlayback(true); flying.length = 0;
      if (renderer) { renderer.pin(shapeName(index)); if (previous === index) renderer.replay(); }
      setComposition(); directShot(); last = 0; sync();
    };
    const toggle = () => { if (!loaded || exitMs !== null) return; setPlayback(!play); last = 0; sync(); };
    const finish = () => {
      if (!loaded || exitMs !== null || completedRef.current) return;
      exitMs = 0; clockRef.current.exitMs = 0; setLeaving(true); setRoutesOpen(false); setPlayback(true); renderer?.pause(); last = 0; wake();
    };
    controller.current = { select, toggle, replay: () => select(0), finish, sync };
    const emit = (x: number, y: number, amount: number, force = 1) => {
      for (let i = 0; i < amount; i += 1) flying.push({ x: x + (rng() - .5) * 20, y: y - rng() * 24, vx: (rng() - .5) * 105 * force, vy: -25 - rng() * 65, life: .5 + rng() * .8, size: .6 + rng() * 1.9, shade: rng() });
      if (flying.length > 1100) flying.splice(0, flying.length - 1100);
    };
    const paintFrame = (stamp: number) => {
      frame = 0;
      if (!available()) { last = 0; return; }
      // The story uses actual foreground time. A slow GPU must not turn one shot into a minute.
      const elapsed = last ? Math.max(0, Math.min(1000, stamp - last)) : 0; last = stamp;
      const dt = play ? Math.min(.045, elapsed / 1000) : 0;
      if (exitMs !== null) {
        exitMs += play ? elapsed : 0; clockRef.current.exitMs = exitMs;
        if (exitMs >= (reducedMotion ? 120 : 1100)) { completedRef.current = true; cancelFrame(); onCompleteRef.current(); return; }
        if (play) wake(); return;
      }
      if (play) local += elapsed;
      if (local >= SHOTS[index].duration) {
        if (index < LAST) { select(index + 1); return; }
        finish(); return;
      }
      clockRef.current.local = local; directShot();
      if (usingStatic && local <= 1800) showStatic();
      if (mapKnotRef.current) mapKnotRef.current.style.opacity = `${reducedMotion ? 1 : clamp((local - 8000) / 900)}`;
      context.clearRect(0, 0, width, height);
      const fit = fitArtwork(); const ox = (width - ART_WIDTH * fit) / 2; const oy = (height - ART_HEIGHT * fit) / 2;
      context.save(); context.translate(ox, oy); context.scale(fit, fit);
      pathRefs.current.forEach((path, n) => {
        if (!path) return;
        const paired = index === LAST; const offset = paired ? 1500 + n * 3100 : 900 + n * 940;
        const p = reducedMotion ? 1 : clamp((local - offset) / (paired ? 3100 : 1500)); const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`; path.style.strokeDashoffset = `${length * (1 - p)}`; path.style.opacity = `${paired ? .95 : reducedMotion ? 0 : p < 1 ? .45 : .06}`;
        if (!reducedMotion && p > 0 && p < 1 && play && dt > 0) {
          const tip = path.getPointAtLength(length * p); emit(tip.x, tip.y, Math.max(1, Math.round(dt * 140)), paired ? 1.45 : .8);
        }
      });
      if (!reducedMotion && pointer.current.down && play) {
        const p = pointer.current; emit((p.x - ox) / fit, (p.y - oy) / fit, Math.max(3, Math.round(dt * 240)), 1.8); brushUntil = stamp + 550;
        const mask = `radial-gradient(circle 32px at ${p.x}px ${p.y}px, transparent 28%, #000 100%)`; sand.style.maskImage = mask; staticCanvas.style.maskImage = mask;
      } else if (stamp > brushUntil) { sand.style.maskImage = ''; staticCanvas.style.maskImage = ''; }
      for (let i = flying.length - 1; i >= 0; i -= 1) {
        const grain = flying[i]; grain.life -= dt;
        if (grain.life <= 0) { flying.splice(i, 1); continue; }
        grain.vy += dt * 112; grain.x += grain.vx * dt; grain.y += grain.vy * dt;
        context.globalAlpha = Math.min(1, grain.life * 2) * (.4 + grain.shade * .45); context.fillStyle = grain.shade > .6 ? '#fff2d9' : sandColor(index); context.fillRect(grain.x, grain.y, grain.size, grain.size);
      }
      context.restore();
      if (play) wake();
    };
    function wake() {
      if (!frame && available()) frame = reducedMotion ? window.setTimeout(() => paintFrame(performance.now()), 125) : requestAnimationFrame(paintFrame);
    }
    function sync() {
      last = 0;
      root!.dataset.sceneSuspended = available() ? 'false' : 'true';
      if (!available()) { renderer?.pause(); cancelFrame(); pointer.current.down = false; }
      else {
        if (play && exitMs === null) { renderer?.resume(); if (renderer && entrancePending) { entrancePending = false; renderer.replay(); } }
        else renderer?.pause();
        wake();
      }
    }
    const resize = () => {
      const rect = stage.getBoundingClientRect(); const scale = Number(stage.style.getPropertyValue('--journey-zoom')) || 1;
      width = rect.width / scale; height = rect.height / scale; const dpr = Math.min(window.devicePixelRatio || 1, 2);
      [drawing, staticCanvas].forEach((canvas) => { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); });
      context.setTransform(dpr, 0, 0, dpr, 0, 0); staticContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      setComposition(); directShot(); wake();
    };
    const useStatic = () => {
      if (disposed) return;
      renderer?.dispose(); renderer = null; usingStatic = true; loaded = true; setReady(true); setFallback(true); staticCanvas.style.opacity = '1'; showStatic(); sync();
    };
    const resizer = new ResizeObserver(resize); resizer.observe(stage);
    const observer = new IntersectionObserver((entries) => { visible = entries.some((entry) => entry.isIntersecting); sync(); }, { threshold: .12 }); observer.observe(stage);
    document.addEventListener('visibilitychange', sync);
    const pointerWake = () => wake(); stage.addEventListener('pointerdown', pointerWake); stage.addEventListener('pointermove', pointerWake); resize();
    if (reducedMotion) useStatic();
    else {
      try {
        renderer = new SandKit(sand, { shapes, worker: true, options: {
          count: window.innerWidth < 700 ? 48000 : 72000, pointSize: 1.18, sizeVariation: 1.05, opacity: 1, color: sandColor(index), colorDark: sandColor(index),
          introMs: 2800, moveMs: 3100, holdMs: 15000, stagger: .48, scatterPhase: .29, scatterReach: .14, scatterDepth: .48, flightFade: .05,
          jitter: .001, sway: 0, tilt: .035, tiltEase: .13, depthRange: .1, depthContrast: .14, dustShare: .005, fillDensity: .48, interiorTone: .025, blurRadius: 1, cloudRadius: 1.15, cloudFar: -.45,
          pictureScale: fitArtwork() * ART_WIDTH / Math.max(1, Math.min(width, height)),
        }, onError: (error) => { if (error.message.includes('context')) useStatic(); } });
        renderer.pin(shapeName(index)); renderer.pause();
        renderer.ready.then(() => {
          if (disposed || usingStatic) return; loaded = true; setReady(true); setFallback(false); staticCanvas.style.opacity = '0'; sync();
        }).catch(useStatic);
      } catch { useStatic(); }
    }
    return () => { disposed = true; cancelFrame(); renderer?.dispose(); resizer.disconnect(); observer.disconnect(); document.removeEventListener('visibilitychange', sync); stage.removeEventListener('pointerdown', pointerWake); stage.removeEventListener('pointermove', pointerWake); controller.current = null; };
  }, [reducedMotion]);

  const handlePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect(); const scale = rect.width / event.currentTarget.clientWidth;
    pointer.current.x = (event.clientX - rect.left) / scale; pointer.current.y = (event.clientY - rect.top) / scale;
    if (event.type === 'pointerdown') { pointer.current.down = true; event.currentTarget.setPointerCapture(event.pointerId); }
  };
  const releasePointer = () => { pointer.current.down = false; };
  const next = () => { if (active === LAST) controller.current?.finish(); else controller.current?.select(active + 1); };
  return (
    <section ref={rootRef} className={`journey-stage journey-film journey-owner-${place.owner}${active === LAST ? ' journey-map-finale' : ''}${leaving ? ' journey-leaving' : ''}${reducedMotion ? ' journey-still' : ''}${!playing || !sceneActive || routesOpen ? ' journey-paused' : ''}`} data-scene={`${place.owner}-${place.id}`} aria-label="第二章，自动讲述的两条人生路线">
      <header className="journey-heading"><span className="journey-eyebrow">第二章 · 两条来路</span><span className="journey-chapter-poem">走过山海，与你同页。</span></header>
      <div className="journey-route-menu">
        <button type="button" className="journey-route-toggle" aria-expanded={routesOpen} aria-controls="journey-routes" onClick={() => setRoutesOpen(!routesOpen)}>翻阅来路 <span aria-hidden="true">{routesOpen ? '−' : '+'}</span></button>
        <div id="journey-routes" className={`journey-routes${routesOpen ? ' is-open' : ''}`} hidden={!routesOpen} aria-label="两条真实来路，可以点选回看">
          {(['her', 'me'] as const).map((owner) => <div className={`journey-route journey-route-${owner}`} key={owner}>
            <span className="journey-route-label">{owner === 'her' ? '你的来路' : '我的来路'}</span>
            <div className="journey-stops">{PLACES.map((item, i) => (item.owner === owner && <button type="button" key={`${owner}-${i}`} onClick={() => controller.current?.select(i)} disabled={!ready || leaving} className={active === i ? 'is-current' : ''} aria-current={active === i ? 'step' : undefined}><strong>{item.city}{item.id === 'zhoukou' || item.id === 'wuhan' ? ` · ${item.region}` : ''}</strong>{item.school && <span>{item.school}</span>}</button>))}</div>
          </div>)}
        </div>
      </div>
      <div className="journey-light-table">
        <div className="journey-light-beam" aria-hidden="true" />
        <div className="journey-place" key={`place-${active}`} aria-live="polite" aria-atomic="true">
          <span className="journey-person">{place.owner === 'her' ? '你的来路' : place.owner === 'me' ? '我的来路' : '我们的这一页'}</span>
          <div className="journey-city"><span className="journey-region">{place.region}</span><h3>{place.city}</h3></div>
          {place.school && <p className="journey-school">{place.school}</p>}
          <span className="journey-motif">{place.motif}</span>
        </div>
        <div ref={stageRef} className="journey-sand-window" onPointerDown={handlePointer} onPointerMove={handlePointer} onPointerUp={releasePointer} onPointerCancel={releasePointer} onLostPointerCapture={releasePointer}>
          <canvas ref={fallbackRef} className={`journey-fallback${fallback ? ' is-visible' : ''}`} aria-hidden="true" />
          <canvas ref={sandRef} className="journey-sand" aria-hidden="true" />
          <svg className="journey-drawn-lines" viewBox={`0 0 ${ART_WIDTH} ${ART_HEIGHT}`} aria-hidden="true">{(active === LAST ? MAP_ROUTES : DRAWING_PATHS[place.id]).map((d, i) => <path className={active === LAST ? `journey-map-route journey-map-route-${i}` : undefined} d={d} key={`${active}-${i}`} ref={(node) => { pathRefs.current[i] = node; }} />)}
            {active === LAST && <g ref={mapKnotRef} className="journey-map-knot" transform={`translate(${MEETING[0]} ${MEETING[1]})`}><circle r="23" /><circle r="10" /><path d="M0 0C-25-20-34 13-9 9L0 0C24-21 34 12 9 9Z" /><path d="M-1 2Q-9 23-27 26M2 2Q11 24 30 27" /></g>}
          </svg>
          {active === LAST && <div className="journey-map-labels" aria-label="中国地图上的两条城市路线，在深圳汇合">
            {MAP_POINTS.map((point) => { const [x, y] = mapPosition(point); return <span className={`journey-map-label journey-map-label-${point.id}`} key={point.id} style={{ left: `${(x + point.dx) / ART_WIDTH * 100}%`, top: `${(y + point.dy) / ART_HEIGHT * 100}%` }}>{point.label}</span>; })}
            <div className="journey-map-meaning"><span>两条来路 · 一个此刻</span><p>你是暖金，我是月白。<br />从深圳起，想与你并肩。</p></div>
          </div>}
          <canvas ref={drawingRef} className="journey-falling-sand" aria-hidden="true" /><div className="journey-photo-outline" aria-hidden="true" />
        </div>
        <div className="journey-caption" aria-live="polite" aria-atomic="true"><p>{narration === 0 ? place.line : place.caption}</p><span>{place.owner === 'her' ? '你走过的每一程，都值得被认真记下。' : place.owner === 'me' ? '书的另一页，是我走向你的来路。' : '从此，未来有了可以并肩写下的一页。'}</span></div>
      </div>
      <footer className="journey-footer">
        <button type="button" className="journey-back" onClick={() => active === LAST ? controller.current?.replay() : controller.current?.select(active - 1)} disabled={active === 0 || !ready || leaving}>{active === LAST ? '再读一次来路' : '回望上一程'}</button>
        <div className="journey-playback"><button type="button" onClick={() => controller.current?.toggle()} disabled={!ready || leaving} aria-label={playing ? '暂停自动讲述' : '继续自动讲述'}>{playing ? '让这一刻停留' : '让故事继续'}</button>
          {!ready && <span className="journey-brush-hint">沙粒正在汇聚…</span>}
          {fallback && !reducedMotion && <span className="journey-brush-hint">此设备以沙画叠映，自动讲述来路</span>}
        </div>
        <button type="button" className="journey-next" onClick={next} disabled={!ready || leaving}>{active === LAST ? '把回忆放进书里' : '略过这一程'}<span aria-hidden="true">↗</span></button>
      </footer>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { SandKit } from './vendor/sandkit/index.js';
import type { ShapeSource } from './vendor/sandkit/index.js';
import './journey.css';

type PlaceId = 'henan' | 'tianjin' | 'beijing' | 'hongkong' | 'wuhan' | 'nanjing' | 'shanghai' | 'shenzhen';
type Place = { id: PlaceId; city: string; school?: string; owner: 'her' | 'me' | 'both'; line: string; caption: string };
const PLACES: Place[] = [
  { id: 'henan', city: '河南', owner: 'her', line: '故事，从这里慢慢展开。', caption: '一粒沙，一页书。一条属于你的路。' },
  { id: 'tianjin', city: '天津', owner: 'her', line: '每一次向前，都有新的风景。', caption: '让风翻过这一页，让光落在下一程。' },
  { id: 'beijing', city: '北京', school: '中国政法大学', owner: 'her', line: '愿每一份认真，都有回响。', caption: '书页里，藏着自己的辽阔。' },
  { id: 'hongkong', city: '香港', school: '香港科技大学', owner: 'her', line: '越过山海，依然闪闪发光。', caption: '把目光交给远方，也把温柔留给自己。' },
  { id: 'shenzhen', city: '深圳', owner: 'her', line: '这一程，来到深圳。', caption: '书里认真记下了，你走过的每一个地方。' },
  { id: 'wuhan', city: '武汉', owner: 'me', line: '书的另一页，也写着我的来路。', caption: '另一条线，从这里开始。' },
  { id: 'nanjing', city: '南京', school: '东南大学', owner: 'me', line: '走过自己的春夏，再向前一点。', caption: '有些页，直到后来才读懂它的伏笔。' },
  { id: 'shanghai', city: '上海', school: '上海交通大学', owner: 'me', line: '远方之外，还会有新的远方。', caption: '这条路，也渐渐写到了深圳。' },
  { id: 'shenzhen', city: '深圳', owner: 'both', line: '各自走来的路，从这里开始并肩。', caption: '后来，在深圳，我遇见了你。' },
];
// Natural Earth 1:110m generalized geographic outline, public domain.
// Source: github.com/nvkelso/natural-earth-vector — ne_110m_admin_0_countries.geojson
// Equirectangular display at latitude 36.9 degrees; not a campus or navigation map.
const CHINA_OUTLINE = 'M650.7 736.5L639.2 731.1L638.8 716.1L645.7 708.1L661 703.2L669 703.6L672.1 710.3L666 718L662.7 728.1L650.7 736.5ZM241.6 313.9L240.5 303.9L250.1 299.3L237.5 268.9L265.3 262L272.4 258.1L282.5 226.7L310.3 232.5L318.1 224.6L318.8 207L330.4 205.4L341 193.7L346.5 192.3L350.2 204.5L362 213.8L381.9 220.4L391.6 234.5L386.2 254.9L391.2 262.5L407.9 265.5L426.7 267.9L443.6 278.8L452.3 280.8L458.7 296.9L466.9 307.3L482.3 306.9L511.2 310.8L529.8 308.4L543.7 311L564.4 321.6L581.3 321.6L587.5 327L603.8 317.6L626.4 311.6L647.4 310.9L663.8 304.8L673.8 295.4L683.6 289.5L681.3 283.7L676.9 277L684.2 265.7L692.1 267.3L706.5 270.8L720.4 261.6L741.8 254.8L752.1 243.2L761.9 238.2L782.2 235.9L793.3 237.9L794.8 231.7L782.1 219.4L770.9 213.8L760.1 220.3L746.3 217.6L738.4 219.8L734.8 212.6L744.7 195.1L751.5 182L768.3 188.6L788 177.5L787.9 169.8L800.5 151.2L808.3 145.6L808.2 136L800.5 131.8L812 123.1L829.4 119.9L848 119.5L869 124.7L881.2 131.1L889.9 148.8L895.1 156.3L900 167.1L905.2 184.2L929.6 189.8L946.2 202.2L951.8 218.7L973.1 218.7L985.2 211.8L1008.4 206.6L1001 222.4L995.6 228.8L990.8 248L981.4 265L964.4 261.9L952.4 268.1L956 283L954 303.7L946.9 304.2L947 313.1L937.9 302.8L932.4 312.6L910.7 320.1L912.9 329.3L900.8 328.7L894.2 323.2L884.5 335.6L869.1 345L857.7 356.3L838.1 361.3L827.8 369.5L812.8 374.3L820.2 366.2L817.3 359.4L828.4 347.6L821 338.4L808.8 344.6L793 356.8L784.3 368.1L770.6 368.9L763.5 377.1L770.8 388.9L782.3 391.8L782.8 399.7L793.8 404.8L809.5 392.3L822 399.1L831 399.5L833.3 408.7L813.5 413.6L806.9 423L793.3 431.8L786.1 444.1L801.2 453.7L806.7 470.9L815.2 486.9L824.7 500.4L824.5 513.4L815.7 518.2L819 527.5L827.3 532.9L825.1 547.2L821.6 561.1L813.8 562.6L803.5 581.6L792.2 604.5L779.2 625.4L759.9 641.6L740.5 656.3L724.7 658.3L716.1 666.1L711.3 660.4L703.4 669.1L683.8 677.9L669 680.5L664.2 699L656.5 700.1L652.8 687.4L656.1 680.6L637.3 675L630.7 677.8L616.6 673.3L609.9 666.2L612.2 656.1L599.4 652.9L592.6 646.3L580.7 655.7L567.1 657.7L555.9 657.6L548.4 661.9L541.1 664.4L543.2 684.4L535.8 684L534.5 679.9L534.1 672.6L523.8 677.7L517.8 674.5L507.4 667.9L511.4 653.4L502.6 650L499.2 633.9L484.5 636.8L486.1 616L499.4 601.4L500 587L499.6 573.6L493.4 569.4L488.8 559.1L480.6 560.4L465.5 557.8L470.2 550.5L463.6 539.6L453.7 546.9L441.9 542.6L425.8 553.8L413 566.8L401.8 569L395.6 564.3L388.2 563.9L378.2 559.8L370.7 564.3L361.4 577.3L360.2 563.5L351.7 567.2L335.4 565.5L319.5 561.4L308.2 553.8L297.3 550.3L292.6 541.9L284.7 539.4L270.6 528L259.4 522.6L253.6 526.8L234.1 514.6L220.3 503.5L216.4 484.2L226.5 486.5L226.9 477.6L221.4 468.6L222.8 454.4L207.7 433.9L184.7 426.8L180.6 413.3L170.2 405.2L167.7 400.2L165.6 390.2L166.1 383.4L157.6 379.4L153 381.1L149.5 365L153.4 360.9L151.5 356.9L164.9 348.6L174.5 345.2L189.4 347.5L194.7 336.3L212.6 334.3L217.6 327.3L239.7 317.8L241.6 313.9ZM822.9 628.1L814.5 656.2L808.5 670.5L801.1 655.7L799.5 642.8L807.7 625.6L818.9 612.3L825.3 617.5L822.9 628.1Z';
const ART_WIDTH = 1280;
const ART_HEIGHT = 850;
const BEAT_MS = 7600;
const LAST = PLACES.length - 1;
// Cities: Natural Earth ne_10m_populated_places_simple (public domain).
// Henan has no user-specified city: its marker is explicitly a provincial schematic point.
const MAP_POINTS = [
  { id: 'henan', label: '河南', lon: 113.5, lat: 34.0, dx: -35, dy: -3 },
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
const MAP_ROUTES = [mapRoute(['henan', 'tianjin', 'beijing', 'hongkong', 'shenzhen']), mapRoute(['wuhan', 'nanjing', 'shanghai', 'shenzhen'])];
const MEETING = mapPosition(MAP_POINTS[4]);
type FallingGrain = { x: number; y: number; vx: number; vy: number; life: number; size: number; shade: number };

// SandKit is MIT licensed, Copyright (c) 2026 Linkly AI. The original distribution
// and full license are preserved in vendor/sandkit. Story and drawings are ours.
const DRAWING_PATHS: Record<PlaceId, string[]> = {
  henan: ['M85 554Q260 467 420 516T764 514T1194 558', 'M93 604Q250 548 505 591T1190 613', 'M583 736Q599 643 717 601Q789 576 878 565', 'M975 583Q976 532 964 476Q951 460 962 450'],
  tianjin: ['M125 544Q371 455 571 537Q866 456 1160 554', 'M840 349A133 133 0 1 1 574 349A133 133 0 1 1 840 349', 'M635 550L707 349L780 550', 'M202 644Q552 598 1134 655'],
  beijing: ['M300 578Q290 480 280 360', 'M511 448Q629 419 734 486Q834 419 949 448L938 590Q824 568 734 625Q623 568 518 591Z', 'M734 486V625', 'M165 642Q414 588 573 638T1111 644'],
  hongkong: ['M98 527Q257 475 368 360Q466 447 524 422Q625 511 703 452Q801 544 989 492', 'M168 568Q363 549 510 582T1127 570', 'M991 724Q909 660 893 598Q932 597 968 578', 'M614 618Q657 640 697 618M654 615V556L682 613'],
  wuhan: ['M109 511Q317 453 506 505T1166 506', 'M180 483H1098', 'M225 558V515Q270 474 321 515Q368 474 419 515Q465 474 517 515Q564 474 615 515Q661 474 713 515Q760 474 811 515Q857 474 909 515Q957 474 1007 515V558', 'M726 610Q762 625 798 610'],
  nanjing: ['M298 578Q308 470 287 410Q262 365 281 345', 'M137 621Q341 562 539 608T1149 623', 'M511 448Q629 419 734 486Q834 419 949 448L938 590Q824 568 734 625Q623 568 518 591Z', 'M502 460L503 604Q619 582 734 638Q848 582 950 604L958 460'],
  shanghai: ['M141 570Q372 528 601 571T1155 577', 'M738 551L783 393V183M783 393L828 551', 'M889 550V298L926 255L939 550', 'M972 550Q948 350 1007 240Q984 415 1025 550'],
  shenzhen: ['M82 526Q220 475 370 515T657 514T958 486Q1090 460 1196 523', 'M115 740Q191 608 424 642Q527 663 637 636Q777 589 1178 683', 'M247 739Q428 732 556 663Q597 644 659 667Q705 687 779 688', 'M1056 746Q861 735 798 701Q732 676 674 675Q617 670 593 680'],
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
function person(ctx: CanvasRenderingContext2D, x: number, y: number, dress: boolean) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#765232';
  ctx.beginPath(); ctx.arc(0, -39, 5, 0, Math.PI * 2); ctx.fill();
  fill(ctx, dress ? 'M-4-32L4-32 10-11-9-11Z' : 'M-6-32L6-32 7-13-7-13Z', '#765232');
  stroke(ctx, 'M-4-12L-5 0M4-12L5 0', '#765232', 2.5);
  stroke(ctx, dress ? 'M-4-29L-10-18M4-28L15-21' : 'M-4-29L-15-21M4-28L10-15', '#765232', 2); ctx.restore();
}
/** Illustrative city symbols; no university building is presented as a known campus. */
function drawSandArtwork(ctx: CanvasRenderingContext2D, id: PlaceId, owner: Place['owner']) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (id === 'shenzhen' && owner === 'both') {
    ctx.globalAlpha = .14; fill(ctx, CHINA_OUTLINE, '#79552e'); ctx.globalAlpha = 1;
    stroke(ctx, CHINA_OUTLINE, '#9e7d43', 2.7);
    MAP_POINTS.forEach((point) => { const [x, y] = mapPosition(point); ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = '#79552e'; ctx.fill(); });
    return;
  } else if (id === 'henan') {
    moon(ctx, 816, 235, 66);
    ctx.globalAlpha = .27; fill(ctx, 'M95 553Q208 427 369 449T636 429T924 476Q1042 456 1195 558L1195 604H95Z', '#927341'); ctx.globalAlpha = 1;
    stroke(ctx, DRAWING_PATHS.henan[0], '#a5834d', 3); stroke(ctx, DRAWING_PATHS.henan[1], '#c1a06c', 2);
    ctx.globalAlpha = .45; fill(ctx, 'M583 736Q599 643 717 601Q789 576 878 565Q792 594 755 620Q676 676 724 736Z', '#b69a62'); ctx.globalAlpha = 1;
    for (let i = 0; i < 24; i += 1) {
      const x = 190 + i * 13; const y = 662 + Math.sin(i * .6) * 20;
      stroke(ctx, `M${x} ${y}q-7-30 4-65`, '#b79158', 1.5);
      for (let j = 0; j < 5; j += 1) stroke(ctx, `M${x + 1} ${y - 55 + j * 7}l-7-7m7 7 8-6`, '#b79052', 2);
    }
    tree(ctx, 975, 583, .64, 19);
  } else if (id === 'tianjin') {
    moon(ctx, 929, 217, 45);
    ctx.strokeStyle = '#b38d53'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(707, 349, 133, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(707, 349, 125, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 28; i += 1) {
      const a = i / 28 * Math.PI * 2; const x = 707 + Math.cos(a) * 133; const y = 349 + Math.sin(a) * 133;
      stroke(ctx, `M707 349L${x} ${y}`, '#9f804c', .8); ctx.fillStyle = '#a88350'; ctx.fillRect(x - 3, y - 3, 6, 6);
    }
    stroke(ctx, 'M635 550L707 349 780 550', '#ad884a', 5);
    fill(ctx, 'M125 544Q371 455 571 537Q866 456 1160 554L1160 565Q857 492 571 565Q329 498 125 565Z', '#b3915c');
    stroke(ctx, 'M125 534Q371 445 571 527Q866 446 1160 544', '#a07b46', 1.5);
    water(ctx, 19); tree(ctx, 223, 610, .76, 34);
  } else if (id === 'beijing' || id === 'nanjing') {
    moon(ctx, 853, 218, 55);
    tree(ctx, 310, 578, id === 'beijing' ? 1.1 : 1.34, id === 'beijing' ? 29 : 89);
    tree(ctx, 1039, 563, .63, 32);
    if (id === 'nanjing') tree(ctx, 193, 548, .58, 96);
    stroke(ctx, 'M137 621Q341 562 539 608T1149 623', '#b6905a', 2);
    stroke(ctx, 'M165 642Q414 588 573 638T1111 644', '#927746', 1);
    ctx.globalAlpha = .23; fill(ctx, 'M511 448Q629 419 734 486Q834 419 949 448L938 590Q824 568 734 625Q623 568 518 591Z', '#9f804c'); ctx.globalAlpha = 1;
    stroke(ctx, DRAWING_PATHS.beijing[1], '#ac8450', 3);
    stroke(ctx, 'M734 486V625M502 460L503 604Q619 582 734 638Q848 582 950 604L958 460', '#a7834f', 1.5);
    for (let i = 0; i < 7; i += 1) { const y = 477 + i * 14; stroke(ctx, `M547 ${y}Q623 ${y - 10} 706 ${y + 29}M761 ${y + 29}Q835 ${y - 10} 912 ${y}`, '#ab8953', .9); }
    for (let i = 0; i < 8; i += 1) { const x = 480 + i * 36; const y = 284 + Math.sin(i * .8) * 32; stroke(ctx, `M${x} ${y}q5-7 11-1q7-7 12-4`, '#a27f49', 1.3); }
  } else if (id === 'hongkong') {
    moon(ctx, 841, 226, 68);
    ctx.globalAlpha = .32; fill(ctx, 'M99 527Q257 475 368 360Q466 447 524 422Q625 511 703 452Q801 544 989 492L1185 580H99Z', '#8b754b'); ctx.globalAlpha = 1;
    stroke(ctx, DRAWING_PATHS.hongkong[0], '#bd9d63', 2); stroke(ctx, DRAWING_PATHS.hongkong[1], '#a98a54', 3);
    water(ctx, 20, 584, 728);
    ctx.globalAlpha = .35; fill(ctx, 'M987 722Q906 660 893 598Q935 597 968 578Q1002 617 1153 649L1172 731Z', '#8a7047'); ctx.globalAlpha = 1;
    stroke(ctx, DRAWING_PATHS.hongkong[2], '#a3824e', 2); stroke(ctx, DRAWING_PATHS.hongkong[3], '#ac864d', 2);
  } else if (id === 'wuhan') {
    moon(ctx, 843, 231, 76); stroke(ctx, DRAWING_PATHS.wuhan[0], '#a78e62', 1.5);
    fill(ctx, 'M180 483H1098V504H180Z', '#a58853'); stroke(ctx, 'M186 475H1098M202 483V468M1082 483V468', '#a97e47', 2);
    for (let x = 225; x < 1080; x += 98) stroke(ctx, `M${x} 505V558M${x} 515Q${x + 45} 474 ${x + 96} 515`, '#9c7741', 4);
    water(ctx, 91, 558, 730); tree(ctx, 169, 631, .8, 44); stroke(ctx, 'M726 610q36 15 72 0ZM757 608v-30', '#b18d54', 2);
  } else if (id === 'shanghai') {
    moon(ctx, 483, 236, 60); stroke(ctx, 'M783 183V544', '#a5854d', 2);
    [302, 376].forEach((y, i) => { ctx.strokeStyle = '#ac8450'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(783, y, i ? 35 : 20, i ? 26 : 17, 0, 0, Math.PI * 2); ctx.stroke(); });
    stroke(ctx, 'M766 407L738 551M799 407L828 551', '#997948', 5);
    ctx.globalAlpha = .4; fill(ctx, 'M889 550V298L926 255L939 550Z', '#a38b5a'); fill(ctx, 'M972 550Q948 350 1007 240Q984 415 1025 550Z', '#856e47'); ctx.globalAlpha = 1;
    stroke(ctx, 'M889 550V298L926 255L939 550M889 298L926 319', '#a78349', 2); stroke(ctx, DRAWING_PATHS.shanghai[3], '#a48850', 2);
    stroke(ctx, DRAWING_PATHS.shanghai[0], '#a48149', 2.5); water(ctx, 102, 594, 736);
    stroke(ctx, 'M175 645C278 598 395 612 496 638', '#9a7646', 4);
    for (let i = 0; i < 9; i += 1) stroke(ctx, `M${186 + i * 35} ${645 - Math.sin(i / 3) * 22}v-27`, '#ac8b55', 2);
  } else {
    moon(ctx, 805, 239, 74);
    ctx.globalAlpha = .25; fill(ctx, 'M82 526Q220 475 370 515T657 514T958 486Q1090 460 1196 523V568H82Z', '#6c6247'); ctx.globalAlpha = 1;
    water(ctx, 202, 548, 648);
    ctx.globalAlpha = .38; fill(ctx, 'M115 740Q191 608 424 642Q527 663 637 636Q777 589 1178 683L1185 754Z', '#9d804b'); ctx.globalAlpha = 1;
    stroke(ctx, DRAWING_PATHS.shenzhen[1], '#a0814b', 2); tree(ctx, 969, 673, 1.45, 162);
    stroke(ctx, DRAWING_PATHS.shenzhen[2], '#9d783f', 4);
    if (owner === 'both') stroke(ctx, DRAWING_PATHS.shenzhen[3], '#8b7553', 3);
    person(ctx, 645, 657, true); if (owner === 'both') person(ctx, 674, 657, false);
    stroke(ctx, 'M604 401q20-13 37 0M662 383q14-10 28 0', '#a58957', 1.4);
  }
  ctx.globalCompositeOperation = 'destination-in';
  const edge = ctx.createRadialGradient(640, 440, 295, 640, 440, 647);
  edge.addColorStop(0, '#000'); edge.addColorStop(.8, 'rgba(0,0,0,.9)'); edge.addColorStop(1, 'transparent');
  ctx.fillStyle = edge; ctx.fillRect(0, 0, ART_WIDTH, ART_HEIGHT); ctx.globalCompositeOperation = 'source-over';
}

function makeArtwork(place: Place) {
  const painting = document.createElement('canvas'); painting.width = ART_WIDTH; painting.height = ART_HEIGHT;
  const context = painting.getContext('2d')!;
  drawSandArtwork(context, place.id, place.owner);
  context.globalCompositeOperation = 'source-in'; context.fillStyle = place.owner === 'both' ? '#d4b077' : '#59371f'; context.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);
  const line = document.createElement('canvas'); line.width = 800; line.height = Math.round(800 * ART_HEIGHT / ART_WIDTH);
  const ink = line.getContext('2d', { willReadFrequently: true })!;
  ink.fillStyle = '#fff'; ink.fillRect(0, 0, line.width, line.height); ink.filter = 'brightness(0)'; ink.drawImage(painting, 0, 0, line.width, line.height);
  return { line, painting };
}
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const shapeName = (index: number) => `${PLACES[index].owner}-${PLACES[index].id}`;

export default function Journey({ onComplete, reducedMotion }: { onComplete: () => void; reducedMotion: boolean }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(!reducedMotion);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const sandRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLCanvasElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const progressRef = useRef<HTMLSpanElement>(null);
  const mapKnotRef = useRef<SVGGElement>(null);
  const currentIndexRef = useRef(0);
  const controller = useRef<{ select: (index: number, autoplay?: boolean) => void; toggle: () => void; replay: () => void } | null>(null);
  const pointer = useRef({ x: -9999, y: -9999, down: false });
  const finishTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const place = PLACES[active];
  useEffect(() => () => { if (finishTimer.current) clearTimeout(finishTimer.current); }, []);

  useEffect(() => {
    const sand = sandRef.current; const drawing = drawingRef.current; const staticCanvas = fallbackRef.current; const stage = stageRef.current;
    const context = drawing?.getContext('2d'); const staticContext = staticCanvas?.getContext('2d');
    if (!sand || !drawing || !staticCanvas || !stage || !context || !staticContext) return;
    let renderer: SandKit | null = null;
    let disposed = false; let frame = 0; let last = 0; let index = currentIndexRef.current;
    let local = reducedMotion ? BEAT_MS : 0;
    let play = !reducedMotion; let manualDrawing = false; let loaded = false; let visible = true;
    let width = 0; let height = 0; let brushUntil = 0;
    const flying: FallingGrain[] = [];
    const art = PLACES.map(makeArtwork); const rng = randomGenerator(7427);
    staticCanvas.style.opacity = '1';
    const shapes: ShapeSource[] = art.map(({ line }, i) => ({ name: shapeName(i), pinOnly: true, raster: () => ({ line: { w: line.width, h: line.height, data: line.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, line.width, line.height).data } }) }));
    const setPlayback = (value: boolean) => { play = value; setPlaying(value); };
    const showStatic = () => {
      const fit = Math.min(width / ART_WIDTH, height / ART_HEIGHT);
      staticContext.clearRect(0, 0, width, height); staticContext.save();
      staticContext.translate((width - ART_WIDTH * fit) / 2, (height - ART_HEIGHT * fit) / 2); staticContext.scale(fit, fit);
      staticContext.globalAlpha = .9; staticContext.drawImage(art[index].painting, 0, 0); staticContext.restore();
    };
    const select = (next: number, autoplay = false) => {
      const changed = index !== Math.max(0, Math.min(LAST, next));
      index = Math.max(0, Math.min(LAST, next)); local = reducedMotion ? BEAT_MS : 0;
      currentIndexRef.current = index;
      manualDrawing = !reducedMotion && !autoplay; setActive(index); setPlayback(autoplay && !reducedMotion); flying.length = 0;
      if (renderer) { renderer.resume(); renderer.pin(shapeName(index)); if (changed) renderer.replay(); void renderer.setOptions({ color: index === LAST ? '#d4b077' : '#65401f', colorDark: index === LAST ? '#d4b077' : '#65401f' }); }
      if (!renderer || reducedMotion) showStatic(); last = 0; wake();
    };
    const toggle = () => {
      if (reducedMotion || !loaded) return;
      if (index === LAST && local >= BEAT_MS && !play) { select(0, true); return; }
      manualDrawing = false; setPlayback(!play); if (play) renderer?.resume(); else renderer?.pause(); last = 0; wake();
    };
    controller.current = { select, toggle, replay: () => select(0, !reducedMotion) };
    const emit = (x: number, y: number, amount: number, force = 1) => {
      for (let i = 0; i < amount; i += 1) flying.push({ x: x + (rng() - .5) * 20, y: y - rng() * 24, vx: (rng() - .5) * 105 * force, vy: -25 - rng() * 65, life: .5 + rng() * .8, size: .6 + rng() * 1.9, shade: rng() });
      if (flying.length > 1100) flying.splice(0, flying.length - 1100);
    };
    const paintFrame = (stamp: number) => {
      frame = 0;
      if (disposed || document.hidden || !visible || !loaded) { last = 0; return; }
      const dt = last ? Math.min(.045, (stamp - last) / 1000) : 0; last = stamp;
      if ((play || manualDrawing) && !reducedMotion) local += dt * 1000;
      if (play && local >= BEAT_MS) {
        if (index < LAST) { index += 1; currentIndexRef.current = index; local = 0; setActive(index); renderer?.pin(shapeName(index)); void renderer?.setOptions({ color: index === LAST ? '#d4b077' : '#65401f', colorDark: index === LAST ? '#d4b077' : '#65401f' }); if (!renderer) showStatic(); }
        else { setPlayback(false); renderer?.pause(); }
      }
      if (manualDrawing && local > (index === LAST ? 7300 : 4800)) { manualDrawing = false; renderer?.pause(); }
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${clamp((index + Math.min(local / BEAT_MS, 1)) / PLACES.length)})`;
      if (mapKnotRef.current) mapKnotRef.current.style.opacity = `${reducedMotion ? 1 : clamp((local - 6300) / 700)}`;
      context.clearRect(0, 0, width, height);
      const fit = Math.min(width / ART_WIDTH, height / ART_HEIGHT); const ox = (width - ART_WIDTH * fit) / 2; const oy = (height - ART_HEIGHT * fit) / 2;
      context.save(); context.translate(ox, oy); context.scale(fit, fit);
      pathRefs.current.forEach((path, n) => {
        if (!path) return;
        const paired = index === LAST; const offset = paired ? 1100 + n * 2600 : 350 + n * 870;
        const p = reducedMotion ? 1 : clamp((local - offset) / (paired ? 2600 : 1250)); const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`; path.style.strokeDashoffset = `${length * (1 - p)}`; path.style.opacity = `${paired ? .95 : reducedMotion ? 0 : p < 1 ? .55 : .15}`;
        if (p > 0 && p < 1 && (play || manualDrawing) && dt > 0) {
          const tip = path.getPointAtLength(length * p); emit(tip.x, tip.y, Math.max(1, Math.round(dt * 140)), paired ? 1.45 : .8);
          context.fillStyle = '#69402518'; context.beginPath(); context.ellipse(tip.x + 5, tip.y - 8, 26, 9, -.35, 0, Math.PI * 2); context.fill();
        }
      });
      if (!reducedMotion && pointer.current.down) {
        const p = pointer.current; emit((p.x - ox) / fit, (p.y - oy) / fit, Math.max(3, Math.round(dt * 240)), 1.8); brushUntil = stamp + 550;
        const mask = `radial-gradient(circle 32px at ${p.x}px ${p.y}px, transparent 28%, #000 100%)`; sand.style.maskImage = mask; staticCanvas.style.maskImage = mask;
      } else if (stamp > brushUntil) { sand.style.maskImage = ''; staticCanvas.style.maskImage = ''; }
      for (let i = flying.length - 1; i >= 0; i -= 1) {
        const grain = flying[i]; grain.life -= dt;
        if (grain.life <= 0) { flying.splice(i, 1); continue; }
        grain.vy += dt * 112; grain.x += grain.vx * dt; grain.y += grain.vy * dt;
        context.globalAlpha = Math.min(1, grain.life * 2) * (.4 + grain.shade * .45); context.fillStyle = index === LAST ? (grain.shade > .6 ? '#fff2d9' : '#e4b862') : grain.shade > .6 ? '#a9763e' : '#57341e'; context.fillRect(grain.x, grain.y, grain.size, grain.size);
      }
      context.restore();
      if (play || manualDrawing || flying.length || pointer.current.down || stamp < brushUntil) frame = requestAnimationFrame(paintFrame);
    };
    function wake() { if (!frame && !disposed && !document.hidden && visible && loaded) frame = requestAnimationFrame(paintFrame); }
    const resize = () => {
      const rect = stage.getBoundingClientRect(); width = rect.width; height = rect.height; const dpr = Math.min(window.devicePixelRatio || 1, 2);
      [drawing, staticCanvas].forEach((canvas) => { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); });
      context.setTransform(dpr, 0, 0, dpr, 0, 0); staticContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      const fit = Math.min(width / ART_WIDTH, height / ART_HEIGHT); void renderer?.setOptions({ pictureScale: fit * ART_WIDTH / Math.max(1, Math.min(width, height)) }); showStatic(); wake();
      stage.style.setProperty('--map-width', `${fit * ART_WIDTH}px`); stage.style.setProperty('--map-height', `${fit * ART_HEIGHT}px`);
    };
    const availability = () => {
      last = 0;
      if (document.hidden || !visible) { renderer?.pause(); cancelAnimationFrame(frame); frame = 0; pointer.current.down = false; }
      else { if (play || manualDrawing) renderer?.resume(); wake(); }
    };
    const resizer = new ResizeObserver(resize); resizer.observe(stage);
    const observer = new IntersectionObserver((entries) => { visible = entries.some((entry) => entry.isIntersecting); availability(); }, { threshold: .12 }); observer.observe(stage);
    document.addEventListener('visibilitychange', availability);
    const pointerWake = () => wake(); stage.addEventListener('pointerdown', pointerWake); stage.addEventListener('pointermove', pointerWake); resize();
    if (reducedMotion) { loaded = true; setReady(true); setFallback(true); setPlayback(false); showStatic(); wake(); }
    else {
      try {
        renderer = new SandKit(sand, { shapes, worker: true, options: {
          count: window.innerWidth < 700 ? 32000 : 52000, pointSize: 1.15, sizeVariation: 1.3, opacity: .92, color: index === LAST ? '#d4b077' : '#65401f', colorDark: index === LAST ? '#d4b077' : '#65401f',
          introMs: 3800, moveMs: 3700, holdMs: 15000, stagger: .38, scatterPhase: .36, scatterReach: .23, scatterDepth: .65, flightFade: .06,
          jitter: .001, sway: 0, tilt: .07, tiltEase: .16, depthRange: .15, depthContrast: .22, dustShare: .008, fillDensity: .3, interiorTone: .045, blurRadius: 1, cloudRadius: 1.2, cloudFar: -.55,
          pictureScale: Math.min(width / ART_WIDTH, height / ART_HEIGHT) * ART_WIDTH / Math.max(1, Math.min(width, height)),
        }, onError: (error) => { if (!disposed && error.message.includes('context')) { renderer?.pause(); staticCanvas.style.opacity = '1'; setFallback(true); setPlayback(false); showStatic(); } } });
        renderer.pin(shapeName(index));
        renderer.ready.then(() => {
          if (disposed) return; loaded = true; setReady(true); setFallback(false); staticCanvas.style.opacity = '0'; availability(); wake();
        }).catch(() => {
          if (disposed) return; renderer?.dispose(); renderer = null; loaded = true; setReady(true); setFallback(true); setPlayback(false); local = BEAT_MS; showStatic(); wake();
        });
      } catch { loaded = true; setReady(true); setFallback(true); setPlayback(false); local = BEAT_MS; showStatic(); wake(); }
    }
    return () => { disposed = true; cancelAnimationFrame(frame); renderer?.dispose(); resizer.disconnect(); observer.disconnect(); document.removeEventListener('visibilitychange', availability); stage.removeEventListener('pointerdown', pointerWake); stage.removeEventListener('pointermove', pointerWake); controller.current = null; };
  }, [reducedMotion]);

  const handlePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect(); pointer.current.x = event.clientX - rect.left; pointer.current.y = event.clientY - rect.top;
    if (event.type === 'pointerdown') { pointer.current.down = true; event.currentTarget.setPointerCapture(event.pointerId); }
  };
  const releasePointer = () => { pointer.current.down = false; };
  const complete = () => {
    if (leaving) return;
    if (reducedMotion) { onCompleteRef.current(); return; }
    setLeaving(true); finishTimer.current = setTimeout(() => onCompleteRef.current(), 1100);
  };
  const next = () => { if (active === LAST) complete(); else controller.current?.select(active + 1, playing); };
  return (
    <section className={`journey-stage journey-film${active === LAST ? ' journey-map-finale' : ''}${leaving ? ' journey-leaving' : ''}${reducedMotion ? ' journey-still' : ''}`} aria-label="第二章，流沙绘成的两条人生路线">
      <header className="journey-heading"><span className="journey-eyebrow">CHAPTER II · EVERY ROAD LED TO A STORY</span><h2>走过山海，<em>与你同页。</em></h2><p>让沙慢慢画出你的来路，也画出我的。</p></header>
      <div className="journey-routes" aria-label="两条来路，可以点选回看">
        {(['her', 'me'] as const).map((owner) => <div className={`journey-route journey-route-${owner}${place.owner === owner || place.owner === 'both' ? ' is-active' : ''}`} key={owner}>
          <span className="journey-route-label">{owner === 'her' ? '你的来路' : '我的来路'}</span>
          <div className="journey-stops">{PLACES.map((item, i) => ((item.owner === owner || (owner === 'me' && item.owner === 'both')) && <button type="button" key={`${owner}-${i}`} onClick={() => controller.current?.select(i)} disabled={!ready || leaving} className={active === i || (place.owner === 'both' && item.id === 'shenzhen') ? 'is-current' : ''} aria-current={active === i ? 'step' : undefined}>{item.city}<span aria-hidden="true" /></button>))}</div>
        </div>)}
      </div>
      <div className="journey-light-table">
        <div className="journey-place" key={`place-${active}`} aria-live="polite" aria-atomic="true"><span>{place.owner === 'her' ? '你的旅程' : place.owner === 'me' ? '我的旅程' : '我们的这一页'}</span><h3>{place.city}</h3>{place.school && <p>{place.school}</p>}</div>
        <div ref={stageRef} className="journey-sand-window" onPointerDown={handlePointer} onPointerMove={handlePointer} onPointerUp={releasePointer} onPointerCancel={releasePointer} onLostPointerCapture={releasePointer}>
          <canvas ref={fallbackRef} className={`journey-fallback${fallback ? ' is-visible' : ''}`} aria-hidden="true" />
          <canvas ref={sandRef} className="journey-sand" aria-hidden="true" />
          <svg className="journey-drawn-lines" viewBox={`0 0 ${ART_WIDTH} ${ART_HEIGHT}`} aria-hidden="true">{(active === LAST ? MAP_ROUTES : DRAWING_PATHS[place.id]).map((d, i) => <path className={active === LAST ? `journey-map-route journey-map-route-${i}` : undefined} d={d} key={`${active}-${i}`} ref={(node) => { pathRefs.current[i] = node; }} />)}
            {active === LAST && <g ref={mapKnotRef} className="journey-map-knot" transform={`translate(${MEETING[0]} ${MEETING[1]})`}><circle r="13" /><path d="M0 0C-25-20-34 13-9 9L0 0C24-21 34 12 9 9Z" /><path d="M-1 2Q-9 23-27 26M2 2Q11 24 30 27" /></g>}
          </svg>
          {active === LAST && <div className="journey-map-labels" aria-label="中国地图上的两条实际城市路线">
            {MAP_POINTS.map((point) => { const [x, y] = mapPosition(point); return <span className={`journey-map-label journey-map-label-${point.id}`} key={point.id} style={{ left: `${(x + point.dx) / ART_WIDTH * 100}%`, top: `${(y + point.dy) / ART_HEIGHT * 100}%` }}>{point.label}</span>; })}
            <div className="journey-map-meaning"><span>两条来路 · 一个此刻</span><p>你是暖金，我是月白。<br />从深圳起，想与你并肩。</p></div>
            <span className="journey-map-note">河南为省级示意点 · 两条路线分别展开</span>
          </div>}
          <canvas ref={drawingRef} className="journey-falling-sand" aria-hidden="true" /><div className="journey-photo-outline" aria-hidden="true" />
        </div>
        <div className="journey-caption" key={`caption-${active}`}><p>{place.line}</p><span>{place.caption}</span></div><div className="journey-grain-tray" aria-hidden="true" />
      </div>
      <div className="journey-film-progress" aria-label={`旅程进度，第${active + 1}幕，共${PLACES.length}幕`}><span ref={progressRef} /></div>
      <footer className="journey-footer">
        <button type="button" className="journey-back" onClick={() => controller.current?.select(active - 1)} disabled={active === 0 || !ready || leaving}><span aria-hidden="true">←</span> 上一幕</button>
        <div className="journey-playback">{active === LAST ? <div className="journey-replays"><button type="button" onClick={() => controller.current?.select(LAST)} disabled={!ready || leaving}>↻ 重看地图上的来路</button><button type="button" onClick={() => controller.current?.replay()} disabled={!ready || leaving}>从头再看</button></div> : !reducedMotion && !fallback && <button type="button" onClick={() => controller.current?.toggle()} disabled={!ready || leaving} aria-label={playing ? '暂停沙画动画' : '继续播放沙画动画'}><span aria-hidden="true">{playing ? 'Ⅱ' : '▷'}</span>{playing ? '停下来看看' : '继续这段旅程'}</button>}<span className="journey-brush-hint">{!ready ? '沙粒正在汇聚…' : reducedMotion ? '每一页，都可以慢慢看' : fallback ? '静态沙画 · 可以逐幕阅读' : '自动展开 · 指尖也可以拂动沙粒'}</span></div>
        <button type="button" className="journey-next" onClick={next} disabled={!ready || leaving}>{active === LAST ? '把回忆放进书里' : '下一幕'}<span aria-hidden="true">→</span></button>
      </footer>
    </section>
  );
}

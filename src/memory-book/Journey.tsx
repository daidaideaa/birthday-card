import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import './journey.css';

type PlaceId = 'henan' | 'tianjin' | 'beijing' | 'hongkong' | 'wuhan' | 'nanjing' | 'shanghai' | 'shenzhen';
type Place = { id: PlaceId; city: string; school?: string; owner: 'her' | 'me' | 'both'; line: string; caption: string };

const PLACES: Place[] = [
  { id: 'henan', city: '河南', owner: 'her', line: '故事，从这里慢慢展开。', caption: '一粒沙，一页书。一条属于你的路。' },
  { id: 'tianjin', city: '天津', owner: 'her', line: '每一次向前，都有新的风景。', caption: '让风翻过这一页，让光落在下一程。' },
  { id: 'beijing', city: '北京', school: '中国政法大学', owner: 'her', line: '愿每一份认真，都有回响。', caption: '书页里，藏着自己的辽阔。' },
  { id: 'hongkong', city: '香港', school: '香港科技大学', owner: 'her', line: '越过山海，依然闪闪发光。', caption: '把目光交给远方，也把温柔留给自己。' },
  { id: 'wuhan', city: '武汉', owner: 'me', line: '书的另一页，也写着我的来路。', caption: '另一条线，从这里开始。' },
  { id: 'nanjing', city: '南京', school: '东南大学', owner: 'me', line: '走过自己的春夏，再向前一点。', caption: '有些页，直到后来才读懂它的伏笔。' },
  { id: 'shanghai', city: '上海', school: '上海交通大学', owner: 'me', line: '远方之外，还会有新的远方。', caption: '这条路，也渐渐写到了深圳。' },
  { id: 'shenzhen', city: '深圳', owner: 'both', line: '后来，在深圳，我遇见了你。', caption: '此前，各自向前。此后，还有许多页，想和你一起写。' },
];

type Grain = { x: number; y: number; fromX: number; fromY: number; tx: number; ty: number; size: number; alpha: number; color: string; delay: number; offset: number };
const ART_WIDTH = 1280;
const ART_HEIGHT = 850;

function randomGenerator(seed: number) {
  let n = seed;
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

function stroke(ctx: CanvasRenderingContext2D, d: string, color = '#c9a466', width = 1.6) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke(new Path2D(d));
}

function fill(ctx: CanvasRenderingContext2D, d: string, color: string) {
  ctx.fillStyle = color;
  ctx.fill(new Path2D(d));
}

function tree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, seed: number) {
  const random = randomGenerator(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // A bent trunk and loose leaf clusters give the sand a drawn silhouette.
  fill(ctx, 'M-10 0 Q-5-64-17-110 Q-32-145-20-174 Q-18-130 9-107 Q4-77 14 0Z', '#b08e52');
  const branches = [
    'M0-70 Q-39-98-67-110 Q-110-117-134-144', 'M-2-89 Q33-124 58-155 Q91-173 130-176',
    'M-15-117 Q-58-157-53-208', 'M-16-125 Q9-173 16-218', 'M-30-142 Q-84-172-112-186',
    'M10-111 Q65-128 99-127 Q132-129 154-151',
  ];
  branches.forEach((d) => stroke(ctx, d, '#bd9e66', 4));
  for (let i = 0; i < 235; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random());
    const px = Math.cos(angle) * radius * 177;
    const py = -170 + Math.sin(angle) * radius * 75;
    ctx.fillStyle = i % 3 === 0 ? '#e4bf7b' : i % 2 === 0 ? '#9d814e' : '#cda465';
    ctx.globalAlpha = 0.27 + random() * 0.49;
    ctx.beginPath();
    ctx.ellipse(px, py, 3 + random() * 8, 2 + random() * 5, random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function water(ctx: CanvasRenderingContext2D, seed: number, low = 570, high = 730) {
  const random = randomGenerator(seed);
  for (let i = 0; i < 220; i += 1) {
    const y = low + random() * (high - low);
    const x = 80 + random() * 1100;
    const length = 5 + random() * 59;
    const middle = 1 - Math.abs(x - 640) / 640;
    ctx.globalAlpha = 0.16 + middle * 0.35;
    stroke(ctx, `M${x} ${y}q${length / 2} -2 ${length} 0`, '#cfac70', 0.7 + random() * 1.6);
  }
  ctx.globalAlpha = 1;
}

function moon(ctx: CanvasRenderingContext2D, x = 800, y = 200, radius = 72) {
  ctx.save();
  ctx.strokeStyle = '#dbc28b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(x, y, radius + 7, Math.PI * 0.18, Math.PI * 1.36);
  ctx.stroke();
  const glow = ctx.createRadialGradient(x - 10, y - 12, 3, x, y, radius);
  glow.addColorStop(0, 'rgba(245,216,162,.30)');
  glow.addColorStop(1, 'rgba(197,155,92,.02)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function littlePerson(ctx: CanvasRenderingContext2D, x: number, y: number, dress: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#e6c188';
  ctx.beginPath();
  ctx.arc(0, -39, 5, 0, Math.PI * 2);
  ctx.fill();
  fill(ctx, dress ? 'M-4-32L4-32 10-11-9-11Z' : 'M-6-32L6-32 7-13-7-13Z', '#dcc18e');
  stroke(ctx, 'M-4-12L-5 0M4-12L5 0', '#dcc18e', 2.5);
  stroke(ctx, dress ? 'M-4-29L-10-18M4-28L15-21' : 'M-4-29L-15-21M4-28L10-15', '#dcc18e', 2);
  ctx.restore();
}

/** Original illustrative contours; the school labels are never attached to an invented campus. */
function drawSandArtwork(ctx: CanvasRenderingContext2D, id: PlaceId) {
  ctx.clearRect(0, 0, ART_WIDTH, ART_HEIGHT);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const random = randomGenerator(73);
  // Fine stars and a hand-etched celestial arc unite the otherwise different landscapes.
  for (let i = 0; i < 75; i += 1) {
    const x = 120 + random() * 1040;
    const y = 70 + random() * 380;
    const r = random() > 0.92 ? 2.3 : 0.8;
    ctx.fillStyle = '#d6b779';
    ctx.globalAlpha = 0.3 + random() * 0.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 0.4;
  stroke(ctx, 'M165 379C220 60 1010 24 1123 391', '#c9a56a', 0.8);
  ctx.globalAlpha = 1;

  if (id === 'henan') {
    moon(ctx, 816, 218, 66);
    fill(ctx, 'M95 553Q208 427 369 449T636 429T924 476Q1042 456 1195 558L1195 604H95Z', '#766543');
    stroke(ctx, 'M85 554Q260 467 420 516T764 514T1194 558', '#c6a671', 3);
    stroke(ctx, 'M93 604Q250 548 505 591T1190 613', '#d4b982', 2);
    fill(ctx, 'M583 736Q599 643 717 601Q789 576 878 565Q792 594 755 620Q676 676 724 736Z', '#b69a62');
    for (let i = 0; i < 24; i += 1) {
      const x = 190 + i * 13;
      const y = 662 + Math.sin(i * 0.6) * 20;
      stroke(ctx, `M${x} ${y}q-7-30 4-65`, '#d8b47a', 1.5);
      for (let j = 0; j < 5; j += 1) {
        const stemY = y - 55 + j * 7;
        stroke(ctx, `M${x + 1} ${stemY}l-7-7m7 7 8-6`, '#e2bd7e', 2);
      }
    }
    tree(ctx, 975, 583, 0.64, 19);
  } else if (id === 'tianjin') {
    moon(ctx, 906, 223, 52);
    const cx = 707; const cy = 349; const radius = 133;
    ctx.strokeStyle = '#d8b77c'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 28; i += 1) {
      const a = i / 28 * Math.PI * 2;
      const x = cx + Math.cos(a) * radius; const y = cy + Math.sin(a) * radius;
      stroke(ctx, `M${cx} ${cy}L${x} ${y}`, '#a68c61', 0.9);
      ctx.fillStyle = '#dfbd80'; ctx.fillRect(x - 3, y - 3, 6, 6);
    }
    stroke(ctx, 'M635 550L707 349 780 550', '#d1aa6c', 5);
    fill(ctx, 'M125 544Q371 455 571 537Q866 456 1160 554L1160 565Q857 492 571 565Q329 498 125 565Z', '#b3915c');
    stroke(ctx, 'M125 534Q371 445 571 527Q866 446 1160 544', '#d4b37a', 1.5);
    for (let x = 168; x < 1150; x += 26) stroke(ctx, `M${x} ${535 - Math.sin(x / 150) * 12}v20`, '#b79b65', 1);
    water(ctx, 19);
    tree(ctx, 223, 610, 0.76, 34);
  } else if (id === 'beijing' || id === 'nanjing') {
    moon(ctx, 853, 198, 59);
    tree(ctx, 310, 578, 1.34, id === 'beijing' ? 29 : 89);
    tree(ctx, 1039, 563, 0.63, 32);
    stroke(ctx, 'M137 621Q341 562 539 608T1149 623', '#c6a575', 2);
    stroke(ctx, 'M165 642Q414 588 573 638T1111 644', '#927746', 1);
    // Open pages, rather than a made-up university building.
    fill(ctx, 'M511 448Q629 419 734 486Q834 419 949 448L938 590Q824 568 734 625Q623 568 518 591Z', '#897344');
    stroke(ctx, 'M511 448Q629 419 734 486Q834 419 949 448L938 590Q824 568 734 625Q623 568 518 591Z', '#d8b67c', 3);
    stroke(ctx, 'M734 486V625M502 460L503 604Q619 582 734 638Q848 582 950 604L958 460', '#d8b67c', 1.5);
    for (let i = 0; i < 7; i += 1) {
      const y = 477 + i * 14;
      stroke(ctx, `M547 ${y}Q623 ${y - 10} 706 ${y + 29}M761 ${y + 29}Q835 ${y - 10} 912 ${y}`, '#c2a36a', 0.9);
    }
    for (let i = 0; i < 11; i += 1) {
      const x = 466 + i * 31; const y = 277 + Math.sin(i * 0.8) * 33;
      stroke(ctx, `M${x} ${y}q5-7 11-1q7-7 12-4`, '#d9ba83', 1.3);
    }
  } else if (id === 'hongkong') {
    moon(ctx, 841, 206, 76);
    fill(ctx, 'M99 527Q257 475 368 360Q466 447 524 422Q625 511 703 452Q801 544 989 492L1185 580H99Z', '#7e704f');
    stroke(ctx, 'M98 527Q257 475 368 360Q466 447 524 422Q625 511 703 452Q801 544 989 492', '#bd9d63', 2);
    stroke(ctx, 'M168 568Q363 549 510 582T1127 570', '#e1bf82', 3);
    water(ctx, 20, 584, 728);
    fill(ctx, 'M987 722Q906 660 893 598Q935 597 968 578Q1002 617 1153 649L1172 731Z', '#7f6a45');
    stroke(ctx, 'M991 724Q909 660 893 598Q932 597 968 578', '#d9b77b', 2);
    stroke(ctx, 'M614 618Q657 640 697 618Z', '#dfbe88', 2.5);
    stroke(ctx, 'M654 615V556L682 613Z', '#dfbe88', 1.5);
  } else if (id === 'wuhan') {
    moon(ctx, 843, 213, 82);
    stroke(ctx, 'M109 511Q317 453 506 505T1166 506', '#a78e62', 1.5);
    fill(ctx, 'M180 483H1098V504H180Z', '#a58853');
    stroke(ctx, 'M186 475H1098M202 483V468M1082 483V468', '#e0b979', 2);
    for (let x = 225; x < 1080; x += 98) {
      stroke(ctx, `M${x} 505V558M${x} 515Q${x + 45} 474 ${x + 96} 515`, '#d3ad6d', 5);
    }
    water(ctx, 91, 558, 730);
    tree(ctx, 169, 631, 0.8, 44);
    stroke(ctx, 'M726 610q36 15 72 0ZM757 608v-30', '#e2bc7a', 2);
  } else if (id === 'shanghai') {
    moon(ctx, 483, 226, 61);
    // Three recognizable river silhouettes, kept spare rather than a skyline of boxes.
    fill(ctx, 'M769 531V393L783 339L797 393V531Z', '#a48a55');
    stroke(ctx, 'M783 183V544', '#d1af72', 2);
    [302, 376].forEach((y, i) => {
      ctx.strokeStyle = '#d9b77d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(783, y, i ? 35 : 20, i ? 26 : 17, 0, 0, Math.PI * 2); ctx.stroke();
    });
    stroke(ctx, 'M766 407L738 551M799 407L828 551', '#bd9c62', 5);
    fill(ctx, 'M889 550V298L926 255L939 550Z', '#a38b5a');
    stroke(ctx, 'M889 550V298L926 255L939 550M889 298L926 319', '#debb7b', 2);
    fill(ctx, 'M972 550Q948 350 1007 240Q984 415 1025 550Z', '#856e47');
    stroke(ctx, 'M972 550Q948 350 1007 240Q984 415 1025 550', '#c1a168', 2);
    stroke(ctx, 'M141 570Q372 528 601 571T1155 577', '#ddba7b', 2.5);
    water(ctx, 102, 594, 736);
    stroke(ctx, 'M175 645C278 598 395 612 496 638', '#b09055', 4);
    for (let i = 0; i < 9; i += 1) stroke(ctx, `M${186 + i * 35} ${645 - Math.sin(i / 3) * 22}v-27`, '#c5a570', 2);
  } else {
    moon(ctx, 805, 224, 86);
    fill(ctx, 'M82 526Q220 475 370 515T657 514T958 486Q1090 460 1196 523V568H82Z', '#6c6247');
    water(ctx, 202, 548, 648);
    fill(ctx, 'M115 740Q191 608 424 642Q527 663 637 636Q777 589 1178 683L1185 754Z', '#8f794c');
    stroke(ctx, 'M115 740Q191 608 424 642Q527 663 637 636Q777 589 1178 683', '#d6b57a', 2);
    tree(ctx, 969, 673, 1.45, 162);
    stroke(ctx, 'M247 739Q428 732 556 663Q597 644 659 667Q705 687 779 688', '#f0d097', 5);
    stroke(ctx, 'M1056 746Q861 735 798 701Q732 676 674 675Q617 670 593 680', '#b8c6bc', 3);
    littlePerson(ctx, 645, 657, true);
    littlePerson(ctx, 674, 657, false);
    stroke(ctx, 'M604 401q20-13 37 0M662 383q14-10 28 0', '#e2c58c', 1.4);
  }
  // The unfinished edge feels like sand on a light table, not a rectangular image.
  ctx.globalCompositeOperation = 'destination-in';
  const edge = ctx.createRadialGradient(640, 440, 275, 640, 440, 647);
  edge.addColorStop(0, '#000'); edge.addColorStop(0.8, 'rgba(0,0,0,.9)'); edge.addColorStop(1, 'transparent');
  ctx.fillStyle = edge; ctx.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);
  ctx.globalCompositeOperation = 'source-over';
}

function buildGrains(art: HTMLCanvasElement, previous: Grain[], seed: number) {
  const context = art.getContext('2d', { willReadFrequently: true });
  if (!context) return [];
  const pixels = context.getImageData(0, 0, ART_WIDTH, ART_HEIGHT).data;
  const random = randomGenerator(seed + 88);
  const grains: Grain[] = [];
  const step = window.innerWidth < 700 ? 4 : 3;
  for (let y = 60; y < ART_HEIGHT - 45; y += step) {
    for (let x = 65; x < ART_WIDTH - 65; x += step) {
      const tx = Math.min(ART_WIDTH - 1, x + Math.floor(random() * step));
      const ty = Math.min(ART_HEIGHT - 1, y + Math.floor(random() * step));
      const index = (ty * ART_WIDTH + tx) * 4;
      const alpha = pixels[index + 3] / 255;
      if (alpha < 0.13 || random() > 0.83) continue;
      const old = previous[grains.length % Math.max(1, previous.length)];
      const fromX = old?.x ?? tx + (random() - 0.5) * 360;
      const fromY = old?.y ?? 680 + random() * 80;
      grains.push({
        x: fromX, y: fromY, fromX, fromY, tx, ty,
        size: 0.65 + random() * 1.1, alpha: 0.36 + alpha * 0.64,
        color: `rgb(${pixels[index]},${pixels[index + 1]},${pixels[index + 2]})`,
        delay: tx / ART_WIDTH * 0.65 + random() * 0.2, offset: random() * Math.PI * 2,
      });
    }
  }
  return grains;
}

export default function Journey({ onComplete, reducedMotion }: { onComplete: () => void; reducedMotion: boolean }) {
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grainsRef = useRef<Grain[]>([]);
  const pointerRef = useRef({ x: -1000, y: -1000, down: false });
  const drawRef = useRef<(() => void) | null>(null);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const place = PLACES[active];

  useEffect(() => () => { if (finishTimer.current) clearTimeout(finishTimer.current); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const art = document.createElement('canvas');
    art.width = ART_WIDTH; art.height = ART_HEIGHT;
    const artContext = art.getContext('2d', { willReadFrequently: true });
    if (!artContext) return;
    drawSandArtwork(artContext, place.id);
    const grains = buildGrains(art, grainsRef.current, active * 8);
    grainsRef.current = grains;
    let frame = 0;
    let start = performance.now();
    let width = 0; let height = 0;
    let hiddenAt = 0;
    let running = false;
    let stopped = false;
    let interactionUntil = 0;

    const render = (now: number) => {
      frame = 0;
      if (stopped || document.hidden) { running = false; return; }
      context.clearRect(0, 0, width, height);
      context.save();
      const scale = Math.min(width / ART_WIDTH, height / ART_HEIGHT);
      const ox = (width - ART_WIDTH * scale) / 2;
      const oy = (height - ART_HEIGHT * scale) / 2;
      context.translate(ox, oy); context.scale(scale, scale);
      const elapsed = reducedMotion ? 9 : (now - start) / 1000;
      const pointer = pointerRef.current;
      const pointerX = (pointer.x - ox) / scale;
      const pointerY = (pointer.y - oy) / scale;
      const moving = !reducedMotion && (elapsed < 3.6 || now < interactionUntil);
      const underlay = Math.min(1, Math.max(0, (elapsed - 1.4) / 1.5));
      context.globalAlpha = underlay * 0.2;
      context.drawImage(art, 0, 0);
      grains.forEach((grain) => {
        const raw = reducedMotion ? 1 : Math.min(1, Math.max(0, (elapsed - grain.delay) / 2.2));
        const progress = 1 - Math.pow(1 - raw, 3);
        let x = grain.fromX + (grain.tx - grain.fromX) * progress;
        let y = grain.fromY + (grain.ty - grain.fromY) * progress;
        if (raw < 1) {
          x += Math.sin(raw * Math.PI * 2 + grain.offset) * (1 - raw) * 56;
          y -= Math.sin(raw * Math.PI) * 90;
        }
        if (!reducedMotion) {
          const dx = grain.tx - pointerX; const dy = grain.ty - pointerY;
          const distance = Math.hypot(dx, dy);
          if (pointer.down && distance < 105) {
            const force = (1 - distance / 105) * 46;
            x += dx / Math.max(1, distance) * force;
            y += dy / Math.max(1, distance) * force;
          }
          // A short settling movement makes a brushstroke leave a physical trace.
          grain.x += (x - grain.x) * (moving ? 0.16 : 1);
          grain.y += (y - grain.y) * (moving ? 0.16 : 1);
        } else { grain.x = grain.tx; grain.y = grain.ty; }
        context.globalAlpha = grain.alpha * Math.min(1, raw * 4 + 0.12);
        context.fillStyle = grain.color;
        context.fillRect(grain.x, grain.y, grain.size, grain.size);
      });
      context.restore();
      running = moving || pointer.down;
      if (running && !reducedMotion) frame = requestAnimationFrame(render);
    };
    const requestDraw = () => {
      interactionUntil = performance.now() + 1200;
      if (!running && !document.hidden) { running = true; frame = requestAnimationFrame(render); }
    };
    drawRef.current = requestDraw;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      requestDraw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const visibility = () => {
      if (document.hidden) {
        hiddenAt = performance.now(); cancelAnimationFrame(frame); running = false;
        pointerRef.current.down = false;
      } else {
        if (hiddenAt) start += performance.now() - hiddenAt;
        hiddenAt = 0; requestDraw();
      }
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      stopped = true; cancelAnimationFrame(frame); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      drawRef.current = null;
    };
  }, [active, place.id, reducedMotion]);

  const handlePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!pointerRef.current.down && event.type === 'pointermove') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerRef.current.x = event.clientX - bounds.left;
    pointerRef.current.y = event.clientY - bounds.top;
    if (event.type === 'pointerdown') {
      pointerRef.current.down = true;
      setTouched(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    drawRef.current?.();
  };
  const releasePointer = () => {
    pointerRef.current.down = false;
    drawRef.current?.();
  };
  const select = (index: number) => {
    if (leaving) return;
    pointerRef.current.down = false;
    setActive(index);
  };
  const next = () => {
    if (leaving) return;
    if (active < PLACES.length - 1) { select(active + 1); return; }
    if (reducedMotion) { onComplete(); return; }
    setLeaving(true);
    finishTimer.current = setTimeout(onComplete, 1100);
  };

  return (
    <section className={`journey-stage${place.owner === 'both' ? ' journey-together' : ''}${leaving ? ' journey-leaving' : ''}${reducedMotion ? ' journey-still' : ''}`} aria-label="第二章，两条人生路线">
      <div className="journey-vellum" aria-hidden="true" />
      <header className="journey-heading">
        <span className="journey-eyebrow">CHAPTER II · 沿途有光</span>
        <h2>两条路，<em>终于同向。</em></h2>
        <p>那些各自走过的风景，都被这本书好好珍藏。</p>
      </header>

      <div className="journey-composition">
        <aside className="journey-routes" aria-label="回看两个人的路线">
          <div className={`journey-route${place.owner === 'her' ? ' is-active' : ''}`}>
            <span className="journey-route-label"><i />你的来路</span>
            <div className="journey-stops">
              {PLACES.filter((item) => item.owner === 'her').map((item) => {
                const index = PLACES.indexOf(item);
                return <button type="button" key={item.id} onClick={() => select(index)} className={active === index ? 'is-current' : ''} aria-current={active === index ? 'step' : undefined} disabled={leaving}><span />{item.city}</button>;
              })}
              <button type="button" onClick={() => select(7)} className={active === 7 ? 'is-current' : ''} aria-current={active === 7 ? 'step' : undefined} disabled={leaving}><span />深圳</button>
            </div>
          </div>
          <div className={`journey-route journey-route-me${place.owner === 'me' ? ' is-active' : ''}`}>
            <span className="journey-route-label"><i />我的来路</span>
            <div className="journey-stops">
              {PLACES.filter((item) => item.owner === 'me').map((item) => {
                const index = PLACES.indexOf(item);
                return <button type="button" key={item.id} onClick={() => select(index)} className={active === index ? 'is-current' : ''} aria-current={active === index ? 'step' : undefined} disabled={leaving}><span />{item.city}</button>;
              })}
              <button type="button" onClick={() => select(7)} className={active === 7 ? 'is-current' : ''} aria-current={active === 7 ? 'step' : undefined} disabled={leaving}><span />深圳</button>
            </div>
          </div>
          <span className="journey-route-note">各自的章节<br />在这里写到同一页</span>
        </aside>

        <div className="journey-picture">
          <div className="journey-paper-corner journey-paper-corner-left" aria-hidden="true" />
          <div className="journey-paper-corner journey-paper-corner-right" aria-hidden="true" />
          <canvas ref={canvasRef} className="journey-sand" aria-label={`${place.city}的沙画。可以轻扫沙面，让沙粒散开再聚拢。`} role="img" onPointerDown={handlePointer} onPointerMove={handlePointer} onPointerUp={releasePointer} onPointerCancel={releasePointer} onLostPointerCapture={releasePointer} />
          <div key={place.id} className="journey-place" aria-live="polite" aria-atomic="true">
            <span className="journey-place-owner">{place.owner === 'her' ? '写给你的那一页' : place.owner === 'me' ? '我的另一页' : '我们的这一页'}</span>
            <h3>{place.city}</h3>
            {place.school && <span className="journey-school">{place.school}</span>}
          </div>
          <div className="journey-caption" key={`${place.id}-caption`}>
            <p>{place.line}</p><span>{place.caption}</span>
          </div>
          <div className="journey-photo-outline" aria-hidden="true" />
        </div>
      </div>

      <footer className="journey-footer">
        <button type="button" className="journey-back" onClick={() => select(active - 1)} disabled={active === 0 || leaving} aria-label="回到上一站"><span aria-hidden="true">←</span> 上一页</button>
        <span className="journey-brush-hint">{reducedMotion ? '每一页，都可以慢慢看' : touched ? '风会停下，故事会留下' : '轻扫沙面 · 让记忆在指尖苏醒'}</span>
        <button type="button" className="journey-next" onClick={next} disabled={leaving}>{active === 7 ? '把回忆放进书里' : active === 3 ? '翻开我的来路' : active === 6 ? '在深圳相遇' : '去下一站'}<span aria-hidden="true">→</span></button>
      </footer>
    </section>
  );
}

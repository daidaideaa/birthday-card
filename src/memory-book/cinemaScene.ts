export interface Atlas { src: string; frameWidth: number; frameHeight: number; columns: number; frames: number; durations: number[] }
export interface Character { image: HTMLImageElement; atlas: Atlas }
export interface Scenery { background: HTMLImageElement; horses: Character; lions: Character }
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (t: number, a: number, b: number) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };

function actor(ctx: CanvasRenderingContext2D, source: Character, seconds: number, x: number, y: number, width: number, alpha: number) {
  if (alpha <= 0) return;
  const { image, atlas } = source;
  let time = Math.max(0, seconds * 1000), frame = 0;
  while (frame < atlas.frames - 1 && time >= atlas.durations[frame]) { time -= atlas.durations[frame]; frame++; }
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.drawImage(image, frame % atlas.columns * atlas.frameWidth, Math.floor(frame / atlas.columns) * atlas.frameHeight, atlas.frameWidth, atlas.frameHeight, x, y, width, width * atlas.frameHeight / atlas.frameWidth);
  ctx.restore();
}

/** Compose at the actual viewport ratio; only the scenery may crop, never the characters. */
export function paintCinema(ctx: CanvasRenderingContext2D, art: Scenery, t: number, still: boolean, wish: number, w: number, h: number) {
  const portrait = w < 700, night = ease(t, 4, 10), drift = still ? 0 : Math.sin(t / 9) * w * .008;
  ctx.clearRect(0, 0, w, h);
  const fit = Math.max(w / art.background.width, h / art.background.height);
  const bw = art.background.width * fit * 1.025, bh = art.background.height * fit * 1.025;
  ctx.drawImage(art.background, (w - bw) / 2 + drift, (h - bh) / 2, bw, bh);
  const grade = ctx.createLinearGradient(0, 0, 0, h);
  grade.addColorStop(0, `rgba(16,28,60,${.13 + night * .38})`);
  grade.addColorStop(.55, `rgba(245,186,104,${.14 * (1 - night)})`);
  grade.addColorStop(1, `rgba(9,21,34,${.45 + night * .26})`);
  ctx.fillStyle = grade; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 56; i++) {
    const a = (.12 + night * .7) * (still ? .7 : .65 + Math.sin(t * .7 + i * .76) * .2);
    ctx.globalAlpha = a; ctx.fillStyle = '#eedbbc'; ctx.beginPath();
    ctx.arc(w * (((i * 173 + 97) % 1210) / 1280), h * (.1 + ((i * 137 + 43) % 330) / 1000), .55 + i % 3 * .2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const horseAlpha = ease(t, .3, 1) * (1 - ease(t, 4.2, 6.6));
  const lionAlpha = ease(t, 7, 8.3) * (1 - ease(t, 11.5, 14.5));
  // Their effective source pixels are finite: mobile framing keeps native detail intact.
  const horseW = Math.min(w * (portrait ? .94 : .62), 690);
  const lionW = Math.min(w * (portrait ? .9 : .5), 620);
  const ground = h * (portrait ? .73 : .78);
  const horseY = ground - horseW * art.horses.atlas.frameHeight / art.horses.atlas.frameWidth;
  const lionY = ground - lionW * art.lions.atlas.frameHeight / art.lions.atlas.frameWidth;
  const horseFloor = horseY + horseW * art.horses.atlas.frameHeight / art.horses.atlas.frameWidth;
  const lionFloor = lionY + lionW * art.lions.atlas.frameHeight / art.lions.atlas.frameWidth;
  ctx.save(); ctx.globalAlpha = horseAlpha * .27; ctx.fillStyle = '#131f26'; ctx.beginPath();
  ctx.ellipse(w / 2, horseFloor - 2, horseW * .4, Math.max(5, h * .012), 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  actor(ctx, art.horses, still ? .8 : t - 1, (w - horseW) / 2 + drift, horseY, horseW, horseAlpha);
  actor(ctx, art.lions, still ? .72 : t - 8.3, (w - lionW) / 2 - drift * .3, lionY, lionW, lionAlpha);
  // Continue the source crop into a soft field; grass bends independently in the near plane.
  const floor = horseAlpha > lionAlpha ? horseFloor : lionAlpha > .02 ? lionFloor : h * .65;
  const groundAlpha = Math.max(horseAlpha, lionAlpha);
  const seam = ctx.createLinearGradient(0, floor - 12, 0, floor + 48);
  seam.addColorStop(0, 'rgba(18,28,36,0)'); seam.addColorStop(.25, `rgba(18,28,36,${groundAlpha * .25})`); seam.addColorStop(1, `rgba(13,25,34,${groundAlpha * .78})`);
  ctx.fillStyle = seam; ctx.fillRect(0, floor - 12, w, h - floor + 12);
  for (let i = 0; i < (portrait ? 62 : 106); i++) {
    const x = i * (portrait ? w / 60 : w / 104), base = h * .88 + i % 5 * 4;
    const length = h * (.055 + ((i * 19) % 55) / 950);
    const bend = still ? 5 : 5 + Math.sin(t * .85 + i * .3) * (5 + wish * 4);
    ctx.strokeStyle = i % 4 ? 'rgba(15,28,34,.72)' : 'rgba(192,162,107,.27)'; ctx.lineWidth = i % 4 ? 1.4 : .7;
    ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x - 4, base - length / 2, x + bend, base - length); ctx.stroke();
  }
  const wind = ease(t, 3, 4.5) * (1 - ease(t, 7, 9.5)) + wish * .5;
  for (let i = 0; i < 24; i++) {
    const p = still ? (i % 10) / 10 : (t * .065 + i * .043) % 1;
    ctx.globalAlpha = clamp(wind) * Math.sin(p * Math.PI) * .62;
    ctx.fillStyle = '#f0d7a4'; ctx.beginPath();
    ctx.arc(w * (-.05 + p * 1.1), h * (.65 - Math.sin(p * Math.PI * .73) * .4 + Math.sin(i * 14) * .03), .7 + i % 3 * .4, 0, Math.PI * 2); ctx.fill();
  }
  const constellation = ease(t, 11, 15);
  const nodes = [[.5,.23],[.46,.18],[.39,.19],[.38,.25],[.5,.33],[.62,.25],[.61,.19],[.54,.18],[.5,.23]];
  ctx.globalAlpha = constellation * .7; ctx.strokeStyle = '#e6cd9d'; ctx.lineWidth = .7; ctx.beginPath();
  nodes.forEach(([x,y],i)=>i?ctx.lineTo(x*w,y*h):ctx.moveTo(x*w,y*h)); ctx.stroke();
  nodes.slice(0,-1).forEach(([x,y])=>{ctx.fillStyle='#f5dfb5';ctx.beginPath();ctx.arc(x*w,y*h,1.5,0,Math.PI*2);ctx.fill();});
  ctx.globalAlpha = 1;
  const fall = ease(t,15,20), x = w * (.73 - fall * .12), y = h * (.16 + fall * fall * .44);
  const radius = Math.min(w * .08, 40), glow = ctx.createRadialGradient(x,y,0,x,y,radius);
  glow.addColorStop(0,`rgba(255,219,148,${.24 + wish * .1})`);glow.addColorStop(1,'rgba(255,219,148,0)');
  ctx.fillStyle=glow;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
  ctx.fillStyle='#ffe7b1';ctx.beginPath();ctx.moveTo(x,y-5);ctx.quadraticCurveTo(x+1,y-1,x+4,y);ctx.quadraticCurveTo(x+1,y+1,x,y+5);ctx.quadraticCurveTo(x-1,y+1,x-4,y);ctx.quadraticCurveTo(x-1,y-1,x,y-5);ctx.fill();
}

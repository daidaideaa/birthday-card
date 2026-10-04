import { memo, useEffect, useRef, useState } from 'react';
import './pets.css';

type PetsProps = { scene: number; quiet: boolean; reducedMotion: boolean; celebrate: number; onPet?: () => void };
type DogColor = 'apricot' | 'cream';
type Mood = 'watch' | 'sniff' | 'walk' | 'sit' | 'sleep' | 'stretch';
type Actor = {
  element: HTMLDivElement; touch: HTMLButtonElement; parts: Record<string, SVGElement>;
  x: number; target: number; direction: number; facing: number; phase: number;
  mood: Mood; nextMood: number; nextBlink: number; blinkUntil: number; petUntil: number; jumpAt: number;
  sitting: number; sleeping: number; sniffing: number; stretching: number; affection: number; gait: number;
  random: () => number;
};
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;
const damp = (a: number, b: number, dt: number, speed = 6) => mix(a, b, 1 - Math.exp(-dt * speed));
const f = (n: number) => n.toFixed(2);
const seeded = (seed: number) => () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };

// Complete overlapping fur volumes keep the joints inside the coat. Small curls
// follow the silhouette; there is no portrait atlas stretched across a skeleton.
function coatOutline(cx: number, cy: number, rx: number, ry: number, seed: number) {
  const random = seeded(seed);
  const count = Math.round((rx + ry) / 3.4);
  const points = Array.from({ length: count }, (_, i) => {
    const a = i / count * Math.PI * 2, puff = .97 + random() * .055;
    return [cx + Math.cos(a) * rx * puff, cy + Math.sin(a) * ry * puff];
  });
  let d = `M${points[0].map(f).join(' ')}`;
  points.forEach((_, i) => {
    const next = points[(i + 1) % count], a = (i + .5) / count * Math.PI * 2, loft = 1.02 + random() * .065;
    d += `Q${f(cx + Math.cos(a) * rx * loft)} ${f(cy + Math.sin(a) * ry * loft)} ${f(next[0])} ${f(next[1])}`;
  });
  return `${d}Z`;
}
function Coat({ cx, cy, rx, ry, seed, fill, pale = false }: { cx: number; cy: number; rx: number; ry: number; seed: number; fill: string; pale?: boolean }) {
  const random = seeded(seed * 57);
  return <g>
    <path d={coatOutline(cx, cy, rx, ry, seed)} fill={fill} stroke={pale ? '#baa48b' : '#aa754a'} strokeWidth=".45" strokeOpacity=".4" />
    {Array.from({ length: Math.round(rx * ry / 17) }, (_, i) => {
      const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * .88;
      const x = cx + Math.cos(angle) * radius * rx, y = cy + Math.sin(angle) * radius * ry, s = 1.7 + random() * 2.4;
      return <g key={i} transform={`translate(${f(x)} ${f(y)}) rotate(${f(random() * 150 - 75)})`}>
        <path d={`M${f(-s)} .8 C${f(-s * 1.3)} ${f(-s * 1.05)} ${f(s * .5)} ${f(-s * 1.5)} ${f(s)} ${f(-s * .15)} C${f(s * 1.5)} ${f(s * .8)} ${f(s * .1)} ${f(s * 1.2)} ${f(-s * .25)} ${f(s * .55)}`} fill="none" stroke={pale ? '#907b65' : '#795036'} strokeWidth="1.35" opacity=".22" strokeLinecap="round" />
        <path d={`M${f(-s * .9)} 0 Q${f(-s * .75)} ${f(-s * 1.3)} ${f(s * .55)} ${f(-s * .62)}`} fill="none" stroke="#fff2d9" strokeWidth="1.1" opacity={pale ? '.47' : '.43'} strokeLinecap="round" />
      </g>;
    })}
  </g>;
}

const Teddy = memo(function Teddy({ color }: { color: DogColor }) {
  const pale = color === 'cream', id = `teddy-${color}`;
  const fur = `url(#${id}-fur)`, light = `url(#${id}-light)`, ear = `url(#${id}-ear)`;
  const limb = (name: string, x: number, y: number, far = false, rear = false) => <g data-part={name} opacity={far ? '.91' : '1'}>
    <Coat cx={x} cy={y + 14} rx={rear ? 18 : 13} ry={24} seed={rear ? 23 : 81} fill={far ? ear : fur} pale={pale} />
    <Coat cx={x + 2} cy={y + 39} rx={13} ry={20} seed={rear ? 11 : 97} fill={far ? ear : fur} pale={pale} />
    <Coat cx={x + 6} cy={y + 52} rx={18} ry={10} seed={12} fill={far ? fur : light} pale={pale} />
    {!far && <path d={`M${x + 9} ${y + 52}q-2 3-1 6m-7-6q-2 3-1 5`} fill="none" stroke={pale ? '#897263' : '#845335'} strokeWidth=".8" opacity=".45" strokeLinecap="round" />}
  </g>;
  return <svg className={`memory-pet-drawing memory-pet-fur-${color}`} viewBox="0 0 280 240" aria-hidden="true">
    <defs>
      <radialGradient id={`${id}-fur`} cx="37%" cy="20%" r="85%">
        <stop stopColor={pale ? '#fff3db' : '#eac08a'} /><stop offset=".43" stopColor={pale ? '#e9d9bd' : '#cf995f'} /><stop offset=".8" stopColor={pale ? '#c7b194' : '#b77d48'} /><stop offset="1" stopColor={pale ? '#aa9179' : '#92613e'} />
      </radialGradient>
      <radialGradient id={`${id}-light`} cx="40%" cy="20%" r="85%">
        <stop stopColor={pale ? '#fff9e9' : '#f7dcb2'} /><stop offset=".58" stopColor={pale ? '#f1e5d0' : '#e6bc8b'} /><stop offset="1" stopColor={pale ? '#cbb69a' : '#b9885c'} />
      </radialGradient>
      <radialGradient id={`${id}-ear`} cx="33%" cy="18%" r="83%">
        <stop stopColor={pale ? '#dfcdb1' : '#c58a51'} /><stop offset=".6" stopColor={pale ? '#b8a085' : '#a77043'} /><stop offset="1" stopColor={pale ? '#92745c' : '#785037'} />
      </radialGradient>
      <radialGradient id={`${id}-eye`} cx="35%" cy="32%" r="70%"><stop stopColor="#705346" /><stop offset=".5" stopColor="#302820" /><stop offset="1" stopColor="#171c1b" /></radialGradient>
      <linearGradient id={`${id}-nose`} x2=".2" y2="1"><stop stopColor="#645046" /><stop offset=".5" stopColor="#362925" /><stop offset="1" stopColor="#261e1c" /></linearGradient>
    </defs>
    <g data-part="facing"><g data-part="bounce">
      {limb('far-back', 100, 145, true, true)}{limb('far-front', 183, 146, true)}
      <g data-part="tail"><path d="M73 152Q48 143 49 127" fill="none" stroke={pale ? '#bca486' : '#a36d42'} strokeWidth="20" strokeLinecap="round" /><Coat cx={49} cy={126} rx={17} ry={18} seed={88} fill={fur} pale={pale} /></g>
      <g data-part="body"><Coat cx={131} cy={149} rx={61} ry={39} seed={41} fill={fur} pale={pale} /><Coat cx={171} cy={144} rx={30} ry={38} seed={43} fill={light} pale={pale} /></g>
      {limb('near-back', 83, 148, false, true)}{limb('near-front', 161, 148)}
      <g data-part="chest"><Coat cx={160} cy={151} rx={25} ry={25} seed={53} fill={fur} pale={pale} /></g>
      <g data-part="head">
        <g data-part="far-ear"><Coat cx={214} cy={110} rx={18} ry={29} seed={27} fill={ear} pale={pale} /></g>
        <Coat cx={177} cy={98} rx={pale ? 46 : 44} ry={43} seed={pale ? 13 : 7} fill={fur} pale={pale} />
        <Coat cx={183} cy={115} rx={34} ry={25} seed={18} fill={light} pale={pale} />
        <g data-part="features">
          <g data-part="eyes-open">
            <ellipse cx="167" cy="102" rx="7" ry="7.8" fill={pale ? '#b69c7d' : '#a4754f'} opacity=".5" /><ellipse cx="201" cy="101" rx="5.9" ry="7.3" fill={pale ? '#b69c7d' : '#a4754f'} opacity=".5" />
            <g data-part="pupils"><ellipse cx="167.6" cy="102.8" rx="5.25" ry="6.6" fill={`url(#${id}-eye)`} /><ellipse cx="201.2" cy="102.3" rx="4.55" ry="6.05" fill={`url(#${id}-eye)`} /><ellipse cx="166" cy="100.2" rx="1.55" ry="1.8" fill="#fffaf0" opacity=".94" /><ellipse cx="199.8" cy="100.1" rx="1.25" ry="1.6" fill="#fffaf0" opacity=".92" /><circle cx="169.1" cy="106.3" r=".65" fill="#cfac75" /><circle cx="202.5" cy="105.4" r=".55" fill="#cfac75" /></g>
          </g>
          <g data-part="eyes-closed" opacity="0" fill="none" stroke="#503b2d" strokeWidth="1.7" strokeLinecap="round"><path d="M161 104q6-4.2 12-.3M196 103q5-3.7 10-.6" /></g>
          <path d="M158 94q7-4 13-1m24-.4q5-3.3 10-.8" fill="none" stroke={pale ? '#fff7e3' : '#efcca0'} strokeWidth="2.5" opacity=".75" strokeLinecap="round" />
          <Coat cx={177} cy={119} rx={14} ry={11} seed={95} fill={light} pale={pale} /><Coat cx={199} cy={118} rx={13} ry={10} seed={96} fill={light} pale={pale} />
          <path d="M178.8 113.5c.6-5.1 18.2-6 19.2-.2.5 4.1-6.2 9.4-9.4 9.1-3.4-.2-10.2-5.1-9.8-8.9Z" fill={`url(#${id}-nose)`} />
          <path d="M182.2 112.4q4.9-2 10.8-.3" fill="none" stroke="#cfafa0" strokeWidth="1.3" opacity=".62" strokeLinecap="round" /><ellipse cx="182" cy="115.6" rx="1.6" ry="1" fill="#211d1b" /><ellipse cx="195.3" cy="115.1" rx="1.5" ry="1" fill="#211d1b" />
          <path d="M188.6 122.3v4m0 0q-4.5 4.5-9.2.1m9.2-.1q5.1 3.2 9.2-.8" fill="none" stroke="#6c4a36" strokeWidth="1.15" strokeLinecap="round" />
          <g data-part="tongue" opacity="0"><path d="M183.5 127q5.5-1.5 11-.8l-1 6.8c-.5 5.7-8.9 5.7-9.5.2Z" fill="#d48e82" stroke="#b7736d" strokeWidth=".6" /><path d="M189 129v4" stroke="#af6d68" strokeWidth=".65" strokeLinecap="round" /></g>
        </g>
        <g data-part="near-ear"><Coat cx={143} cy={112} rx={18} ry={29} seed={67} fill={ear} pale={pale} /><path d="M139 89q-10 17-4 32" fill="none" stroke={pale ? '#f0dfbe' : '#d7a36d'} strokeWidth="2.5" strokeLinecap="round" opacity=".32" /></g>
        <path d="M153 76q4-7 12-7m3-4q7-4 12-1m4 0q6-1 10 4" fill="none" stroke={pale ? '#fff8e5' : '#f1c994'} strokeWidth="2.1" opacity=".6" strokeLinecap="round" />
      </g>
    </g></g>
  </svg>;
});

function PetDrawing({ color, reply, onPet, elementRef }: { color: DogColor; reply: string; onPet: () => void; elementRef: (element: HTMLDivElement | null) => void }) {
  return <div ref={elementRef} className={`memory-pet memory-pet-${color}`}>
    <span className="memory-pet-shadow" aria-hidden="true" /><span className="memory-pet-heart" aria-hidden="true">♡</span>
    {reply && <span className="memory-pet-reply" role="status">{reply}</span>}
    <button type="button" className="memory-pet-touch" aria-label={`摸摸${color === 'apricot' ? '杏色' : '奶油色'}泰迪`} onClick={onPet} title="轻轻摸摸我"><Teddy color={color} /><span className="memory-pet-touch-cue" aria-hidden="true">摸摸我</span></button>
  </div>;
}

export default function Pets(props: PetsProps) {
  const container = useRef<HTMLDivElement>(null), dogElements = useRef<(HTMLDivElement | null)[]>([null, null]);
  const actors = useRef<Actor[]>([]), current = useRef(props), wake = useRef<() => void>(() => {});
  current.current = props;
  const [replies, setReplies] = useState(['', '']);
  const replyTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pet = (index: number) => {
    const actor = actors.current[index];
    if (actor) actor.petUntil = performance.now() + 3200;
    current.current.onPet?.();
    if (replyTimers.current[index]) clearTimeout(replyTimers.current[index]);
    setReplies((values) => values.map((value, i) => i === index ? current.current.quiet ? '我在这里陪你' : index ? '再靠近你一点 ♡' : '喜欢你的摸摸 ♡' : value));
    replyTimers.current[index] = setTimeout(() => { setReplies((values) => values.map((value, i) => i === index ? '' : value)); wake.current(); }, 3200);
    wake.current();
  };

  useEffect(() => {
    const stage = container.current;
    if (!stage) return;
    let width = stage.clientWidth, visible = true, raf = 0, last = 0, elapsed = 0;
    let previousScene = current.current.scene, previousCelebrate = current.current.celebrate;
    const pointer = { x: width / 2, until: 0 };
    const park = (index: number) => width * (current.current.scene === 3 ? index ? .88 : .12 : index ? .85 : .15);
    actors.current = dogElements.current.filter((element): element is HTMLDivElement => Boolean(element)).map((element, index) => ({
      element, touch: element.querySelector<HTMLButtonElement>('.memory-pet-touch')!, parts: Object.fromEntries(Array.from(element.querySelectorAll<SVGElement>('[data-part]')).map((part) => [part.dataset.part!, part])),
      x: park(index), target: park(index), direction: index ? -1 : 1, facing: index ? -1 : 1, phase: index ? 2.7 : 0,
      mood: index ? 'sit' : 'watch', nextMood: index ? 6.7 : 2.8, nextBlink: index ? 2.2 : 3.6, blinkUntil: 0, petUntil: 0, jumpAt: -20,
      sitting: index ? 1 : 0, sleeping: 0, sniffing: 0, stretching: 0, affection: 0, gait: 0, random: seeded(index ? 7193 : 1207),
    }));
    const transform = (actor: Actor, part: string, value: string) => actor.parts[part]?.setAttribute('transform', value);
    const opacity = (actor: Actor, part: string, value: number) => actor.parts[part]?.setAttribute('opacity', f(value));
    const schedule = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    wake.current = schedule;
    const resize = new ResizeObserver(() => {
      const nextWidth = stage.clientWidth;
      actors.current.forEach((actor) => { actor.x = actor.x / Math.max(1, width) * nextWidth; actor.target = actor.target / Math.max(1, width) * nextWidth; });
      width = nextWidth; schedule();
    });
    resize.observe(stage);
    const visibility = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting); last = 0;
      if (visible) schedule(); else { cancelAnimationFrame(raf); raf = 0; }
    }, { rootMargin: '40px' });
    visibility.observe(stage);
    const documentVisibility = () => { last = 0; if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else schedule(); };
    document.addEventListener('visibilitychange', documentVisibility);
    const point = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = stage.getBoundingClientRect();
      if (event.clientY < rect.top + 25 || event.clientY > rect.bottom + 25) return;
      pointer.x = event.clientX - rect.left; pointer.until = performance.now() + 1500;
    };
    window.addEventListener('pointermove', point, { passive: true });

    function frame(now: number) {
      raf = 0;
      if (document.hidden || !visible || width < 1) { last = 0; return; }
      const settings = current.current, motion = !settings.reducedMotion;
      if (motion && last && now - last < 25) { schedule(); return; }
      const dt = motion ? Math.min((now - (last || now)) / 1000, .06) : 1;
      last = now; if (motion) elapsed += dt;
      if (previousScene !== settings.scene) {
        previousScene = settings.scene;
        actors.current.forEach((actor, index) => { actor.target = park(index); actor.mood = settings.scene === 3 ? 'walk' : index ? 'sit' : 'watch'; actor.nextMood = elapsed + (index ? 8.6 : 4.8); });
      }
      if (previousCelebrate !== settings.celebrate) {
        previousCelebrate = settings.celebrate;
        if (settings.celebrate) actors.current.forEach((actor, index) => { actor.jumpAt = elapsed + index * .6; });
      }
      actors.current.forEach((actor, index) => {
        const beingPetted = actor.petUntil > now, nearPointer = pointer.until > now && Math.abs(pointer.x - actor.x) < 125, quiet = settings.quiet;
        // Clear the cinema's controls before settling, even when quiet mode is
        // already on. The passing dog must not intercept a pause-button click.
        const parking = settings.scene === 3 && Math.abs(park(index) - actor.x) > 2;
        if (parking) { actor.target = park(index); actor.mood = 'walk'; }
        actor.touch.style.pointerEvents = parking ? 'none' : '';
        if (motion && !quiet && !beingPetted && elapsed > actor.nextMood) {
          const choice = actor.random();
          if (actor.mood === 'sleep') actor.mood = 'stretch';
          else if (actor.mood === 'stretch') actor.mood = 'watch';
          else if (choice < (index ? .2 : .34)) {
            actor.mood = 'walk';
            actor.target = width * mix(index ? .65 : .13, index ? .87 : width < 600 ? .36 : .43, actor.random());
          } else if (choice < .52) actor.mood = 'sniff';
          else if (choice < .76) actor.mood = 'sit';
          else if (choice < (index ? .94 : .87)) actor.mood = 'sleep';
          else actor.mood = 'watch';
          actor.nextMood = elapsed + (actor.mood === 'sleep' ? 10 + actor.random() * 8 : actor.mood === 'walk' ? 7 : actor.mood === 'stretch' ? 2.6 : 3.8 + actor.random() * 4.7);
        }
        const jumpTime = elapsed - actor.jumpAt, celebrating = motion && jumpTime >= 0 && jumpTime < 1.55;
        const resting = !beingPetted && !celebrating && ((quiet && !parking) || actor.mood === 'sleep');
        actor.sleeping = motion ? damp(actor.sleeping, resting ? 1 : 0, dt, resting ? 2.8 : 5) : 0;
        actor.sitting = motion ? damp(actor.sitting, !resting && !beingPetted && actor.mood === 'sit' ? 1 : 0, dt, 3) : index;
        actor.sniffing = motion ? damp(actor.sniffing, !quiet && !resting && !beingPetted && actor.mood === 'sniff' ? 1 : 0, dt, 3.4) : 0;
        actor.stretching = motion ? damp(actor.stretching, !quiet && !beingPetted && actor.mood === 'stretch' ? 1 : 0, dt, 3.6) : 0;
        actor.affection = motion ? damp(actor.affection, beingPetted ? 1 : 0, dt, 5.2) : beingPetted ? 1 : 0;
        const ready = actor.sleeping < .08 && actor.sitting < .1 && actor.sniffing < .1 && actor.stretching < .1, distance = actor.target - actor.x;
        const wantsWalk = motion && (!quiet || parking) && !beingPetted && !celebrating && actor.mood === 'walk' && Math.abs(distance) > 2;
        actor.gait = damp(actor.gait, wantsWalk && ready ? 1 : 0, dt, 7);
        if (wantsWalk && ready) {
          actor.direction = Math.sign(distance);
          const speed = parking ? index ? 54 : 66 : index ? 23 : 30;
          const step = Math.sign(distance) * Math.min(Math.abs(distance), speed * (width < 600 ? .72 : 1) * dt * actor.gait);
          actor.x += step; actor.phase += Math.abs(step) / (width < 600 ? 21 : 28) * Math.PI * 2;
        } else if (actor.mood === 'walk' && !wantsWalk) { actor.mood = 'watch'; actor.nextMood = elapsed + 1.4 + actor.random() * 1.4; }
        if (!motion) { actor.x = park(index); actor.direction = index ? -1 : 1; actor.touch.style.pointerEvents = ''; }
        if (settings.scene === 3 && !parking && actor.gait < .15 && !beingPetted) actor.direction = index ? -1 : 1;
        actor.facing = motion ? damp(actor.facing, actor.direction, dt, 10) : actor.direction;
        const sit = actor.sitting, sleep = actor.sleeping, sniff = actor.sniffing, stretch = actor.stretching, love = actor.affection;
        const t = motion ? elapsed + index * 4.27 : 0, breath = motion ? Math.sin(t * (index ? 1.75 : 2.05)) : 0;
        const bodyBob = -Math.abs(Math.sin(actor.phase * 2)) * actor.gait * 1.3;
        let jump = 0, anticipation = 0;
        if (celebrating) {
          if (jumpTime < .26) anticipation = Math.sin(jumpTime / .26 * Math.PI) * 4;
          else if (jumpTime < .9) jump = Math.sin((jumpTime - .26) / .64 * Math.PI) * (index ? 11 : 18);
          else anticipation = Math.sin((jumpTime - .9) / .65 * Math.PI) * 2.4;
        }
        const follow = nearPointer ? clamp((pointer.x - actor.x) * actor.direction / 50, -1.7, 1.7) : Math.sin(t * .28) * .45;
        const headTilt = sniff * 22 + sleep * 10 + stretch * 10 - love * 8 + follow * 1.9;
        const headX = sniff * 13 + sleep * 10 + stretch * 15 + love * 1.5;
        const headY = sniff * 27 + sleep * 54 + stretch * 32 - sit * 4 - love * 4 + breath * .25 + sniff * Math.sin(t * 7.7) * .9;
        const earLag = motion ? Math.sin(t * 2.1 - .6) * .6 + Math.sin(actor.phase - .65) * actor.gait * 3 + love * Math.sin(t * 4.1) : 0;
        const wag = motion ? Math.sin(t * (love > .2 || celebrating ? 13 : 7.2)) * (love * 16 + (celebrating ? 10 : 0) + Math.max(0, Math.sin(t * .75 + index)) ** 4 * 8 + actor.gait * 4) * (1 - sleep) : 0;
        if (motion && elapsed > actor.nextBlink) { actor.blinkUntil = elapsed + .14 + actor.random() * .08; actor.nextBlink = elapsed + 2.7 + actor.random() * 4.2; }
        const closed = sleep > .72 || (motion && elapsed < actor.blinkUntil) || (love > .4 && (!motion || Math.sin(t * 1.1) > -.3));
        actor.element.style.transform = `translate3d(${f(actor.x)}px,0,0)`;
        actor.element.dataset.mood = beingPetted ? 'loved' : celebrating ? 'celebrating' : sleep > .55 ? 'sleeping' : actor.gait > .1 ? 'walking' : actor.mood;
        actor.element.style.setProperty('--pet-shadow-scale', f(1 - jump / 80 + sleep * .14));
        transform(actor, 'facing', `translate(140 0) scale(${f(actor.facing)} 1) translate(-140 0)`);
        transform(actor, 'bounce', `translate(0 ${f(bodyBob - jump + anticipation)})`);
        transform(actor, 'body', `translate(${f(-sit * 3)} ${f(sleep * 35 + stretch * 8)}) translate(166 149) rotate(${f(-sit * 13 + stretch * 6)}) scale(1 ${f(1 - sleep * .29 + breath * .008)}) translate(-166 -149)`);
        transform(actor, 'chest', `translate(${f(sleep * 14 + stretch * 13)} ${f(sleep * 31 + stretch * 11 - sit * 4)}) scale(1 ${f(1 - sleep * .12)})`);
        transform(actor, 'tail', `translate(0 ${f(sit * 18 + sleep * 25)}) rotate(${f(wag + sleep * -24 - sit * 6)} 67 149)`);
        // Four-beat walk: longer planted stance, shorter lifted return. Phase is
        // advanced by distance travelled so feet don't cycle while standing still.
        const limbs: [string, number, number, number, boolean][] = [['near-back', 83, 148, .75, true], ['far-back', 100, 145, .25, true], ['near-front', 161, 148, 0, false], ['far-front', 183, 146, .5, false]];
        limbs.forEach(([name, px, py, offset, rear]) => {
          const cycle = (actor.phase / (Math.PI * 2) + offset) % 1;
          const swing = clamp((cycle - .62) / .38, 0, 1);
          const stride = (cycle < .62 ? mix(-13, 13, cycle / .62) : mix(13, -13, swing * swing * (3 - 2 * swing))) * actor.gait;
          const angle = stride + (rear ? sit * -23 + sleep * -34 : sleep * -71 - stretch * 32);
          const lower = rear ? sit * 24 + sleep * 38 : sleep * 40 + stretch * 12, compress = rear ? 1 - sit * .36 - sleep * .46 : 1 - sleep * .1;
          const lift = Math.sin(swing * Math.PI) * actor.gait * 7;
          transform(actor, name, `translate(0 ${f(lower - lift)}) translate(${px} ${py}) rotate(${f(angle)}) scale(1 ${f(compress)}) translate(${-px} ${-py})`);
        });
        transform(actor, 'head', `translate(${f(headX)} ${f(headY)}) rotate(${f(headTilt)} 174 137)`);
        transform(actor, 'features', `translate(${f(follow * .75 + actor.gait * 3)} 0) translate(188 116) scale(${f(1 - actor.gait * .08)} 1) translate(-188 -116)`); transform(actor, 'pupils', `translate(${f(follow * .32)} ${f(-love * .2)})`);
        transform(actor, 'near-ear', `rotate(${f(earLag - sniff * 4 + sleep * 5)} 145 86)`); transform(actor, 'far-ear', `rotate(${f(-earLag * .6 - sniff * 3)} 209 87)`);
        opacity(actor, 'eyes-open', closed ? 0 : 1); opacity(actor, 'eyes-closed', closed ? 1 : 0); opacity(actor, 'tongue', love * .92 + (celebrating ? .5 : 0));
      });
      if (motion) schedule();
    }
    schedule();
    const timers = replyTimers.current;
    return () => { wake.current = () => {}; cancelAnimationFrame(raf); resize.disconnect(); visibility.disconnect(); document.removeEventListener('visibilitychange', documentVisibility); window.removeEventListener('pointermove', point); timers.forEach(clearTimeout); };
  }, []);
  useEffect(() => { wake.current(); }, [props.scene, props.quiet, props.reducedMotion, props.celebrate]);
  return <div ref={container} className={`memory-pets${props.quiet ? ' memory-pets-reading' : ''}${props.reducedMotion ? ' memory-pets-still' : ''}`} aria-label="两只会散步、嗅闻和打盹的泰迪">
    <PetDrawing color="apricot" reply={replies[0]} onPet={() => pet(0)} elementRef={(element) => { dogElements.current[0] = element; }} />
    <PetDrawing color="cream" reply={replies[1]} onPet={() => pet(1)} elementRef={(element) => { dogElements.current[1] = element; }} />
  </div>;
}

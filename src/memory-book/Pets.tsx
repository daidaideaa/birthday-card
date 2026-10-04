import { memo, useEffect, useRef, useState } from 'react';
import { assetUrl } from '../utils/assetUrl';
import './pets.css';

type PetsProps = { scene: number; quiet: boolean; reducedMotion: boolean; celebrate: number; transitioning?: boolean; onPet?: () => void };
type DogColor = 'apricot' | 'cream';
type Mood = 'watch' | 'sniff' | 'walk' | 'sit' | 'sleep' | 'stretch' | 'look' | 'greet' | 'bow';
type Actor = {
  element: HTMLDivElement; touch: HTMLButtonElement; parts: Record<string, SVGElement>;
  x: number; target: number; direction: number; facing: number; phase: number;
  mood: Mood; beat: number; moodSince: number; nextMood: number; nextBlink: number; blinkUntil: number; petUntil: number; petStarted: number; noticeAt: number; noticeUntil: number; jumpAt: number;
  sitting: number; sleeping: number; sniffing: number; stretching: number; affection: number; gait: number;
  greeting: number; curiosity: number; bowing: number;
  random: () => number;
};
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;
const damp = (a: number, b: number, dt: number, speed = 6) => mix(a, b, 1 - Math.exp(-dt * speed));
const f = (n: number) => n.toFixed(2);
const seeded = (seed: number) => () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
const pulse = (time: number, start: number, duration: number) => time > start && time < start + duration ? Math.sin((time - start) / duration * Math.PI) : 0;
// Small, readable performances separated by long pauses. The two puppies have
// their own rhythm; curiosity and greetings are deliberate, not rare dice rolls.
const ROUTINES: { mood: Mood; seconds: number }[][] = [
  [{ mood: 'look', seconds: 2.8 }, { mood: 'greet', seconds: 2.8 }, { mood: 'watch', seconds: 9 }, { mood: 'sniff', seconds: 3.2 }, { mood: 'walk', seconds: 6 }, { mood: 'look', seconds: 3.6 }, { mood: 'bow', seconds: 2.3 }, { mood: 'watch', seconds: 8 }, { mood: 'sit', seconds: 13 }, { mood: 'sleep', seconds: 16 }, { mood: 'stretch', seconds: 2.6 }],
  [{ mood: 'look', seconds: 3.3 }, { mood: 'watch', seconds: 3 }, { mood: 'greet', seconds: 2.8 }, { mood: 'sit', seconds: 12 }, { mood: 'sniff', seconds: 3.8 }, { mood: 'walk', seconds: 5 }, { mood: 'look', seconds: 4.2 }, { mood: 'watch', seconds: 9 }, { mood: 'sleep', seconds: 20 }, { mood: 'stretch', seconds: 2.8 }],
];

// ImageGen-painted RGBA layers. Each cutout is an anatomical volume with generous
// overlap at its joint; the reference dog in the atlas is never used as a sprite.
const PAINTED_CROPS = {
  body: '26 94 507 313', head: '572 36 314 292', ear: '980 88 221 353',
  tail: '1269 103 220 298', front: '64 508 180 421', back: '323 513 206 415',
  blink: '572 539 314 293', paw: '65 831 180 100',
};
function PaintedPart({ color, crop, x, y, width, height }: { color: DogColor; crop: keyof typeof PAINTED_CROPS; x: number; y: number; width: number; height: number }) {
  return <svg x={x} y={y} width={width} height={height} viewBox={PAINTED_CROPS[crop]} overflow="hidden" aria-hidden="true">
    <image href={assetUrl(`memory-book/teddy-${color}-painted.webp`)} width="1536" height="1024" />
  </svg>;
}
const FACE_CROPS = {
  apricot: { open: '58 71 448 448', closed: '58 548 448 448', happy: '58 1026 448 448' },
  cream: { open: '538 72 448 448', closed: '538 550 448 448', happy: '538 1026 448 448' },
};
function PuppyFace({ color, expression }: { color: DogColor; expression: keyof typeof FACE_CROPS.apricot }) {
  return <svg x="124" y="32" width="111" height="111" viewBox={FACE_CROPS[color][expression]} overflow="hidden" aria-hidden="true">
    <image href={assetUrl('memory-book/teddy-puppy-expressions.webp')} width="1024" height="1536" />
  </svg>;
}
const Teddy = memo(function Teddy({ color }: { color: DogColor }) {
  return <svg className={`memory-pet-drawing memory-pet-fur-${color}`} viewBox="0 0 280 240" aria-hidden="true">
    <g data-part="facing"><g data-part="bounce">
      <g data-part="far-back" opacity=".86"><PaintedPart color={color} crop="back" x={88} y={132} width={36} height={77}/></g>
      <g data-part="far-front" opacity=".86"><PaintedPart color={color} crop="front" x={176} y={131} width={32} height={77}/></g>
      <g data-part="tail"><PaintedPart color={color} crop="tail" x={38} y={97} width={44} height={60}/></g>
      <g data-part="body"><PaintedPart color={color} crop="body" x={64} y={110} width={138} height={85}/></g>
      <g data-part="near-back"><PaintedPart color={color} crop="back" x={66} y={132} width={39} height={79}/></g>
      <g data-part="near-front"><PaintedPart color={color} crop="front" x={149} y={132} width={34} height={79}/></g>
      <g data-part="rest-far-paw" opacity="0"><PaintedPart color={color} crop="paw" x={225} y={188} width={38} height={21}/></g>
      <g data-part="head">
        <g data-part="far-ear"><PaintedPart color={color} crop="ear" x={208} y={78} width={29} height={67}/></g>
        <g data-part="eyes-open"><PuppyFace color={color} expression="open"/></g>
        <g data-part="eyes-closed" opacity="0"><PuppyFace color={color} expression="closed"/></g>
        <g data-part="eyes-happy" opacity="0"><PuppyFace color={color} expression="happy"/></g>
        <g data-part="near-ear"><PaintedPart color={color} crop="ear" x={129} y={79} width={39} height={75}/></g>
      </g>
      <g data-part="rest-near-paw" opacity="0"><PaintedPart color={color} crop="paw" x={207} y={196} width={40} height={22}/></g>
    </g></g>
  </svg>;
});
function PetDrawing({ color, reply, onPet, elementRef }: { color: DogColor; reply: string; onPet: () => void; elementRef: (element: HTMLDivElement | null) => void }) {
  return <div ref={elementRef} className={`memory-pet memory-pet-${color}`}>
    <span className="memory-pet-shadow" aria-hidden="true" /><span className="memory-pet-heart" aria-hidden="true">♡</span>
    <Teddy color={color} />
    {reply && <span className="memory-pet-reply" role="status">{reply}</span>}
    <button type="button" className="memory-pet-touch" aria-label={`摸摸${color === 'apricot' ? '杏色' : '奶油色'}泰迪`} onClick={onPet} title="轻轻摸摸我"><span className="memory-pet-touch-cue" aria-hidden="true">摸摸我</span></button>
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
    const now = performance.now();
    if (actor) { actor.petStarted = now; actor.petUntil = now + 4400; }
    const companion = actors.current[1 - index];
    if (companion) { companion.noticeAt = now + 600; companion.noticeUntil = now + 3500; }
    current.current.onPet?.();
    if (replyTimers.current[index]) clearTimeout(replyTimers.current[index]);
    setReplies((values) => values.map((value, i) => i === index ? current.current.quiet ? '我在这里陪你' : index ? '再靠近你一点 ♡' : '喜欢你的摸摸 ♡' : value));
    replyTimers.current[index] = setTimeout(() => { setReplies((values) => values.map((value, i) => i === index ? '' : value)); wake.current(); }, 4400);
    wake.current();
  };

  useEffect(() => {
    const stage = container.current;
    if (!stage) return;
    let width = stage.clientWidth, visible = true, raf = 0, last = 0, elapsed = 0;
    let previousScene = current.current.scene, previousCelebrate = current.current.celebrate;
    const pointer = { x: width / 2, until: 0 };
    const keepOnStage = (position: number, element: HTMLDivElement | null) => {
      const inset = (element?.clientWidth ?? 0) / 2 + 8;
      return clamp(position, Math.min(inset, width / 2), Math.max(width - inset, width / 2));
    };
    const park = (index: number) => keepOnStage(width * (current.current.scene >= 3 ? index ? .88 : .12 : index ? .85 : .15), dogElements.current[index]);
    actors.current = dogElements.current.filter((element): element is HTMLDivElement => Boolean(element)).map((element, index) => ({
      element, touch: element.querySelector<HTMLButtonElement>('.memory-pet-touch')!, parts: Object.fromEntries(Array.from(element.querySelectorAll<SVGElement>('[data-part]')).map((part) => [part.dataset.part!, part])),
      x: park(index), target: park(index), direction: index ? -1 : 1, facing: index ? -1 : 1, phase: index ? 2.7 : 0,
      mood: index ? 'sit' : 'watch', beat: 0, moodSince: 0, nextMood: index ? 5.7 : 2.4, nextBlink: index ? 2.2 : 3.6, blinkUntil: 0, petUntil: 0, petStarted: -10000, noticeAt: 0, noticeUntil: 0, jumpAt: -20,
      sitting: index ? 1 : 0, sleeping: 0, sniffing: 0, stretching: 0, affection: 0, gait: 0, random: seeded(index ? 7193 : 1207),
      greeting: 0, curiosity: 0, bowing: 0,
    }));
    const transform = (actor: Actor, part: string, value: string) => actor.parts[part]?.setAttribute('transform', value);
    const opacity = (actor: Actor, part: string, value: number) => actor.parts[part]?.setAttribute('opacity', f(value));
    const schedule = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    wake.current = schedule;
    const resize = new ResizeObserver(() => {
      const previousWidth = width;
      width = stage.clientWidth;
      actors.current.forEach((actor) => { actor.x = keepOnStage(actor.x / Math.max(1, previousWidth) * width, actor.element); actor.target = keepOnStage(actor.target / Math.max(1, previousWidth) * width, actor.element); });
      schedule();
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
        actors.current.forEach((actor, index) => { actor.target = park(index); actor.mood = settings.scene >= 3 ? 'walk' : index ? 'sit' : 'watch'; actor.beat = 0; actor.moodSince = elapsed; actor.nextMood = elapsed + (index ? 5.7 : 2.4); });
      }
      if (previousCelebrate !== settings.celebrate) {
        previousCelebrate = settings.celebrate;
        if (settings.celebrate) actors.current.forEach((actor, index) => { actor.jumpAt = elapsed + index * .6; });
      }
      actors.current.forEach((actor, index) => {
        actor.x = keepOnStage(actor.x, actor.element);
        actor.target = keepOnStage(actor.target, actor.element);
        const quiet = settings.quiet || Boolean(settings.transitioning), reading = settings.scene === 2;
        const beingPetted = !settings.transitioning && actor.petUntil > now, nearPointer = pointer.until > now && Math.abs(pointer.x - actor.x) < 125;
        const noticing = now > actor.noticeAt && now < actor.noticeUntil, calm = quiet || reading;
        // Clear the cinema's controls before settling, even when quiet mode is
        // already on. The passing dog must not intercept a pause-button click.
        const petWidth = actor.element.clientWidth;
        const safeLeftMin = width * (width < 600 ? .08 : .1);
        const safeLeftMax = width < 600 ? width * .16 : Math.max(safeLeftMin, Math.min(width * .24, width / 2 - 120 - petWidth / 2 - 18));
        const safeMin = keepOnStage(index ? width - safeLeftMax : safeLeftMin, actor.element);
        const safeMax = keepOnStage(index ? width - safeLeftMin : safeLeftMax, actor.element);
        const outsideCakeZone = settings.scene === 4 && (actor.x < safeMin || actor.x > safeMax);
        const parking = (settings.scene === 3 || outsideCakeZone) && Math.abs(park(index) - actor.x) > 2;
        if (parking) { actor.target = park(index); actor.mood = 'walk'; }
        actor.touch.style.pointerEvents = parking || settings.transitioning ? 'none' : '';
        actor.touch.disabled = Boolean(settings.transitioning);
        if (motion && !calm && !beingPetted && !parking && elapsed > actor.nextMood) {
          const routine = ROUTINES[index], beat = routine[actor.beat % routine.length];
          actor.beat += 1; actor.mood = beat.mood; actor.moodSince = elapsed;
          if (actor.mood === 'walk') {
            actor.target = keepOnStage(settings.scene === 4 ? mix(safeMin, safeMax, actor.random()) : width * mix(index ? .65 : .13, index ? .87 : width < 600 ? .36 : .43, actor.random()), actor.element);
          }
          actor.nextMood = elapsed + beat.seconds + (beat.seconds > 5 ? actor.random() * 2 : 0);
        }
        const jumpTime = elapsed - actor.jumpAt, celebrating = motion && !settings.transitioning && jumpTime >= 0 && jumpTime < 1.55;
        const resting = !beingPetted && !celebrating && ((quiet && !parking) || actor.mood === 'sleep');
        actor.sleeping = motion ? damp(actor.sleeping, resting ? 1 : 0, dt, resting ? 2.8 : 5) : 0;
        actor.sitting = motion ? damp(actor.sitting, !resting && !beingPetted && !parking && (reading || actor.mood === 'sit') ? 1 : 0, dt, 3) : index;
        actor.sniffing = motion ? damp(actor.sniffing, !calm && !resting && !beingPetted && actor.mood === 'sniff' ? 1 : 0, dt, 3.4) : 0;
        actor.stretching = motion ? damp(actor.stretching, !calm && !beingPetted && actor.mood === 'stretch' ? 1 : 0, dt, 3.6) : 0;
        actor.affection = motion ? damp(actor.affection, beingPetted ? 1 : 0, dt, 5.2) : beingPetted ? 1 : 0;
        const petTime = (now - actor.petStarted) / 1000, moodTime = elapsed - actor.moodSince;
        const greeting = beingPetted ? pulse(petTime, 1.05, 1.8) : !calm && actor.mood === 'greet' ? pulse(moodTime, .4, 1.8) : 0;
        const curious = beingPetted ? pulse(petTime, .15, 3.6) : noticing ? .85 : nearPointer ? .6 : !calm && actor.mood === 'look' ? pulse(moodTime, .1, 2.7) : reading ? .18 : 0;
        actor.greeting = motion ? damp(actor.greeting, actor.sleeping < .12 && actor.sitting < .15 && !parking ? greeting : 0, dt, 9) : 0;
        actor.curiosity = motion ? damp(actor.curiosity, !resting && !parking ? curious : 0, dt, 4.5) : 0;
        actor.bowing = motion ? damp(actor.bowing, !calm && !beingPetted && actor.mood === 'bow' ? pulse(moodTime, .15, 1.7) : 0, dt, 9) : 0;
        const ready = actor.sleeping < .08 && actor.sitting < .1 && actor.sniffing < .1 && actor.stretching < .1, distance = actor.target - actor.x;
        const wantsWalk = motion && (!calm || parking) && !beingPetted && !celebrating && actor.mood === 'walk' && Math.abs(distance) > 2;
        actor.gait = damp(actor.gait, wantsWalk && ready ? 1 : 0, dt, 7);
        if (wantsWalk && ready) {
          actor.direction = Math.sign(distance);
          const speed = parking ? index ? 54 : 66 : index ? 23 : 30;
          const step = Math.sign(distance) * Math.min(Math.abs(distance), speed * (width < 600 ? .72 : 1) * dt * actor.gait);
          actor.x += step; actor.phase += Math.abs(step) / (width < 600 ? 21 : 28) * Math.PI * 2;
        } else if (actor.mood === 'walk' && !wantsWalk) { actor.mood = 'watch'; actor.nextMood = elapsed + 1.4 + actor.random() * 1.4; }
        if (!motion) { actor.x = park(index); actor.direction = index ? -1 : 1; actor.touch.style.pointerEvents = settings.transitioning ? 'none' : ''; }
        if (!parking && actor.gait < .15 && (calm || noticing || beingPetted || actor.mood === 'look' || actor.mood === 'greet')) actor.direction = index ? -1 : 1;
        actor.facing = motion ? damp(actor.facing, actor.direction, dt, 10) : actor.direction;
        const sit = actor.sitting, sleep = actor.sleeping, sniff = actor.sniffing, stretch = actor.stretching, love = actor.affection, greet = actor.greeting, curiousTilt = actor.curiosity, bow = actor.bowing;
        const t = motion ? elapsed + index * 4.27 : 0, breath = motion ? Math.sin(t * (index ? 1.75 : 2.05)) : 0;
        const bodyBob = -Math.abs(Math.sin(actor.phase * 2)) * actor.gait * 1.3;
        let jump = 0, anticipation = 0;
        if (celebrating) {
          if (jumpTime < .26) anticipation = Math.sin(jumpTime / .26 * Math.PI) * 4;
          else if (jumpTime < .9) jump = Math.sin((jumpTime - .26) / .64 * Math.PI) * (index ? 11 : 18);
          else anticipation = Math.sin((jumpTime - .9) / .65 * Math.PI) * 2.4;
        }
        const follow = nearPointer ? clamp((pointer.x - actor.x) * actor.direction / 50, -1.7, 1.7) : Math.sin(t * .28) * .45;
        const headTilt = sniff * 22 + sleep * 27 + stretch * 10 + bow * 12 - love * 3 - curiousTilt * (index ? 13 : 16) + follow * 1.4;
        const headX = sniff * 13 + sleep * 10 + stretch * 15 + bow * 12 + love * 1.5;
        const headY = sniff * 27 + sleep * 49 + stretch * 32 + bow * 28 - sit * 4 - love * 3 - curiousTilt * 2 + breath * .25 + sniff * Math.sin(t * 7.7) * .9;
        const earLag = motion ? Math.sin(t * 2.1 - .6) * .6 + Math.sin(actor.phase - .65) * actor.gait * 3 + love * Math.sin(t * 4.1) : 0;
        const wag = motion ? Math.sin(t * (love > .2 || celebrating || greet > .1 ? 13 : 7.2)) * (love * 15 + (celebrating ? 10 : 0) + greet * 12 + curiousTilt * 5 + bow * 13 + (!calm ? Math.max(0, Math.sin(t * .43 + index) - .75) * 13 : 0) + actor.gait * 4) * (1 - sleep) : 0;
        if (motion && elapsed > actor.nextBlink) { actor.blinkUntil = elapsed + .14 + actor.random() * .08; actor.nextBlink = elapsed + 2.7 + actor.random() * 4.2; }
        const closed = sleep > .72 || (motion && elapsed < actor.blinkUntil) || (beingPetted && petTime > .18 && petTime < .65);
        const happy = !closed && (beingPetted || greet > .2 || celebrating || bow > .25);
        actor.element.style.transform = `translate3d(${f(actor.x)}px,0,0)`;
        actor.element.dataset.mood = beingPetted ? 'loved' : celebrating ? 'celebrating' : sleep > .55 ? 'sleeping' : actor.gait > .1 ? 'walking' : actor.mood;
        actor.element.style.setProperty('--pet-shadow-scale', f(1 - jump / 80 + sleep * .14));
        // A painted profile changes direction with a small squash, never a
        // paper-thin 3D-card flip that makes the puppy disappear mid-turn.
        const facingScale = (actor.facing < 0 ? -1 : 1) * (.84 + .16 * Math.abs(actor.facing));
        transform(actor, 'facing', `translate(140 0) scale(${f(facingScale)} 1) translate(-140 0)`);
        transform(actor, 'bounce', `translate(0 ${f(bodyBob - jump + anticipation)})`);
        transform(actor, 'body', `translate(${f(-sit * 3 - greet * 2)} ${f(sleep * 23 + stretch * 8 + bow * 8)}) translate(166 149) rotate(${f(-sit * 13 + stretch * 6 + bow * 9 - greet * 2)}) scale(${f(1 - sleep * .1)} ${f(1 - sleep * .13 + breath * .008)}) translate(-166 -149)`);
        transform(actor, 'tail', `translate(0 ${f(sit * 18 + sleep * 25)}) rotate(${f(wag + sleep * -24 - sit * 6)} 82 151)`);
        // Four-beat walk: longer planted stance, shorter lifted return. Phase is
        // advanced by distance travelled so feet don't cycle while standing still.
        const limbs: [string, number, number, number, boolean][] = [['near-back', 83, 148, .75, true], ['far-back', 100, 145, .25, true], ['near-front', 161, 148, 0, false], ['far-front', 183, 146, .5, false]];
        limbs.forEach(([name, px, py, offset, rear]) => {
          const cycle = (actor.phase / (Math.PI * 2) + offset) % 1;
          const swing = clamp((cycle - .62) / .38, 0, 1);
          const stride = (cycle < .62 ? mix(-13, 13, cycle / .62) : mix(13, -13, swing * swing * (3 - 2 * swing))) * actor.gait;
          const offering = name === 'near-front' ? greet : 0;
          const angle = stride + (rear ? sit * -23 + sleep * -34 - bow * 4 : sleep * -71 - stretch * 32 - bow * 28) - offering * (37 + Math.sin((beingPetted ? petTime : moodTime) * 12) * 4);
          const lower = rear ? sit * 24 + sleep * 38 - bow * 2 : sleep * 40 + stretch * 12 + bow * 12, compress = rear ? 1 - sit * .36 - sleep * .46 : 1 - sleep * .1 - offering * .19;
          const lift = Math.sin(swing * Math.PI) * actor.gait * 7 + offering * 10;
          transform(actor, name, `translate(0 ${f(lower - lift)}) translate(${px} ${py}) rotate(${f(angle)}) scale(1 ${f(compress)}) translate(${-px} ${-py})`);
        });
        transform(actor, 'head', `translate(${f(headX)} ${f(headY)}) rotate(${f(headTilt)} 174 137)`);
        // The curled front limbs retain their full joints underneath; their paw
        // tips are composited over the chin so the sleeping pose visibly bears weight.
        const restingPaws = clamp((sleep - .45) / .5, 0, 1);
        transform(actor, 'rest-near-paw', `translate(${f(-42 * (1 - sleep))} ${f(3 * (1 - sleep))})`);
        transform(actor, 'rest-far-paw', `translate(${f(-42 * (1 - sleep))} ${f(15 * (1 - sleep))})`);
        opacity(actor, 'rest-near-paw', restingPaws); opacity(actor, 'rest-far-paw', restingPaws * .88);
        transform(actor, 'near-ear', `rotate(${f(earLag - sniff * 4 + sleep * 5)} 152 82)`); transform(actor, 'far-ear', `rotate(${f(-earLag * .6 - sniff * 3)} 220 82)`);
        opacity(actor, 'eyes-open', closed || happy ? 0 : 1); opacity(actor, 'eyes-closed', closed ? 1 : 0); opacity(actor, 'eyes-happy', happy ? 1 : 0);
      });
      if (motion) schedule();
    }
    schedule();
    const timers = replyTimers.current;
    return () => { wake.current = () => {}; cancelAnimationFrame(raf); resize.disconnect(); visibility.disconnect(); document.removeEventListener('visibilitychange', documentVisibility); window.removeEventListener('pointermove', point); timers.forEach(clearTimeout); };
  }, []);
  useEffect(() => { wake.current(); }, [props.scene, props.quiet, props.reducedMotion, props.celebrate, props.transitioning]);
  return <div ref={container} className={`memory-pets${props.scene === 4 ? ' memory-pets-cake' : ''}${props.quiet ? ' memory-pets-reading' : ''}${props.reducedMotion ? ' memory-pets-still' : ''}`} aria-label="两只会歪头、招呼和陪伴你的泰迪幼犬">
    <PetDrawing color="apricot" reply={replies[0]} onPet={() => pet(0)} elementRef={(element) => { dogElements.current[0] = element; }} />
    <PetDrawing color="cream" reply={replies[1]} onPet={() => pet(1)} elementRef={(element) => { dogElements.current[1] = element; }} />
  </div>;
}

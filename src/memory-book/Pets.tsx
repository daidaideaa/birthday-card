import { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../utils/assetUrl';
import rigCrops from '../../public/memory-book/teddy-turnaround-layout-v9.json';
import './pets.css';

type PetsProps = { scene: number; quiet: boolean; reducedMotion: boolean; celebrate: number; transitioning?: boolean; onPet?: () => void };
type Color = 'apricot' | 'cream';
type Mood = 'watch' | 'walk' | 'trot' | 'lookback' | 'greet' | 'sniff' | 'sit' | 'rest' | 'hop';
type Part = 'head' | 'body' | 'front' | 'back' | 'tail' | 'blink';
type Rect = [number, number, number, number];
type Point = { x: number; depth: number };
type Obstacle = { left: number; top: number; right: number; bottom: number };
type Pose = { head: Rect; body: Rect; tail: Rect; legs: Rect[]; neck: [number, number] };
type Actor = Point & {
  element: HTMLDivElement; button: HTMLButtonElement; context: CanvasRenderingContext2D;
  color: Color; target: Point; yaw: number; headYaw: number; phase: number; gait: number;
  mood: Mood; moodAt: number; nextMood: number; beat: number; hopAt: number;
  sit: number; rest: number; sniff: number; greeting: number; tilt: number;
  petAt: number; petUntil: number; noticeAt: number; noticeUntil: number;
  nextBlink: number; blinkUntil: number; opacity: number; hasSpace: boolean; random: () => number;
};
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const damp = (a: number, b: number, dt: number, speed = 6) => mix(a, b, 1 - Math.exp(-dt * speed));
const angle = (n: number) => ((n + 180) % 360 + 360) % 360 - 180;
const turn = (a: number, b: number, dt: number) => a + angle(b - a) * (1 - Math.exp(-dt * 4.8));
const pulse = (t: number, start: number, duration: number) => t > start && t < start + duration ? Math.sin((t - start) / duration * Math.PI) : 0;
const seeded = (seed: number) => () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
const overlaps = (a: Obstacle, b: Obstacle) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

// Actual perspective drawings, not a side-view flattened into a front or back.
// Coordinates share planted feet and an anatomical neck anchor through a turn.
const POSES: Pose[] = [
  { head: [82, 37, 116, 101], body: [94, 109, 92, 87], tail: [143, 107, 31, 48], legs: [[101, 144, 29, 67], [151, 144, 29, 67], [108, 145, 28, 69], [146, 145, 28, 69]], neck: [140, 130] },
  { head: [120, 42, 116, 104], body: [81, 110, 121, 86], tail: [68, 105, 37, 50], legs: [[78, 144, 37, 70], [111, 140, 32, 69], [159, 144, 31, 70], [183, 140, 28, 67]], neck: [180, 134] },
  { head: [141, 43, 109, 104], body: [63, 112, 141, 84], tail: [39, 103, 40, 51], legs: [[69, 144, 40, 70], [97, 141, 33, 69], [163, 144, 31, 70], [186, 140, 28, 69]], neck: [189, 134] },
  { head: [141, 42, 109, 104], body: [82, 109, 121, 89], tail: [81, 113, 39, 52], legs: [[91, 145, 37, 70], [121, 140, 32, 70], [177, 143, 29, 70], [196, 140, 25, 67]], neck: [190, 134] },
  { head: [82, 37, 116, 101], body: [93, 108, 94, 90], tail: [123, 119, 35, 53], legs: [[103, 145, 30, 70], [148, 145, 30, 70], [106, 142, 27, 68], [147, 142, 27, 68]], neck: [140, 130] },
];
const ROUTINES: { mood: Mood; seconds: number }[][] = [
  [{ mood: 'watch', seconds: 3.1 }, { mood: 'walk', seconds: 5 }, { mood: 'lookback', seconds: 3.2 }, { mood: 'trot', seconds: 4 }, { mood: 'greet', seconds: 3.1 }, { mood: 'watch', seconds: 8 }, { mood: 'hop', seconds: 2 }, { mood: 'sniff', seconds: 3.4 }, { mood: 'sit', seconds: 11 }, { mood: 'rest', seconds: 16 }],
  [{ mood: 'greet', seconds: 3 }, { mood: 'watch', seconds: 7 }, { mood: 'walk', seconds: 5 }, { mood: 'lookback', seconds: 3.5 }, { mood: 'trot', seconds: 4 }, { mood: 'sit', seconds: 12 }, { mood: 'hop', seconds: 2 }, { mood: 'watch', seconds: 8 }, { mood: 'rest', seconds: 18 }],
];
function poseAt(yaw: number): Pose {
  const value = Math.abs(angle(yaw)) / 45, lower = Math.floor(value), higher = Math.min(4, lower + 1), t = smooth(value - lower);
  const a = POSES[lower], b = POSES[higher];
  const rect = (r: Rect, s: Rect) => r.map((v, i) => mix(v, s[i], t)) as Rect;
  return { head: rect(a.head, b.head), body: rect(a.body, b.body), tail: rect(a.tail, b.tail), legs: a.legs.map((r, i) => rect(r, b.legs[i])), neck: [mix(a.neck[0], b.neck[0], t), mix(a.neck[1], b.neck[1], t)] };
}
function drawLayer(context: CanvasRenderingContext2D, atlas: HTMLImageElement, color: Color, part: Part, yaw: number, rect: Rect) {
  const value = Math.abs(angle(yaw)) / 45, a = Math.floor(value), b = Math.min(4, a + 1), blend = smooth(value - a);
  const crops = rigCrops[color][part];
  const paint = (index: number, opacity: number) => {
    if (opacity < .005) return;
    const crop = crops[index];
    context.globalAlpha = opacity;
    context.drawImage(atlas, crop[0], crop[1], crop[2], crop[3], rect[0], rect[1], rect[2], rect[3]);
  };
  // Neighboring drawings share interpolated joints, so paws/head don't jump
  // when the visible skull, chest, muzzle and rump rotate through a key view.
  paint(a, 1 - blend); if (a !== b) paint(b, blend);
  context.globalAlpha = 1;
}
function drawPuppy(actor: Actor, atlas: HTMLImageElement, blinkAtlas: HTMLImageElement, time: number, moving: boolean, reduced: boolean, closed: boolean, hopTime: number) {
  const ctx = actor.context, yaw = angle(actor.yaw), facing = yaw < 0 ? -1 : 1, view = Math.abs(yaw), pose = poseAt(yaw);
  const gait = actor.gait, trot = actor.mood === 'trot', breath = reduced ? 0 : Math.sin(time * (actor.color === 'apricot' ? 2 : 1.72));
  let hop = 0, crouch = 0;
  if (!reduced && hopTime >= 0 && hopTime < 1.35) {
    if (hopTime < .28) crouch = Math.sin(hopTime / .28 * Math.PI / 2);
    else if (hopTime < .91) { hop = Math.sin((hopTime - .28) / .63 * Math.PI) * 31; crouch = 0; }
    else crouch = Math.sin((hopTime - .91) / .44 * Math.PI) * .68;
  }
  const bob = moving ? -Math.abs(Math.sin(actor.phase * (trot ? 1 : 2))) * gait * (trot ? 3.5 : 1.1) : 0;
  actor.element.style.setProperty('--pet-shadow-scale', (1 - hop / 85 + actor.rest * .12).toFixed(3));
  actor.element.style.setProperty('--pet-shadow-opacity', (.65 - hop / 115).toFixed(3));
  actor.element.style.setProperty('--pet-shadow-blur', (hop / 12).toFixed(2) + 'px');
  ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, 280, 280);
  ctx.save(); ctx.translate(140, 20 + bob - hop + crouch * 5); ctx.scale(facing, 1); ctx.translate(-140, 0);
  const render = (part: Part, rect: Rect, partYaw = yaw) => drawLayer(ctx, part === 'blink' ? blinkAtlas : atlas, actor.color, part, partYaw, rect);
  const leg = (i: number) => {
    const r = pose.legs[i], rear = i < 2, offered = i === 2 ? actor.greeting : 0;
    const offset = trot ? [.5, 0, 0, .5][i] : [.5, 0, .25, .75][i];
    const cycle = (actor.phase / (Math.PI * 2) + offset) % 1, swing = clamp((cycle - .61) / .39, 0, 1);
    const stride = (cycle < .61 ? mix(-14, 14, cycle / .61) : mix(14, -14, smooth(swing))) * gait;
    const angleDegrees = stride * Math.sin(view * Math.PI / 180) + (rear ? -actor.sit * 24 - actor.rest * 37 : -actor.rest * 63 - offered * 35);
    const lower = rear ? actor.sit * 24 + actor.rest * 33 : actor.rest * 34;
    const lift = Math.sin(swing * Math.PI) * gait * (trot ? 11 : 7) + offered * 11;
    const squeeze = 1 - (rear ? actor.sit * .31 + actor.rest * .39 : actor.rest * .1 + offered * .15) - crouch * .17;
    const pivotX = r[0] + r[2] * .5, pivotY = r[1] + 13;
    ctx.save(); ctx.translate(0, lower - lift + crouch * 7);
    // Front and back views lift the paws in depth; side views also swing at the shoulder.
    ctx.translate(pivotX, pivotY); ctx.rotate(angleDegrees * Math.PI / 180); ctx.scale(1, squeeze); ctx.translate(-pivotX, -pivotY);
    render(rear ? 'back' : 'front', r); ctx.restore();
  };
  const tail = () => {
    const r = pose.tail, excited = actor.greeting * 16 + (hopTime >= 0 && hopTime < 1.35 ? 15 : 0) + gait * 7 + actor.tilt * 4;
    const wag = reduced ? 0 : Math.sin(time * (excited > 8 ? 13 : 7)) * (excited + 2) * (1 - actor.rest);
    ctx.save(); ctx.translate(0, actor.sit * 12 + actor.rest * 24);
    ctx.translate(r[0] + r[2] * .5, r[1] + r[3] * .86); ctx.rotate((wag - actor.rest * 17) * Math.PI / 180);
    ctx.translate(-r[0] - r[2] * .5, -r[1] - r[3] * .86); render('tail', r); ctx.restore();
  };
  const head = () => {
    const r = pose.head, tilt = actor.sniff * 18 + actor.rest * 20 - actor.tilt * 13 + (reduced ? 0 : Math.sin(actor.phase - .8) * gait * 1.8);
    ctx.save(); ctx.translate(actor.sniff * 8 + actor.rest * 9, actor.sniff * 23 + actor.rest * 46 - actor.sit * 3 + breath * .22 - actor.tilt * 2);
    ctx.translate(...pose.neck); ctx.rotate(tilt * Math.PI / 180); ctx.translate(-pose.neck[0], -pose.neck[1]);
    render(closed ? 'blink' : 'head', r, actor.headYaw); ctx.restore();
  };
  if (view < 112) tail();
  leg(1); leg(3);
  if (view > 112) head();
  ctx.save(); ctx.translate(-actor.sit * 2 - actor.greeting, actor.rest * 21 + crouch * 4);
  ctx.translate(140, 163); ctx.rotate((-actor.sit * Math.sin(view * Math.PI / 180) * 10) * Math.PI / 180);
  ctx.scale(1 - actor.rest * .08, 1 - actor.rest * .13 + breath * .008); ctx.translate(-140, -163);
  render('body', pose.body); ctx.restore();
  leg(0); leg(2);
  if (view < 35) leg(3);
  if (view > 145) leg(1);
  if (view <= 112) head();
  if (view >= 112) tail();
  // The forward paw tips visibly support the lowered chin during a rest.
  if (actor.rest > .45) {
    const alpha = clamp((actor.rest - .45) / .5, 0, 1), fore = rigCrops[actor.color].front[1];
    const x = pose.neck[0] + 25, y = 198;
    ctx.globalAlpha = alpha;
    ctx.drawImage(atlas, fore[0], fore[1] + fore[3] * .76, fore[2], fore[3] * .24, x, y, 28, 16);
    ctx.drawImage(atlas, fore[0], fore[1] + fore[3] * .76, fore[2], fore[3] * .24, x + 19, y - 5, 26, 15);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export default function Pets(props: PetsProps) {
  const container = useRef<HTMLDivElement>(null), elements = useRef<(HTMLDivElement | null)[]>([]);
  const actors = useRef<Actor[]>([]), current = useRef(props), wake = useRef<() => void>(() => {});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]), [replies, setReplies] = useState(['', '']);
  current.current = props;
  const pet = (index: number) => {
    const now = performance.now(), actor = actors.current[index], other = actors.current[1 - index];
    if (!actor || actor.button.disabled) return;
    actor.petAt = now; actor.petUntil = now + 4300; actor.target = { x: actor.x, depth: actor.depth };
    if (other) { other.noticeAt = now + 650; other.noticeUntil = now + 3300; }
    current.current.onPet?.();
    if (timers.current[index]) clearTimeout(timers.current[index]);
    setReplies(v => v.map((value, i) => i === index ? index ? '也想靠近你一点 ♡' : '喜欢你的摸摸 ♡' : value));
    timers.current[index] = setTimeout(() => { setReplies(v => v.map((value, i) => i === index ? '' : value)); wake.current(); }, 4300);
    wake.current();
  };
  useEffect(() => {
    const stage = container.current;
    if (!stage) return;
    const root = stage.closest('.chapter-stage') ?? stage.parentElement!;
    const images = { apricot: new Image(), cream: new Image(), blink: new Image() };
    let width = stage.clientWidth, stageRect = stage.getBoundingClientRect(), obstacles: Obstacle[] = [];
    let visible = true, raf = 0, last = 0, elapsed = 0, nextGeometry = 0, previousScene = current.current.scene, previousCelebrate = current.current.celebrate;
    const pointer = { x: 0, until: 0 };
    const schedule = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    wake.current = schedule;
    const scaleAt = (depth: number) => 1 - depth * .19;
    const edge = (actor: Actor, x: number, depth = actor.depth) => {
      const inset = actor.element.clientWidth * scaleAt(depth) / 2 + 8;
      return clamp(x, Math.min(inset, width / 2), Math.max(width - inset, width / 2));
    };
    const bounds = (actor: Actor, point: Point, jumping = false): Obstacle => {
      const size = actor.element.clientWidth * scaleAt(point.depth), ground = stageRect.bottom + (width < 600 ? 12 : 0) - point.depth * 36;
      // Measured painted silhouette in the 280-square canvas: about y=54..234.
      // Its transparent margins are not an obstacle and don't consume the lane.
      return { left: stageRect.left + point.x - size * .44 - 3, right: stageRect.left + point.x + size * .44 + 3, top: ground - size * .81 - (jumping ? size * .15 : 2), bottom: ground - size * .155 + 1 };
    };
    const clear = (actor: Actor, point: Point, jumping = false, partner = true) => {
      if (Math.abs(edge(actor, point.x, point.depth) - point.x) > .5) return false;
      const box = bounds(actor, point, jumping);
      if (box.top < 0 || box.bottom > innerHeight - 4 || obstacles.some(obstacle => overlaps(box, obstacle))) return false;
      if (partner) {
        const other = actors.current.find(value => value !== actor);
        if (other && other.opacity > .1 && overlaps(box, bounds(other, other))) return false;
      }
      return true;
    };
    const routeClear = (actor: Actor, target: Point) => {
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        if (!clear(actor, { x: mix(actor.x, target.x, t), depth: mix(actor.depth, target.depth, t) })) return false;
      }
      return true;
    };
    const findSpace = (actor: Actor, index: number, moving: boolean): Point | null => {
      const desired = width * (index ? .85 : .15), candidates: { point: Point; score: number }[] = [];
      const depths = width < 600 ? [0, .35, .65] : [0, .35, .7, 1];
      for (const depth of depths) {
        for (let x = 12; x < width; x += width < 600 ? 14 : 22) {
          const point = { x: edge(actor, x, depth), depth };
          // Each puppy owns its half of the foreground. Never cross a CTA or
          // another puppy just to make an idle routine reach its nominal mark.
          if (index ? point.x < width * .54 : point.x > width * .46) continue;
          if (!clear(actor, point) || (moving && !routeClear(actor, point))) continue;
          const distance = Math.abs(point.x - actor.x) + Math.abs(depth - actor.depth) * 55;
          const score = moving ? -distance + actor.random() * 28 : Math.abs(point.x - desired) + depth * 18;
          candidates.push({ point, score });
        }
      }
      candidates.sort((a, b) => a.score - b.score);
      return candidates[0]?.point ?? null;
    };
    actors.current = elements.current.filter((e): e is HTMLDivElement => Boolean(e)).flatMap((element, index) => {
      const context = element.querySelector('canvas')?.getContext('2d');
      if (!context) return [];
      return [{ element, button: element.querySelector('button')!, context, color: index ? 'cream' as const : 'apricot' as const,
        x: width * (index ? .85 : .15), depth: 0, target: { x: width * (index ? .85 : .15), depth: 0 }, yaw: index ? -45 : 45, headYaw: index ? -45 : 45, phase: index ? 2.7 : 0, gait: 0,
        mood: 'watch' as Mood, moodAt: 0, nextMood: index ? 6.3 : 3.6, beat: 0, hopAt: -20, sit: 0, rest: 0, sniff: 0, greeting: 0, tilt: 0,
        petAt: -10000, petUntil: 0, noticeAt: 0, noticeUntil: 0, nextBlink: index ? 2.2 : 3.6, blinkUntil: 0, opacity: 0, hasSpace: false, random: seeded(index ? 7193 : 1207) }];
    });
    const measure = () => {
      const previousWidth = width; width = stage.clientWidth; stageRect = stage.getBoundingClientRect();
      if (previousWidth !== width) actors.current.forEach(actor => { actor.x = edge(actor, actor.x / Math.max(1, previousWidth) * width); actor.target.x = edge(actor, actor.target.x / Math.max(1, previousWidth) * width); });
      obstacles = Array.from(root.querySelectorAll<HTMLElement>('[data-pet-obstacle],button,a,[role="button"],.cinema-caption,.chapter-caption,.journey-caption,.book-caption,.object-tools')).filter(element => !stage.contains(element) && !element.closest('[hidden]')).flatMap(element => {
        const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
        if (!rect.width || !rect.height || style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) < .08) return [];
        const gap = width < 600 ? 5 : 9;
        return [{ left: rect.left - gap, top: rect.top - gap, right: rect.right + gap, bottom: rect.bottom + gap }];
      });
      nextGeometry = performance.now() + 650;
    };
    const changed = () => { nextGeometry = 0; schedule(); };
    const resize = new ResizeObserver(changed); resize.observe(root); resize.observe(stage);
    const mutations = new MutationObserver(records => { if (records.some(record => !(record.target instanceof Element) || !record.target.closest('.memory-pets'))) changed(); });
    mutations.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'data-pet-obstacle'] });
    const intersection = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); last = 0; if (visible) schedule(); else { cancelAnimationFrame(raf); raf = 0; } }, { rootMargin: '40px' });
    intersection.observe(stage);
    const visibility = () => { last = 0; if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else { nextGeometry = 0; schedule(); } };
    const point = (event: PointerEvent) => { if (event.pointerType !== 'touch' && event.clientY > stageRect.top - 25) { pointer.x = event.clientX - stageRect.left; pointer.until = performance.now() + 1300; } };
    document.addEventListener('visibilitychange', visibility); window.addEventListener('pointermove', point, { passive: true }); window.addEventListener('scroll', changed, { passive: true });
    images.apricot.src = assetUrl('memory-book/teddy-apricot-turnaround-v9.webp');
    images.cream.src = assetUrl('memory-book/teddy-cream-turnaround-v9.webp');
    images.blink.src = assetUrl('memory-book/teddy-turnaround-blink-v9.webp');
    Object.values(images).forEach(image => { image.onload = schedule; image.onerror = schedule; });
    function frame(now: number) {
      raf = 0;
      if (!visible || document.hidden || width < 1) { last = 0; return; }
      const settings = current.current, motion = !settings.reducedMotion, mobile = width < 600;
      if (motion && last && now - last < (mobile ? 32 : 25)) { schedule(); return; }
      const dt = motion ? Math.min((now - (last || now)) / 1000, .06) : 1; last = now; if (motion) elapsed += dt;
      if (now >= nextGeometry) measure();
      const reading = settings.quiet || settings.scene === 2 || settings.scene === 3 || Boolean(root.closest('.memory-gift')?.classList.contains('is-book-reading'));
      const withdraw = Boolean(settings.transitioning) || (mobile && reading);
      if (previousScene !== settings.scene) {
        previousScene = settings.scene;
        actors.current.forEach((actor, index) => { actor.mood = 'watch'; actor.beat = 0; actor.nextMood = elapsed + (index ? 6.3 : 3.6); actor.hopAt = -20; actor.target = { x: actor.x, depth: actor.depth }; });
      }
      if (previousCelebrate !== settings.celebrate) {
        previousCelebrate = settings.celebrate;
        if (settings.celebrate) actors.current.forEach((actor, index) => { if (clear(actor, actor, true) && !withdraw) actor.hopAt = elapsed + index * .58; });
      }
      actors.current.forEach((actor, index) => {
        const atlas = images[actor.color], ready = atlas.complete && atlas.naturalWidth > 0 && images.blink.complete && images.blink.naturalWidth > 0;
        actor.x = edge(actor, actor.x);
        const beingPetted = now < actor.petUntil && !withdraw, notice = now > actor.noticeAt && now < actor.noticeUntil;
        let safe = clear(actor, actor);
        if (!safe || !actor.hasSpace) {
          const place = findSpace(actor, index, false);
          actor.hasSpace = Boolean(place);
          if (place) {
            // Hide before relocating when a new page/control occupies the old
            // patch of floor. An invisible relocation never passes over controls.
            actor.opacity = 0; actor.x = place.x; actor.depth = place.depth; actor.target = { ...place }; actor.mood = 'sit'; safe = true;
          }
        }
        if (!safe) actor.hasSpace = false;
        const display = ready && actor.hasSpace && !withdraw;
        actor.opacity = motion ? damp(actor.opacity, display ? 1 : 0, dt, display ? 5 : 9) : display ? 1 : 0;
        actor.element.style.opacity = safe ? actor.opacity.toFixed(3) : '0';
        actor.button.disabled = !display || actor.opacity < .65;
        actor.button.tabIndex = display ? 0 : -1;
        actor.element.setAttribute('aria-hidden', display ? 'false' : 'true');
        actor.button.style.pointerEvents = actor.button.disabled ? 'none' : '';
        if (!display) { actor.target = { x: actor.x, depth: actor.depth }; actor.hopAt = -20; }
        if (motion && display && !reading && !beingPetted && elapsed > actor.nextMood) {
          const beat = ROUTINES[index][actor.beat++ % ROUTINES[index].length]; actor.mood = beat.mood; actor.moodAt = elapsed;
          actor.nextMood = elapsed + beat.seconds;
          if (beat.mood === 'walk' || beat.mood === 'trot') {
            const destination = findSpace(actor, index, true);
            if (destination && Math.abs(destination.x - actor.x) + Math.abs(destination.depth - actor.depth) * 55 > 22) actor.target = destination;
            else { actor.mood = 'sit'; actor.target = { x: actor.x, depth: actor.depth }; }
          } else actor.target = { x: actor.x, depth: actor.depth };
          if (beat.mood === 'hop' && clear(actor, actor, true)) actor.hopAt = elapsed;
        }
        // Jump envelopes are tested separately: a standing gap is not enough
        // if an upward hop would touch a caption or button.
        if (elapsed - actor.hopAt < 1.35 && !clear(actor, actor, true)) actor.hopAt = -20;
        const hopTime = elapsed - actor.hopAt, hopping = motion && hopTime >= 0 && hopTime < 1.35;
        const resting = display && !beingPetted && !hopping && (reading || actor.mood === 'rest');
        const sitting = display && !resting && !beingPetted && !hopping && actor.mood === 'sit';
        actor.rest = motion ? damp(actor.rest, resting ? 1 : 0, dt, 4) : 0;
        actor.sit = motion ? damp(actor.sit, sitting ? 1 : 0, dt, 4) : index;
        actor.sniff = motion ? damp(actor.sniff, !reading && !beingPetted && actor.mood === 'sniff' ? 1 : 0, dt, 4) : 0;
        const petTime = (now - actor.petAt) / 1000, moodTime = elapsed - actor.moodAt;
        const wantsGreeting = beingPetted ? pulse(petTime, .8, 2) : actor.mood === 'greet' && !reading ? pulse(moodTime, .4, 2) : 0;
        actor.greeting = motion ? damp(actor.greeting, actor.rest < .1 && actor.sit < .1 ? wantsGreeting : 0, dt, 8) : 0;
        const attentive = beingPetted ? pulse(petTime, .1, 3.8) : notice ? .7 : pointer.until > now && Math.abs(pointer.x - actor.x) < 90 ? .5 : 0;
        actor.tilt = motion ? damp(actor.tilt, clear(actor, actor, true) ? attentive : 0, dt, 5) : 0;
        const dx = actor.target.x - actor.x, dd = (actor.target.depth - actor.depth) * 80, distance = Math.hypot(dx, dd);
        let walking = display && motion && !reading && !beingPetted && !hopping && (actor.mood === 'walk' || actor.mood === 'trot') && distance > 2;
        if (walking && !routeClear(actor, actor.target)) { walking = false; actor.target = { x: actor.x, depth: actor.depth }; actor.mood = 'sit'; }
        actor.gait = motion ? damp(actor.gait, walking && actor.rest < .08 && actor.sit < .1 && actor.sniff < .1 ? 1 : 0, dt, 7) : 0;
        const inward = index ? -1 : 1;
        let desiredYaw = actor.mood === 'lookback' ? inward * 135 : actor.mood === 'watch' || beingPetted ? 0 : inward * 45;
        if (resting) desiredYaw = inward * 45;
        if (walking) {
          desiredYaw = Math.atan2(dx, -dd) * 180 / Math.PI;
          const speed = (actor.mood === 'trot' ? 65 : 29) * (mobile ? .78 : 1) * actor.gait;
          const amount = Math.min(1, speed * dt / Math.max(1, distance));
          actor.x += dx * amount; actor.depth += dd / 80 * amount; actor.phase += distance * amount / (actor.mood === 'trot' ? 31 : 26) * Math.PI * 2;
        }
        actor.yaw = motion ? turn(actor.yaw, desiredYaw, dt) : inward * 45;
        const headTarget = actor.mood === 'lookback' || notice ? inward * 45 : beingPetted ? 0 : actor.yaw;
        actor.headYaw = motion ? turn(actor.headYaw, headTarget, dt) : actor.yaw;
        if (motion && elapsed > actor.nextBlink) { actor.blinkUntil = elapsed + .14 + actor.random() * .07; actor.nextBlink = elapsed + 2.9 + actor.random() * 3.7; }
        const closed = actor.rest > .75 || (motion && elapsed < actor.blinkUntil) || (beingPetted && petTime > .15 && petTime < .6);
        actor.element.style.transform = 'translate3d(' + actor.x.toFixed(2) + 'px,' + ((mobile ? 12 : 0) - actor.depth * 36).toFixed(2) + 'px,0) scale(' + scaleAt(actor.depth).toFixed(3) + ')';
        actor.element.style.zIndex = String(20 - Math.round(actor.depth * 10));
        actor.element.dataset.mood = beingPetted ? 'loved' : hopping ? 'hopping' : resting ? 'resting' : walking ? actor.mood : actor.mood;
        actor.element.dataset.view = ['front', 'front-quarter', 'side', 'rear-quarter', 'back'][Math.round(Math.abs(angle(actor.yaw)) / 45)];
        if (ready && safe && actor.opacity > .005) drawPuppy(actor, atlas, images.blink, elapsed + index * 3.71, walking, !motion, closed, hopping ? hopTime : -1);
      });
      if (motion) schedule();
    }
    measure(); schedule();
    const replyTimers = timers.current;
    return () => {
      wake.current = () => {}; cancelAnimationFrame(raf); resize.disconnect(); intersection.disconnect(); mutations.disconnect();
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pointermove', point); window.removeEventListener('scroll', changed);
      Object.values(images).forEach(image => { image.onload = null; image.onerror = null; }); replyTimers.forEach(clearTimeout);
    };
  }, []);
  useEffect(() => { wake.current(); }, [props.scene, props.quiet, props.transitioning, props.reducedMotion, props.celebrate]);
  return <div ref={container} className={'memory-pets' + (props.quiet ? ' memory-pets-reading' : '') + (props.reducedMotion ? ' memory-pets-still' : '')} aria-label="两只会转身、小跑和陪伴你的泰迪幼犬">
    {(['apricot', 'cream'] as const).map((color, index) => <div key={color} ref={element => { elements.current[index] = element; }} className={'memory-pet memory-pet-' + color}>
      <span className="memory-pet-shadow" aria-hidden="true" />
      <canvas className="memory-pet-drawing" width="560" height="560" aria-hidden="true" />
      <span className="memory-pet-heart" aria-hidden="true">♡</span>
      {replies[index] && <span className="memory-pet-reply" role="status">{replies[index]}</span>}
      <button type="button" className="memory-pet-touch" aria-label={'摸摸' + (index ? '奶油色' : '杏色') + '泰迪'} title="轻轻摸摸我" onClick={() => pet(index)}><span className="memory-pet-touch-cue" aria-hidden="true">摸摸我</span></button>
    </div>)}
  </div>;
}


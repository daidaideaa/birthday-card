import { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../utils/assetUrl';
import './pets.css';

type PetsProps = {
  scene: number;
  quiet: boolean;
  reducedMotion: boolean;
  celebrate: number;
  onPet?: () => void;
};
type DogColor = 'apricot' | 'cream';
type Mood = 'watch' | 'sniff' | 'walk' | 'play';
type Mark = [number, number, Mood];
type Actor = {
  element: HTMLDivElement;
  parts: Record<string, SVGElement>;
  x: number;
  facing: number;
  direction: number;
  step: number;
  petUntil: number;
};

const ART = assetUrl('memory-book/teddy-rig.webp');
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Every part has its own joint; the painted atlas supplies fur, not pre-baked motion.
const CROPS = {
  body: '22 120 427 282',
  face: '490 42 388 358',
  ear: '1022 72 232 341',
  tail: '1430 70 240 310',
  front: '122 455 227 390',
  back: '535 453 252 391',
  blink: '1353 481 389 368',
};

function Part({ crop, x, y, width, height }: { crop: keyof typeof CROPS; x: number; y: number; width: number; height: number }) {
  return <svg x={x} y={y} width={width} height={height} viewBox={CROPS[crop]} overflow="hidden" aria-hidden="true">
    <image href={ART} width="1774" height="887" />
  </svg>;
}

function PaintedTeddy({ color }: { color: DogColor }) {
  return <svg className={`memory-pet-drawing memory-pet-fur-${color}`} viewBox="0 0 240 220" aria-hidden="true">
    <g data-part="facing">
      <g data-part="bounce">
        <g data-part="far-back" opacity=".77"><Part crop="back" x={64} y={110} width={43} height={74} /></g>
        <g data-part="far-front" opacity=".78"><Part crop="front" x={141} y={109} width={35} height={77} /></g>
        <g data-part="tail"><Part crop="tail" x={20} y={67} width={47} height={68} /></g>
        <g data-part="body"><Part crop="body" x={44} y={79} width={139} height={89} /></g>
        <g data-part="near-back"><Part crop="back" x={51} y={112} width={49} height={79} /></g>
        <g data-part="near-front"><Part crop="front" x={150} y={111} width={37} height={81} /></g>
        <g data-part="head">
          <g data-part="far-ear"><Part crop="ear" x={177} y={43} width={35} height={71} /></g>
          <g data-part="face-open"><Part crop="face" x={106} y={22} width={103} height={96} /></g>
          <g data-part="face-blink" opacity="0"><Part crop="blink" x={106} y={22} width={103} height={96} /></g>
          <g data-part="near-ear"><Part crop="ear" x={101} y={42} width={40} height={83} /></g>
        </g>
      </g>
    </g>
  </svg>;
}

function PetDrawing({ color, quiet, reply, onPet, elementRef }: { color: DogColor; quiet: boolean; reply: string; onPet: () => void; elementRef: (element: HTMLDivElement | null) => void }) {
  return <div ref={elementRef} className={`memory-pet memory-pet-${color}`}>
    {reply && <span className="memory-pet-reply" role="status">{reply}</span>}
    <span className="memory-pet-shadow" aria-hidden="true" />
    <span className="memory-pet-heart" aria-hidden="true">♡</span>
    <button type="button" className="memory-pet-touch" aria-label={`摸摸${color === 'apricot' ? '杏色' : '奶油色'}泰迪`} onClick={onPet} title={quiet ? '轻轻摸摸，陪你读信' : '摸摸我，我会回应你'}>
      <PaintedTeddy color={color} />
      <span className="memory-pet-touch-cue" aria-hidden="true">摸摸我</span>
    </button>
  </div>;
}

export default function Pets(props: PetsProps) {
  const container = useRef<HTMLDivElement>(null);
  const dogElements = useRef<(HTMLDivElement | null)[]>([null, null]);
  const actors = useRef<Actor[]>([]);
  const current = useRef(props);
  current.current = props;
  const [replies, setReplies] = useState(['', '']);
  const replyTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const celebration = useRef({ count: props.celebrate, until: 0 });

  const pet = (index: number) => {
    const actor = actors.current[index];
    if (actor) actor.petUntil = performance.now() + 3600;
    current.current.onPet?.();
    if (replyTimers.current[index]) clearTimeout(replyTimers.current[index]);
    setReplies((values) => values.map((value, i) => i === index ? current.current.quiet ? '我轻轻地陪着你' : index ? '嗯！最喜欢被你摸摸' : '再摸摸嘛 ♡' : value));
    replyTimers.current[index] = setTimeout(() => setReplies((values) => values.map((value, i) => i === index ? '' : value)), 3600);
  };

  useEffect(() => {
    const stage = container.current;
    if (!stage) return;
    let width = stage.clientWidth;
    let visible = true;
    let raf = 0;
    let last = 0;
    let elapsed = 0;
    let previousScene = current.current.scene;
    let previousReduced = current.current.reducedMotion;
    let previousQuiet = current.current.quiet;
    let hadPetting = false;
    let needsStaticFrame = true;
    const pointer = { x: width / 2, until: 0 };
    actors.current = dogElements.current.filter((element): element is HTMLDivElement => Boolean(element)).map((element, index) => ({
      element,
      parts: Object.fromEntries(Array.from(element.querySelectorAll<SVGElement>('[data-part]')).map((part) => [part.dataset.part!, part])),
      x: width * (index ? .83 : .16), facing: index ? -1 : 1, direction: index ? -1 : 1,
      step: index ? 1.8 : 0, petUntil: 0,
    }));
    const resize = new ResizeObserver(() => {
      const nextWidth = stage.clientWidth;
      actors.current.forEach((actor) => { actor.x = actor.x / Math.max(1, width) * nextWidth; });
      width = nextWidth;
      needsStaticFrame = true;
    });
    resize.observe(stage);
    const visibility = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      last = 0;
    }, { rootMargin: '20px' });
    visibility.observe(stage);
    const point = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = stage.getBoundingClientRect();
      if (event.clientY < rect.top - 90 || event.clientY > rect.bottom + 30) return;
      pointer.x = event.clientX - rect.left;
      pointer.until = performance.now() + 1600;
    };
    window.addEventListener('pointermove', point, { passive: true });
    const transform = (actor: Actor, part: string, value: string) => actor.parts[part]?.setAttribute('transform', value);
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden || !visible || width < 1) { last = 0; return; }
      const settings = current.current;
      const dt = Math.min((now - (last || now)) / 1000, .04);
      last = now;
      if (previousScene !== settings.scene) {
        previousScene = settings.scene;
        elapsed = 4;
        needsStaticFrame = true;
      }
      if (previousReduced !== settings.reducedMotion) {
        previousReduced = settings.reducedMotion;
        needsStaticFrame = true;
      }
      if (previousQuiet !== settings.quiet) {
        previousQuiet = settings.quiet;
        needsStaticFrame = true;
      }
      if (celebration.current.count !== settings.celebrate) {
        celebration.current = { count: settings.celebrate, until: settings.celebrate ? now + 5000 : 0 };
      }
      const petting = actors.current.some((actor) => actor.petUntil > now);
      if (settings.reducedMotion && !needsStaticFrame && !petting && !hadPetting) return;
      hadPetting = petting;
      const motion = !settings.reducedMotion;
      if (motion) elapsed += dt;
      const small = width < 600;
      const leftMeet = small ? .36 : .75 - 150 / width;
      const rightMeet = small ? .71 : .75;
      const timeline: Mark[][] = [
        [[0, .16, 'watch'], [2, .16, 'sniff'], [4, .29, 'walk'], [7, .29, 'watch'], [9, leftMeet, 'walk'], [13, leftMeet, 'play'], [16, leftMeet, 'watch'], [18, .29, 'walk'], [22, .29, 'sniff'], [25, .16, 'walk'], [29, .16, 'watch']],
        [[0, .83, 'watch'], [4, .83, 'watch'], [6, rightMeet, 'walk'], [10, rightMeet, 'sniff'], [13, rightMeet, 'watch'], [16, rightMeet, 'play'], [19, .83, 'walk'], [23, .83, 'watch'], [26, rightMeet, 'walk'], [29, rightMeet, 'watch']],
      ];
      actors.current.forEach((actor, index) => {
        const seconds = elapsed % 32;
        let mark = timeline[index][0];
        timeline[index].forEach((candidate) => { if (seconds >= candidate[0]) mark = candidate; });
        let desired = width * mark[1];
        let mood = mark[2];
        const beingPetted = actor.petUntil > now;
        const festive = celebration.current.until > now;
        const followsPointer = motion && !settings.quiet && pointer.until > now && Math.abs(pointer.x - actor.x) < Math.min(width * .35, 230);
        if (followsPointer) {
          desired = clamp(pointer.x + (index ? 66 : -66), width * (index ? .64 : .14), width * (index ? .87 : leftMeet));
          mood = 'watch';
        }
        if (settings.quiet || !motion) {
          desired = width * (index ? .84 : .16);
          mood = 'watch';
        }
        if (beingPetted || festive) desired = actor.x;
        const distance = desired - actor.x;
        const speed = (index ? 31 : 47) * (small ? .76 : 1);
        const moving = motion && !beingPetted && !festive && Math.abs(distance) > 2;
        if (moving) {
          actor.x += Math.sign(distance) * Math.min(Math.abs(distance), speed * dt);
          actor.direction = Math.sign(distance);
          actor.step += dt * (index ? 8.6 : 10.7);
        } else {
          const partner = actors.current[1 - index];
          const lookAt = followsPointer ? pointer.x : partner?.x ?? width / 2;
          if (!beingPetted) actor.direction = lookAt > actor.x ? 1 : -1;
          actor.step += dt * 1.4;
        }
        if (!motion) actor.x = desired;
        actor.facing = actor.direction;
        if (!motion) actor.facing = index ? -1 : 1;
        const t = motion ? elapsed + index * 2.93 : 0;
        const breath = Math.sin(t * (index ? 2.2 : 2.65));
        const gait = moving ? Math.sin(actor.step) * 22 : 0;
        const sniff = motion && !moving && !beingPetted && mood === 'sniff' && !settings.quiet;
        const bow = motion && !moving && !beingPetted && mood === 'play' && !settings.quiet;
        const affection = motion && beingPetted;
        const jump = motion && festive ? Math.max(0, Math.sin(t * 7.8 + index * 2.2)) * 23 : 0;
        const bob = moving ? -Math.abs(Math.sin(actor.step)) * 3.2 : breath * .9;
        const look = followsPointer ? clamp((pointer.x - actor.x) / 25, -4, 4) * actor.direction : Math.sin(t * .65 + index) * 2;
        const headAngle = sniff ? 23 + Math.sin(t * 9) * 2 : bow ? 14 : affection ? -10 + Math.sin(t * 5) * 4 : look + (settings.quiet ? 6 : 0);
        const headY = sniff ? 14 : bow ? 12 : affection ? -4 : breath * .9;
        const wag = motion ? Math.sin(t * (affection || festive ? 17 : index ? 8 : 11)) * (settings.quiet ? 5 : affection || festive ? 25 : 16) : 0;
        const ear = motion ? Math.sin(t * 4.4 + index) * 3 + (moving ? Math.sin(actor.step - .8) * 10 : 0) : 0;
        const blinkPhase = (t + index * 1.6) % (index ? 4.9 : 3.7);
        const blink = (motion && blinkPhase < .16) || (beingPetted && (!motion || (t % 1.6) < 1.1));
        actor.element.style.transform = `translate3d(${actor.x.toFixed(1)}px,0,0)`;
        actor.element.dataset.mood = beingPetted ? 'loved' : festive ? 'celebrating' : moving ? 'walking' : sniff ? 'sniffing' : 'watching';
        transform(actor, 'facing', `translate(120 0) scale(${actor.facing.toFixed(3)} 1) translate(-120 0)`);
        transform(actor, 'bounce', `translate(0 ${(bob - jump).toFixed(2)})`);
        transform(actor, 'body', `translate(112 150) scale(${1 + breath * .008} ${1 + breath * (settings.quiet ? .012 : .018)}) rotate(${bow ? 6 : sniff ? 2 : 0}) translate(-112 -150)`);
        transform(actor, 'tail', `rotate(${(-7 + wag).toFixed(2)} 58 129)`);
        transform(actor, 'near-back', `rotate(${gait.toFixed(2)} 84 121)`);
        transform(actor, 'far-back', `rotate(${(-gait).toFixed(2)} 84 118)`);
        transform(actor, 'near-front', `rotate(${(affection ? -24 + Math.sin(t * 7) * 12 : bow ? 21 : -gait).toFixed(2)} 165 121)`);
        transform(actor, 'far-front', `rotate(${(bow ? 17 : gait).toFixed(2)} 155 121)`);
        transform(actor, 'head', `translate(0 ${headY.toFixed(2)}) rotate(${headAngle.toFixed(2)} 156 102)`);
        transform(actor, 'near-ear', `rotate(${ear.toFixed(2)} 119 52)`);
        transform(actor, 'far-ear', `rotate(${(-ear * .7).toFixed(2)} 192 50)`);
        actor.parts['face-open'].setAttribute('opacity', blink ? '0' : '1');
        actor.parts['face-blink'].setAttribute('opacity', blink ? '1' : '0');
      });
      needsStaticFrame = false;
    };
    raf = requestAnimationFrame(frame);
    const timers = replyTimers.current;
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      visibility.disconnect();
      window.removeEventListener('pointermove', point);
      timers.forEach(clearTimeout);
    };
  }, []);

  return <div ref={container} className={`memory-pets${props.quiet ? ' memory-pets-reading' : ''}${props.reducedMotion ? ' memory-pets-still' : ''}`} aria-label="两只会走动、眨眼、摇尾巴的泰迪">
    <PetDrawing color="apricot" quiet={props.quiet} reply={replies[0]} onPet={() => pet(0)} elementRef={(element) => { dogElements.current[0] = element; }} />
    <PetDrawing color="cream" quiet={props.quiet} reply={replies[1]} onPet={() => pet(1)} elementRef={(element) => { dogElements.current[1] = element; }} />
  </div>;
}

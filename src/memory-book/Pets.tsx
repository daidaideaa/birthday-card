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
type Pose = { frame: number; x: number; jump: boolean };
type Beat = Partial<Pose> & { duration: number };
type DogActions = { pet: () => void; celebrate: () => void };

const SPRITES: Record<DogColor, string> = {
  apricot: assetUrl('memory-book/puppy-apricot.webp'),
  cream: assetUrl('memory-book/puppy-cream.webp'),
};

function Dog({ color, scene, quiet, reducedMotion, celebrate, awake, onPet }: PetsProps & { color: DogColor; awake: boolean }) {
  const [pose, setPose] = useState<Pose>({ frame: quiet ? 6 : 0, x: 0, jump: false });
  const [reply, setReply] = useState('');
  const actions = useRef<DogActions | null>(null);
  const previousScene = useRef(scene);
  const previousCelebration = useRef(celebrate);
  const onPetRef = useRef(onPet);
  onPetRef.current = onPet;

  useEffect(() => {
    let disposed = false;
    let sequence = 0;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const direction = color === 'apricot' ? 1 : -1;
    const restingX = ((scene % 2) * 12) * direction;
    const rest: Pose = { frame: quiet ? 6 : 0, x: restingX, jump: false };
    const changedScene = previousScene.current !== scene;
    previousScene.current = scene;

    const after = (callback: () => void, delay: number) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!disposed) callback();
      }, delay);
      timers.add(timer);
      return timer;
    };
    const cancelSequence = () => {
      sequence += 1;
      timers.forEach(clearTimeout);
      timers.clear();
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = undefined;
    };
    const settle = () => {
      if (disposed) return;
      setPose(rest);
      setReply('');
    };
    const scheduleIdle = () => {
      if (quiet || reducedMotion || !awake || disposed) return;
      idleTimer = after(() => {
        play(color === 'apricot'
          ? [{ frame: 1, duration: 1000 }, { frame: 0, duration: 280 }, { frame: 4, duration: 170 }]
          : [{ frame: 1, duration: 1450 }, { frame: 4, duration: 350 }]);
      }, (color === 'apricot' ? 11500 : 18500) + Math.random() * 4500);
    };
    const play = (beats: Beat[], message = '', delay = 0) => {
      if (!awake || disposed) return;
      cancelSequence();
      const currentSequence = sequence;
      setReply(message);
      let position: Pose = { ...rest };
      let time = delay;
      beats.forEach((beat) => {
        position = { ...position, ...beat };
        const nextPose = { frame: position.frame, x: position.x, jump: position.jump };
        after(() => {
          if (sequence === currentSequence) setPose(nextPose);
        }, time);
        time += beat.duration;
      });
      after(() => {
        if (sequence !== currentSequence) return;
        settle();
        scheduleIdle();
      }, time);
    };

    actions.current = {
      pet: () => {
        if (!awake) return;
        onPetRef.current?.();
        if (reducedMotion) {
          play([{ frame: 4, duration: 1800 }], color === 'apricot' ? '最喜欢你啦 ♡' : '在这里陪着你');
          return;
        }
        if (quiet) {
          play([{ frame: 4, duration: 1200 }, { frame: 6, duration: 400 }], '陪你慢慢读');
        } else if (color === 'apricot') {
          play([{ frame: 1, duration: 180 }, { frame: 4, duration: 950 }, { frame: 5, duration: 420 }, { frame: 0, duration: 300 }], '最喜欢你啦 ♡');
        } else {
          play([{ frame: 1, duration: 300 }, { frame: 4, duration: 1450 }], '在这里陪着你');
        }
      },
      celebrate: () => {
        if (reducedMotion || !awake) return;
        if (color === 'apricot') {
          play([
            { frame: 5, duration: 230 }, { frame: 7, jump: true, duration: 290 },
            { frame: 0, jump: false, duration: 210 }, { frame: 7, jump: true, duration: 260 },
            { frame: 4, jump: false, duration: 1150 },
          ], '愿望一定会听见 ♡');
        } else {
          play([{ frame: 1, duration: 450 }, { frame: 7, jump: true, duration: 290 }, { frame: 4, jump: false, duration: 1300 }], '生日快乐呀', 340);
        }
      },
    };

    settle();
    if (awake && !quiet && !reducedMotion) {
      if (changedScene) {
        play([
          { frame: 1, x: restingX - 18 * direction, duration: 260 },
          { frame: 2, x: restingX - 18 * direction, duration: 180 },
          { frame: 3, x: restingX - 12 * direction, duration: 180 },
          { frame: 2, x: restingX - 6 * direction, duration: 180 },
          { frame: 3, x: restingX, duration: 180 },
          { frame: 0, x: restingX, duration: 500 },
        ], '', color === 'apricot' ? 180 : 650);
      } else {
        scheduleIdle();
      }
    }
    return () => {
      disposed = true;
      cancelSequence();
      actions.current = null;
    };
  }, [scene, quiet, reducedMotion, awake, color]);

  useEffect(() => {
    if (celebrate !== previousCelebration.current) {
      previousCelebration.current = celebrate;
      if (celebrate > 0) actions.current?.celebrate();
    }
  }, [celebrate]);

  const column = pose.frame % 4;
  const row = Math.floor(pose.frame / 4);
  const walking = pose.frame === 2 || pose.frame === 3;
  return (
    <div className={`memory-pet memory-pet-${color}${quiet ? ' memory-pet-quiet' : ''}${pose.jump ? ' memory-pet-jumping' : ''}${walking ? ' memory-pet-walking' : ''}${reducedMotion ? ' memory-pet-still' : ''}`} style={{ transform: `translateX(${pose.x}px)` }}>
      {reply && <span className="memory-pet-reply" role="status">{reply}</span>}
      <span className="memory-pet-shadow" aria-hidden="true" />
      <button type="button" className="memory-pet-touch" aria-label={`摸摸${color === 'apricot' ? '杏色' : '奶油色'}泰迪`} onClick={() => actions.current?.pet()} title={`摸摸${color === 'apricot' ? '杏色' : '奶油色'}泰迪`}>
        <span className="memory-pet-drawing" aria-hidden="true" style={{ backgroundImage: `url("${SPRITES[color]}")`, backgroundPosition: `${column / 3 * 100}% ${row * 100}%` }} />
        <span className="memory-pet-touch-cue" aria-hidden="true">摸摸我</span>
      </button>
    </div>
  );
}

export default function Pets(props: PetsProps) {
  const container = useRef<HTMLDivElement>(null);
  const [awake, setAwake] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let visible = false;
    const update = () => setAwake(visible && !document.hidden);
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      update();
    }, { threshold: 0.05 });
    observer.observe(element);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return (
    <div ref={container} className={`memory-pets${props.quiet ? ' memory-pets-reading' : ''}`} aria-label="两只陪你看书的泰迪">
      <Dog {...props} color="apricot" awake={awake} />
      <Dog {...props} color="cream" awake={awake} />
    </div>
  );
}

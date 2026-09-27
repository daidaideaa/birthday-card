import { useEffect, useId, useRef, useState } from "react";
import "./savanna-story.css";

type Phase = "dawn" | "stars" | "return";
type Motion = "idle" | "approach" | "look" | "walk" | "journey" | "roar";
const chapters: { id: Phase; title: string; line: string }[] = [
  { id: "dawn", title: "有你在，清晨就很温暖", line: "小小的脚步，也有人温柔地等候。" },
  { id: "stars", title: "抬头，爱一直在", line: "有些温暖，会变成陪伴我们的星光。" },
  { id: "return", title: "带着勇气，重新出发", line: "愿你走向远方，也始终记得自己的光。" },
];

/** Original vector drawing: articulated limbs and face, not a film frame or a scaled cub. */
function Lion({ cub = false, spectral = false, roaring = false }: { cub?: boolean; spectral?: boolean; roaring?: boolean }) {
  return <g className={`savanna-lion ${cub ? "lion-cub" : "lion-adult"}`} opacity={spectral ? 0.22 : 1} stroke="#65432f" strokeWidth={cub ? 2.5 : 2} strokeLinejoin="round">
    <ellipse cx="112" cy="170" rx="94" ry="9" fill="#392a36" opacity=".22" stroke="none" />
    <path className="lion-tail" d="M48 95 C9 84 26 38 7 49 C-3 56 1 65 8 64" fill="none" stroke="#c58d48" strokeWidth="9" />
    <path d="M8 51 Q-5 47 0 69 Q15 66 12 53" fill="#684132" />
    <g className="lion-leg lion-leg--far" fill="#b67b3e"><path d="M75 104 Q92 110 85 135 L89 163 Q96 170 77 169 L67 127 Z"/><path d="M163 101 L170 144 L167 163 Q180 171 157 169 L149 125 Z"/></g>
    <path d="M41 94 C41 65 79 56 109 67 C137 57 167 57 180 83 L179 115 Q152 136 106 118 Q90 134 63 119 Z" fill={cub ? "#dda458" : "#d4a05b"} />
    <path d="M69 104 Q100 120 151 104 L173 111 Q150 135 108 119 Q89 132 71 117" fill="#f1c782" stroke="none" />
    <g className="lion-leg lion-leg--near" fill="#dfa65c"><path d="M57 103 Q84 101 82 126 L68 151 L69 163 Q85 174 53 170 L50 158 L58 133 Q40 123 57 103"/><path d="M146 104 Q162 100 163 121 L156 157 L162 163 Q179 173 145 171 L140 160 Z"/></g>
    {!cub && <path d="M150 97 C121 94 116 63 126 35 L123 23 L140 28 Q151 0 174 3 L186 0 L185 9 Q217 15 224 47 L232 59 L221 65 Q225 98 201 112 L182 125 L164 109 L149 113 Z" fill="#865035" />}
    <g className="lion-head" style={{ transform: roaring ? "rotate(-18deg)" : undefined }}>
      <path d={cub ? "M150 81 Q130 59 139 37 Q151 13 181 23 Q209 22 210 51 L221 68 Q218 85 199 89 L177 99 Z" : "M153 76 Q139 48 153 27 Q171 10 191 24 Q207 28 206 48 L222 61 L216 79 L198 91 L175 88 Z"} fill={cub ? "#e6b667" : "#dca75d"}/>
      <path d="M145 42 Q127 41 136 26 Q147 14 155 29" fill="#dfa75d"/><path d="M143 36 Q134 31 143 27" fill="#875542" stroke="none"/>
      <path d="M175 55 Q187 46 201 57 L206 65 L219 65 Q224 80 207 85 Q187 95 177 79" fill="#f6d8a0" stroke="none"/>
      <path d="M199 57 Q211 54 219 62 L211 70 L202 67 Z" fill="#623d32" />
      <path d="M169 44 Q179 40 188 45" fill="none" strokeWidth="3"/>
      <path className="lion-eye" d="M169 49 Q178 43 187 49 Q179 56 172 53 Z" fill="#fff0c9"/>
      <ellipse className="lion-pupil" cx="180" cy="49" rx="3.2" ry="4" fill="#38302b" stroke="none"/>
      {roaring ? <g><path d="M194 74 Q205 98 217 76 Q210 108 194 89 Z" fill="#58312e"/><path d="M199 91 Q207 85 212 94" fill="#ca8076" stroke="none"/></g> : <path d="M193 76 Q200 84 211 77" fill="none" strokeWidth="1.8"/>}
      <path d="M188 73 L174 70 M188 78 L172 79" fill="none" strokeWidth="1" opacity=".55"/>
    </g>
    <path d="M53 165 L53 170 M61 165 L61 170 M149 166 L149 171 M156 166 L156 171" fill="none" strokeWidth="1" />
  </g>;
}

export function SavannaStory({ onRoar, onComplete }: { onRoar: () => void; onComplete: () => void }) {
  const id = useId().replaceAll(":", "");
  const host = useRef<HTMLElement>(null);
  const traveller = useRef<SVGGElement>(null);
  const position = useRef(0);
  const [phase, setPhase] = useState<Phase>("dawn");
  const [motion, setMotion] = useState<Motion>("idle");
  const [active, setActive] = useState(true);
  const [arrived, setArrived] = useState(false);
  const [stars, setStars] = useState<number[]>([]);
  const [roaring, setRoaring] = useState(false);
  const sound = useRef(onRoar);
  sound.current = onRoar;
  const chapter = chapters.find(c => c.id === phase)!;
  useEffect(() => {
    let visible = true;
    let focused = true;
    const sync = () => {
      const enabled = visible && focused && !document.hidden;
      setActive(enabled);
      if (!enabled) { setMotion("idle"); setRoaring(false); }
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    if (host.current) observer.observe(host.current);
    const blur = () => { focused = false; sync(); };
    const focus = () => { focused = true; sync(); };
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); window.removeEventListener("blur", blur); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", sync); };
  }, []);
  useEffect(() => {
    if (!active || motion === "idle") return;
    let raf = 0, previous = 0, elapsed = 0, sounded = false;
    const tick = (now: number) => {
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now; elapsed += dt;
      if (motion === "walk" || motion === "journey") {
        position.current = Math.min(1, position.current + dt / 4);
        traveller.current?.setAttribute("transform", `translate(${80 + position.current * 310} 430) scale(1.2)`);
        if (host.current) host.current.dataset.progress = position.current.toFixed(4);
        if (position.current === 1) { setArrived(true); setMotion("idle"); return; }
      } else if (motion === "roar") {
        if (elapsed > 0.4 && !sounded) { sounded = true; setRoaring(true); sound.current(); }
        if (elapsed > 1.7) setRoaring(false);
        if (elapsed > 2.1) { setMotion("idle"); return; }
      } else if (elapsed > 1.8) { setMotion("idle"); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [motion, active]);
  const select = (next: Phase) => { setMotion("idle"); setRoaring(false); setPhase(next); };
  const stop = () => setMotion(old => old === "walk" ? "idle" : old);
  return <section ref={host} className={`savanna-story savanna-${phase}`} data-motion={motion} data-active={active} data-navigation-lock aria-label="草原绘本：清晨、星空与归来">
    <div className="savanna-heading"><span>草原来信</span><span>0{chapters.findIndex(c => c.id === phase) + 1} / 03</span></div>
    <div className="savanna-frame">
      <svg viewBox="0 0 800 760" role="img" aria-label={chapter.title} className="savanna-art">
        <defs>
          <linearGradient id={`${id}sky`} x2="0" y2="1"><stop stopColor={phase === "stars" ? "#1c2548" : "#bc7365"}/><stop offset=".62" stopColor={phase === "stars" ? "#555277" : "#f0c98d"}/><stop offset="1" stopColor="#c19065"/></linearGradient>
          <linearGradient id={`${id}rock`} x2=".5" y2="1"><stop stopColor="#e1b282"/><stop offset="1" stopColor="#75554d"/></linearGradient>
        </defs>
        <rect width="800" height="760" fill={`url(#${id}sky)`}/>
        <circle cx="600" cy="184" r={phase === "stars" ? 40 : 73} fill="#fff0c5" opacity=".85"/>
        <path d="M0 360 L82 326 147 336 233 293 277 321 338 291 437 326 492 304 591 340 706 288 800 324 V760 H0Z" fill="#737083" opacity=".68"/>
        <path d="M0 418 Q167 345 330 412 T800 401 V760 H0Z" fill="#928777"/>
        <path d="M0 496 Q185 423 412 461 T800 465 V760 H0Z" fill="#bc976a"/>
        <path d="M550 448 Q479 482 440 499 T266 540 Q425 532 522 490Z" fill="#e6c5a0" opacity=".65"/>
        <g fill="#5d5d50"><path d="M87 436 L94 338 98 436Z"/><path d="M32 342 Q13 320 66 314 Q77 283 108 310 Q153 307 158 333 Q117 354 32 342Z"/><path d="M700 451 L705 376 710 451Z"/><path d="M658 379 Q652 360 689 358 Q706 338 727 359 Q766 356 770 377 Q713 391 658 379Z"/></g>
        <path d="M0 689 Q128 605 284 628 L425 603 L479 573 L692 581 L735 603 L650 631 L604 681 L592 760 H0Z" fill={`url(#${id}rock)`}/>
        <path d="M426 603 L484 587 L685 591 L649 610 L603 618Z" fill="#ebc595"/><path d="M606 630 L592 712 M475 620 L438 705 M158 661 L105 739" stroke="#76554c" strokeWidth="4" fill="none" opacity=".55"/>
        {phase === "dawn" && <>
          <g transform="translate(292 392) scale(1.2)"><Lion/></g>
          <g className={`savanna-cub ${motion === "approach" ? "is-nuzzling" : ""} ${motion === "look" ? "is-looking" : ""}`} transform="translate(238 501) scale(.62)"><Lion cub/></g>
        </>}
        {phase === "stars" && <><g transform="translate(345 92) scale(1.05)"><Lion spectral/></g><g transform="translate(315 500) scale(.65)"><Lion cub/></g></>}
        {phase === "return" && <g ref={traveller} transform={`translate(${80 + position.current * 310} 430) scale(1.2)`}><Lion roaring={roaring}/></g>}
        <g stroke="#615c4d" strokeWidth="3" fill="none" opacity=".75"><path d="M28 760 Q52 688 33 646 M28 760 Q62 701 90 696 M28 760 Q21 709 3 689 M748 760 Q720 684 732 664 M748 760 Q772 689 796 681 M748 760 Q765 720 799 713"/></g>
      </svg>
      {phase === "dawn" && <button className="savanna-cub-target" aria-label="轻轻招呼幼狮" onClick={() => setMotion("approach")}><span>来，靠近一点</span></button>}
      {phase === "stars" && <div className="savanna-star-controls">{[[19,19],[33,10],[47,22],[72,13],[81,32]].map(([x,y], i) => <button key={i} style={{left:`${x}%`,top:`${y}%`}} aria-label={`点亮第${i+1}颗星`} aria-pressed={stars.includes(i)} onClick={() => setStars(old => old.includes(i) ? old : [...old,i])}>✧</button>)}</div>}
      {phase === "return" && <button className="savanna-destination" onClick={() => setMotion("journey")} aria-label="走到阳光下的岩台">向着光 ↗</button>}
      <div className="savanna-caption" aria-live="polite"><h3>{chapter.title}</h3><p>{phase === "stars" && stars.length >= 3 ? "星光亮起来了。你从来不是独自前行。" : chapter.line}</p></div>
    </div>
    <div className="savanna-actions">
      {phase === "dawn" && <button onClick={() => setMotion("look")}>一起看看远方</button>}
      {phase === "stars" && <p role="status">轻点星光，让夜空慢慢亮起来 · {stars.length}/5</p>}
      {phase === "return" && <>
        <button onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setMotion("walk"); }} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); setMotion("walk"); } }} onKeyUp={stop} onBlur={stop} disabled={arrived}>按住，向前走</button>
        <button disabled={motion === "roar"} onClick={() => setMotion("roar")}>勇敢地吼一声</button>
      </>}
    </div>
    <nav className="savanna-chapters" aria-label="草原故事段落">{chapters.map((c,i) => <button key={c.id} aria-current={phase === c.id ? "step" : undefined} onClick={() => select(c.id)}><span>0{i+1}</span>{["清晨", "星空", "归来"][i]}</button>)}</nav>
    <button className="text-button wish-film-skip" onClick={phase === "dawn" ? () => select("stars") : phase === "stars" ? () => select("return") : onComplete}>{phase === "return" ? "把这份勇气，带进生日愿望 →" : "翻到下一幕 →"}</button>
  </section>;
}

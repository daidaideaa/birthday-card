import { useEffect, useRef, useState } from "react";

export function MagicWand({
  onCast,
  active,
}: {
  onCast: () => void;
  active: boolean;
}) {
  const [casting, setCasting] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className={"wand-scene " + (casting || active ? "wand-lit" : "")}>
      <svg className="wand-trail" viewBox="0 0 500 300" aria-hidden="true">
        <path d="M60 260 C120 80 350 290 410 115 S310 20 245 105" />
        <circle cx="245" cy="105" r="4" />
      </svg>
      <button
        className="magic-wand"
        aria-label="挥动魔杖，点亮贺卡"
        onClick={() => {
          setCasting(true);
          onCast();
          clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setCasting(false), 2200);
        }}
      >
        <span className="wand-stick" />
        <span className="wand-tip" />
        <span className="wand-label">挥一下，施个小魔法</span>
      </button>
    </div>
  );
}

export function PianoDance({ onPlay }: { onPlay: (note?: number) => void }) {
  const [dancing, setDancing] = useState(false);
  const [pressed, setPressed] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const keyTimer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(keyTimer.current);
    },
    [],
  );
  const play = (note?: number) => {
    onPlay(note);
    setDancing(true);
    setPressed(note ?? null);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDancing(false), 9000);
    clearTimeout(keyTimer.current);
    keyTimer.current = window.setTimeout(() => setPressed(null), 250);
  };
  return (
    <aside
      className={"piano-nook " + (dancing ? "is-dancing" : "")}
      aria-label="星光下的钢琴与舞步"
    >
      <div className="piano-night">
        <span className="piano-moon" />
        <svg viewBox="0 0 320 210" className="dance-scene" aria-hidden="true">
          <g className="city-silhouette" fill="currentColor">
            <path d="M0 174V147h12v15h9v-26h16v33h13v-20h22v24h33v-19h15v20h70v-25h19v22h18v-33h15v31h19v-15h13v20h18v-40h16v41h12v35H0Z" />
          </g>
          <path className="dance-ground" d="M25 185H300" />
          <g className="streetlamp">
            <path d="M61 180V39M45 43Q61 13 77 43ZM49 45H73L70 66H52Z" />
            <circle cx="61" cy="50" r="18" className="lamp-glow" />
          </g>
          <g className="dancers">
            <g className="dancer dancer-one">
              <circle cx="165" cy="84" r="9" />
              <path d="M162 95L157 124L179 138L170 105Z" />
              <path
                className="dance-limb"
                d="M162 102L142 117L131 104M170 105L185 112L200 96M163 124L151 151L126 170M175 135L185 158L208 165"
              />
            </g>
            <g className="dancer dancer-two">
              <circle cx="211" cy="91" r="8" />
              <path
                className="dance-dress"
                d="M209 101L202 122Q190 139 188 151Q210 162 230 144L215 120L217 103Z"
              />
              <path
                className="dance-limb"
                d="M208 105L197 101L191 82M217 108L239 105L251 88M204 151L205 170L219 177M218 152L236 164L259 150"
              />
            </g>
          </g>
          <g className="grand-piano">
            <path d="M24 150H103Q104 131 82 129L42 124L24 130Z" />
            <path d="M24 149V158H98V152M30 156L26 184M91 156L95 184M45 124L94 104L101 126Z" />
          </g>
        </svg>
      </div>
      <div className="piano-keys" aria-label="小钢琴" data-navigation-lock>
        {[60, 62, 64, 65, 67, 69, 71, 72].map((note, i) => (
          <button
            key={note}
            className={pressed === note ? "pressed" : ""}
            onClick={() => play(note)}
            aria-label={
              "弹奏 " + ["哆", "来", "咪", "发", "嗦", "拉", "西", "高音哆"][i]
            }
          >
            <span>{["C", "D", "E", "F", "G", "A", "B", "C"][i]}</span>
          </button>
        ))}
        {[0, 1, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="black-key"
            style={{ left: (i + 1) * 12.5 - 3.4 + "%" }}
            aria-hidden="true"
          />
        ))}
      </div>
      <button className="piano-play" onClick={() => play()}>
        {dancing ? "♫ 星光正在跳舞" : "♫ 弹一段小夜曲"}
      </button>
      <p>愿我们都能，跳自己的舞。</p>
    </aside>
  );
}

export function SavannaLife({ onRoar }: { onRoar: () => void }) {
  const [roaring, setRoaring] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className={"savanna-life " + (roaring ? "lion-roaring" : "")}>
      <svg className="pride-rock" viewBox="0 0 460 220" aria-hidden="true">
        <path d="M0 218L100 151L167 141L228 94L185 72L353 42L298 117L353 217Z" />
        <path className="rock-lit" d="M167 141L228 94L185 72L353 42L272 93Z" />
        <path
          className="rock-shade"
          d="M228 94L272 93L298 117L353 217L227 217Z"
        />
      </svg>
      <button
        className="lion-crossing"
        onClick={() => {
          if (roaring) return;
          onRoar();
          setRoaring(true);
          clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setRoaring(false), 1500);
        }}
        aria-label="听狮子的回应"
      >
        <svg viewBox="0 0 220 150" className="lion-form" aria-hidden="true">
          <path className="lion-tail" d="M64 70Q19 51 17 83Q14 106 4 96" />
          <path
            className="lion-body"
            d="M49 62Q92 52 136 65L149 79L135 101Q103 93 78 99L47 85Z"
          />
          <g className="lion-leg back-leg">
            <path d="M61 81L53 113L29 130L25 138L52 138L67 119L82 92Z" />
          </g>
          <g className="lion-leg front-leg">
            <path d="M125 85L127 119L111 132L111 138H140L145 104L143 83Z" />
          </g>
          <g className="lion-leg back-leg second">
            <path d="M71 88L83 119L72 133L75 138H96L99 119L84 86Z" />
          </g>
          <g className="lion-leg front-leg second">
            <path d="M140 88L157 117L149 132L151 138H172L174 115L155 84Z" />
          </g>
          <g className="lion-head">
            <path
              className="lion-mane"
              d="M124 56L131 34L151 22L172 23L189 43L184 67L173 90L152 108L127 89L120 72Z"
            />
            <path
              className="lion-face"
              d="M159 39L180 43L186 52L204 56L204 66L188 70L177 84L161 73Z"
            />
            <path className="lion-jaw" d="M176 69L197 68L199 77L184 81Z" />
            <circle cx="180" cy="51" r="2.1" className="lion-eye" />
          </g>
        </svg>
        <span className="lion-hint">
          {roaring ? "把勇气，送给你。" : "听听它的生日祝福"}
        </span>
      </button>
      <div className="roar-rings" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

import * as THREE from "three";
import { story } from "../content/story";

type Face = "cover" | "inside" | "message" | "back";
const WIDTH = 1760;
const HEIGHT = 1240;

export function createArtwork(face: Face) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const c = canvas.getContext("2d")!;
  const dark = face === "cover" || face === "back";
  const field = c.createRadialGradient(770, 430, 80, 880, 620, 1080);
  field.addColorStop(0, dark ? "#50252f" : "#fff9e9");
  field.addColorStop(0.6, dark ? "#30151f" : "#f9efdc");
  field.addColorStop(1, dark ? "#140f1a" : "#e7d4b4");
  c.fillStyle = field;
  c.fillRect(0, 0, WIDTH, HEIGHT);

  // Fine deterministic fibres keep the surface tactile at close range.
  let seed = 17;
  for (let i = 0; i < 34000; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = seed % WIDTH;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = seed % HEIGHT;
    c.fillStyle = dark
      ? i % 2
        ? "rgba(235,174,155,.027)"
        : "rgba(0,0,0,.06)"
      : i % 2
        ? "rgba(129,94,58,.035)"
        : "rgba(255,255,255,.24)";
    c.fillRect(x, y, 1 + (i % 3), 1);
  }
  const gold = c.createLinearGradient(280, 80, 1400, 1200);
  gold.addColorStop(0, "#94703d");
  gold.addColorStop(0.28, "#f5dba0");
  gold.addColorStop(0.48, "#bd9357");
  gold.addColorStop(0.7, "#f7e5b4");
  gold.addColorStop(1, "#957242");
  const ink = dark ? gold : "#7e5c38";
  const text = (
    s: string,
    y: number,
    size: number,
    color: string | CanvasGradient = ink,
  ) => {
    c.fillStyle = color;
    c.textAlign = "center";
    c.font = `${size}px "Birthday Serif", serif`;
    c.fillText(s, WIDTH / 2, y);
  };
  const star = (x: number, y: number, r: number, opacity = 1) => {
    c.save();
    c.globalAlpha = opacity;
    c.translate(x, y);
    c.fillStyle = ink;
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const rr = i % 2 ? r * 0.18 : r;
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
    c.restore();
  };
  const line = (points: number[][], alpha = 1) => {
    c.save();
    c.globalAlpha = alpha;
    c.strokeStyle = ink;
    c.lineWidth = 1.7;
    c.beginPath();
    points.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
    c.stroke();
    c.restore();
  };
  c.strokeStyle = ink;
  c.lineWidth = 2;
  c.strokeRect(58, 58, WIDTH - 116, HEIGHT - 116);
  c.globalAlpha = 0.45;
  c.lineWidth = 1;
  c.strokeRect(74, 74, WIDTH - 148, HEIGHT - 148);
  c.globalAlpha = 1;

  // Engraved botanical corners, drawn into the stock rather than pasted on.
  for (const [x, y, sx, sy] of [
    [108, 108, 1, 1],
    [1652, 108, -1, 1],
    [108, 1132, 1, -1],
    [1652, 1132, -1, -1],
  ]) {
    c.save();
    c.translate(x, y);
    c.scale(sx, sy);
    c.strokeStyle = ink;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, 168);
    c.bezierCurveTo(0, 65, 26, 22, 165, 0);
    c.stroke();
    for (let i = 0; i < 5; i++) {
      const t = i * 21;
      c.beginPath();
      c.ellipse(14 + t, 91 - t * 0.62, 19, 5.5, -0.82, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
  }

  if (face === "cover") {
    // A celestial seal leaves the typography as the unmistakable focal point.
    c.strokeStyle = gold;
    c.lineWidth = 2.1;
    for (const radius of [77, 92]) {
      c.beginPath();
      c.arc(880, 248, radius, 0, Math.PI * 2);
      c.stroke();
    }
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const inner = i % 4 ? 99 : 101;
      const outer = i % 4 ? 106 : 117;
      line(
        [
          [880 + Math.cos(a) * inner, 248 + Math.sin(a) * inner],
          [880 + Math.cos(a) * outer, 248 + Math.sin(a) * outer],
        ],
        0.65,
      );
    }
    star(880, 248, 54);
    star(825, 213, 9);
    star(925, 286, 8);
    line(
      [
        [370, 247],
        [676, 247],
      ],
      0.4,
    );
    line(
      [
        [1084, 247],
        [1390, 247],
      ],
      0.4,
    );
    star(358, 247, 9);
    star(1402, 247, 9);
    text(story.person.name, 590, 174, gold);
    text("生日快乐", 768, 100, gold);
    line(
      [
        [664, 860],
        [835, 860],
      ],
      0.6,
    );
    line(
      [
        [925, 860],
        [1096, 860],
      ],
      0.6,
    );
    star(880, 860, 15);
    text("爱与魔法，都送给你", 994, 36, "#d4b783");
    text("愿你的每一个明天，都闪闪发光", 1071, 27, "#a88a71");
    // Small constellations along the margins frame the words.
    for (const [x, y, r] of [
      [249, 411, 9],
      [308, 521, 4],
      [220, 663, 14],
      [337, 788, 6],
      [1498, 413, 13],
      [1420, 563, 5],
      [1515, 701, 8],
      [1437, 842, 11],
    ])
      star(x, y, r, 0.8);
    line(
      [
        [249, 411],
        [308, 521],
        [220, 663],
        [337, 788],
      ],
      0.17,
    );
    line(
      [
        [1498, 413],
        [1420, 563],
        [1515, 701],
        [1437, 842],
      ],
      0.17,
    );
  } else if (face === "message") {
    text("亲爱的" + story.person.name, 224, 65, "#775446");
    text("生日快乐。", 400, 130, "#683b40");
    star(880, 479, 17);
    [
      "愿你心里有光，眼里有星。",
      "愿每一个小小的心愿，",
      "都在未来的某天悄悄实现。",
    ].forEach((s, i) => text(s, 588 + i * 70, 53, "#62483c"));
    ["愿你一直勇敢，", "也一直被爱。"].forEach((s, i) =>
      text(s, 844 + i * 68, 54, "#62483c"),
    );
    text("爱与魔法，都送给你。", 1066, 48, "#9c7548");
  } else if (face === "inside") {
    c.strokeStyle = "#b5945d";
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(880, 403, 112, 0, Math.PI * 2);
    c.stroke();
    star(880, 403, 49);
    text("许个愿吧。", 742, 148, "#8b6944");
    text("今 天 ， 星 光 为 你 而 来", 891, 34, "#a38b68");
  } else {
    star(880, 445, 38);
    text("只为" + story.person.name + "，认真准备。", 679, 62);
    text("愿你一直被爱", 798, 32, "#c1a67a");
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

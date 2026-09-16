import * as THREE from "three";
type Face = "cover" | "inside" | "message" | "back";
export function createArtwork(face: Face) {
  const canvas = document.createElement("canvas");
  canvas.width = 1760;
  canvas.height = 1240;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#fff5e3";
  c.fillRect(0, 0, 1760, 1240);
  // Fine, deterministic cotton-paper flecks; never a downloaded image.
  let seed = 17;
  for (let i = 0; i < 24000; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = seed % 1760;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = seed % 1240;
    c.fillStyle = i % 2 ? "rgba(129,94,58,.025)" : "rgba(255,255,255,.18)";
    c.fillRect(x, y, 1.5, 1.5);
  }
  c.strokeStyle = "#b99a65";
  c.lineWidth = 2;
  c.strokeRect(55, 55, 1650, 1130);
  c.strokeStyle = "rgba(185,154,101,.35)";
  c.strokeRect(68, 68, 1624, 1104);
  const text = (
    s: string,
    y: number,
    size: number,
    color = "#493033",
    family = "Georgia",
  ) => {
    c.fillStyle = color;
    c.textAlign = "center";
    c.font = `${size}px ${family}`;
    c.fillText(s, 880, y);
  };
  const star = (x: number, y: number, r: number) => {
    c.save();
    c.translate(x, y);
    c.fillStyle = "#be9a58";
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const rr = i % 2 ? r * 0.25 : r;
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
    c.restore();
  };
  if (face === "cover") {
    text("F O R   Y O U ,   H A N", 188, 30, "#957950");
    text(
      "A little birthday magic",
      330,
      100,
      "#755353",
      '"Parisienne", cursive',
    );
    // Layered patisserie illustration, with soft painted shading and piped icing.
    c.save();
    c.translate(880, 720);
    c.fillStyle = "rgba(117,77,66,.10)";
    c.beginPath();
    c.ellipse(0, 233, 345, 28, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#d1b282";
    c.beginPath();
    c.ellipse(0, 218, 329, 30, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#e5d7ed";
    c.beginPath();
    c.ellipse(0, 209, 317, 26, 0, 0, Math.PI * 2);
    c.fill();
    const layer = (
      x: number,
      y: number,
      w: number,
      h: number,
      color: string,
    ) => {
      const g = c.createLinearGradient(x, y, x + w, y);
      g.addColorStop(0, color);
      g.addColorStop(0.55, color);
      g.addColorStop(1, "#c88391");
      c.fillStyle = g;
      c.beginPath();
      c.roundRect(x, y, w, h, 20);
      c.fill();
      c.strokeStyle = "rgba(255,242,219,.85)";
      c.lineWidth = 14;
      c.beginPath();
      c.moveTo(x + 8, y + h * 0.58);
      c.lineTo(x + w - 8, y + h * 0.58);
      c.stroke();
      c.fillStyle = "#fff0d7";
      c.beginPath();
      c.moveTo(x, y + 14);
      c.bezierCurveTo(x, y - 22, x + w, y - 22, x + w, y + 14);
      c.lineTo(x + w, y + 44);
      for (let j = 0; j < 10; j++) {
        const xx = x + w - (j * w) / 10;
        c.quadraticCurveTo(
          xx - w / 20,
          y + 86 + (j % 3) * 7,
          xx - w / 10,
          y + 44,
        );
      }
      c.closePath();
      c.fill();
      c.fillStyle = "#fff8e9";
      c.beginPath();
      c.ellipse(x + w / 2, y + 9, w / 2, 25, 0, 0, Math.PI * 2);
      c.fill();
    };
    layer(-274, 40, 548, 170, "#e9a8b0");
    layer(-204, -95, 408, 146, "#d9c5e6");
    const colors = ["#97b6c6", "#dd939e", "#c4a1cb", "#c8ad70", "#8aafbb"];
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 65,
        y = -211 - (i % 2) * 18;
      c.fillStyle = colors[i];
      c.beginPath();
      c.roundRect(x - 9, y, 18, -90 - y, 4);
      c.fill();
      c.strokeStyle = "#fff2de";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x - 8, y + 22);
      c.lineTo(x + 8, y + 10);
      c.stroke();
      c.fillStyle = "#ddb56d";
      c.beginPath();
      c.moveTo(x, y - 43);
      c.bezierCurveTo(x - 23, y - 17, x - 10, y - 4, x, y - 5);
      c.bezierCurveTo(x + 16, y - 6, x + 14, y - 22, x, y - 43);
      c.fill();
      c.fillStyle = "#fff1ba";
      c.beginPath();
      c.ellipse(x, y - 18, 5, 9, 0, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 13; i++) {
      c.fillStyle = i % 2 ? "#d27b8b" : "#e8b4ba";
      c.beginPath();
      c.arc(-250 + i * 42, 200, 9, 0, Math.PI * 2);
      c.fill();
    }
    for (const [x, y] of [
      [-180, 0],
      [165, -6],
      [-243, 131],
      [221, 130],
    ]) {
      c.fillStyle = "#ce7586";
      c.beginPath();
      c.ellipse(x, y, 14, 20, 0.3, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#799e8e";
      c.beginPath();
      c.ellipse(x + 6, y - 18, 12, 4, -0.5, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    for (const [x, y, r] of [
      [390, 590, 19],
      [1310, 536, 24],
      [1410, 833, 17],
      [426, 883, 13],
      [1150, 410, 13],
    ])
      star(x, y, r);
    for (let i = 0; i < 18; i++) {
      const x = 310 + ((i * 173) % 1150),
        y = 440 + ((i * 89) % 500);
      c.fillStyle = ["#d3a0af", "#b6bfce", "#ceb587"][i % 3];
      c.beginPath();
      c.arc(x, y, 3 + (i % 3), 0, Math.PI * 2);
      c.fill();
    }
    text("A little surprise for you", 1080, 34, "#997e68", "Georgia");
  } else if (face === "message") {
    text("Dear Han,", 235, 68, "#8f6461", '"Parisienne", cursive');
    text("Happy Birthday!", 405, 130, "#7b4c50", '"Parisienne", cursive');
    star(880, 483, 15);
    [
      "May your day be filled with laughter,",
      "your heart with love,",
      "and the year ahead with wonderful little surprises.",
    ].forEach((s, i) => text(s, 590 + i * 68, 56));
    ["Here’s to you,", "and all the beautiful moments yet to come."].forEach(
      (s, i) => text(s, 843 + i * 64, 56),
    );
    text("With love ♥", 1060, 56, "#a17b52", '"Parisienne", cursive');
  } else if (face === "inside") {
    star(880, 380, 29);
    text("Make a wish.", 650, 155, "#937352", '"Parisienne", cursive');
    text("T H I S   M O M E N T   I S   Y O U R S", 810, 25, "#a58b6c");
  } else {
    text(
      "Made with love, for Han.",
      690,
      65,
      "#a58b6c",
      '"Parisienne", cursive',
    );
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

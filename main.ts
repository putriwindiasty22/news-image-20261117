// news-image-20261117 — "The World Today", a front page for Tuesday 17 November 2026.
// Draws a 1024x1024 PNG newspaper front page with a stdlib-only 5x7 bitmap font.
// Fully deterministic: fixed zlib level, no timestamps, no randomness, no network.
import * as fs from "node:fs";
import * as zlib from "node:zlib";
import * as path from "node:path";

const W = 1024;
const H = 1024;
const PAPER = [246, 241, 227, 255];
const PANEL = [253, 251, 242, 255];
const INK = [20, 20, 20, 255];
const SOFT = [58, 54, 46, 255];
const RED = [169, 31, 31, 255];
const BLUE = [31, 74, 138, 255];
const SKY = [214, 228, 240, 255];
const SEA = [96, 140, 178, 255];

// ---------------------------------------------------------------- PNG encoder
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function encodePNG(rgba, w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // filter: none
    Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (1 + w * 4) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows, each a 5-bit number (bit 4 = leftmost pixel).
const FONT = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "-": [0, 0, 0, 0x0e, 0, 0, 0],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  '"': [0x0a, 0x0a, 0, 0, 0, 0, 0],
  "+": [0, 0x04, 0x04, 0x0e, 0x04, 0x04, 0],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
};

// ---------------------------------------------------------------- canvas
const buf = new Uint8Array(W * H * 4);
function px(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
  buf[i + 3] = c[3];
}
function fillRect(x, y, w, h, c) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j, c);
}
function hline(x, y, w, c, th = 1) {
  fillRect(x, y, w, th, c);
}
function vline(x, y, h, c, th = 1) {
  fillRect(x, y, th, h, c);
}
function rect(x, y, w, h, c, th = 1) {
  hline(x, y, w, c, th);
  hline(x, y + h - th, w, c, th);
  vline(x, y, h, c, th);
  vline(x + w - th, y, h, c, th);
}
function line(x0, y0, x1, y1, c, th = 1) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  for (;;) {
    fillRect(x - Math.floor(th / 2), y - Math.floor(th / 2), th, th, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}
function circle(cx, cy, r, c, filled) {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = x * x + y * y;
      if (filled ? d <= r * r : d <= r * r && d >= (r - 1) * (r - 1)) px(cx + x, cy + y, c);
    }
  }
}
function textWidth(s, scale) {
  return s.length * 6 * scale - scale;
}
function drawText(x, y, s, scale, c) {
  let cx = x;
  for (const ch of s) {
    const g = FONT[ch] || FONT["?"];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r] & (1 << (4 - col))) {
          fillRect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}
function drawTextCentered(x, y, w, s, scale, c) {
  drawText(x + Math.floor((w - textWidth(s, scale)) / 2), y, s, scale, c);
}
function wrap(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------- pictograms
function drawBridge(x, y, w, h) {
  // sky + sea
  fillRect(x, y, w, Math.floor(h * 0.62), SKY);
  fillRect(x, y + Math.floor(h * 0.62), w, h - Math.floor(h * 0.62), SEA);
  const waterY = y + Math.floor(h * 0.62);
  // deck
  const deckY = y + Math.floor(h * 0.55);
  fillRect(x + 8, deckY, w - 16, 6, INK);
  // towers
  const t1 = x + Math.floor(w * 0.28);
  const t2 = x + Math.floor(w * 0.72);
  fillRect(t1 - 4, y + 14, 8, deckY - y - 14, INK);
  fillRect(t2 - 4, y + 14, 8, deckY - y - 14, INK);
  // main cable
  line(x + 8, deckY, t1, y + 16, INK, 2);
  line(t1, y + 16, t2, y + 16, INK, 2);
  line(t2, y + 16, x + w - 8, deckY, INK, 2);
  // suspenders
  for (let i = 1; i <= 4; i++) {
    const sx = t1 + Math.floor(((t2 - t1) * i) / 5);
    const sy = y + 16 + Math.floor((deckY - y - 16) * 0.35);
    line(sx, sy, sx, deckY, INK, 1);
  }
  // deck, broken: a clear gap near the right tower with tilted ends
  const gapX = t2 + 18;
  fillRect(x + 8, deckY, gapX - (x + 8), 6, INK);
  fillRect(gapX + 30, deckY, x + w - 8 - (gapX + 30), 6, INK);
  line(gapX, deckY + 3, gapX + 12, deckY + 18, INK, 3);
  line(gapX + 30, deckY + 3, gapX + 18, deckY + 18, INK, 3);
  // blast burst above the gap, with smoke puffs
  const bx2 = gapX + 15;
  const by2 = deckY - 16;
  circle(bx2, by2, 15, RED, true);
  circle(bx2, by2, 10, [255, 140, 40, 255], true);
  circle(bx2, by2, 5, [255, 220, 120, 255], true);
  circle(bx2 - 16, by2 - 12, 6, SOFT, true);
  circle(bx2 + 16, by2 - 14, 7, SOFT, true);
  // waves
  for (let i = 0; i < 4; i++) {
    line(x + 10 + i * 52, waterY + 14, x + 30 + i * 52, waterY + 14, [255, 255, 255, 255], 2);
  }
}
function drawTanker(x, y, s) {
  // s = box size (~64)
  const bx = x + 4;
  const by = y + s - 26;
  fillRect(bx, by, s - 8, 14, INK); // hull
  fillRect(bx + 6, by - 10, 14, 10, INK); // bridge block
  fillRect(bx + s - 26, by - 16, 10, 16, RED); // funnel
  line(bx + 12, by - 10, bx + 12, by - 22, INK, 2);
  // smoke + flame
  circle(bx + 26, by - 26, 6, RED, true);
  circle(bx + 26, by - 26, 3, [255, 220, 120, 255], true);
  circle(bx + 40, by - 30, 5, SOFT, true);
  // sea
  hline(x + 2, y + s - 10, s - 4, BLUE, 2);
  hline(x + 10, y + s - 5, s - 20, BLUE, 2);
}
function drawRadar(x, y, s) {
  const cx = x + Math.floor(s / 2);
  const cy = y + Math.floor(s / 2) + 4;
  circle(cx, cy, 22, INK, false);
  circle(cx, cy, 14, INK, false);
  circle(cx, cy, 3, RED, true);
  line(cx, cy, cx + 18, cy - 12, RED, 2); // sweep
  line(cx, cy - 22, cx + 8, cy - 22, INK, 3); // dish
  line(cx, cy, cx - 8, cy + 20, INK, 3); // mast
  line(cx - 14, cy + 20, cx + 14, cy + 20, INK, 3); // base
}
function drawFlags(x, y, s) {
  // three small flags on poles: China (red + yellow star), USA (stripes + canton),
  // Russia (white-blue-red bands)
  const poles = [x + 10, x + Math.floor(s / 2), x + s - 12];
  for (let p = 0; p < 3; p++) {
    const fx = poles[p];
    const fy = y + 8;
    vline(fx, fy, 40, INK, 2);
    if (p === 0) {
      fillRect(fx + 2, fy, 16, 21, RED);
      fillRect(fx + 5, fy + 4, 5, 5, [255, 220, 60, 255]);
    } else if (p === 1) {
      for (let b = 0; b < 7; b++) {
        fillRect(fx + 2, fy + b * 3, 16, 3, b % 2 ? [255, 255, 255, 255] : RED);
      }
      fillRect(fx + 2, fy, 8, 9, BLUE);
    } else {
      fillRect(fx + 2, fy, 16, 7, [255, 255, 255, 255]);
      fillRect(fx + 2, fy + 7, 16, 7, BLUE);
      fillRect(fx + 2, fy + 14, 16, 7, RED);
    }
    rect(fx + 2, fy, 16, 21, INK, 1);
  }
}
function drawJet(x, y, s) {
  const cx = x + Math.floor(s / 2);
  const cy = y + Math.floor(s / 2);
  // fuselage (delta shape)
  line(cx - 24, cy + 10, cx + 26, cy - 4, INK, 4);
  // wings
  line(cx - 2, cy - 2, cx - 14, cy - 18, INK, 3);
  line(cx - 2, cy + 2, cx - 14, cy + 16, INK, 3);
  // tail
  line(cx - 22, cy + 8, cx - 26, cy - 6, INK, 3);
  // cockpit dot
  circle(cx + 14, cy - 3, 3, RED, true);
  // motion lines
  hline(x + 2, cy + 14, 18, SOFT, 2);
  hline(x + 8, cy + 20, 14, SOFT, 2);
}
function drawBuilding(x, y, s) {
  const bx = x + 12;
  const by = y + 12;
  fillRect(bx, by, s - 24, s - 26, INK);
  fillRect(bx + 4, by + 4, s - 32, 10, PANEL); // roof band
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      fillRect(bx + 8 + c * 12, by + 20 + r * 14, 7, 8, [255, 220, 120, 255]);
    }
  }
  fillRect(bx + Math.floor((s - 24) / 2) - 4, by + s - 40, 9, 14, RED); // door
  // arrow pointing down into the roof (returns)
  const ax = x + Math.floor(s / 2);
  line(ax, y + 2, ax, y + 10, RED, 3);
  line(ax, y + 10, ax - 4, y + 5, RED, 3);
  line(ax, y + 10, ax + 4, y + 5, RED, 3);
}
function drawAidBox(x, y, s) {
  const bx = x + 10;
  const by = y + 18;
  fillRect(bx, by, s - 20, s - 34, [210, 170, 90, 255]);
  rect(bx, by, s - 20, s - 34, INK, 2);
  // cross
  fillRect(bx + Math.floor((s - 20) / 2) - 3, by + 8, 6, 20, RED);
  fillRect(bx + Math.floor((s - 20) / 2) - 10, by + 15, 20, 6, RED);
  // second small box
  fillRect(bx + 4, by + s - 38, 16, 8, SOFT);
  fillRect(bx + s - 28, by + s - 38, 16, 8, SOFT);
  // open gate arrow
  line(x + 6, y + s - 8, x + s - 6, y + s - 8, BLUE, 2);
}

// ---------------------------------------------------------------- stories
const LEAD = {
  kicker: "LEAD",
  head: ["UKRAINE HITS CRIMEA", "BRIDGE AGAIN"],
  caption:
    "UKRAINIAN STRIKES DAMAGE THE KERCH BRIDGE FOR A SECOND STRAIGHT DAY. " +
    "RUSSIA HITS BRIDGES IN KYIV. ZELENSKYY CALLS IT AN UNPRECEDENTED OPERATION.",
};
const STORIES = [
  {
    head: "MINES HIT TANKERS NEAR HORMUZ",
    caption:
      "SEVERAL OIL TANKERS STRUCK BY MINES NEAR THE STRAIT OF HORMUZ AND CATCH FIRE.",
    pic: drawTanker,
  },
  {
    head: "IRAN DRONES TARGET U.S. RADAR IN BAHRAIN",
    caption:
      "IRAN FIRES DRONES AT A U.S. RADAR AT SHEIKH ISA BASE. BAHRAIN SAYS THE ATTACK WAS INTERCEPTED. NO CASUALTIES.",
    pic: drawRadar,
  },
  {
    head: "XI, TRUMP, PUTIN TO MEET IN SHENZHEN",
    caption:
      "CHINA CONFIRMS THE FIRST THREE-WAY MEETING OF THE THREE LEADERS, THURSDAY ON THE APEC SIDELINES. TRUMP IS TRAVELLING TO ASIA.",
    pic: drawFlags,
  },
  {
    head: "JAPAN SCRAMBLES JETS",
    caption:
      "TWO SUSPECTED RUSSIAN AIRCRAFT VIOLATE JAPANESE AIRSPACE. TOKYO PROTESTS STRONGLY.",
    pic: drawJet,
  },
  {
    head: "EUROPE PLANS RWANDA RETURNS HUB",
    caption:
      "GERMANY, DENMARK, AUSTRIA, GREECE AND THE NETHERLANDS PLAN A JOINT RETURN FACILITY IN RWANDA FOR REJECTED ASYLUM SEEKERS.",
    pic: drawBuilding,
  },
  {
    head: "GAZA AID PLEA",
    caption:
      "THE UK, AUSTRALIA, CANADA AND ITALY URGE ISRAEL TO OPEN GAZA CROSSINGS FOR AID. THE UK SANCTIONS EIGHT ISRAELI CONSTRUCTION FIRMS OVER WEST BANK SETTLEMENTS.",
    pic: drawAidBox,
  },
];

// ---------------------------------------------------------------- layout
function draw() {
  fillRect(0, 0, W, H, PAPER);
  rect(6, 6, W - 12, H - 12, INK, 2);

  // ---- masthead
  drawTextCentered(16, 26, W - 32, "THE WORLD TODAY", 8, INK);
  hline(120, 100, W - 240, INK, 2);
  drawTextCentered(16, 112, W - 32, "TUESDAY 17 NOVEMBER 2026", 3, RED);
  drawText(28, 112, "EST. 2026", 2, SOFT);
  drawText(W - 28 - textWidth("ONE PAGE", 2), 112, "ONE PAGE", 2, SOFT);
  hline(16, 142, W - 32, INK, 3);
  hline(16, 148, W - 32, INK, 1);

  // ---- lead panel
  const lx = 16;
  const ly = 162;
  const lw = W - 32;
  const lh = 268;
  fillRect(lx, ly, lw, lh, PANEL);
  rect(lx, ly, lw, lh, INK, 2);
  fillRect(lx + 14, ly + 12, textWidth("LEAD", 2) + 16, 20, RED);
  drawText(lx + 22, ly + 15, "LEAD", 2, [255, 255, 255, 255]);
  drawText(lx + 20, ly + 46, LEAD.head[0], 4, INK);
  drawText(lx + 20, ly + 80, LEAD.head[1], 4, INK);
  const capLines = wrap(LEAD.caption, 50);
  capLines.forEach((ln, i) => drawText(lx + 20, ly + 132 + i * 18, ln, 2, SOFT));
  // bridge pictogram, right side of the lead panel
  const bx = lx + 664;
  const by = ly + 18;
  rect(bx - 6, by - 6, 316, 232, INK, 1);
  drawBridge(bx, by, 304, 220);

  // ---- secondary stories
  let y = 446;
  const rowH = 86;
  for (let i = 0; i < STORIES.length; i++) {
    const st = STORIES[i];
    // icon box
    fillRect(16, y, 84, 84, PANEL);
    rect(16, y, 84, 84, INK, 1);
    st.pic(24, y + 8, 68);
    // headline
    drawText(116, y + 8, st.head, 3, INK);
    // caption, up to 2 lines
    const lines = wrap(st.caption, 72);
    lines.slice(0, 2).forEach((ln, j) => drawText(116, y + 36 + j * 18, ln, 2, SOFT));
    y += rowH;
    if (i < STORIES.length - 1) hline(16, y - 2, W - 32, [180, 172, 152, 255], 1);
  }

  // ---- footer
  hline(16, y + 4, W - 32, INK, 2);
  drawTextCentered(
    16,
    y + 14,
    W - 32,
    "ALL EVENTS REPORTED ON TUESDAY 17 NOVEMBER 2026",
    2,
    SOFT,
  );
}

function main() {
  draw();
  const png = encodePNG(buf, W, H);
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
}

main();

import { CONFIG } from "./scene-config.js";

const TAU = Math.PI * 2;
const alphabet = "אבגדהוזחטיכלמנסעפצקרשת";
// Legible Hebrew lettering approximates the reference's tiny inscriptions.
const inscription = "לכל זמן ועת לכל חפץ תחת השמים · ";

// These canvases are texture masks only; the visible scene is rendered by WebGL.
/** @param {0|1|2|3} layer @returns {HTMLCanvasElement} */
export function ringTexture(layer) {
  let seed = 103;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = textureCanvas.height = CONFIG.textureSize;
  const ctx = textureCanvas.getContext("2d");
  const half = CONFIG.textureSize / 2;
  ctx.translate(half, half);
  ctx.scale(half, half);
  ctx.strokeStyle = "#fff";
  ctx.fillStyle = "#fff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  function circle(r, width = 0.0009, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function textRing(r, count, size, offset = 0) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < count; i++) {
      ctx.save();
      ctx.rotate((-TAU * i) / count + offset);
      ctx.translate(0, -r);
      ctx.scale(1 / half, 1 / half);
      ctx.font = `${size * half}px CelestialScript`;
      ctx.fillText(inscription[i % inscription.length], 0, 0);
      ctx.restore();
    }
  }
  function transcriptRing(r, count, size) {
    const words = inscription.split(" ");
    for (let i = 0; i < count; i++) {
      ctx.save();
      ctx.rotate((-TAU * i) / count);
      ctx.translate(0, -r);
      ctx.scale(1 / half, 1 / half);
      ctx.font = `${size * half}px CelestialScript`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.direction = "rtl";
      ctx.fillText(
        words[i % words.length],
        0,
        0,
        ((TAU * r * half) / count) * 0.88,
      );
      ctx.restore();
    }
  }

  function ticks(r, n, length) {
    ctx.lineWidth = 0.00065;
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.rotate((i / n) * TAU);
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(0, -r - length * (i % 5 === 0 ? 1.8 : 1));
      ctx.stroke();
      ctx.restore();
    }
  }
  function drawInnerRing() {
    circle(0.297, 0.0011);
    circle(0.363, 0.001);
    // Individual constellation diagrams, with luminous star vertices.
    const constellations = [
      [
        [-0.022, -0.014],
        [-0.014, 0.012],
        [0.013, 0.008],
        [0.023, -0.016],
      ],
      [
        [-0.022, 0.011],
        [0, -0.016],
        [0.021, 0.013],
        [0.005, 0.015],
      ],
      [
        [-0.022, -0.009],
        [-0.004, -0.014],
        [0.02, 0.013],
        [-0.015, 0.014],
      ],
      [
        [-0.02, 0.012],
        [-0.01, -0.012],
        [0.011, -0.006],
        [0.025, -0.014],
      ],
      [
        [-0.022, -0.013],
        [0.004, 0.002],
        [-0.008, 0.017],
        [0.024, 0.011],
      ],
      [
        [-0.024, 0.01],
        [-0.008, -0.014],
        [0.009, 0.01],
        [0.023, -0.013],
      ],
    ];
    for (let i = 0; i < 18; i++) {
      ctx.save();
      ctx.rotate((i * TAU) / 18 + 0.04);
      ctx.translate(0, -0.33);
      const points = constellations[i % constellations.length];
      ctx.lineWidth = 0.0019;
      ctx.beginPath();
      points.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      for (const [x, y] of points) {
        ctx.beginPath();
        ctx.arc(x, y, 0.0034, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  function drawScriptRing() {
    // Thin rectangular cells, with two closely set belts of typeset words.
    for (const r of [0.371, 0.386, 0.391, 0.409, 0.414, 0.432])
      circle(r, 0.00055, 0.75);
    const blocks = 192;
    for (let i = 0; i < blocks; i++) {
      ctx.save();
      ctx.rotate((i * TAU) / blocks);
      ctx.lineWidth = 0.0005;
      ctx.beginPath();
      ctx.moveTo(0, -0.371);
      ctx.lineTo(0, -0.386);
      ctx.stroke();
      ctx.restore();
    }
    textRing(0.379, blocks, 0.009);
    transcriptRing(0.4, 84, 0.01);
    transcriptRing(0.423, 92, 0.01);
  }
  function drawRuneRing() {
    const inner = 0.44,
      outer = 0.535,
      n = 28;
    for (let i = 0; i < n; i++) {
      const a = (i * TAU) / n - Math.PI / 2;
      ctx.save();
      if ([0, 1, 2, 5, 6, 9, 11, 12, 16, 17, 21, 24, 25, 27].includes(i)) {
        ctx.beginPath();
        ctx.arc(0, 0, outer, a, a + TAU / n);
        ctx.arc(0, 0, inner, a + TAU / n, a, true);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#05090c";
      }
      ctx.rotate(a + TAU / n / 2 + Math.PI / 2);
      ctx.scale(1 / half, 1 / half);
      ctx.font = "50px CelestialScript";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(alphabet[(i * 7 + 9) % alphabet.length], 0, -0.482 * half);
      ctx.font = "12px CelestialScript";
      ctx.fillText(
        alphabet[(i * 3) % alphabet.length],
        0.029 * half,
        -0.472 * half,
      );
      ctx.font = "8px CelestialScript";
      ctx.direction = "rtl";
      ctx.fillText("לכל זמן ועת", 0, -0.522 * half);
      ctx.restore();
    }
    circle(inner, 0.0015);
    circle(outer, 0.0015);
    circle(0.546, 0.001);
    circle(0.563, 0.0007);
    textRing(0.554, 286, 0.012);
    ticks(0.569, 360, 0.009);
  }
  function drawOuterRing() {
    circle(0.589, 0.001);
    circle(0.605, 0.0009);
    circle(0.645, 0.001);
    textRing(0.624, 120, 0.026, 0.02);
    circle(0.674, 0.0014);
    circle(0.685, 0.0008);
    ticks(0.688, 420, 0.01);
    circle(0.743, 0.001);
    circle(0.763, 0.0006);
    ticks(0.798, 480, 0.009);
    // Engraved radial strokes extend beyond the frame.
    for (let i = 0; i < 780; i++) {
      ctx.save();
      ctx.rotate((i * TAU) / 780);
      ctx.globalAlpha = 0.15 + random() * 0.65;
      const start = 0.83 + random() * 0.065;
      ctx.lineWidth = 0.0004 + random() * 0.0008;
      ctx.beginPath();
      ctx.moveTo(0, -start);
      ctx.lineTo(0, -start - 0.03 - random() * 0.24);
      ctx.stroke();
      ctx.restore();
    }
  }
  [drawInnerRing, drawRuneRing, drawOuterRing, drawScriptRing][layer]();
  return textureCanvas;
}

/** @returns {HTMLCanvasElement} */
export function landTexture() {
  const map = document.createElement("canvas");
  map.width = 1024;
  map.height = 512;
  const ctx = map.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = "#fff";
  // Hand-drawn geographic silhouettes provide a fully local globe texture.
  const continents = [
    [
      [-168, 70],
      [-145, 72],
      [-126, 70],
      [-112, 75],
      [-88, 72],
      [-62, 59],
      [-55, 50],
      [-66, 46],
      [-81, 25],
      [-97, 18],
      [-88, 16],
      [-83, 9],
      [-77, 8],
      [-88, 21],
      [-104, 24],
      [-112, 32],
      [-123, 42],
      [-128, 52],
      [-144, 60],
      [-166, 60],
    ],
    [
      [-81, 12],
      [-72, 11],
      [-62, 10],
      [-51, 3],
      [-35, -6],
      [-41, -21],
      [-50, -29],
      [-54, -39],
      [-68, -55],
      [-74, -46],
      [-72, -30],
      [-79, -9],
    ],
    [
      [-55, 59],
      [-43, 60],
      [-21, 72],
      [-25, 81],
      [-46, 84],
      [-62, 78],
    ],
    [
      [-17, 36],
      [-5, 36],
      [11, 37],
      [25, 32],
      [33, 31],
      [35, 22],
      [43, 12],
      [51, 11],
      [43, -1],
      [40, -13],
      [32, -25],
      [20, -35],
      [12, -28],
      [10, -13],
      [2, 4],
      [-10, 5],
      [-17, 15],
    ],
    [
      [-10, 36],
      [-10, 44],
      [-2, 49],
      [6, 54],
      [10, 58],
      [5, 62],
      [19, 71],
      [32, 70],
      [30, 60],
      [45, 66],
      [66, 69],
      [89, 76],
      [112, 73],
      [141, 72],
      [179, 66],
      [170, 53],
      [155, 50],
      [141, 40],
      [129, 32],
      [122, 20],
      [111, 19],
      [107, 7],
      [100, 1],
      [99, 15],
      [91, 22],
      [81, 8],
      [72, 19],
      [66, 25],
      [55, 26],
      [49, 13],
      [43, 12],
      [37, 30],
      [29, 40],
      [23, 40],
      [20, 36],
      [13, 44],
      [7, 43],
      [3, 42],
    ],
    [
      [112, -22],
      [115, -34],
      [129, -33],
      [137, -38],
      [149, -38],
      [154, -27],
      [146, -16],
      [137, -12],
      [131, -12],
      [128, -17],
      [120, -18],
    ],
    [
      [47, -13],
      [50, -16],
      [46, -26],
      [43, -23],
    ],
    [
      [130, 31],
      [142, 45],
      [145, 43],
      [140, 35],
    ],
    [
      [95, 5],
      [106, -6],
      [105, -9],
      [99, -3],
    ],
    [
      [109, 7],
      [118, 6],
      [119, -4],
      [111, -4],
    ],
    [
      [130, -3],
      [141, -3],
      [151, -7],
      [145, -11],
      [135, -8],
    ],
    [
      [166, -35],
      [178, -39],
      [172, -46],
      [167, -46],
    ],
    [
      [-180, -73],
      [-120, -72],
      [-60, -64],
      [0, -72],
      [60, -69],
      [120, -66],
      [180, -73],
      [180, -90],
      [-180, -90],
    ],
  ];
  for (const points of continents) {
    ctx.beginPath();
    points.forEach(([lon, lat], i) => {
      const x = ((lon + 180) / 360) * 1024,
        y = ((90 - lat) / 180) * 512;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  }
  return map;
}

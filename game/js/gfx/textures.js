// Every wall, floor and sky in the game is painted here with the 2D canvas API.
// No image files are downloaded, so there is nothing to license or attribute.
import * as THREE from 'three';

// Small seeded random generator so textures look the same on every load.
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return { c, g };
}

export function toTexture(canvas, { repeat = false, mipmaps = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = mipmaps ? THREE.NearestMipmapLinearFilter : THREE.NearestFilter;
  t.generateMipmaps = mipmaps;
  t.colorSpace = THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Soft neon glow: draw the same shape a few times, wide and faint, then sharp.
export function glow(g, color, drawShape, passes = [8, 4, 0]) {
  g.save();
  g.shadowColor = color;
  for (const blur of passes) {
    g.shadowBlur = blur;
    drawShape();
  }
  g.restore();
}

function noise(g, w, h, rand, amount, color = '0,0,0') {
  for (let i = 0; i < w * h * amount; i++) {
    g.fillStyle = `rgba(${color},${0.05 + rand() * 0.2})`;
    g.fillRect((rand() * w) | 0, (rand() * h) | 0, 1, 1);
  }
}

const S = 64; // wall/floor texture size

const PAINTERS = {
  brick(g, rand) {
    g.fillStyle = '#1d0f2c';
    g.fillRect(0, 0, S, S);
    for (let row = 0; row < 8; row++) {
      const off = row % 2 ? 8 : 0;
      for (let col = -1; col < 4; col++) {
        const v = 30 + rand() * 25;
        g.fillStyle = `rgb(${v + 30},${v * 0.5},${v + 45})`;
        g.fillRect(col * 16 + off + 1, row * 8 + 1, 14, 6);
      }
    }
    noise(g, S, S, rand, 0.3);
    // a neon strip that "hums" along the top
    glow(g, '#ff2bd6', () => {
      g.fillStyle = '#ff7ae8';
      g.fillRect(0, 3, S, 2);
    });
    // wet shine near the ground
    const grad = g.createLinearGradient(0, 44, 0, 64);
    grad.addColorStop(0, 'rgba(0,255,240,0)');
    grad.addColorStop(1, 'rgba(0,255,240,0.18)');
    g.fillStyle = grad;
    g.fillRect(0, 44, S, 20);
  },

  neonSign(g, rand) {
    g.fillStyle = '#120a1e';
    g.fillRect(0, 0, S, S);
    noise(g, S, S, rand, 0.2, '120,80,200');
    g.strokeStyle = '#3a2a55';
    g.strokeRect(4.5, 10.5, 55, 34);
    // abstract glyphs (made-up symbols, not a real language)
    glow(g, '#00f0ff', () => {
      g.strokeStyle = '#8ffbff';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(12, 18); g.lineTo(12, 36); g.lineTo(22, 36);
      g.moveTo(28, 18); g.lineTo(36, 18); g.lineTo(32, 26); g.lineTo(36, 36);
      g.moveTo(44, 18); g.arc(48, 27, 7, Math.PI, Math.PI * 3);
      g.stroke();
    });
    glow(g, '#ff2bd6', () => {
      g.fillStyle = '#ff9cf0';
      g.font = 'bold 9px monospace';
      g.fillText('24H', 22, 56);
    });
  },

  shutter(g, rand) {
    g.fillStyle = '#2b3550';
    g.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 4) {
      g.fillStyle = y % 8 ? '#3d4a6b' : '#222a40';
      g.fillRect(0, y, S, 2);
    }
    noise(g, S, S, rand, 0.4);
    glow(g, '#ffe600', () => {
      g.fillStyle = '#fff36b';
      g.fillRect(6, 30, 52, 3);
    });
  },

  wallpaper(g, rand) {
    g.fillStyle = '#2f5250';
    g.fillRect(0, 0, S, S);
    for (let x = 0; x < S; x += 8) {
      g.fillStyle = '#365d5a';
      g.fillRect(x, 0, 3, 48);
    }
    for (let y = 6; y < 44; y += 12) {
      for (let x = 4; x < S; x += 16) {
        g.fillStyle = '#c4b27a';
        g.fillRect(x + ((y / 12) % 2) * 8, y, 2, 2);
      }
    }
    g.fillStyle = '#4a2e1c'; // wainscot
    g.fillRect(0, 48, S, 16);
    g.fillStyle = '#5e3c25';
    g.fillRect(0, 48, S, 2);
    noise(g, S, S, rand, 0.5);
    g.fillStyle = 'rgba(40,30,10,0.25)'; // water stain
    g.beginPath();
    g.ellipse(18 + rand() * 30, 20, 8, 14, 0, 0, Math.PI * 2);
    g.fill();
  },

  motelDoor(g, rand) {
    PAINTERS.wallpaper(g, rand);
    g.fillStyle = '#5a3a22';
    g.fillRect(12, 4, 40, 60);
    g.fillStyle = '#6e4a2c';
    g.fillRect(16, 8, 32, 22);
    g.fillRect(16, 34, 32, 26);
    g.fillStyle = '#d8c070';
    g.fillRect(44, 34, 3, 3); // knob
    g.fillStyle = '#1a1a1a';
    g.fillRect(24, 12, 16, 8);
    g.fillStyle = '#e8d890';
    g.font = 'bold 7px monospace';
    g.fillText('107', 26, 19);
  },

  painting(g, rand) {
    PAINTERS.wallpaper(g, rand);
    g.fillStyle = '#8a6a2a';
    g.fillRect(12, 8, 40, 32);
    const sky = g.createLinearGradient(0, 11, 0, 37);
    sky.addColorStop(0, '#2b0f4f');
    sky.addColorStop(1, '#ff6fa8');
    g.fillStyle = sky;
    g.fillRect(15, 11, 34, 26);
    g.fillStyle = '#ffd36b';
    g.beginPath();
    g.arc(32, 32, 7, Math.PI, 0);
    g.fill();
    g.fillStyle = '#1a0a2a';
    g.fillRect(15, 32, 34, 5);
  },

  eye(g, rand) {
    PAINTERS.wallpaper(g, rand);
    g.fillStyle = '#8a6a2a';
    g.fillRect(10, 6, 44, 36);
    g.fillStyle = '#10141c';
    g.fillRect(13, 9, 38, 30);
    g.fillStyle = '#f2ece0';
    g.beginPath();
    g.ellipse(32, 24, 15, 9, 0, 0, Math.PI * 2);
    g.fill();
    glow(g, '#ff2bd6', () => {
      g.fillStyle = '#ff3fd0';
      g.beginPath();
      g.arc(32, 24, 6, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = '#000';
    g.beginPath();
    g.arc(32, 24, 3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    g.fillRect(33, 21, 2, 2);
  },

  eyeClosed(g, rand) {
    PAINTERS.wallpaper(g, rand);
    g.fillStyle = '#8a6a2a';
    g.fillRect(10, 6, 44, 36);
    g.fillStyle = '#10141c';
    g.fillRect(13, 9, 38, 30);
    g.strokeStyle = '#f2ece0';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(32, 18, 15, Math.PI * 0.2, Math.PI * 0.8);
    g.stroke();
    g.fillStyle = '#00e0ff';
    g.fillRect(31, 31, 2, 6); // a single tear
  },

  chrome(g, rand) {
    const grad = g.createLinearGradient(0, 0, S, S);
    grad.addColorStop(0, '#0d0d14');
    grad.addColorStop(0.5, '#2a2a38');
    grad.addColorStop(1, '#0a0a10');
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    g.strokeStyle = '#6a6a85';
    g.strokeRect(2.5, 2.5, 59, 59);
    g.strokeStyle = '#15151f';
    g.strokeRect(5.5, 5.5, 53, 53);
    noise(g, S, S, rand, 0.2, '200,200,255');
    glow(g, '#ff1f3d', () => {
      g.fillStyle = '#ff5a6e';
      g.fillRect(8, 40, 48, 2);
    });
  },

  clockPanel(g) {
    g.fillStyle = '#3a060c';
    g.fillRect(0, 0, S, S);
    g.fillStyle = '#e8dcc0';
    g.beginPath();
    g.arc(32, 30, 22, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1a0a0a';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillRect(32 + Math.cos(a) * 18 - 1, 30 + Math.sin(a) * 18 - 1, 2, 2);
    }
    g.strokeStyle = '#1a0a0a';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(32, 30); g.lineTo(32, 14);
    g.moveTo(32, 30); g.lineTo(43, 34);
    g.stroke();
    glow(g, '#ff1f3d', () => {
      g.strokeStyle = '#ff4060';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(32, 30, 24, 0, Math.PI * 2);
      g.stroke();
    });
  },

  gold(g, rand) {
    g.fillStyle = '#7a5a12';
    g.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 16) {
      g.fillStyle = '#a07a1e';
      g.fillRect(0, y, S, 14);
      g.fillStyle = '#e8c45a';
      for (let x = 4; x < S; x += 12) g.fillRect(x, y + 2, 2, 2);
    }
    noise(g, S, S, rand, 0.3);
  },

  door(g) {
    g.fillStyle = '#141a2a';
    g.fillRect(0, 0, S, S);
    g.fillStyle = '#26314d';
    g.fillRect(4, 4, 56, 56);
    g.fillStyle = '#0a0e18';
    g.fillRect(31, 4, 2, 56);
    glow(g, '#00f0ff', () => {
      g.strokeStyle = '#7ffcff';
      g.lineWidth = 2;
      g.beginPath();
      for (let y = 12; y < 56; y += 12) {
        g.moveTo(14, y + 6); g.lineTo(22, y); g.lineTo(30, y + 6);
        g.moveTo(34, y + 6); g.lineTo(42, y); g.lineTo(50, y + 6);
      }
      g.stroke();
    });
  },

  doorRed(g) {
    PAINTERS.door(g);
    keyStripe(g, '#ff2b4a', '#ff8c9c');
  },

  doorBlue(g) {
    PAINTERS.door(g);
    keyStripe(g, '#2b6bff', '#8cb4ff');
  },

  asphalt(g, rand) {
    g.fillStyle = '#121019';
    g.fillRect(0, 0, S, S);
    noise(g, S, S, rand, 0.8, '60,50,80');
    // puddles reflecting the neon
    for (let i = 0; i < 3; i++) {
      g.fillStyle = rand() > 0.5 ? 'rgba(255,43,214,0.18)' : 'rgba(0,240,255,0.15)';
      g.beginPath();
      g.ellipse(rand() * S, rand() * S, 6 + rand() * 8, 3 + rand() * 4, rand() * 3, 0, Math.PI * 2);
      g.fill();
    }
  },

  carpet(g, rand) {
    g.fillStyle = '#3a1410';
    g.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 16) {
      for (let x = 0; x < S; x += 16) {
        g.fillStyle = '#7a2a12';
        g.beginPath();
        g.moveTo(x + 8, y + 1); g.lineTo(x + 15, y + 8); g.lineTo(x + 8, y + 15); g.lineTo(x + 1, y + 8);
        g.fill();
        g.fillStyle = '#c86a1a';
        g.fillRect(x + 7, y + 7, 2, 2);
      }
    }
    noise(g, S, S, rand, 0.4);
  },

  redGrid(g, rand) {
    g.fillStyle = '#0c0204';
    g.fillRect(0, 0, S, S);
    noise(g, S, S, rand, 0.3, '120,20,30');
    glow(g, '#ff1f3d', () => {
      g.strokeStyle = '#7a0f1e';
      g.lineWidth = 1;
      g.strokeRect(0.5, 0.5, 63, 63);
      g.beginPath();
      g.moveTo(32, 0); g.lineTo(32, 64);
      g.moveTo(0, 32); g.lineTo(64, 32);
      g.stroke();
    }, [4, 0]);
  },

  ceilingTile(g, rand) {
    g.fillStyle = '#2a2a24';
    g.fillRect(0, 0, S, S);
    noise(g, S, S, rand, 0.9, '90,90,70');
    g.strokeStyle = '#1a1a14';
    g.strokeRect(0.5, 0.5, 63, 63);
    if (rand() > 0.2) {
      g.fillStyle = '#d8ffe8'; // a fluorescent panel
      g.fillRect(20, 26, 24, 12);
    }
  },

  exitPad(g) {
    g.fillStyle = '#05010a';
    g.fillRect(0, 0, S, S);
    glow(g, '#00ff9c', () => {
      g.strokeStyle = '#9cffd6';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(32, 32, 24, 0, Math.PI * 2);
      g.moveTo(44, 32);
      g.arc(32, 32, 12, 0, Math.PI * 2);
      g.stroke();
    });
  },
};

function keyStripe(g, color, light) {
  glow(g, color, () => {
    g.fillStyle = light;
    g.fillRect(4, 26, 56, 10);
  });
  g.fillStyle = '#0a0e18';
  g.beginPath();
  g.arc(24, 31, 3, 0, Math.PI * 2);
  g.fill();
  g.fillRect(26, 30, 14, 2);
  g.fillRect(36, 30, 2, 4);
}

const cache = new Map();

export function surfaceTexture(name) {
  if (cache.has(name)) return cache.get(name);
  const painter = PAINTERS[name];
  if (!painter) throw new Error('No texture called ' + name);
  const { c, g } = makeCanvas(S, S);
  painter(g, seeded(name.length * 977 + name.charCodeAt(0)));
  const tex = toTexture(c, { repeat: true, mipmaps: true });
  cache.set(name, tex);
  return tex;
}

// Wide panoramic skies wrapped around a cylinder that follows the player.
export function skyTexture(kind) {
  const W = 1024;
  const H = 256;
  const { c, g } = makeCanvas(W, H);
  const rand = seeded(kind === 'sunset' ? 7 : 13);
  if (kind === 'sunset') {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0b0220');
    grad.addColorStop(0.45, '#4a0f6b');
    grad.addColorStop(0.75, '#ff4fa3');
    grad.addColorStop(1, '#ffb35c');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    starField(g, W, H * 0.5, rand, 120);
    // striped sun
    g.save();
    g.beginPath();
    g.arc(260, 190, 70, 0, Math.PI * 2);
    g.clip();
    const sun = g.createLinearGradient(0, 120, 0, 260);
    sun.addColorStop(0, '#fff36b');
    sun.addColorStop(1, '#ff3fa0');
    g.fillStyle = sun;
    g.fillRect(180, 110, 160, 160);
    g.fillStyle = '#ff4fa3';
    for (let y = 170; y < 260; y += 12) g.fillRect(180, y, 160, 3 + (y - 170) / 14);
    g.restore();
    // the moon is an eye, and it's open
    g.fillStyle = '#f2ece0';
    g.beginPath();
    g.ellipse(760, 70, 46, 26, 0, 0, Math.PI * 2);
    g.fill();
    glow(g, '#00f0ff', () => {
      g.fillStyle = '#29e6ff';
      g.beginPath();
      g.arc(760, 70, 17, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = '#05010a';
    g.beginPath();
    g.arc(760, 70, 8, 0, Math.PI * 2);
    g.fill();
    skyline(g, W, H, rand, '#12041f', 150);
    skyline(g, W, H, rand, '#07010f', 185);
  } else {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#020003');
    grad.addColorStop(0.6, '#3a0410');
    grad.addColorStop(1, '#8a0f1e');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    starField(g, W, H * 0.6, rand, 160);
    // a huge clock face hanging in the sky
    for (const cx of [300, 812]) {
      g.fillStyle = 'rgba(232,220,192,0.85)';
      g.beginPath();
      g.arc(cx, 90, 60, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2a0508';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.fillRect(cx + Math.cos(a) * 50 - 2, 90 + Math.sin(a) * 50 - 2, 4, 4);
      }
      g.strokeStyle = '#2a0508';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(cx, 90); g.lineTo(cx + 6, 48);
      g.moveTo(cx, 90); g.lineTo(cx + 34, 104);
      g.stroke();
    }
    skyline(g, W, H, rand, '#120105', 170);
  }
  const tex = toTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

function starField(g, w, h, rand, n) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.7})`;
    g.fillRect(rand() * w, rand() * h, 1, 1);
  }
}

function skyline(g, w, h, rand, color, base) {
  g.fillStyle = color;
  let x = 0;
  while (x < w) {
    const bw = 20 + rand() * 50;
    const bh = 20 + rand() * 70;
    g.fillRect(x, base - bh, bw, h);
    // tiny lit windows
    for (let i = 0; i < 6; i++) {
      g.fillStyle = rand() > 0.5 ? '#ff4fd0' : '#3ff6ff';
      g.fillRect(x + 3 + rand() * (bw - 6), base - bh + 5 + rand() * (bh - 10), 2, 2);
    }
    g.fillStyle = color;
    x += bw + 2;
  }
}

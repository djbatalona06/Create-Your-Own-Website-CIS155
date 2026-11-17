// Flat "billboard" pictures for enemies, pickups, shots and the weapon in your
// hands. Each frame is drawn once with canvas code and turned into a texture.
import { makeCanvas, toTexture, glow, seeded } from '../gfx/textures.js';

function frame(size, draw) {
  const { c, g } = makeCanvas(size, size);
  draw(g, size);
  return toTexture(c);
}

// ---------- Mask Drifter: a floating porcelain mask trailing ribbons ----------
function drawMask(g, { bob = 0, mouth = false, pain = false, cracked = false }) {
  const y = 18 + bob;
  for (let i = 0; i < 3; i++) {
    glow(g, '#00f0ff', () => {
      g.strokeStyle = '#7ffcff';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(24 + i * 8, y + 30);
      g.quadraticCurveTo(20 + i * 10 + bob * 2, y + 38, 26 + i * 6, 62);
      g.stroke();
    }, [4, 0]);
  }
  if (cracked) {
    g.fillStyle = '#e8e2d6';
    g.beginPath();
    g.ellipse(22, y + 22, 9, 15, -0.5, 0, Math.PI * 2);
    g.ellipse(42, y + 26, 9, 15, 0.6, 0, Math.PI * 2);
    g.fill();
    return;
  }
  g.fillStyle = pain ? '#ffffff' : '#ece6da';
  g.beginPath();
  g.ellipse(32, y + 14, 15, 19, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#c9c0b0';
  g.fillRect(31, y - 4, 2, 10); // crack
  g.fillStyle = '#0a0612';
  for (const ex of [25, 39]) {
    g.beginPath();
    g.ellipse(ex, y + 10, 5, 3, ex < 32 ? 0.3 : -0.3, 0, Math.PI * 2);
    g.fill();
  }
  glow(g, '#ff2bd6', () => {
    g.fillStyle = '#ff6fe4';
    g.fillRect(24, y + 9, 2, 2);
    g.fillRect(38, y + 9, 2, 2);
  }, [6, 0]);
  g.fillStyle = '#0a0612';
  if (mouth) {
    g.beginPath();
    g.ellipse(32, y + 24, 5, 6, 0, 0, Math.PI * 2);
    g.fill();
  } else {
    g.fillRect(28, y + 23, 8, 2);
  }
  g.fillStyle = 'rgba(255,120,200,0.5)';
  g.fillRect(20, y + 16, 4, 2);
  g.fillRect(40, y + 16, 4, 2);
}

// ---------- Channel Hound: a runner with an old TV for a head ----------
function drawHound(g, { step = 0, bite = false, pain = false, dead = false, rand }) {
  const body = pain ? '#ffffff' : '#1b1626';
  if (dead) {
    g.fillStyle = '#1b1626';
    g.fillRect(10, 52, 44, 8);
    g.fillStyle = '#3a3a48';
    g.fillRect(14, 44, 18, 12);
    g.fillStyle = '#111';
    g.fillRect(17, 47, 12, 6);
    return;
  }
  g.fillStyle = body;
  g.fillRect(14, 34, 36, 12); // body
  const legA = step ? 4 : -4;
  g.fillRect(16 + legA, 46, 4, 14);
  g.fillRect(26 - legA, 46, 4, 14);
  g.fillRect(36 + legA, 46, 4, 14);
  g.fillRect(44 - legA, 46, 4, 14);
  g.fillRect(48, 30, 10, 3); // tail-antenna
  // the TV head
  g.fillStyle = pain ? '#ffffff' : '#4a4458';
  g.fillRect(4, 16, 26, 22);
  g.fillStyle = '#2a2633';
  g.fillRect(26, 20, 4, 14);
  g.fillStyle = bite ? '#ff2b4a' : '#9aa0b0';
  g.fillRect(7, 19, 18, 15);
  if (!bite) {
    for (let i = 0; i < 70; i++) {
      g.fillStyle = rand() > 0.5 ? '#eef' : '#334';
      g.fillRect(7 + rand() * 18, 19 + rand() * 15, 1, 1);
    }
  } else {
    g.fillStyle = '#fff';
    g.fillRect(9, 28, 14, 3);
  }
  glow(g, '#00f0ff', () => {
    g.strokeStyle = '#7ffcff';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(12, 16); g.lineTo(6, 4);
    g.moveTo(20, 16); g.lineTo(26, 5);
    g.stroke();
  }, [4, 0]);
}

// ---------- Chrome Mime: a smooth liquid-metal figure with a painted smile ----------
function drawMime(g, { arms = false, pain = false, blink = false, dead = false }) {
  if (dead) {
    const pool = g.createRadialGradient(32, 58, 2, 32, 58, 22);
    pool.addColorStop(0, '#f0f4ff');
    pool.addColorStop(1, '#5a6080');
    g.fillStyle = pool;
    g.beginPath();
    g.ellipse(32, 58, 22, 5, 0, 0, Math.PI * 2);
    g.fill();
    return;
  }
  const chrome = g.createLinearGradient(16, 0, 48, 0);
  chrome.addColorStop(0, pain ? '#fff' : '#3a4058');
  chrome.addColorStop(0.45, '#f4f8ff');
  chrome.addColorStop(0.6, '#8a92b8');
  chrome.addColorStop(1, pain ? '#fff' : '#20243a');
  g.fillStyle = chrome;
  g.beginPath();
  g.ellipse(32, 12, 8, 10, 0, 0, Math.PI * 2); // head
  g.fill();
  g.fillRect(24, 22, 16, 22); // torso
  g.fillRect(25, 44, 6, 18); // legs
  g.fillRect(33, 44, 6, 18);
  if (arms) {
    g.fillRect(8, 24, 16, 5);
    g.fillRect(40, 24, 16, 5);
    g.fillStyle = '#fff';
    g.fillRect(4, 22, 6, 8);
    g.fillRect(54, 22, 6, 8);
  } else {
    g.fillRect(18, 23, 5, 18);
    g.fillRect(41, 23, 5, 18);
    g.fillStyle = '#fff';
    g.fillRect(17, 40, 7, 6);
    g.fillRect(40, 40, 7, 6);
  }
  g.strokeStyle = '#ff2b6a';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(32, 13, 4, 0.2, Math.PI - 0.2);
  g.stroke();
  if (blink) {
    g.globalCompositeOperation = 'destination-out';
    for (let y = 0; y < 64; y += 4) g.fillRect(((y * 7) % 20) - 4, y, 64, 2);
    g.globalCompositeOperation = 'source-over';
  }
}

// ---------- The Snooze: a giant alarm-clock idol with one eye ----------
function drawSnooze(g, { hand = 0, ring = false, pain = false, dead = false }) {
  if (dead) {
    g.fillStyle = '#5a0a12';
    g.beginPath();
    g.ellipse(64, 118, 46, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#e8dcc0';
    for (let i = 0; i < 10; i++) g.fillRect(24 + i * 8, 108 - (i % 3) * 4, 6, 6);
    return;
  }
  // bells
  for (const bx of [28, 100]) {
    g.fillStyle = pain ? '#fff' : '#c8a032';
    g.beginPath();
    g.arc(bx, 26 + (ring ? (bx < 64 ? -3 : 3) : 0), 18, Math.PI, 0);
    g.fill();
  }
  g.fillStyle = '#7a5a12';
  g.fillRect(60, 6, 8, 14);
  // body and face
  g.fillStyle = pain ? '#fff' : '#b0161e';
  g.beginPath();
  g.arc(64, 70, 46, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f0e6cc';
  g.beginPath();
  g.arc(64, 70, 36, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#2a0508';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.fillRect(64 + Math.cos(a) * 30 - 2, 70 + Math.sin(a) * 30 - 2, 4, 4);
  }
  // hands spin as it gets angrier
  g.strokeStyle = '#2a0508';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(64, 70); g.lineTo(64 + Math.cos(hand) * 26, 70 + Math.sin(hand) * 26);
  g.moveTo(64, 70); g.lineTo(64 + Math.cos(hand * 0.3 + 2) * 18, 70 + Math.sin(hand * 0.3 + 2) * 18);
  g.stroke();
  // the single eye in the middle
  g.fillStyle = '#fff';
  g.beginPath();
  g.ellipse(64, 70, 12, 8, 0, 0, Math.PI * 2);
  g.fill();
  glow(g, '#ff1f3d', () => {
    g.fillStyle = ring ? '#ffe600' : '#ff1f3d';
    g.beginPath();
    g.arc(64, 70, 5, 0, Math.PI * 2);
    g.fill();
  });
  // little legs
  g.fillStyle = '#7a5a12';
  g.fillRect(34, 112, 10, 14);
  g.fillRect(84, 112, 10, 14);
  if (ring) {
    glow(g, '#ffe600', () => {
      g.strokeStyle = '#fff36b';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(64, 70, 52, -0.6, 0.6);
      g.moveTo(64 - 52 * Math.cos(0.6), 70 - 52 * Math.sin(0.6));
      g.arc(64, 70, 52, Math.PI - 0.6, Math.PI + 0.6);
      g.stroke();
    });
  }
}

export function buildEnemyFrames() {
  const r = seeded(99);
  const mask = {
    idle: [frame(64, (g) => drawMask(g, { bob: 0 })), frame(64, (g) => drawMask(g, { bob: 2 }))],
    attack: frame(64, (g) => drawMask(g, { mouth: true })),
    pain: frame(64, (g) => drawMask(g, { pain: true })),
    dead: frame(64, (g) => drawMask(g, { cracked: true })),
  };
  const hound = {
    idle: [frame(64, (g) => drawHound(g, { step: 0, rand: r })), frame(64, (g) => drawHound(g, { step: 1, rand: r }))],
    attack: frame(64, (g) => drawHound(g, { bite: true, rand: r })),
    pain: frame(64, (g) => drawHound(g, { pain: true, rand: r })),
    dead: frame(64, (g) => drawHound(g, { dead: true, rand: r })),
  };
  const mime = {
    idle: [frame(64, (g) => drawMime(g, {}))],
    attack: frame(64, (g) => drawMime(g, { arms: true })),
    pain: frame(64, (g) => drawMime(g, { pain: true })),
    blink: frame(64, (g) => drawMime(g, { blink: true })),
    dead: frame(64, (g) => drawMime(g, { dead: true })),
  };
  const snooze = {
    idle: [0, 1, 2, 3].map((i) => frame(128, (g) => drawSnooze(g, { hand: (i / 4) * Math.PI * 2 }))),
    attack: frame(128, (g) => drawSnooze(g, { ring: true, hand: 1 })),
    pain: frame(128, (g) => drawSnooze(g, { pain: true })),
    dead: frame(128, (g) => drawSnooze(g, { dead: true })),
  };
  return { mask, hound, mime, snooze };
}

// ---------- Pickups ----------
export function buildPickupFrames() {
  const pill = (g, left, right) => {
    g.save();
    g.translate(32, 36);
    g.rotate(-0.5);
    g.fillStyle = left;
    g.beginPath();
    g.arc(-8, 0, 8, Math.PI / 2, Math.PI * 1.5);
    g.fillRect(-8, -8, 8, 16);
    g.fill();
    g.fillStyle = right;
    g.beginPath();
    g.arc(8, 0, 8, -Math.PI / 2, Math.PI / 2);
    g.fillRect(0, -8, 8, 16);
    g.fill();
    g.restore();
  };
  const keycard = (color, light) => (g) => {
    glow(g, color, () => {
      g.fillStyle = light;
      g.fillRect(18, 22, 28, 20);
    });
    g.fillStyle = '#0a0e18';
    g.fillRect(22, 26, 8, 6);
    g.fillRect(22, 36, 20, 2);
  };
  return {
    health: frame(64, (g) => {
      glow(g, '#00f0ff', () => pill(g, '#e8ffff', '#29e6ff'));
      g.fillStyle = '#05303a';
      g.fillRect(29, 30, 6, 12);
      g.fillRect(26, 33, 12, 6);
    }),
    armor: frame(64, (g) => {
      glow(g, '#9c4bff', () => {
        g.fillStyle = '#c99cff';
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          g.lineTo(32 + Math.cos(a) * 16, 34 + Math.sin(a) * 16);
        }
        g.fill();
      });
      g.fillStyle = '#2a0f4f';
      g.fillRect(28, 26, 8, 16);
    }),
    volts: frame(64, (g) => {
      g.fillStyle = '#222';
      g.fillRect(22, 24, 20, 26);
      g.fillRect(28, 20, 8, 4);
      glow(g, '#ffe600', () => {
        g.fillStyle = '#fff36b';
        g.beginPath();
        g.moveTo(34, 26); g.lineTo(26, 38); g.lineTo(32, 38); g.lineTo(29, 48); g.lineTo(38, 34); g.lineTo(32, 34);
        g.fill();
      });
    }),
    lucid: frame(64, (g) => {
      glow(g, '#ff2bd6', () => pill(g, '#ff4fd0', '#29e6ff'), [12, 6, 0]);
      g.fillStyle = '#fff';
      g.fillRect(44, 18, 2, 6);
      g.fillRect(42, 20, 6, 2);
    }),
    keyRed: frame(64, keycard('#ff2b4a', '#ff8c9c')),
    keyBlue: frame(64, keycard('#2b6bff', '#8cb4ff')),
    scatter: frame(64, (g) => {
      g.fillStyle = '#2a2a38';
      g.fillRect(12, 34, 40, 10);
      g.fillRect(16, 44, 8, 10);
      glow(g, '#ff2bd6', () => {
        g.fillStyle = '#ffb3f2';
        g.beginPath();
        g.moveTo(46, 28); g.lineTo(58, 39); g.lineTo(46, 50);
        g.fill();
      });
    }),
    lance: frame(64, (g) => {
      g.fillStyle = '#2a2a38';
      g.fillRect(8, 36, 48, 6);
      glow(g, '#00f0ff', () => {
        g.fillStyle = '#9cfbff';
        g.fillRect(12, 32, 4, 14);
        g.fillRect(28, 32, 4, 14);
        g.fillRect(44, 32, 4, 14);
      });
    }),
  };
}

export function buildMiscFrames() {
  const orb = (color, light) =>
    frame(32, (g) => {
      glow(g, color, () => {
        g.fillStyle = light;
        g.beginPath();
        g.arc(16, 16, 6, 0, Math.PI * 2);
        g.fill();
      }, [10, 5, 0]);
    });
  return {
    orbPink: orb('#ff2bd6', '#ffd0f6'),
    orbCyan: orb('#00f0ff', '#d0fdff'),
    orbGold: orb('#ffe600', '#fffbd0'),
    spark: frame(16, (g) => {
      g.fillStyle = '#fff';
      g.fillRect(6, 6, 4, 4);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillRect(4, 7, 8, 2);
      g.fillRect(7, 4, 2, 8);
    }),
    exit: frame(64, (g) => {
      glow(g, '#00ff9c', () => {
        g.strokeStyle = '#9cffd6';
        g.lineWidth = 3;
        g.strokeRect(10, 8, 44, 24);
      });
      g.fillStyle = '#c8ffe8';
      g.font = 'bold 12px monospace';
      g.fillText('WAKE', 17, 25);
      g.fillStyle = 'rgba(0,255,156,0.35)';
      g.fillRect(26, 34, 12, 30);
    }),
    rain: frame(8, (g) => {
      g.fillStyle = 'rgba(160,220,255,0.9)';
      g.fillRect(3, 0, 1, 8);
    }),
    dust: frame(8, (g) => {
      g.fillStyle = 'rgba(220,255,240,0.8)';
      g.fillRect(3, 3, 2, 2);
    }),
    ember: frame(8, (g) => {
      g.fillStyle = '#ff5a3d';
      g.fillRect(2, 2, 4, 4);
      g.fillStyle = '#ffd36b';
      g.fillRect(3, 3, 2, 2);
    }),
  };
}

// ---------- The weapon in your hands (drawn at the bottom of the screen) ----------
function glove(g, x, y) {
  g.fillStyle = '#16121f';
  g.fillRect(x, y, 26, 30);
  g.fillStyle = '#2b2440';
  g.fillRect(x + 2, y + 2, 22, 6);
  g.fillStyle = '#ff2bd6';
  g.fillRect(x, y + 24, 26, 3); // courier wristband
}

export function buildWeaponFrames() {
  const W = 160;
  const make = (draw) => {
    const { c, g } = makeCanvas(W, 120);
    draw(g);
    return toTexture(c);
  };
  const flash = (g, x, y, color) =>
    glow(g, color, () => {
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(x, y, 10, 0, Math.PI * 2);
      g.fill();
    }, [16, 8, 0]);

  const pistol = (fire) => (g) => {
    g.fillStyle = '#2a2a38';
    g.fillRect(70, 52, 20, 40);
    g.fillStyle = '#3d3d52';
    g.fillRect(72, 40, 16, 16);
    glow(g, '#00f0ff', () => {
      g.fillStyle = '#7ffcff';
      g.fillRect(74, 44, 12, 3);
      g.fillRect(78, 60, 4, 20);
    });
    glove(g, 66, 88);
    if (fire) flash(g, 80, 36, '#00f0ff');
  };
  const scatter = (fire) => (g) => {
    g.fillStyle = '#2a2a38';
    g.fillRect(56, 56, 48, 34);
    glow(g, '#ff2bd6', () => {
      g.fillStyle = '#ffb3f2';
      g.beginPath();
      g.moveTo(64, 56); g.lineTo(80, 30); g.lineTo(96, 56);
      g.fill();
    });
    glove(g, 50, 88);
    glove(g, 86, 90);
    if (fire) {
      flash(g, 80, 26, '#ff2bd6');
      flash(g, 70, 30, '#00f0ff');
      flash(g, 90, 30, '#ffe600');
    }
  };
  const lance = (fire) => (g) => {
    g.fillStyle = '#20202c';
    g.fillRect(74, 20, 12, 74);
    glow(g, '#00f0ff', () => {
      g.fillStyle = fire ? '#ffffff' : '#7ffcff';
      for (let y = 26; y < 86; y += 14) g.fillRect(70, y, 20, 4);
    });
    glove(g, 66, 88);
    if (fire) flash(g, 80, 18, '#7ffcff');
  };
  return {
    pulse: { idle: make(pistol(false)), fire: make(pistol(true)) },
    scatter: { idle: make(scatter(false)), fire: make(scatter(true)) },
    lance: { idle: make(lance(false)), fire: make(lance(true)) },
  };
}

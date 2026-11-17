// Builds the 3D world from a parsed level.
// Walls are merged into one mesh per texture and only the faces you can see
// are made, so even a phone draws the whole level in a handful of calls.
import * as THREE from 'three';
import { surfaceTexture, skyTexture } from '../gfx/textures.js';

export const WALL_H = 1.25;

class MeshBuilder {
  constructor() {
    this.pos = [];
    this.uv = [];
    this.col = [];
    this.idx = [];
  }

  // Adds a quad. Corners go in order around the edge; `normal` is the way the
  // face should point. The winding is fixed up so the visible side faces out.
  quad(corners, uvs, shades, normal) {
    const base = this.pos.length / 3;
    corners.forEach((c, i) => {
      this.pos.push(c[0], c[1], c[2]);
      this.uv.push(uvs[i][0], uvs[i][1]);
      this.col.push(shades[i], shades[i], shades[i]);
    });
    const [a, b, c] = corners;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const facing = nx * normal[0] + ny * normal[1] + nz * normal[2];
    if (facing >= 0) this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    else this.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }

  build(material) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    geo.setIndex(this.idx);
    geo.computeBoundingSphere();
    return new THREE.Mesh(geo, material);
  }
}

function basic(map, extra = {}) {
  return new THREE.MeshBasicMaterial({ map, vertexColors: true, fog: true, ...extra });
}

export function buildLevel(level, parsed, grid, frames) {
  const root = new THREE.Group();
  const H = WALL_H;
  const materials = {};
  const wallBuilders = new Map();
  const floor = new MeshBuilder();
  const ceiling = new MeshBuilder();
  const exitPads = new MeshBuilder();
  const isExit = new Set(parsed.exits.map((e) => e.y * parsed.w + e.x));

  const staticWall = (x, y) => grid.inside(x, y) && grid.walls[grid.idx(x, y)] === 1;

  for (let y = 0; y < parsed.h; y++) {
    for (let x = 0; x < parsed.w; x++) {
      const ch = parsed.walls[y][x];
      if (ch !== '.') {
        if (!wallBuilders.has(ch)) wallBuilders.set(ch, new MeshBuilder());
        const mb = wallBuilders.get(ch);
        // Emit a face toward every neighbour that is not a static wall.
        // Classic trick: east/west faces are a bit darker than north/south.
        const faces = [
          { nx: 0, ny: -1, n: [0, 0, -1], c: [[x, y], [x + 1, y]], light: 1.0 },
          { nx: 0, ny: 1, n: [0, 0, 1], c: [[x + 1, y + 1], [x, y + 1]], light: 0.85 },
          { nx: -1, ny: 0, n: [-1, 0, 0], c: [[x, y + 1], [x, y]], light: 0.7 },
          { nx: 1, ny: 0, n: [1, 0, 0], c: [[x + 1, y], [x + 1, y + 1]], light: 0.78 },
        ];
        for (const f of faces) {
          if (staticWall(x + f.nx, y + f.ny) || !grid.inside(x + f.nx, y + f.ny)) continue;
          const [[x0, z0], [x1, z1]] = f.c;
          mb.quad(
            [[x0, 0, z0], [x1, 0, z1], [x1, H, z1], [x0, H, z0]],
            [[0, 0], [1, 0], [1, H], [0, H]],
            [f.light * 0.55, f.light * 0.55, f.light, f.light],
            f.n
          );
        }
        continue;
      }
      const corners = (yy) => [[x, yy, y], [x + 1, yy, y], [x + 1, yy, y + 1], [x, yy, y + 1]];
      const uvs = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
      floor.quad(corners(0), uvs, [1, 1, 1, 1], [0, 1, 0]);
      if (level.ceiling) ceiling.quad(corners(H), uvs, [0.8, 0.8, 0.8, 0.8], [0, -1, 0]);
      if (isExit.has(y * parsed.w + x)) {
        exitPads.quad(corners(0.004), [[0, 0], [1, 0], [1, 1], [0, 1]], [1, 1, 1, 1], [0, 1, 0]);
      }
    }
  }

  for (const [ch, mb] of wallBuilders) {
    const texName = level.textures[ch] || 'brick';
    // One material per wall character, so the eye painting can change by itself.
    const mat = basic(surfaceTexture(texName));
    materials[ch] = mat;
    root.add(mb.build(mat));
  }
  root.add(floor.build(basic(surfaceTexture(level.textures.floor))));
  if (level.ceiling) root.add(ceiling.build(basic(surfaceTexture(level.textures.ceiling))));
  if (parsed.exits.length) {
    root.add(exitPads.build(basic(surfaceTexture('exitPad'))));
    for (const e of parsed.exits) {
      const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: frames.misc.exit, fog: true }));
      beacon.center.set(0.5, 0);
      beacon.scale.set(0.8, 0.8, 1);
      beacon.position.set(e.x + 0.5, 0.1, e.y + 0.5);
      root.add(beacon);
    }
  }

  // Doors: thin slabs that slide up into the ceiling.
  const doorTex = { null: 'door', keyRed: 'doorRed', keyBlue: 'doorBlue' };
  const doors = parsed.doors.map((d) => {
    const alongX = staticWall(d.x - 1, d.y) || staticWall(d.x + 1, d.y);
    const geo = new THREE.BoxGeometry(alongX ? 1 : 0.25, H, alongX ? 0.25 : 1);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: surfaceTexture(doorTex[d.key]), fog: true }));
    mesh.position.set(d.x + 0.5, H / 2, d.y + 0.5);
    root.add(mesh);
    const door = { ...d, mesh, open: 0, opening: false, solid: true };
    grid.dynamic.set(grid.idx(d.x, d.y), door);
    return door;
  });

  // Moving walls: full blocks that sink into the floor and rise again.
  const moverMat = new THREE.MeshBasicMaterial({ map: surfaceTexture(level.textures['='] || 'gold'), fog: true });
  const movers = parsed.movers.map((m) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, H, 1), moverMat);
    const mover = { ...m, mesh, h: m.up ? 1 : 0, target: m.up ? 1 : 0, solid: m.up };
    mesh.position.set(m.x + 0.5, (mover.h - 1) * H + H / 2, m.y + 0.5);
    root.add(mesh);
    grid.dynamic.set(grid.idx(m.x, m.y), mover);
    return mover;
  });

  // Sky: a tall cylinder painted on the inside that follows the player around.
  let sky = null;
  if (level.sky !== 'none') {
    const tex = skyTexture(level.sky);
    tex.repeat.set(2, 1);
    sky = new THREE.Mesh(
      new THREE.CylinderGeometry(40, 40, 80, 32, 1, true),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false })
    );
    sky.renderOrder = -1;
    root.add(sky);
  }

  return { root, materials, doors, movers, sky, weather: buildWeather(level, frames) };
}

// Rain, motel dust or rising embers: a cloud of points that wraps around you.
function buildWeather(level, frames) {
  const kinds = {
    rain: { tex: frames.misc.rain, count: 700, speed: [0, -9, 0], size: 0.16 },
    dust: { tex: frames.misc.dust, count: 260, speed: [0.1, 0.05, 0.05], size: 0.05 },
    embers: { tex: frames.misc.ember, count: 300, speed: [0, 0.8, 0], size: 0.07 },
  };
  const k = kinds[level.weather];
  if (!k) return null;
  const positions = new Float32Array(k.count * 3);
  for (let i = 0; i < k.count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = Math.random() * 4;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ map: k.tex, size: k.size, transparent: true, depthWrite: false, fog: true })
  );
  points.frustumCulled = false;
  return {
    points,
    update(dt, px, pz) {
      const p = geo.attributes.position.array;
      for (let i = 0; i < k.count; i++) {
        const j = i * 3;
        p[j] += k.speed[0] * dt + Math.sin(p[j + 1] * 3 + i) * 0.002;
        p[j + 1] += k.speed[1] * dt;
        p[j + 2] += k.speed[2] * dt;
        if (p[j + 1] < 0) p[j + 1] += 4;
        if (p[j + 1] > 4) p[j + 1] -= 4;
        // keep every particle inside a 16x16 box centred on the player
        if (p[j] - px > 8) p[j] -= 16;
        if (p[j] - px < -8) p[j] += 16;
        if (p[j + 2] - pz > 8) p[j + 2] -= 16;
        if (p[j + 2] - pz < -8) p[j + 2] += 16;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

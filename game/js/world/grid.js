// The world is a grid of 1x1 tiles. This class answers the questions the game
// keeps asking: "is this tile solid?", "what does this ray hit?", "can the enemy
// see me?", and "which way is the player from here?".

export class Grid {
  constructor(parsed) {
    this.w = parsed.w;
    this.h = parsed.h;
    this.walls = new Uint8Array(this.w * this.h);
    this.wallChar = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const ch = parsed.walls[y][x];
        this.walls[y * this.w + x] = ch === '.' ? 0 : 1;
        this.wallChar[y * this.w + x] = ch;
      }
    }
    // Doors and moving walls register here. Each has a `.solid` flag.
    this.dynamic = new Map();
    this.flow = new Int16Array(this.w * this.h);
  }

  idx(x, y) {
    return y * this.w + x;
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  isSolid(x, y) {
    if (!this.inside(x, y)) return true;
    const i = y * this.w + x;
    if (this.walls[i]) return true;
    const d = this.dynamic.get(i);
    return d ? d.solid : false;
  }

  // Does a circle of radius r centred at (x, z) overlap anything solid?
  blocked(x, z, r) {
    return (
      this.isSolid(Math.floor(x - r), Math.floor(z - r)) ||
      this.isSolid(Math.floor(x + r), Math.floor(z - r)) ||
      this.isSolid(Math.floor(x - r), Math.floor(z + r)) ||
      this.isSolid(Math.floor(x + r), Math.floor(z + r))
    );
  }

  // Move one axis at a time so you slide along walls instead of sticking.
  move(obj, dx, dz, r) {
    if (dx) {
      let nx = obj.x + dx;
      if (this.blocked(nx, obj.z, r)) {
        nx = dx > 0 ? Math.floor(nx + r) - r - 1e-4 : Math.floor(nx - r) + 1 + r + 1e-4;
        if (this.blocked(nx, obj.z, r)) nx = obj.x;
      }
      obj.x = nx;
    }
    if (dz) {
      let nz = obj.z + dz;
      if (this.blocked(obj.x, nz, r)) {
        nz = dz > 0 ? Math.floor(nz + r) - r - 1e-4 : Math.floor(nz - r) + 1 + r + 1e-4;
        if (this.blocked(obj.x, nz, r)) nz = obj.z;
      }
      obj.z = nz;
    }
  }

  // DDA ray march (the same trick classic raycasters use): hop from tile edge
  // to tile edge until a solid tile is hit. (dx, dz) must be a unit vector.
  raycast(ox, oz, dx, dz, maxDist = 64) {
    let mx = Math.floor(ox);
    let my = Math.floor(oz);
    const ddx = dx === 0 ? 1e30 : Math.abs(1 / dx);
    const ddy = dz === 0 ? 1e30 : Math.abs(1 / dz);
    const stepX = dx < 0 ? -1 : 1;
    const stepY = dz < 0 ? -1 : 1;
    let sideX = (dx < 0 ? ox - mx : mx + 1 - ox) * ddx;
    let sideY = (dz < 0 ? oz - my : my + 1 - oz) * ddy;
    let dist = 0;
    let side = 0;
    for (let i = 0; i < 256; i++) {
      if (sideX < sideY) {
        dist = sideX;
        sideX += ddx;
        mx += stepX;
        side = 0;
      } else {
        dist = sideY;
        sideY += ddy;
        my += stepY;
        side = 1;
      }
      if (dist > maxDist) return { hit: false, dist: maxDist };
      if (this.isSolid(mx, my)) return { hit: true, dist, cx: mx, cy: my, side };
    }
    return { hit: false, dist: maxDist };
  }

  lineOfSight(ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) return true;
    return this.raycast(ax, az, dx / len, dz / len, len).dist >= len - 1e-3;
  }

  // Breadth-first "distance to the player" map. Enemies walk downhill on it,
  // which is how they find their way around corners.
  buildFlow(px, pz) {
    const flow = this.flow;
    flow.fill(-1);
    const sx = Math.floor(px);
    const sy = Math.floor(pz);
    if (!this.inside(sx, sy)) return;
    const queue = new Int32Array(this.w * this.h);
    let head = 0;
    let tail = 0;
    flow[this.idx(sx, sy)] = 0;
    queue[tail++] = this.idx(sx, sy);
    while (head < tail) {
      const i = queue[head++];
      const x = i % this.w;
      const y = (i / this.w) | 0;
      const d = flow[i] + 1;
      if (d > 60) continue;
      if (x > 0) visit(this, i - 1, x - 1, y, d);
      if (x < this.w - 1) visit(this, i + 1, x + 1, y, d);
      if (y > 0) visit(this, i - this.w, x, y - 1, d);
      if (y < this.h - 1) visit(this, i + this.w, x, y + 1, d);
    }
    function visit(grid, j, x, y, d) {
      if (flow[j] !== -1 || grid.isSolid(x, y)) return;
      flow[j] = d;
      queue[tail++] = j;
    }
  }

  // Best neighbouring tile centre to step to, heading toward the player.
  flowStep(x, z) {
    const cx = Math.floor(x);
    const cy = Math.floor(z);
    let best = null;
    let bestD = 1e9;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!this.inside(nx, ny)) continue;
      const d = this.flow[this.idx(nx, ny)];
      if (d >= 0 && d < bestD) {
        bestD = d;
        best = { x: nx + 0.5, z: ny + 0.5 };
      }
    }
    return best;
  }

  randomFloorNear(x, z, minR, maxR, rand = Math.random) {
    for (let tries = 0; tries < 40; tries++) {
      const a = rand() * Math.PI * 2;
      const r = minR + rand() * (maxR - minR);
      const tx = Math.floor(x + Math.cos(a) * r);
      const ty = Math.floor(z + Math.sin(a) * r);
      if (!this.isSolid(tx, ty)) return { x: tx + 0.5, z: ty + 0.5 };
    }
    return null;
  }
}

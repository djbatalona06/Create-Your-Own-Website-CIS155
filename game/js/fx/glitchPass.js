// The final "post-processing" pass. The 3D world is drawn small (like an old
// game), then this shader stretches it to the screen and adds the dream look:
// scanlines, colour split, a glitch when you're hurt, TV static near a Channel
// Hound, and the inverted, melting colours of the Lucid Pill.
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uRes;      // size of the small render, in pixels
  uniform float uTime;
  uniform float uHurt;    // 0..1 red glitch when damaged
  uniform float uLucid;   // 0..1 Lucid Pill strength
  uniform float uStatic;  // 0..1 TV snow
  uniform float uFlash;   // 0..1 muzzle flash brightness
  uniform float uFx;      // 0 = effects off, 0.5 = soft, 1 = full
  uniform float uFade;    // 0..1 fade to white (waking up)
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  vec3 hueShift(vec3 c, float a) {
    const vec3 k = vec3(0.57735);
    float ca = cos(a);
    return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
  }

  void main() {
    vec2 uv = vUv;
    float fx = uFx;

    // Lucid Pill: the screen ripples like warm air
    uv.x += sin(uv.y * 12.0 + uTime * 3.0) * 0.012 * uLucid * fx;
    uv.y += cos(uv.x * 9.0 + uTime * 2.0) * 0.010 * uLucid * fx;

    // Hurt: random horizontal bands slide sideways
    float band = floor(uv.y * 24.0);
    float tick = floor(uTime * 20.0);
    float glitchOn = step(1.0 - uHurt * 0.55, hash(vec2(band, tick)));
    uv.x += (hash(vec2(band, tick + 7.0)) - 0.5) * 0.08 * glitchOn * fx;

    // Chromatic aberration: red and blue drift apart
    float split = (0.0012 + uHurt * 0.008 + uLucid * 0.006) * fx;
    vec3 col;
    col.r = texture2D(tDiffuse, uv + vec2(split, 0.0)).r;
    col.g = texture2D(tDiffuse, uv).g;
    col.b = texture2D(tDiffuse, uv - vec2(split, 0.0)).b;

    // TV static
    float n = hash(floor(vUv * uRes) + fract(uTime * 7.0) * 100.0);
    col = mix(col, vec3(n), clamp(uStatic, 0.0, 1.0) * 0.4 * max(fx, 0.35));

    // Lucid Pill: invert and slowly rotate every colour
    vec3 dream = hueShift(1.0 - col, uTime * 1.5 * fx);
    col = mix(col, dream, uLucid);

    col += uFlash * vec3(0.22, 0.12, 0.28);

    // Vignette, tinted pink when hurt
    vec2 d = vUv - 0.5;
    float vig = dot(d, d);
    col = mix(col, vec3(1.0, 0.0, 0.35), clamp(uHurt * vig * 2.5, 0.0, 0.6));
    col *= 1.0 - vig * 0.9;

    // Scanlines, one dark line per pixel row of the small render
    float scan = 0.86 + 0.14 * sin(vUv.y * uRes.y * 3.14159 * 2.0);
    col *= mix(1.0, scan, fx);

    col = mix(col, vec3(1.0), uFade);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createGlitchPass() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      uRes: { value: new THREE.Vector2(320, 180) },
      uTime: { value: 0 },
      uHurt: { value: 0 },
      uLucid: { value: 0 },
      uStatic: { value: 0 },
      uFlash: { value: 0 },
      uFx: { value: 1 },
      uFade: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return { material, scene, camera, uniforms: material.uniforms };
}

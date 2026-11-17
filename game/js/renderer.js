// Owns the WebGL renderer. Draws the world and the weapon into a small
// low-resolution image, then the glitch pass stretches it over the screen.
import * as THREE from 'three';
import { createGlitchPass } from './fx/glitchPass.js';

// Internal render heights for the Quality setting.
const QUALITY = { low: 180, med: 240, high: 320 };

export class Renderer {
  constructor(canvas) {
    THREE.ColorManagement.enabled = false; // keep colours exactly as painted
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.gl.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.gl.setPixelRatio(1);
    this.gl.autoClear = false;

    this.camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 80);
    this.camera.rotation.order = 'YXZ';

    // The weapon lives in its own tiny scene with a flat camera.
    this.hudScene = new THREE.Scene();
    this.hudCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);

    this.target = new THREE.WebGLRenderTarget(320, 180, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
    });
    this.post = createGlitchPass();
    this.post.uniforms.tDiffuse.value = this.target.texture;
    this.quality = 'med';
    this.resize();
  }

  setQuality(q) {
    this.quality = QUALITY[q] ? q : 'med';
    this.resize();
  }

  resize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    this.gl.setSize(w, h, false);
    const aspect = w / h;
    const ih = QUALITY[this.quality];
    const iw = Math.round(ih * aspect);
    this.target.setSize(iw, ih);
    this.post.uniforms.uRes.value.set(iw, ih);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.hudCamera.left = -aspect;
    this.hudCamera.right = aspect;
    this.hudCamera.updateProjectionMatrix();
    this.aspect = aspect;
  }

  render(scene) {
    const gl = this.gl;
    gl.setRenderTarget(this.target);
    gl.setClearColor(scene.fog ? scene.fog.color : 0x000000, 1);
    gl.clear();
    gl.render(scene, this.camera);
    gl.clearDepth();
    gl.render(this.hudScene, this.hudCamera);
    gl.setRenderTarget(null);
    gl.render(this.post.scene, this.post.camera);
  }
}

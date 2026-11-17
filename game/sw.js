// Service worker: lets the game open with no internet after the first visit.
// "Network first": always try the newest file, and fall back to the saved copy
// when offline. That way your edits show up right away while you develop.
const CACHE = 'neon-somnia-v1';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/game.css',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './vendor/three.module.min.js',
  './js/main.js',
  './js/game.js',
  './js/renderer.js',
  './js/save.js',
  './js/weapons.js',
  './js/pickups.js',
  './js/fx/glitchPass.js',
  './js/fx/sparks.js',
  './js/gfx/textures.js',
  './js/world/levels.js',
  './js/world/levelParse.js',
  './js/world/levelBuilder.js',
  './js/world/grid.js',
  './js/world/dreamLogic.js',
  './js/entities/player.js',
  './js/entities/enemies.js',
  './js/entities/sprites.js',
  './js/input/input.js',
  './js/input/touch.js',
  './js/input/keyboard.js',
  './js/audio/audio.js',
  './js/audio/sfx.js',
  './js/audio/music.js',
  './js/ui/hud.js',
  './js/ui/menus.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

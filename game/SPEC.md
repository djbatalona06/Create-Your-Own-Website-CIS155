# Neon Somnia: Six-Document Spec

> An **original** surreal cyberpunk first-person shooter for phone browsers.
> It replaces the native DOOM-engine port idea from PR #4 with our own game:
> our own name, world, enemies, maps, art and music. Nothing comes from DOOM.

Read order: 01 PRD → 02 TRD → 03 App Flow → 04 UI/UX → 05 Data Schema → 06 Implementation Plan.

---

## 01. PRD (Product Requirements)

**Pitch:** You're a night-shift courier trapped inside a sleeping city's shared dream. Fight through three dreams to wake up.

**Users:** students and casual players on phones; desktop players for testing.

**MVP (in scope)**
- 3 short levels: *Rain Market*, *Static Motel*, *Alarm Tower*.
- 3 enemies + 1 boss: Mask Drifter, Channel Hound, Chrome Mime, The Snooze.
- 3 weapons: Pulse Pistol, Prism Scatter, Arc Lance. Pickups: health, armor, volts (ammo), keycards, Lucid Pill.
- Surreal rules: rooms bigger on the inside, a looping hallway, an eye painting that breaks the loop, breathing walls, a gate that slams shut.
- Touch controls, keyboard and mouse, pause, options, level select, saved progress, offline play, home-screen install.

**Out of scope:** multiplayer, accounts, ads, analytics, in-app purchases, app-store builds.

**Success checks**
- `node game/tests/levels.test.mjs` proves every level can be finished.
- `node game/tests/smoke.mjs` passes on emulated iPhone and Pixel with zero page errors.
- Playable start to finish with touch only.

---

## 02. TRD (Technical Requirements)

| Layer | Choice | Why |
|---|---|---|
| 3D | Three.js r160, vendored in `vendor/` (MIT) | Real 3D on WebGL; vendored so it works offline and never changes underneath us |
| Language | Plain JavaScript ES modules | No build step; open the file and edit |
| Look | Low-res render target + custom glitch shader | Retro pixels, scanlines, colour split, Lucid invert |
| Art | Canvas-drawn textures and sprites | No image files to license |
| Audio | Web Audio API synthesis | No sound files; tiny download |
| Storage | `localStorage` (wrapped in try/catch) | Settings and progress, no server |
| Offline | Service worker (network first) | Opens without internet after the first visit |
| Hosting | GitHub Pages (existing workflow) | Already deploys this repo |

**Rules**
- `.html` holds only HTML; CSS in `css/`, JS in `js/`.
- Game logic runs at a fixed 60 steps per second, whatever the screen's refresh rate.
- Walls are merged into one mesh per texture, with only the visible faces built.

---

## 03. App Flow

```
Loading → Title ─┬─ Start Dreaming → Intro card → Playing
                 ├─ Continue (highest unlocked) → Intro → Playing
                 ├─ Choose Dream → Intro → Playing
                 ├─ Options ↔ back
                 └─ How to Play ↔ back

Playing ─┬─ Pause button / Esc / app hidden → Paused (Resume · Restart · Options · Quit)
         ├─ step on exit pad → Dream Escaped (stats) → Next Dream → Intro …
         ├─ health hits 0 → You Slipped Deeper (Try Again · Title)
         └─ defeat The Snooze (Dream 3) → fade to white → You Woke Up → Title
```

Edge cases: portrait phone → "turn sideways" card (dismissable). Storage blocked → game still runs, nothing is saved.

---

## 04. UI/UX Brief

- **Mood:** vaporwave night city, uncanny but not gory. Hot pink `#ff2bd6`, cyan `#00f0ff`, violet `#9c4bff`, yellow `#ffe600` on near-black `#0b0214`.
- **Type:** system monospace (works offline).
- **Controls:** floating left stick, drag on the right half to turn, FIRE (doubles as an aim pad), USE, SWAP, PAUSE. Every target is at least 44px. Left-handed mirror mode.
- **Safety:** flashing warning on the title. Glitch FX can be set to Full, Soft or Off. Respects reduced motion.
- **Safe areas:** HUD and buttons stay clear of notches and rounded corners.

---

## 05. Data Schema (local only, no backend)

`localStorage["neonSomnia.v1"]`

| Key | Type | Default |
|---|---|---|
| `settings.musicVol` | 0–1 | 0.5 |
| `settings.sfxVol` | 0–1 | 0.8 |
| `settings.lookSens` | 0.3–2.5 | 1 |
| `settings.touchOpacity` | 0.15–1 | 0.55 |
| `settings.leftHanded` | boolean | false |
| `settings.fx` | `full` \| `soft` \| `off` | `full` |
| `settings.quality` | `low` \| `med` \| `high` | `med` |
| `settings.vibrate` | boolean | true |
| `unlocked` | 1–3 | 1 |
| `best` | `{ levelId: seconds }` | `{}` |

**Level format** (`js/world/levels.js`): a text map where one character is one tile, plus a `markers` table for custom tiles (teleports, moving walls, triggers).

---

## 06. Implementation Plan (each phase ends with a check)

| Phase | Work | Check |
|---|---|---|
| 0 | Vendor Three.js, low-res render + glitch pass | Page boots, no errors |
| 1 | Touch + keyboard input, safe areas, rotate card | Synthetic touches walk and turn |
| 2 | Map parser, wall builder, collision, doors, keys, exit | Level 1 finishable |
| 3 | Weapons, enemies, pickups, HUD, death | Fire hits, game over works |
| 4 | Teleports, loop + eye, breathing walls, gate, boss | All 3 levels' tricks fire in the smoke test |
| 5 | Synth SFX + music, unlocked on first tap | No audio errors |
| 6 | Menus, saves, PWA manifest, service worker, icons | Progress survives reload |
| 7 | Docs, nav link, polish | `levels.test.mjs` and `smoke.mjs` pass |

**Ideas for v2:** a map editor page, more dreams, gamepad support, a speedrun timer leaderboard (would need a backend).

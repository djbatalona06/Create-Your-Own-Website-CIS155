# DOOM-Style Mobile Shooter: Six-Document Spec

> **Working title:** "Shareware Slayer (working title)". Do not use the DOOM name or logo in the app name, store listing, icon, or keywords. DOOM is a trademark owned by ZeniMax Media, so a license is needed for that. Confirm this with counsel before any public release.

**Read order:** 01 PRD → 02 TRD → 03 App Flow → 04 UI/UX Brief → 05 Backend Schema → 06 Implementation Plan.

**Revision 2:** Corrected the audio facts (doomgeneric's SDL port includes sound). Added the build type (TRD) and a risk-mitigation table (TRD). Made the Phase 0 gate time-boxed and moved a rough touch test into Phase 1.

---

## 01. PRD (Product Requirements Doc)

### Problem
Mobile players who love classic first-person shooters have no free, touch-friendly way to play the original 1993 level design on a phone.

### Goal
Ship a free iOS and Android app that plays **Episode 1 (E1M1–E1M9, the id shareware episode)** with touch controls, sound, save/load, and a settings menu. The original 35 Hz game logic stays intact.

### Users
- **Nostalgic players:** adults who played the original and want it on a phone.
- **New players:** teens who want a classic FPS with short, self-contained levels.

### In scope (MVP)
- Engine runs E1M1–E1M9 at the original 35 ticks/sec.
- Touch controls: movement pad, look/turn, fire, use, weapon switch, run toggle.
- Main menu, episode/skill select, pause menu, save and load (engine save slots).
- Settings: control layout, look sensitivity, invert look, music/SFX volume, HUD scale.
- Optional WAD import: the user can load their own licensed `DOOM.WAD` or `DOOM2.WAD` from Files. Nothing is bundled.

### Out of scope (MVP)
- Multiplayer or any networking.
- Accounts, cloud saves, ads, analytics, in-app purchases.
- Mods, custom maps, or a level editor.
- Any bundled commercial game data.

### Legal and licensing constraints
| Item | Rule for this project |
|---|---|
| Engine source | id Software released the DOOM source under **GPL-2.0** (the repo's LICENSE and Carmack's note say so). Keep the GPL notice, provide source access, and keep derivative code under GPL-2.0. |
| Shareware WAD (`DOOM1.WAD`) | Ships with the app. Confirm the exact redistribution terms in the shareware readme before submitting. |
| Commercial WAD | **Never bundled.** Only imported by the user, who must own a copy. |
| Name, icon, logo | Working title only, no DOOM trademark. |
| App store GPL | Check each store's terms for GPL apps. Some stores restrict GPL distribution, so this is a release blocker to verify early. |

### Success metrics (MVP)
- E1M1 runs at a steady 35 logic ticks/sec on a mid-range phone (2021 or newer).
- Render at 60 fps display refresh with no tick drift over 10 minutes of play.
- A player can finish E1 with touch controls alone, no external controller.
- Crash-free sessions at or above 99% in the first 30 days (TestFlight and Play internal testing before public release).

### Key risks
1. **Audio:** doomgeneric's SDL port includes sound and music (`FEATURE_SOUND`), so reuse that approach. Music needs OPL FM synthesis, which Chocolate Doom provides under GPL-2.0. This stays the largest unknown until Phase 4 proves it on a phone.
2. **GPL vs. store terms:** see the legal table above.
3. **Touch input:** the original game expects a keyboard. Touch controls must not feel laggy.

---

## 02. TRD (Technical Requirements Doc)

### Stack decision
| Layer | Choice | Why |
|---|---|---|
| Engine | **doomgeneric** (C, GPL-2.0) as the base | Small porting surface: the engine is ported by implementing a few `DG_*` platform hooks. |
| Fallback engine | **Chocolate Doom** (C, GPL-2.0) | Use this if doomgeneric's sound or menus are too hard to add. It is more faithful to the original but a bigger porting job. |
| Platform window, input, audio | **SDL2** (+ SDL_mixer for audio) | One C-side API for both mobile platforms. |
| Android shell | Kotlin Activity + NDK (CMake) | Standard, and the NDK builds the same C core. |
| iOS shell | Swift/Obj-C host + C core | Standard, and the same C core. |
| Touch overlay | Native views drawn over the SDL surface | Native touch is smoother than SDL touch for virtual buttons. |
| Build | Gradle (Android), Xcode (iOS), CMake for the shared core | One C source tree for both platforms. |
| Min OS | Android 8.0 (API 26), iOS 15 | Enough reach for an app like this. |

> Confirm the current doomgeneric and SDL/SDL_mixer versions and their licenses before the Phase 0 spike. Pin exact versions in the lockfile once chosen.

### Build type
**Shared C engine + two thin native shells, built with CMake.**
- One C tree holds the engine and the platform layer. CMake builds it for Linux (desktop tests), Android (NDK), and iOS.
- The Android (Kotlin) and iOS (Swift) shells only host the window, touch overlay, file picker, and app lifecycle. No game logic lives in them.
- Rejected: Unity or Godot (the engine would have to be rewritten in another runtime, and the 35 Hz logic would need re-verification). A WebView build (input and audio latency is too high for a shooter).

### Architecture
```
┌──────────────────────────────────────────────┐
│ Native shell (Android Activity / iOS VC)     │  lifecycle, file picker, store
├──────────────────────────────────────────────┤
│ Touch overlay (native views)                 │  pad, buttons → key events
├──────────────────────────────────────────────┤
│ Platform layer (C, implements DG_* hooks)    │  frame blit, tick clock,
│                                              │  key queue, audio out
├──────────────────────────────────────────────┤
│ doomgeneric core (unmodified where possible) │  game logic at 35 Hz
└──────────────────────────────────────────────┘
```

### Platform hooks (verify names against the repo)
- `DG_Init`: create the SDL window/surface and audio device.
- `DG_DrawFrame`: copy the 320×200 framebuffer to the screen, scaled.
- `DG_SleepMs` and `DG_GetTicksMs`: frame and tick timing.
- `DG_GetKey`: pop a key event from the queue fed by the touch overlay and the hardware keyboard.
- `DG_SetWindowTitle`: no-op on mobile.

### Rules for the engine
- Keep the original 35 Hz tick. Do not change game logic to fit a faster frame rate.
- Render at 320×200 internally, then scale with nearest-neighbor to the screen with a 4:3 letterbox.
- No floating-point changes to game logic (demos and saves depend on it).

### Data and file handling
- `DOOM1.WAD` lives in the app bundle (read-only).
- Imported WADs are copied into the app's Documents folder, after checking the file header is `IWAD`.
- Save files go to the app's Documents folder, managed by the engine's save code.

### Non-functional requirements
- Cold start under 2 seconds on a mid-range phone.
- Battery: no sustained CPU above one core for menus; cap frame rate when paused.
- Memory: under 150 MB resident during gameplay.
- Offline only: no network calls.
- Privacy: no analytics SDKs, no tracking, no account.

### Testing
- **Unit-level:** a small C smoke test that loads `DOOM1.WAD` and runs 100 tics headless.
- **Device:** a manual checklist per phase on one Android and one iPhone.
- **Regression:** record a demo file on desktop Linux and replay it on mobile. Same inputs should produce the same map state.

### Risk mitigations
| Risk | Mitigation |
|---|---|
| Audio (SFX and music) | Reuse doomgeneric's SDL sound module for SFX. Take OPL music from Chocolate Doom. Fall back to SFX-only for v1 if music is blocked. |
| GPL vs. store terms | Get a written store-policy answer before Phase 1. Keep GPL notices and a source offer ready. If a store refuses GPL apps, ship on another store. |
| Engine drift | Leave engine files unmodified. Put all changes in the platform layer so upstream fixes merge cleanly. |
| Touch feel and lag | Run a rough touch test on a real phone in Phase 1, not Phase 3, so problems show up early. |
| Performance and battery | Keep logic at 35 ticks/sec and draw only 320×200. Profile audio mixing first, since that is the likely hot spot. |
| Trademark | Keep the working title. Counsel signs off before any store listing. |
| Scope creep | Time-box Phase 0 before starting. If E1M1 is not on track, switch to Chocolate Doom. |
| Porting bugs | Replay desktop demo files on the phone. Same inputs should give the same map state. |

---

## 03. App Flow

### Global navigation
```
Launch
 └─ Splash (GPL notice + "not affiliated with ZeniMax") → 2s or tap
     └─ Main Menu
         ├─ New Game → Episode Select (E1 only in free build) → Skill Select → Gameplay
         ├─ Load Game → Save Slot List → Gameplay
         ├─ Import WAD (full game) → Files picker → validate IWAD → Main Menu
         ├─ Options → Controls | Sound | Display | Back
         └─ Quit
```

### Gameplay loop
```
Gameplay (HUD on)
 ├─ Pause button → Pause Menu
 │    ├─ Resume → Gameplay
 │    ├─ Options → (same as Main Menu Options) → back to Pause Menu
 │    ├─ Save → Save Slot List → back to Pause Menu
 │    ├─ Load → Save Slot List → Gameplay
 │    └─ Quit to Main Menu
 ├─ Player dies → Game Over
 │    ├─ Restart checkpoint → Gameplay
 │    └─ Main Menu
 └─ Level exit → Intermission → next map → Gameplay
        (after E1M9 → Episode End → Main Menu)
```

### Edge cases the flow must handle
- **Incoming call or app backgrounded:** auto-pause, show Pause Menu on return.
- **WAD import of the wrong file:** show an error ("Not a DOOM IWAD"), keep the old state.
- **Save from a different WAD:** warn and refuse to load.
- **Storage full during save:** show an error, do not write a partial file.
- **Rotation:** lock to landscape during gameplay; menus support both.

---

## 04. UI/UX Design Brief

### Feel
Classic and retro. The HUD and palette come from the original game. Controls are modern and thumb-first. Think "classic game, clean phone UI," not a pixel-art mobile skin.

### Visual rules
- Game area: 320×200 scaled, nearest-neighbor, 4:3 letterbox. CRT filter is an optional toggle, off by default.
- HUD: the original status bar, scaled with a HUD-size setting (small, medium, large).
- Menus: the original menu graphics, drawn at the same scale as the game area.
- Colors: the original 256-color palette. Overlay buttons use semi-transparent white at 40% opacity.

### Touch layout (landscape)
```
┌───────────────────────────────────────────────────────┐
│ [Pause]                                  [Map]        │
│                                                        │
│                 GAME VIEW (4:3)                        │
│                                                        │
│ ( Move pad )                           [Fire]          │
│    left thumb                          [Use]  [Weapon] │
│                                        right thumb     │
└───────────────────────────────────────────────────────┘
```
- **Move pad:** bottom-left, floating (appears where the thumb lands) or fixed (setting).
- **Look:** drag on the right half of the screen. Sensitivity is a setting.
- **Fire:** large, bottom-right. **Use:** next to Fire. **Weapon:** cycle button.
- **Run:** a toggle on the move pad, not a separate button.
- Minimum touch target: 48 dp (Android) and 44 pt (iOS).

### Controls settings
- Layout: left-handed or right-handed.
- Pad type: floating or fixed.
- Look sensitivity: slider.
- Invert look: toggle.
- Overlay opacity: slider.
- Haptics: on or off (light tap on fire).

### Accessibility basics
- Labels on every button for VoiceOver and TalkBack.
- Overlay can be hidden entirely if the player uses a Bluetooth keyboard or controller.
- Text in menus at least 4.5:1 contrast with its background.
- Pause is always reachable with one tap.

### Store and first-run
- First launch: a short tip card with the move pad and fire button, dismissible.
- Splash shows the GPL notice and that the app is not affiliated with ZeniMax.

---

## 05. Backend Schema

### MVP: no backend
- No server, no accounts, no network calls. Everything is local.
- Reason: keeps the GPL and privacy surface small, and avoids hosting costs.

### Local storage

**Settings (key-value, stored as a JSON file in the app's Documents folder)**

| Key | Type | Default |
|---|---|---|
| `controls.layout` | `"right"` \| `"left"` | `"right"` |
| `controls.padType` | `"floating"` \| `"fixed"` | `"floating"` |
| `controls.lookSensitivity` | number, 0.1–3.0 | `1.0` |
| `controls.invertLook` | boolean | `false` |
| `controls.overlayOpacity` | number, 0–1 | `0.4` |
| `audio.musicVolume` | integer, 0–15 | `10` |
| `audio.sfxVolume` | integer, 0–15 | `10` |
| `display.hudScale` | `"small"` \| `"medium"` \| `"large"` | `"medium"` |
| `display.crtFilter` | boolean | `false` |
| `haptics.enabled` | boolean | `true` |
| `wad.importedPath` | string or null | `null` |

**Save slots (managed by the engine's save code, one file per slot)**

| Field | Source | Notes |
|---|---|---|
| slot index | filename `doomsav0`–`doomsav5` | Engine convention, 6 slots. |
| episode, map | engine save header | Shown in the Load menu. |
| skill | engine save header | Shown in the Load menu. |
| wad fingerprint | app-computed hash of the WAD | Refuses loads from a different WAD. |
| saved at | file modified time | Shown in the Load menu. |

**Entitlement (optional, only if a full-game unlock is ever added)**
- Stored locally after a receipt check. No server in MVP.

### Future (not MVP)
- Cloud saves would need a managed auth service and a privacy policy update. Keep the save format the same so this is an additive change.

---

## 06. Implementation Plan

Each phase ends with a **runnable check**. Do not start the next phase until the check passes.

### Phase 0: Desktop spike (proves the engine runs)
1. Clone doomgeneric. Build it on Linux with the SDL2 platform layer.
2. Run `DOOM1.WAD` and confirm E1M1 loads and plays.
3. Measure logic at 35 ticks/sec using the engine's own timer.
- **Check:** a 60-second headless run of E1M1 finishes with no crashes and a steady tick count.
- **Decision gate (time-boxed):** agree the time box before starting. If E1M1 does not run at 35 ticks/sec within it, or the SDL sound module will not play on desktop, switch to Chocolate Doom. Record the choice in the TRD.

### Phase 1: Android shell
1. Create the Android project with CMake building the C core.
2. Implement the `DG_*` hooks for Android (surface draw, timing, key queue).
3. Add the hardware keyboard path so the game is playable with a keyboard.
- **Check:** E1M1 is playable on a physical device with a keyboard and renders at 60 fps display refresh. A rough touch-pad test on the same phone shows the input lag, so touch problems surface here, not in Phase 3.

### Phase 2: iOS shell
1. Create the iOS project with the same C core.
2. Implement the same `DG_*` hooks, reusing the shared C platform file where possible.
- **Check:** E1M1 is playable on an iPhone with a keyboard.

### Phase 3: Touch overlay (both platforms)
1. Build the move pad, look drag, fire, use, weapon, pause, and map buttons as native views.
2. Map touch events to the key queue.
- **Check:** E1 is completable on touch alone, on one Android and one iPhone. Input lag is under 100 ms in a manual test.

### Phase 4: Audio (the biggest unknown)
1. Port doomgeneric's SDL sound module for SFX through SDL_mixer. Check the license of every file it pulls in.
2. Add music. The original music is MIDI rendered through OPL FM synthesis. Use Chocolate Doom's OPL emulator (GPL-2.0). A stock soundfont is the fallback if OPL is hard to link on mobile.
3. Add volume settings.
- **Check:** SFX and music play on both platforms with no stutter over 10 minutes, and audio mixing causes no CPU spike during heavy combat. If the music path is not workable, ship SFX-only and log music as a known gap.

### Phase 5: Menus, save/load, settings
1. Wire the main menu, episode and skill select, pause menu, and options.
2. Persist settings to JSON (schema in 05).
3. Wire save and load to the engine's save slots, with the WAD fingerprint check.
- **Check:** save on E1M3, force-quit, relaunch, load, and continue from the same spot.

### Phase 6: WAD import (full game, license-gated)
1. Add the Files picker, `IWAD` header check, and copy into Documents.
2. Add the "Not a DOOM IWAD" error path.
- **Check:** importing a valid WAD unlocks its episodes, and importing a random file shows the error with no state change.

### Phase 7: QA, performance, and store prep
1. Run the device checklist on at least three phones, including one older Android.
2. Profile: cold start under 2 seconds, memory under 150 MB, battery check over 20 minutes.
3. Prepare store assets: privacy policy (no data collected), age rating (cartoon-style violence), GPL notices in the app and in a source-offer page, and the working-title listing.
4. Ship TestFlight and Play internal testing first.
- **Check:** all success metrics in 01 pass, and the legal table in 01 is signed off.

---

## Open questions (to answer before Phase 0)
1. Final app name, since the working title can't use DOOM.
2. Confirm the shareware WAD redistribution terms.
3. Confirm each app store accepts a GPL-2.0 app and what source-offer language it needs.
4. Audio path: confirm doomgeneric's SDL sound module works on desktop, then choose OPL music (from Chocolate Doom) or SFX-only for v1.
5. Confirm doomgeneric's exact license and `DG_*` hook names against its repo. Both are from search excerpts so far.

# Twilight Rally · Solo adventure update — 18 November 2026

Continue resumes the highest unlocked stage on this browser. Results offer Next Level after a progression win, Replay/Try Again, and More Options (choose level, practice, speed, menu). Progress never advances without player input. First clears award 100 + 10 × min(level, 60) local Adventure points; replays, losses and practice award no points. Existing cleared stages are not awarded points retroactively. Levels 1–5 show dismissible tips; these tips do not certify skill mastery.

These saves and points remain local to this browser. Sign-in, cloud sync, online leaderboard and two-player networking are not implemented in this release. Hosting remains undecided. The existing capped AI and unlimited numbered progression remain unchanged.

# Twilight Rally · Editable arcade game

A dependency-free HTML, CSS and JavaScript Canvas game. Updated from the corrected v0.2.0 source; original WAV files and the original sound-pack ZIP are preserved. All source is expanded and formatted for VS Code. No build step or npm install is needed.

## Start locally

Install Node.js 20+ and extract the ZIP into a fresh folder. Open the `twilight-rally` folder in VS Code, then run:

```powershell
npm.cmd start
```

If an older game server is running, stop it with Ctrl+C in its terminal first. Run the command from this new game folder, then open http://localhost:5173 and refresh with Ctrl+Shift+R. Do not double-click index.html: ES modules require a local server. To use another port:

```powershell
$env:PORT='5190'
npm.cmd start
```

You can use your computer's LAN IP to play solo on a phone on the same Wi-Fi, if your firewall permits it. This does not create an online multiplayer game.

## Play

- **Move:** mouse, drag the arena, Up/Down or W/S, or hold the on-screen Up/Down buttons. Pointer, touch and keyboard movement all use the same 600 virtual-pixel/second player limit.
- **Pause:** P, Escape, or Pause. Resuming has a five-second countdown. Opening any menu, hiding the tab or losing window focus pauses a match, including its countdown. Fire timers freeze while paused or in menus.
- **Win:** first to seven with a two-point lead; at 15 points the leader wins.
- **Levels:** start at Level 1, replay any unlocked level, or select Practice to try a higher level. Enter a positive whole number. Winning the highest unlocked level in Progression unlocks exactly the next one. Practice does not unlock levels or add progression wins/matches. Its completed matches are counted separately.
- **Speed:** Chill, Classic and Turbo affect ball pace, independently of AI level. Player movement speed stays fixed. Changing speed resets the match.
- **Graphics:** Lite, Balanced and Ultra change effects, without changing physics or collision radius.
- **Fire:** Arcade Fireball is optional in Settings. Turning it off disables it for both sides and resets the match.

## Earned Fireball

Successful returns add 20 energy plus up to 6 for an angled return. Returning an opponent's Fireball gives 10 extra energy. About five returns fill the gauge. Both players follow the same charging, boost and expiry rules; the AI waits one second after becoming ready before arming.

At 100%, a ready sound and visible state announce an **eight-second gameplay window**. Tap Fire or press Space while the arena has keyboard focus. Your **next successful return must happen before that same deadline**. Arming does not extend the window. Holding Space does not repeatedly activate Fireball. Space/Enter still operates focused buttons and menu controls normally.

The shot launches at up to 1.25× normal speed, capped at 750 virtual pixels/second, with a bright core, short trailing flame and launch sound. It ends on the opponent's return or after 2.8 seconds. Normal speed is restored, boosts cannot stack, and the ball's collision radius stays 9. A point resets both gauges and any active Fireball. A missed activation window empties that gauge.

Lite uses one compact flame ribbon; Balanced uses three ribbons and a bounded particle trail; Ultra uses five and a slightly richer trail. Reduced-motion mode uses a static compact flame without animated particles. Fire-ready and launch WAV files are original synthesized effects; regenerate them with `npm.cmd run audio:generate`.

## Difficulty and endless progression

AI now uses a small aiming offset held consistently through each incoming shot, rather than large random errors on every observation. Its limited prediction horizon makes difficult angled shots and wall rebounds expose positioning weaknesses naturally. Levels 1–5 remain forgiving; Levels 6–15 improve steadily; later levels reach fixed human-beatable limits and rotate six strategy archetypes. Speed remains independent of intelligence.

Physical ceilings are unchanged: AI movement at most 280 units/second, acceleration at most 850 units/second², and observations no faster than 300 ms. The aiming offset is now 16–24 units in learning levels, gradually reducing from 14 to 6 later. Prediction looks only 150–450 ms ahead, depending on level. No score manipulation, teleporting or deliberate miss lottery is used.

There is no designed final level; identifiers remain exact BigInt decimal strings. Capped strategies repeat. Simulated beatability is representative evidence, not a guarantee that every player wins.

## Responsive layout and accessibility

The interface uses a compact header, a flexible arena and persistent paddle/Fire controls within 100dvh (100vh fallback), with safe-area padding. Guide, Levels, Settings and stats are native modal dialogs with internal scrolling, explicit focus wrapping, Escape dismissal and opener focus restoration. Closing a menu leaves the match paused. Critical buttons have at least 44px-high targets and visible focus styles. Movement keys prevent page scrolling during play; menus retain normal editing and keyboard behavior. The score is readable text; important score, phase and Fire changes use polite announcements. The animated arcade itself remains primarily visual and is not a complete nonvisual game.

Browser chrome height changes are handled by dynamic viewport sizing. Reduced-motion preferences simplify effects. The game uses system fonts and no automatic third-party font requests. A round screen-space ball core keeps its centre legible on portrait screens; this visibility marker does not alter the underlying collision radius.

## Tests and evidence

```powershell
npm.cmd test
```

The 22 regression tests include entry/asset integrity, collision/scoring, exact level IDs, progression/practice rules, observation and movement limits, speed independence, Fire earn/arm/expiry/boost/reset rules and 108 seeded simulated matches. Each tested beginner and high-level/speed combination must be won in at least two of three seeds by its bounded simulation player.

For browser tests use Node.js 22+ and a separate Chrome instance with a fresh temporary profile. Start the game, then launch Chrome with:

```text
--headless=new --remote-debugging-port=9397 --user-data-dir=<a-fresh-test-profile-folder>
```

In PowerShell, from this project folder:

```powershell
$env:GAME_URL='http://localhost:5173'
$env:CDP_PORT='9397'
npm.cmd run test:responsive
npm.cmd run test:gameplay
npm.cmd run test:effects
npm.cmd run test:adventure
```

Run these browser scripts sequentially; they use the same test tab. Responsive tests cover ten sizes from 320×480 through 1920×1080, portrait and landscape, dynamic-height resizing, visible controls, touch paddle movement, modal focus behavior, countdown interruption, movement-key defaults and all 17 WAV responses.

The gameplay script uses real browser animation frames and normal pointer/key/touch event paths. A localhost-only `?qa=1` hook returns **cloned read-only snapshots** to observe the match; it provides no state setter. The test player does not inject points, energy, unlocked levels or physics changes. It earns charge through rallies, checks Space/touch launches and a frozen pause deadline, completes a Level 1 progression match, verifies unlock/next-level behavior and opens exact very-high-level practice. This run can take several minutes. Reports and screenshots are saved under `qa/`.

The effects test uses isolated renderer fixtures for Lite/Balanced/Ultra, reduced motion, bounded particle trails, render-density caps and a round portrait ball core. These fixtures never alter the live match.

Release QA used Chrome desktop and mobile emulation. Physical iOS/Safari, Android browser toolbars, low-end phones, assistive-technology combinations and subjective audio/balance still need device/human testing. Automated audio checks validate WAV availability and browser decoding; they do not certify speaker quality.

## Local data

Progress is stored under `twilight-rally-progress-v1` in the browser's localStorage. Private mode, storage clearing, a different port/origin or another device may reset it. The old `twilight-rally-solo` record is left intact; its best rally is carried forward, while old matches without level eligibility do not unlock progression. Storage errors fall back to the current session. Local records can be edited and are not secure ranked scores.

## Editable file map

- `index.html`: semantic interface, overlays, controls and dialogs.
- `src/main.js`: input, match state, UI, countdown, local persistence.
- `src/game/physics.js`: collisions, scoring and Fire integration.
- `src/game/ai.js`: sampled observations and physical AI movement.
- `src/game/levels.js`: exact level identifiers, bounded profiles, progression rules.
- `src/game/fire.js`: earned energy, activation deadlines and boost lifetime.
- `src/game/render.js`: arena, ball, trails and flame rendering.
- `src/config/settings.js`: speed, field, AI and Fire limits.
- `src/audio/sound.js`, `assets/audio/`: audio loader, original sounds and new Fire WAVs.
- `src/styles.css`: expanded editable responsive styles.
- `tests/`: regression tests and the bounded match simulator.
- `scripts/`: local server, optional browser checks and Fire audio generator.
- `qa/`: release evidence and reproducible test output.
- `docs/SHARED-GAMES-PLATFORM-BRIEF.md`: Twilight Play shared games platform roadmap, release gates and backend delivery brief.

## Online limitations and deployment

This release is **solo and local only**. Private multiplayer, invite codes, matchmaking, global leaderboards, accounts, cloud profiles, cross-device recovery, championships and server-verified scores are not implemented. The stats panel labels multiplayer/leaderboard features as in development. They require a real authoritative backend.

For static hosting upload `index.html`, `src/`, `assets/` and `public/`, keeping relative paths intact, including `public/favicon.svg`. Do not upload the development server, tests or QA evidence as public game content. The development server is for trusted local testing, not production hosting.

The Adventure browser check runs after gameplay/effects checks: it reloads the naturally earned Level 2 save, verifies 110 local points, Continue and tip dismissal without injecting progress.

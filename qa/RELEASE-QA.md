# Release QA · Twilight Rally

## Passed

- JavaScript syntax checks for every source, server, test and browser-check module.
- 22 Node regression tests, including 108 seeded matches using bounded movement and observation intervals. This is representative balance evidence, not a guarantee of any individual player's win.
- Chrome responsive checks at 1920×1080, 1366×768, 1024×600, 768×1024, 390×844, 360×640, 320×480, 844×390, 568×320 and 320×568.
- Critical controls inside the viewport, minimum 44px button height, touch paddle movement, dynamic viewport-height changes, arrow-key default prevention during play and preserved defaults in menus.
- Native dialogs, countdown interruption, explicit Tab wrapping and focus restoration.
- Live browser rallies earned the Fire Gauge; Space and touch activation launched a Fireball on a subsequent return. Pausing froze the activation deadline. The ball retained its 9-unit collision radius and remained under the 750-unit speed cap.
- A complete browser Level 1 match earned the Level 2 unlock, with no injected scores, energy or progression. Next Level and exact high-number practice selection worked. Practice did not unlock progression.
- All 17 WAV files returned valid data; the 13 effects mapped for game use decoded in the browser. The other original audio files remain included for future use.
- Isolated rendering fixtures covered Lite/Balanced/Ultra and reduced-motion modes, bounded trails, density limits, and a round portrait ball core. Renderer fixture state is separate from live gameplay.
- The 15 original WAVs and original sound-pack ZIP match the prior release byte-for-byte.

## Evidence

- `results.json`: responsive checks, audio count and runtime error results.
- `gameplay-results.json`: earned Fire, activation paths, final progression score and exact high-level practice.
- `effects-results.json`: graphics-mode and reduced-motion fixtures. Render timings are diagnostic, not a device performance guarantee.
- Viewport PNGs, desktop/mobile Fireball PNGs and the mobile Level 1 victory PNG.

## Limits

Chrome desktop/mobile emulation was used. Real phones, Safari, low-end-device performance, assistive technologies, subjective sound and human difficulty balancing remain to be tested. Automated input tests establish functioning input paths and selected win scenarios; they do not prove every human can beat every level. Numbered progression has no designed final level, but capped difficulty rotates six recurring strategies. Device memory and storage are finite.

This is a local solo release. Multiplayer, invites, matchmaking, global rankings, accounts, cloud progress, championships and secure server-verified scoring are not implemented.

Solo adds first-clear Adventure points, Continue from the highest unlocked stage, dismissible learning tips and a post-match More Options dialog. These remain local, with no account/cloud/online features.

AI calibration: 100 controlled routine and 100 steep-angle shots per level/speed; see calibration-results.json. Live browser checks include an eight-hit Level 8 rally. Aiming error is sampled once per incoming shot; finite prediction horizon and physical limits drive misses.

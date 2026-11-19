# Twilight Rally maintenance instructions

- Keep HTML, CSS and JavaScript expanded, formatted and modular. Preserve the original audio assets.
- Run npm.cmd test after gameplay changes. For releases, run both browser scripts sequentially and inspect desktop/mobile screenshots.
- Never substitute README content for index.html. Verify the actual ZIP entry and every asset against the tested source.
- Keep speed independent of AI level. Never exceed the fixed physical AI/ball limits or award artificial points to force a result.
- Practice never unlocks progression or earns progression wins. Keep numeric level identifiers exact.
- Fire is earned through successful returns; arming never extends the eight-second deadline. Preserve collision radius and prevent boost stacking.
- Preserve dynamic viewport sizing, safe areas, visible controls, keyboard scrolling fixes, focus handling and reduced-motion behavior.
- QA snapshots must stay cloned, read-only and localhost-only; browser gameplay tests must not inject energy, scores or unlocked progress.
- Report physical-device and online-feature limitations honestly. Do not describe simulated beatability as a universal human-win guarantee.

# Twilight Play · Decision & Delivery Brief
## The Shared Games Platform
**Partner and implementation-agent handoff | 18 November 2026**

---

### Objective
Publish Twilight Rally under the existing Twilight Play domain, using the partner's established deployment process. Keep CrossTalk working. Keep the current game free for players and avoid introducing paid hosting or a new provider without an owner decision.

### Target Addresses
- `play.twilight.ng/` — shared games catalogue
- `play.twilight.ng/operation-crosstalk/` — existing CrossTalk
- `play.twilight.ng/twilight-rally/` — proposed Rally location

### What is Ready Today
Rally is an editable static HTML/CSS/JavaScript solo game with original audio, responsive controls, local progression, practice, Adventure points and earned Fireball. The latest AI calibration defends routine shots reliably and keeps physical limits. Accounts, cloud saves, global rankings and online two-player matches are not implemented.

### Hosting Evidence — Confirm Before Changing Anything
A public inspection on 18 November 2026 returned GitHub Pages headers for CrossTalk. Its public bundle included Supabase networking code; the saved project article describes Supabase Realtime. These are observations, not access to the hosting account, repository or complete architecture. The implementing agent must verify the real setup.

### Delivery Order
1. **Discover and preserve the existing setup.**
2. **Publish the current solo game and catalogue entry.**
3. **Validate and hand over a rollback procedure.**
4. **Implement accounts, cloud progression and rankings on a separately approved backend.**
5. **Add authoritative private two-player matches.**

### Project Rules
- Keep the internal game version at 1.0; do not put revision numbers in game UI, document titles or public filenames.
- Keep source expanded and editable.
- Do not claim online capabilities exist until they are deployed and tested.
- No Cloudflare account or domain migration is required for the first release.

---

## Phase 1 / Static Publication: Discover, Integrate, Preserve

### Required Access and Inputs
Obtain the canonical Twilight Play repository URL, repository-owner access, current branch, Pages publishing source, deployment workflow and the latest Rally ZIP. Use `Twilight-Rally-Editable.zip` for editable source or the matching current hosting package. If using a hosting ZIP, verify it includes the latest calibrated AI; do not assume an earlier hosting ZIP is current.

### Inspect Before Editing
Record the current production commit/artifact and confirm CrossTalk opens. Inspect the catalogue source, build command, output directory, Pages settings, custom-domain configuration and HTTPS. Establish whether games are built together or assembled from separate projects. Record the existing DNS setup; do not repoint `play.twilight.ng`.

### Integrate into the Existing Architecture
Prefer a separate source folder and a final output folder named `twilight-rally/`. If the current repository already uses an assembly workflow, extend that workflow. Do not replace the existing site root with Rally. Do not assume one repository per game automatically supports the desired paths: inspect whether this is an organization site, project site or shared build.

### Public Artifact Contents
- **Include:** Rally `index.html`, `src/`, `public/favicon.svg` and the WAV files in `assets/audio/`.
- **Exclude:** `tests/`, `scripts/`, `qa/`, `AGENTS.md`, local credentials, internal manifests and the original audio-concept ZIP from the public artifact.
- Preserve all original assets and tests in editable source. Verify the archive root becomes `/twilight-rally/index.html`, without an extra nested folder.

### Subpath and Browser Checks
- Keep script, CSS, favicon and audio paths relative to `/twilight-rally/`.
- Check every dynamic import and audio URL.
- Do not add a site-wide fallback redirect that sends CrossTalk or the catalogue into Rally.
- Scope any future service worker to the game path.
- Keep storage keys namespaced: both games share one origin, and `localStorage` is not separated by URL folder.

### Catalogue Entry
Add a Rally card with a clear solo-play description and launch link. Do not advertise online matches or cloud saving yet. Keep CrossTalk's card and address intact. Add a return-to-Twilight-Play link in Rally using the existing catalogue design system.

---

## Phase 2 / Public Launch: Release Gates and Rollback

### Free-Hosting Gate
Confirm the existing account, repository visibility, workflow and site use are eligible for its current plan. GitHub Pages supports static HTML/CSS/JavaScript and custom domains; public repositories can use GitHub Free. Private repository eligibility depends on the plan. Review GitHub Pages usage terms for a branded commercial project rather than assuming all business uses qualify. Existing domain renewal costs still apply. [1-3]

### Build and Automated Checks
Run the full Rally test suite, currently 22 regression tests with 108 seeded match simulations. Run the responsive, live gameplay, effects and Adventure persistence browser scripts sequentially. Recheck the final assembled site artifact, not just the source folder. Confirm the AI calibration report and original WAV integrity.

### Acceptance on the Actual Public Path
Verify catalogue, CrossTalk and Rally all load over HTTPS. Require successful HTML, CSS, module and audio responses with appropriate MIME types; no console errors, missing imports or mixed content. Test direct navigation, refresh, trailing slash, browser Back and links between games. Verify no internal source ZIP, credentials or QA reports were accidentally published.

### Gameplay and Accessibility Matrix
Test portrait 320×480, 360×640 and 390×844; landscape 568×320 and 844×390; desktop 1366×768 and 1920×1080. Verify no clipped critical controls, arrow-key scrolling prevention during play, ordinary keyboard behavior in dialogs, focus restoration, zoom, reduced motion, touch movement and browser-toolbar resizing. Include real Android Chrome and iPhone Safari before claiming device validation.

### Gameplay-Specific Gates
Complete a Level 1 match, unlock Level 2, reload and confirm Continue and local points. Verify replay/practice do not farm first-clear points. Check Level 8 routine returns and longer rallies, Fire earning, the eight-second deadline, tap/Space, pause and all graphics modes. Never inject points or energy into the live game to claim a gameplay test passed.

### Rollback and Handover
Publish through the established workflow with one owner controlling production deployment. Keep the prior complete site artifact/commit. If Rally or CrossTalk fails, restore that known-good artifact and verify all three URLs. Deliver the change summary, deployment commit, live URLs, test evidence, known limits and exact rollback steps. Do not delete unrelated site files as cleanup.

---

## Phase 3 / Backend Decision Required: Accounts and Lasting Solo Progress

### Choose Services After the Static Launch
Keep every public game at `play.twilight.ng`. A separate backend or API hostname can serve accounts and game data. Reuse the partner's existing services where suitable, but first confirm ownership, authentication support, security model, quotas, backups and ongoing cost. Cloudflare remains an option, not a requirement. Set measurable usage limits; do not promise permanently free unlimited backend operation.

### Simple Sign-In
Offer Continue with Google and an email sign-in link. Do not add an application-mandated second factor. Google or the email provider may still impose its own security checks. Use maintained identity libraries/providers, expiring single-use email links, secure sessions, sign-out and account recovery. Keep credentials and private service keys out of frontend bundles. Use a consistent immutable user ID across games.

### Progress Model
Store user ID, highest unlocked stage, selected/resume stage, completed-stage records, Adventure points, rules identifier, timestamps and revision counter. Keep stage identifiers as exact decimal strings; do not convert Level 1,000+ or very large identifiers through floating point. If database sorting uses text, sort levels by digit length then lexicographically, or use an exact numeric representation supported by that database.

### Checkpoint Semantics
Save each validated completed match atomically. Resume the current selected/uncompleted stage; restart an interrupted match rather than awarding completion. A win unlocks the next stage, but never advances automatically. After wins show Continue, Replay and More Options. After losses show Try Again and practice/level/speed/menu choices. Retain learning tips for the first five stages.

### Trust and Migration
The server must validate ranked results through an authoritative session or a defined replay-verification system. Never trust an uploaded localStorage level, score or points total. Existing guest progress may be imported as clearly unverified personal progress; do not retroactively convert it into global leaderboard credit without valid evidence. Decide this policy with the owner before migration.

### Recovery Acceptance
Test Google/email sign-in, expired links, account linking without duplicate identities, two devices updating one account, lost connections, retry after a save timeout, logout and deleted browser storage. Use unique match IDs and transactional writes so retries cannot duplicate rewards. Offline sessions may remain local practice; communicate unverified progress clearly.

---

## Phase 4 / Verified Adventure: Points, Rankings and Fair Stages

### Stage Progression
Keep Levels 1–5 approachable. Increase reaction, recovery and shot-selection skill gradually, while retaining fixed physical limits. Beyond the difficulty cap, vary recurring tactics and challenges rather than accelerating forever. There is no designed final stage; do not promise infinitely unique content or a mathematical guarantee that every human can win every stage.

### Preserve the Calibrated AI
Current ceilings: AI movement 280 virtual units/second, acceleration 850 units/second squared and observations no faster than 300 ms. Smaller errors remain consistent through an incoming shot. Speed and AI intelligence remain independent. Validate routine-shot returns and difficult-angle vulnerabilities, not just whether a scripted player can win. Retain the routine-shot Level 8 benchmark and seeded high-level tests.

### Scoring Contract
The local game currently awards first clears `100 + 10 × min(level, 60)` points; replay, practice and loss earn none. Treat this as the local baseline, not an approved competitive economy. Before global launch, freeze and document the online formula, tie-breakers, assisted-play rules and speed/Fireball categories. Version scoring rules internally so later changes remain auditable without showing public release numbers.

### Leaderboard Design
Show chosen display name, rank, verified points and highest verified stage, plus the player's own position. Never publish email addresses. Separate solo progression from multiplayer results. Exclude practice and unverified guest imports. Support pagination and stable tie-breaks. Decide seasonal versus lifetime records and how rule changes affect historical standings.

### Integrity and Abuse Checks
Use authenticated match sessions, bounded input validation, server clocks, duplicate-result protection and audit records. Rate-limit room creation, sign-in links and result submission. Validate lawful score progression and matching game rules. Client-side obfuscation and a client-submitted checksum are not proof of a genuine win.

### Release Evidence
Demonstrate one validated clear appearing exactly once on the leaderboard, two-device resume, recovery after a duplicated submission, rejected fabricated results, privacy controls and backup restoration. Provide a schema/migration plan, rollback strategy, service quotas and a cost trigger requiring owner action before any paid upgrade.

---

## Phase 5 / Shared Front Door, Separate Match Service: Private Two-Player Matches

### First Player Flow
`Play a Friend` → `Create Room` → copy invite link or short code → friend joins → both confirm readiness → shared countdown → match → mutually agreed rematch or leave. Let guests try unranked rooms if abuse controls permit. Keep solo progression separate from multiplayer results.

### Authority and Synchronization
Use one server-owned match state for ball physics, paddles, collisions, scores, Fire gauges and timers. Clients send movement and activation requests, never final scores. Run bounded server simulation; broadcast timestamped snapshots and event IDs. Use interpolation and local paddle prediction with reconciliation. Keep game rules shared/testable between solo and server code to prevent divergence.

### What to Borrow from CrossTalk
Reuse invitation codes, clear waiting/connected/ready states, lightweight onboarding and connection feedback. Verify its actual implementation before reusing code or service credentials. CrossTalk's discrete puzzle broadcasts are not evidence that the same client-authoritative transport is sufficient for continuous competitive Pong. Supabase broadcasts alone do not supply authoritative game simulation.

### Connection and Room Rules
Room codes must expire; join and control permissions must bind to the correct participant. Limit rooms to two active players, keep reconnection tokens secret, and handle duplicate tabs. Agree finite pause allowances and a reconnect grace period. A disconnected player must not win or lose through ambiguous client timers. Define abandonment and mutual rematch rules visibly.

### Network and Fairness Validation
Test two real devices on different networks, including mobile data; add delay, jitter, packet loss and reconnects. Proposed initial test cases: 50/150/300 ms round-trip delay and up to 2% packet loss, then tune launch thresholds from evidence. Never call these values guaranteed tolerances. Verify simultaneous Fire requests, score boundaries, disconnect during countdown and reconnect after a point.

### Hosting Compatibility Gate
Static Pages cannot run the live simulation service itself. Choose a backend with authenticated real-time connections and suitable compute. Reuse existing infrastructure only if it satisfies these needs. Keep the branded game URL unchanged regardless of backend choice. Start with private unranked matches; defer public matchmaking and ranked competition until synchronization and abuse handling pass.

---

## Instructions for the Implementing Agent

### Start Here
Read the repository instructions and this roadmap, inspect the existing Twilight Play deployment, and identify the current Rally source. Confirm repository ownership and the intended public path. Build the smallest integration that preserves CrossTalk, the catalogue and existing domain configuration. Finish static publication before expanding the backend scope.

### Decisions the Owner/Partner Must Supply
- Repository URL and access
- Existing Pages/workflow details
- Permission and ownership for deployment
- Approved catalogue assets
- Free-plan eligibility
- Backend provider and budget limits
- Google/email identity configuration
- Guest migration policy
- Competitive scoring rules
- Privacy/data-retention requirements
- Pause/disconnect rules

> [!CAUTION]
> Do not invent account access, copy another project's private keys or purchase services.

### Required Deliverables
1. Editable source with original audio and README
2. A production-only artifact
3. Separate tests and QA evidence
4. A change/PR summary
5. Live catalogue, CrossTalk and Rally links
6. Deployment identifiers
7. Rollback instructions
8. An honest list of remaining online features

*Keep public filenames and UI free of revision numbers and retain internal game version 1.0.*

### Definition of Done
- **Static launch:** All three URLs work (`play.twilight.ng/`, `play.twilight.ng/operation-crosstalk/`, `play.twilight.ng/twilight-rally/`), Rally passes source and public-path checks, CrossTalk is unchanged in behavior, and rollback is documented.
- **Later online launch:** Real authentication, cross-device saves, validated points, privacy-safe rankings and synchronized private matches must each pass their own acceptance gates. A placeholder button, local mock or successful build is not completion.

### Source Notes (Checked 18 November 2026)
- **[1] GitHub Pages overview:** static hosting, plans and repository eligibility (`docs.github.com/pages/what-is-github-pages`)
- **[2] Custom-domain behavior and multiple repositories:** (`docs.github.com/pages/about-custom-domains`)
- **[3] Usage restrictions, bandwidth and build limits:** (`docs.github.com/pages/github-pages-limits`)

### Public Reference
`play.twilight.ng/operation-crosstalk/`  
*CrossTalk observations are limited to public responses/assets and the supplied project history. Account settings and the canonical repository remain unverified.*

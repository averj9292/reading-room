# Reading Room work log

## 2026-10-09: tablet usability and browse navigation

Started from main `2c73aad1ef2826131a9978a19a9811ecbc4e5f0a`. No prior `NIGHT_WORK.md` existed at that revision.

### Findings and changes

- At 1024 × 768, the original first word example produced a 910 px page. Help extended below the viewport, footer buttons were approximately 21.6 px tall, and the example audio button was 42 px tall. Added a build-inlined tablet stylesheet: compact activity spacing, 48 px minimum touch targets, safe-area padding, visible focus, preserved zoom, and reduced-motion support. The same example now fits a 768 px page; Help ends at approximately y=570, and the example audio and footer buttons measure 48 px tall.
- The collapsed assigned-plan panel inherited a 440 px minimum height. It now collapses around its touch-sized summary and expands normally, keeping the next lesson prominent.
- Story passages and questions now share two columns on wide landscape tablets and stack in portrait/split-screen. Answer audio remains separate from answer selection. Long passages retain normal page scrolling; no fixed-height clipping.
- Browser testing discovered a functional browse bug: selecting a reading area called the later code/guided `home()` override and returned to code entry. The open-lesson renderer now calls its own area renderer. Switching areas reaches the selected lessons and stories without changing the code/guided route.
- Added optional, reproducible browser checks and documented their setup. The generated learner HTML remains self-contained with a regenerated CSP hash.

### Validation

- `npm run build` and all 14 existing `npm test` regression tests passed, including saved snapshots, retry queues, starting-check routing/save/resume, teacher plan saving and overrides, ownership/auth boundaries, all 444 main questions, review, and stories.
- Chromium 153 touch emulation passed 488 assertions at 1024 × 768, 768 × 1024, 1180 × 820, 820 × 1180, 507 × 768, and 390 × 844. Checks covered code entry layout, no-code starting-check pause/resume, recommendation and collapsed plan, practice hints, completion and extra review, reading-area navigation, read/reread/story answers, modal Escape/focus return, and rotation preserving partial letter tiles. No horizontal overflow, touch targets below 44 px, or script errors in those tested flows.
- The mocked-service browser check passed code login, starting-check per-answer save and reload/resume, recommended lesson launch, assisted practice save and reload/resume, and sign-out (two progress writes, zero script errors). Requests were fulfilled in memory, without calling the deployed service.
- Visually inspected landscape practice and story screenshots. Story passage and answer choices remain visible together. Normal animation was enabled during touch tests.
- Bundled audio is identical before and after: SHA-256 `612a0361e2e6cfc061d6dcdf8dac76510af082712428aa7ca62cff2df90ea463`. No backend, database, authentication, or content changes; no production learner records used.

### Next useful step

- Test physical iPad Safari code keyboard behavior, audio playback, safe-area insets, and rotation. Chromium emulation cannot establish Safari-specific behavior. The synthetic mocked-service checks cannot establish live Cloudflare account/setup behavior.
- On the next UI pass, inspect long story/question combinations and pending-save feedback in small split-screen. Fix only a reproduced issue; preserve the current single-next-step learner route and bundled audio.

## 2026-10-09: overlapping-save recovery

Started from main `f202c68083262fe90d34d5aa0f5c147b416ecdbc` and reviewed the prior tablet findings above before changing code.

### Findings and changes

- Reproduced an overlapping-save race: if an older progress request failed while a newer snapshot for the same run was already queued, the older snapshot could be silently re-added after the newer one saved. The server rejected stale revisions safely, but the learner page could retain a stale pending item and misleading save state.
- The client now tracks the newest unsaved payload for each run. A failed older request cannot replace that newer payload; only the newest successful revision clears the run's unsaved state and the Retry save control.
- Login, sign-out, and teacher-plan conflict paths clear this client-only tracking together with the existing pending queue. Authentication, backend storage, and learner record formats are unchanged.
- A 507 × 768 forced-outage check found the dynamically created Retry save button was 42 px high because the legacy `.smallbtn` selector overrode the generic tablet rule. It is now 48 px high and passes the same split-screen overflow check as the rest of the learner controls.

### Validation

- `npm run build` and all 15 `npm test` tests passed. The new regression test delays and fails revision 1 while revision 2 is queued, then verifies that only revision 2 saves and that no stale pending payload remains.
- Chromium 153 touch emulation again passed 488 assertions across 1024 × 768, 768 × 1024, 1180 × 820, 820 × 1180, 507 × 768, and 390 × 844 with zero script errors.
- The mocked classroom browser flow passed code login, starting-check reload/resume, recommended lesson launch, practice reload/resume, a forced 503 save failure, visible 48 px Retry save recovery at 507 × 768, and sign-out. It used synthetic in-memory records and made no production learner requests.
- Bundled audio was not changed. No backend, database, authentication, content, student fields, tracking, or microphone behavior changed.

### Next useful step

- On a physical iPad, verify Safari audio playback, the on-screen keyboard for code entry, safe-area insets, rotation, and Retry save during an actual interrupted connection. Chromium emulation cannot establish those Safari-specific behaviors.
- In the next code pass, examine whether starting-check answer-save failures need the same top-of-screen visibility improvement in small landscape; fix only if reproduced.

## 2026-10-09: starting-check retry focus

Started from main `3be85c7589ca29caed2d74a4d381b81642b80d96` and reviewed both prior entries before testing the remaining starting-check failure path.

### Findings and changes

- A forced starting-check save outage at 768 × 507 kept the retry button and message visible, so the layout did not need to change.
- The failure did leave focus on the now-disabled answer control. Keyboard, switch-control, or assistive-technology users could receive the live error message but have no focused action to continue. The app now moves focus to `Retry saving this answer` after the asynchronous failure. This also makes the recovery action explicit without changing the selected answer or learner route.
- The browser flow now reaches the longer reading-passage section with correct synthetic answers, forces a 503 on one passage answer, verifies that retry is focused and fully inside the small-landscape viewport, saves the same pending answer, and finishes the original 28-question route.

### Validation

- `npm run build` and all 15 `npm test` tests passed.
- Chromium 153 touch emulation passed the 488 existing layout/learner assertions across six portrait, landscape, and split-screen sizes with zero script errors.
- The mocked classroom flow passed code login, first-answer reload/resume, the full 28-question starting check, long-passage failure/retry at 768 × 507, recommendation, practice reload/resume, practice-save failure/retry, and sign-out. No production learner records or services were used.
- Bundled audio remained byte-for-byte unchanged. No backend, database, authentication, learner-record format, content, tracking, student fields, or microphone behavior changed.

### Next useful step

- Physical iPad Safari remains the meaningful unverified layer: test the code keyboard, audio playback, safe-area insets, rotation, VoiceOver focus announcement, and interrupted-connection retry.
- For another automated pass, inspect focus and recovery after a teacher changes the plan while a learner still has a practice screen open. Avoid further visual changes unless a concrete issue is reproduced.

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

## 2026-10-09: stop stale practice after a plan change

Started from main `4eef648315b26009eb71324db46d1f018b816876` and reviewed all prior entries before testing teacher-plan-change recovery.

### Findings and changes

- Reproduced a meaningful stale-plan issue. When a progress save returned 409 because the teacher had changed the plan, saving stopped safely, but the old activity stayed interactive. A learner could continue answering an entire lesson that the app already knew could not save.
- A plan conflict now immediately replaces the stale activity with one simple recovery screen. It explains that the activity stopped and provides a single `Open my updated practice` action. Old answer, hint, next, and story controls are removed, so unsaved work cannot continue by accident.
- The recovery action fetches the existing authenticated learner record, clears only obsolete client-side run queues, and returns to the normal one-next-lesson screen. If refresh fails, the same screen keeps the learner in place, explains the error, re-enables the button, and focuses it for retry.

### Validation

- `npm run build` and all 15 `npm test` tests passed. The plan-change test now confirms that the stale activity is removed, the dedicated recovery screen appears, plan version 2 loads, and a subsequent run saves normally.
- Chromium 153 touch emulation passed all 488 established assertions across six portrait, landscape, and split-screen sizes with zero script errors.
- The mocked classroom browser flow forced a progress 409 at 768 × 507, confirmed that old practice controls disappeared, the update action was fully visible without horizontal overflow, the new plan loaded, and sign-out remained available. It also revalidated the complete starting check and both transient save-retry paths.
- Bundled audio remained unchanged. No backend, database, authentication, learner-record format, content, tracking, student fields, or microphone behavior changed.

### Next useful step

- Use a physical iPad to verify Safari audio, code-keyboard behavior, safe areas, rotation, VoiceOver announcements, transient retries, and the teacher-plan-change screen.
- After teacher review, the next product work should be evidence-led instructional feedback or audio replacement, not more generic visual polish. No additional automated UI issue is currently documented.

## 2026-10-09: stronger teaching and teacher-ready reports

Started from main `a544a413a2bf2d315844cf78e705e480cc545309`. This work was requested after the UI review, specifically to improve instruction and the teacher report before a demonstration.

### Changes

- All 37 non-story lesson screens now include an original worked teaching example and a clear strategy. Word-ending and compound examples show meaningful word parts; spelling boxes are explicitly not described as phoneme counts.
- A first wrong choice or completed incorrect tile word receives a strategy cue. After a second miss, worked help opens automatically. Existing support/attempt fields preserve this distinction on resume and in counts; helped answers never become first-try responses.
- The protected weekly report groups activity by reader, separates main answers and extra review, shows saved targets and in-person observations, and suggests an appropriate adult check. It includes readers with observations/checks even when they have no practice answers in the range.
- Report language explains that saved targets can include earlier parts of a run and do not identify error frequency or a diagnosis. Print and CSV retain the dates actually loaded even if controls change later.
- Deployed only the teacher-page module through Cloudflare's content-only endpoint. Existing Worker, placement and catalog modules were matched by SHA-256 and preserved; configuration, authentication, database bindings and records were not changed.

### Validation

- Build and 18 regression tests passed, including second-miss support persistence, report aggregation, escaping, observation-only readers and changing date controls during a pending report request.
- Chromium 153 local touch emulation: 488 established tablet/learner checks and the full mocked code/check/save/reload/retry/plan-conflict flow passed. An additional 364 teaching/report checks passed at 768×1024, 1024×768, 507×768 and 768×507; they cover all lesson teaching screens, wrong-answer support, print visibility, CSV dates and layout overflow. No production learner requests were used.
- Visually inspected the report print layout. Audio was verified unchanged against an exactly reconstructed previous-main build (Git blob SHA matched the remote index). No ElevenLabs generation or credits were used.
- Browser Rendering was rejected by automatic review because it might incur charges; validation instead used a downloaded local Chromium package. A full-source comparison request was also rejected; a safer hash-only comparison succeeded and the content-only update preserved all unrelated deployed modules.

### Next useful step

- Pennell should try one word-pattern lesson and review one reader summary, checking whether the cue and suggested adult check fit her teaching. Add specific teaching content based on that feedback.
- Replace audio only after the user chooses a satisfactory ElevenLabs sample. Physical iPad Safari and VoiceOver still require device testing.

# Reading Room

Original reading practice focused on Grades 2–4, with age-neutral foundational activities for older readers. Built for teacher review, not a validated intervention replacement.

## Practice

38 lesson groups across sound games, first words, letter teams, long vowels, more patterns, word parts, and meaning and stories. 37 practice lessons each contain a guided example and 12 main questions (444 total), plus up to six review questions for missed or assisted targets. Ten original passages use a read-and-reread routine and 30 comprehension questions.

Audio, letter-tile building, vocabulary, prefixes and suffixes, hints and retries are bundled. No student voice is recorded or assessed. All text and stories are original. No Lexia or UFLI proprietary lessons, assets or branding are included. This is not yet a complete Grade 2–4 curriculum or evidence of equivalent intervention outcomes.

## Classroom backend

The repo now includes a Cloudflare Workers + D1 backend, teacher dashboard, and optional learner-code integration. Teachers create a reader number and code, keep the student-to-code list offline, and give the code to the learner. New readers take a short starting check, receive a suggested practice plan, and see one next lesson. Teachers review or change the plan, enter structured read-aloud observations, and print weekly reports. Learners can resume the saved question, including hint and retry state. Teacher records are separated by the signed-in teacher.

The backend is deployed at https://reading-room.averyjconsulting.workers.dev. Learner code entry is enabled alongside open practice. Teacher access initially allows the Cloudflare account owner only. Health and signed-out teacher protection have passed live checks; the owner still needs to sign in and verify a disposable reader end to end. See [DEPLOYMENT.md](DEPLOYMENT.md) for setup and classroom verification. Missing configuration fails closed.

## Starting check and guided practice

The original starting check uses 12–28 multiple-choice questions covering short-vowel words, letter teams, vowel patterns, word parts, listening comprehension, and short-passage comprehension when appropriate. Harder word sections stop after difficulty; the listening section is separate. Answers save individually and resume after code entry. A no-code preview stays in the current tab.

The routing rule is a practice heuristic: three correct answers out of four moves to the next word section. It is not a validated placement test, a grade-level measure, a diagnosis, or an oral-reading assessment. Untested skills are shown as untested. Teachers can keep the recommendation, assign their own plan, or restart the check. Restarting replaces the current check but retains lesson history.

Learners see one next step, resume unfinished practice, revisit a lesson once if at least a third of its questions needed help, and alternate word practice with stories when stories are assigned. Completing a plan asks for teacher next steps; it does not claim mastery.

## Hosting and offline

GitHub Pages serves `index.html` from main at the repository root. The file contains the complete learner app and audio. An offline copy can be downloaded inside the app; local-file mode does not connect to the classroom service.

## Privacy

Open practice uses page memory and clears on reload. Connected practice saves coded learning records online, including starting-check answer IDs, selected choice numbers, the recommendation, and lesson progress. There are no student-name, student-email, birthdate, school, photo, microphone or free-text note fields. Coded records are not guaranteed anonymous. Teacher sign-in uses Cloudflare Access and a teacher email address. GitHub and Cloudflare have separate operational logging.

No ads, app analytics, or external speech services. Learner codes and session tokens remain in browser memory. Teacher exports are private learning records; learner codes never belong in this public repo.

## Build and verify

Node 22.13+ and Python 3 are sufficient for `npm run build` and `npm test`. No runtime npm dependencies are used by the app or Worker. The build recovers bundled audio from the existing index file, merges the committed placement-audio.json clips, and regenerates CSP hashes. A local audio-data.json may override it but should not be committed as a duplicate.

Tests cover all 444 main questions, additional review, ten stories, saved-question resume, save retry queues, teacher plan controls, adaptive starting-check routes, per-answer saves, check resume and reset, recommendation approval, bundled check audio, teacher access boundaries, code replacement, stale plans, weekly count differences, and deletion. They use a D1-compatible SQLite harness; deployment still needs live Cloudflare verification.

Teacher notes and CMU Flite audio credits are available in Grown-ups. Review pronunciation, vocabulary, sequence, and suitability before use. Activity counts describe app responses, not oral reading, diagnostic levels or mastery.

## Tablet UI checks

The learner UI uses at least 48 CSS-pixel touch targets, compact landscape practice controls, and a story passage beside its questions on wide landscape screens. Browser zoom stays available. Split-screen layouts stack the content and keep passages scrollable.

Optional browser regression checks: install Playwright in a development environment and its Chromium browser (`npm install --no-save --package-lock=false playwright`, then `npx playwright install chromium`), and run `npm run test:tablet`. The script checks six touch viewports, starting-check pause/resume in the tab, recommendations, hints, mixed practice and review, rotation with partial letter tiles, dialogs, area navigation, and stories. A companion check mocks code login, per-answer save, reload/resume, a long-passage save failure and focused retry in small landscape, practice progress, a temporary practice-save failure with retry, and sign-out. Both scripts intercept the app page and block external requests; no production learner records are used. `READING_PLAYWRIGHT_MODULE` can point to an existing Playwright installation. `READING_BROWSER_LAUNCHER` can point to a CommonJS module exporting an async browser launcher for constrained environments.

These checks use Chromium touch emulation, not physical iPad Safari. Verify Safari keyboard, safe-area insets, rotation, and audio playback on a real iPad before classroom rollout. See [NIGHT_WORK.md](NIGHT_WORK.md) for findings and remaining work.

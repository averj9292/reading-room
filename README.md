# Reading Room

Original reading practice focused on Grades 2–4, with age-neutral foundational activities for older readers. Built for teacher review, not a validated intervention replacement.

## Practice

38 lesson groups across sound games, first words, letter teams, long vowels, more patterns, word parts, and meaning and stories. 37 practice lessons each contain a guided example and 12 main questions (444 total), plus up to six review questions for missed or assisted targets. Ten original passages use a read-and-reread routine and 30 comprehension questions.

Audio, letter-tile building, vocabulary, prefixes and suffixes, hints and retries are bundled. No student voice is recorded or assessed. All text and stories are original. No Lexia or UFLI proprietary lessons, assets or branding are included. This is not yet a complete Grade 2–4 curriculum or evidence of equivalent intervention outcomes.

## Classroom backend

The repo now includes a Cloudflare Workers + D1 backend, teacher dashboard, and optional learner-code integration. Teachers assign practice to reader numbers, keep their student-to-code list offline, enter structured read-aloud observations, and print weekly reports. Learners can resume the saved question, including hint and retry state. Teacher records are separated by the signed-in teacher.

The backend is prepared and locally tested, not automatically configured by connecting this repo. Follow [DEPLOYMENT.md](DEPLOYMENT.md) to configure the D1 database, secret, Cloudflare Access teacher sign-in, and public Worker URL. Missing configuration fails closed. The learner app stays in open practice while `backend-url.txt` is empty.

## Hosting and offline

GitHub Pages serves `index.html` from main at the repository root. The file contains the complete learner app and audio. An offline copy can be downloaded inside the app; local-file mode does not connect to the classroom service.

## Privacy

Open practice uses page memory and clears on reload. Connected practice saves coded learning records online. There are no student-name, student-email, birthdate, school, photo, microphone or free-text note fields. Coded records are not guaranteed anonymous. Teacher sign-in uses Cloudflare Access and a teacher email address. GitHub and Cloudflare have separate operational logging.

No ads, app analytics, or external speech services. Learner codes and session tokens remain in browser memory. Teacher exports are private learning records; learner codes never belong in this public repo.

## Build and verify

Node 22.13+ and Python 3 are sufficient for `npm run build` and `npm test`. No runtime npm dependencies are used by the app or Worker. The build recovers bundled audio from the existing index file and regenerates CSP hashes. A local audio-data.json may override it but should not be committed as a duplicate.

Tests cover all 444 main questions, additional review, ten stories, saved-question resume, save retry queues, teacher access boundaries, code replacement, stale plans, weekly count differences, and deletion. They use a D1-compatible SQLite harness; deployment still needs live Cloudflare verification.

Teacher notes and CMU Flite audio credits are available in Grown-ups. Review pronunciation, vocabulary, sequence, and suitability before use. Activity counts describe app responses, not oral reading, diagnostic levels or mastery.

# Connect the classroom backend

The backend is deployed at https://reading-room.averyjconsulting.workers.dev with its D1 database, private code secret, rate-limit bindings, and path-scoped Cloudflare Access. Teacher sign-in initially allows the Cloudflare account owner only. The live health check and signed-out protection for teacher pages and API paths have been verified. The owner still needs to sign in, create a disposable reader, and complete the classroom checks below before real classroom use. `backend-url.txt` enables learner code entry; open practice remains available.

## Your existing GitHub-connected Worker

1. In Cloudflare, open your Worker under **Workers & Pages**. Note its name and its public `https://…workers.dev` URL. The `name` in root `wrangler.jsonc` must match the existing Worker name. It currently says `reading-room`.
2. Leave the build root at the repository root. Use `npx wrangler@latest deploy` as the deploy command. The generated backend files are committed, so no frontend build is required in Cloudflare. Do not configure Static Assets or a framework router for this Worker: the teacher page is served directly so Cloudflare supplies its verified Access context.
3. Create a **D1 database** called `reading-room` under **Storage & Databases → D1**. Copy its database ID into `wrangler.jsonc`. These IDs are configuration, not passwords.
4. Run `backend/schema.sql` against that database. You can use the D1 dashboard console, or from a local checkout run `npx wrangler@latest d1 execute reading-room --remote --file=backend/schema.sql`. Keep the foreign-key definition and transaction behaviour intact.
5. Add a Worker **secret** called `CODE_PEPPER`, containing a randomly generated secret of at least 32 characters. Generate it locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`, then enter it directly in Cloudflare. Do not put it in GitHub, `wrangler.jsonc`, a screenshot, or chat. Keep it stable; changing it invalidates all learner codes.

The D1 binding must be named `DB`. The rate-limit bindings are declared in `wrangler.jsonc`; use namespace IDs that do not collide with other Workers you own. GitHub-connected deployment uses the file's configuration, so changes to those public values belong in the repo too.

## Teacher sign-in

1. Create a Cloudflare **Zero Trust Free** organization. Cloudflare's current setup may ask for a payment method even when selecting the free plan. Select Free, not a paid plan.
2. In **Zero Trust → Access → Applications**, create a **Self-hosted** application for your Worker's hostname and the `/teacher` path, including its subpaths. This protects both `/teacher` and `/teacher/api/*`. Protect these paths only, not the whole Worker: learners use `/v1/*` without teacher sign-in.
3. Add an **Allow** policy containing only the approved teacher email addresses. Start with your own email for testing. Do not use an Everyone allow rule, a bypass rule for teacher paths, or a broad school-domain allow rule for this pilot.
4. Enable the **One-time PIN** login method, or an approved existing identity provider. Teachers sign in through Cloudflare. The app does not store teacher passwords.
5. Copy the Access application's **Audience (AUD)** into `ACCESS_AUD` in root `wrangler.jsonc`. Redeploy the Worker.

The Worker requires Cloudflare's verified `ctx.access` identity and the matching application audience for every teacher page and API request. It does not trust a caller-supplied JWT header. Missing Access configuration denies teacher access; missing database, secret, or rate-limit configuration denies the service. Do not add a local-development identity simulation to production configuration.

Current references: [path-scoped Access and verified Worker identity](https://developers.cloudflare.com/workers/configuration/cloudflare-access/), [rate-limit bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [D1](https://developers.cloudflare.com/d1/).

## Activate learner code entry

1. Verify `/health` returns `{"ok":true,"version":1}`. This checks required bindings and settings, not the full security configuration.
2. Open `/teacher`. Complete teacher sign-in. Create one test reader, write down its code, assign a few skills, and save the plan. The code is shown once. The server stores only a keyed hash of it.
3. Put the Worker origin, with no path or trailing slash, into root `backend-url.txt`. Run `npm run build` using Node 22.13+ and Python 3. This compiles code entry into `index.html` and permits network requests only to this backend origin. Commit the resulting `index.html` and `backend-url.txt` to GitHub.
4. On the live GitHub Pages app, enter the test code, answer several questions, reload, enter the same code, and choose **Keep going**. Confirm the question, hints and completed answers resume correctly.
5. In the teacher dashboard, load the current week's report. Check activity counts and observations, print the report, and download CSV and a full learning-record export.
6. In a signed-out browser, verify teacher paths require Access sign-in. Learner codes must not grant teacher access, list other readers, or retrieve reports. A different teacher must see only the readers they created.
7. Replace the test code; verify the old code and existing learner session stop working. After testing, remove the disposable test reader through the dashboard.

The backend is deployed; the signed-in teacher and learner workflow checks above still need to pass before classroom use.

## What is saved

- Reader number and random internal ID; teacher ownership as a hash of the authenticated teacher email.
- A keyed hash of each 12-character learner code; temporary session-token hashes with eight-hour expiry.
- Assigned lesson IDs and plan version.
- Current question, generated choices and tiles, hints, retries, completed main answers, extra review, and timestamps.
- Structured teacher read-aloud observations, selected from fixed choices.

There are no student-name, student-email, birthdate, school, photo, microphone, or free-text note fields. Teachers keep the identity-to-code list offline. Codes are credentials for practice and should be private. Learning records are coded, not guaranteed anonymous. Teacher authentication and hosting services separately process operational information such as emails, IP addresses and access metadata.

Learner codes and tokens remain in browser memory, not local storage or cookies. Reloading requires code entry again. Progress saves while online; unsent work remains only in the open tab. A save failure is displayed with a Retry save button. Closing an unsaved tab can lose its recent work. Shared-device users should finish and sign out.

Changing a practice plan begins a new assignment version. Earlier activity remains in reports; an old in-progress activity cannot continue against the new plan. Students choose only assigned lessons in connected mode. A completed lesson is labelled Practised, not mastered. The teacher chooses next steps.

## Reports, exports and record removal

Weekly counts use changes saved in the selected date range, not cumulative totals copied into the week a lesson finishes. Report dates use the teacher browser's local timezone. Review targets describe the activity's accumulated targets, so they may include earlier difficulties in a lesson spanning weeks. Read-aloud observations are teacher entries; no voice or measured fluency is captured.

The full JSON export contains assignments, practice snapshots, activity events and observations for the signed-in teacher's readers. It excludes code hashes, learner codes and sessions. Keep exports private. There is no automatic import/restore screen in this version; the export preserves records for recovery work. There is no automatic history deletion in this pilot. Teachers can delete an individual reader and their active records; Cloudflare recovery copies may persist separately. The teacher dashboard asks for explicit confirmation before deletion.

Activity counts originate in the learner app and can be manipulated by someone controlling that browser. They support teaching decisions, not high-stakes assessment or verified grades.

## Free hosting and data location

Workers and D1 use request-based operation rather than Supabase's manual inactivity-pause workflow. The free tier still has request, database and CPU limits and no guarantee of uninterrupted availability. Stay on the Workers Free plan for this pilot. Do not enable paid features or artificial keep-alive traffic.

D1's placement hints are not a guarantee that all processing and records stay in Canada. This setup does not claim Canada-only data residency. If that becomes a requirement, revisit the provider and deployment design before real learner records are used.

## Local verification

Run `npm run build` then `npm test`. Tests exercise the backend through a D1-compatible SQLite harness, including teacher ownership, forged-header rejection, stale plans, lost-code replacement, signed-out behaviour, deletion, weekly count differences, and snapshot validation for all 444 main practice questions plus review and stories. They also check queued saves and resume state. They do not replace live Cloudflare checks.

Audio is already inside `index.html`. The build reuses it, so no speech service or audio-generation dependency is needed to rebuild the app. `audio-license.txt` contains the included Flite credit. Classroom mode is disabled for an offline file opened with `file:`; its lessons and audio still work without saving to the teacher dashboard.

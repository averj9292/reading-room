import { CONTENT } from './catalog.js';
import { teacherPage } from './teacher-page.js';

const enc = new TextEncoder();
const lessons = new Map(CONTENT.lessons.map(l => [l.id, l]));
const observations = ['Read with support', 'Read carefully with few prompts', 'Read smoothly on this passage', 'Needs another teacher check'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
class Problem extends Error { constructor(status, message) { super(message); this.status = status; } }
function insist(ok, message = 'That request could not be accepted.', status = 400) { if (!ok) throw new Problem(status, message); }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } }); }
function int(n, min, max) { insist(Number.isInteger(n) && n >= min && n <= max); return n; }
function flag(x) { insist(typeof x === 'boolean'); return x; }
function pick(x, values) { insist(values.includes(x)); return x; }
function safeId(id) { insist(typeof id === 'string' && UUID.test(id)); return id; }
function equalArrays(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function parts(word) { return word.match(/sh|ch|th|ck|ai|ay|ee|ea|oa|ow|oo|ar|or|er|ir|ur|oi|oy|ou|./g) || []; }
function array(x, min, max) { insist(Array.isArray(x) && x.length >= min && x.length <= max); return x; }
function stats(s, max, reviewMax = 0) {
  insist(s && typeof s === 'object');
  const v = { total: int(s.total, 0, max), first: int(s.first, 0, max), help: int(s.help, 0, max), review: int(s.review ?? 0, 0, reviewMax) };
  insist(v.first + v.help === v.total); return v;
}
function question(q, lesson) {
  insist(q && typeof q === 'object');
  if (lesson.kind === 'quiz') {
    const i = int(q.itemIndex, 0, lesson.items.length - 1), item = lesson.items[i];
    const choices = array(q.choices, item.choices.length, item.choices.length);
    insist(equalArrays([...choices].sort(), [...item.choices].sort()));
    return { mode: 'quiz', itemIndex: i, choices: [...choices], word: item.choices[item.correct], parts: [], tiles: [], soundOnly: !!lesson.soundOnly,
      prompt: item.prompt, promptKey: `quiz:${lesson.id}:${i}`, explanation: item.explanation, explainKey: `explain:${lesson.id}:${i}` };
  }
  const word = pick(q.word, lesson.words), mode = pick(q.mode, ['listen', 'build', 'read']);
  const choices = array(q.choices, 3, 3).map(w => pick(w, lesson.words));
  insist(new Set(choices).size === 3 && choices.includes(word));
  const p = parts(word), tiles = array(q.tiles, p.length + 2, p.length + 2);
  const copy = [...tiles];
  for (const part of p) { const index = copy.indexOf(part); insist(index >= 0); copy.splice(index, 1); }
  insist(copy.length === 2 && copy.every(t => ['a','e','i','o','u','m','n','s','t','p','f','r'].includes(t) && !p.includes(t)) && copy[0] !== copy[1]);
  return { word, mode, choices: [...choices], parts: p, tiles: [...tiles] };
}
export function cleanSnapshot(raw, lessonId) {
  const lesson = lessons.get(lessonId); insist(lesson && raw && typeof raw === 'object');
  if (lesson.kind === 'stories') {
    const s = {
      type: 'story', screen: pick(raw.screen, ['story-read','story','story-finish']), story: int(raw.story, 0, CONTENT.stories.length - 1),
      question: int(raw.question, 0, 3), done: flag(raw.done), attempts: int(raw.attempts, 0, 9999), assisted: flag(raw.assisted),
      storyHelp: flag(raw.storyHelp), storyReadCount: int(raw.storyReadCount, 0, 1), storyStats: stats(raw.storyStats, 3)
    };
    insist(s.screen !== 'story' || s.question < 3);
    insist(s.screen !== 'story-finish' || (s.question === 3 && s.storyStats.total === 3));
    return s;
  }
  const practice = array(raw.practice, 12, 18).map(q => question(q, lesson));
  const current = question(raw.current, lesson);
  const s = {
    type: 'practice', screen: pick(raw.screen, ['practice','finish']), index: int(raw.index, 0, practice.length),
    demo: flag(raw.demo), done: flag(raw.done), attempts: int(raw.attempts, 0, 9999), assisted: flag(raw.assisted),
    practice, current, built: array(raw.built, 0, current.parts.length).map(i => int(i, 0, current.tiles.length - 1)),
    missed: array(raw.missed, 0, 12).map(q => question(q, lesson)), reviewCreated: flag(raw.reviewCreated), stats: stats(raw.stats, 12, 6)
  };
  insist(new Set(s.built).size === s.built.length);
  insist(s.screen !== 'finish' || (s.index === practice.length && s.stats.total === 12 && !s.demo));
  insist(s.screen !== 'practice' || s.index < practice.length);
  if (!s.demo && s.screen === 'practice') insist(equalArrays(s.current, practice[s.index]));
  return s;
}
export async function hash(value) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value)))].map(x => x.toString(16).padStart(2,'0')).join(''); }
async function secretHash(value, env) {
  const key = await crypto.subtle.importKey('raw', enc.encode(env.CODE_PEPPER), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(value)))].map(x => x.toString(16).padStart(2,'0')).join('');
}
function token() { return [...crypto.getRandomValues(new Uint8Array(32))].map(x => x.toString(16).padStart(2,'0')).join(''); }
function code() { const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; const a = crypto.getRandomValues(new Uint8Array(12)); return [...a].map(x => alphabet[x % 32]).join(''); }
function normalCode(value) { insist(typeof value === 'string' && value.length <= 40); const c = value.toUpperCase().replace(/[\s-]/g,''); insist(/^[2-9A-HJ-NP-Z]{12}$/.test(c), 'Check your code and try again.', 401); return c; }
async function body(request) {
  insist(request.headers.get('content-type')?.split(';')[0] === 'application/json', 'Use a JSON request.', 415);
  const reader = request.body?.getReader(); insist(reader); const chunks = []; let size = 0;
  while (true) { const {value,done} = await reader.read(); if (done) break; size += value.length; if (size > 32768) { await reader.cancel(); throw new Problem(413,'Request too large.'); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const c of chunks) { bytes.set(c,offset); offset += c.length; }
  try { const parsed = JSON.parse(new TextDecoder().decode(bytes)); insist(parsed && !Array.isArray(parsed) && typeof parsed === 'object'); return parsed; }
  catch (e) { if (e instanceof Problem) throw e; throw new Problem(400,'Invalid JSON.'); }
}
function config(env) { insist(env.DB && env.LOGIN_LIMITER && env.CODE_LIMITER && env.ACTIVITY_LIMITER && typeof env.CODE_PEPPER === 'string' && env.CODE_PEPPER.length >= 32 && env.ACCESS_AUD && !env.ACCESS_AUD.startsWith('REPLACE_'), 'The classroom service has not been configured yet.', 503); }
async function teacher(request, env, ctx) {
  // Cloudflare supplies ctx.access only after it has authenticated the request.
  // A caller-supplied Cf-Access-Jwt-Assertion header is never trusted here.
  insist(ctx.access && ctx.access.aud === env.ACCESS_AUD, 'Teacher sign-in is required.', 403);
  const identity = await ctx.access.getIdentity(); insist(typeof identity?.email === 'string' && identity.email.includes('@'), 'Teacher sign-in is required.', 403);
  if (request.method !== 'GET') {
    insist(request.headers.get('origin') === new URL(request.url).origin && request.headers.get('x-reading-room') === 'teacher', 'Open the teacher dashboard to make this change.', 403);
  }
  return { owner: await hash('teacher:' + identity.email.toLowerCase()), email: identity.email };
}
async function owned(env, owner, id) {
  safeId(id); const row = await env.DB.prepare('SELECT * FROM learners WHERE id = ? AND owner_id = ?').bind(id,owner).first();
  insist(row,'Reader not found.',404); return row;
}
async function session(request, env) {
  const t = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1]; insist(t,'Enter your code again.',401);
  const row = await env.DB.prepare('SELECT l.* FROM sessions s JOIN learners l ON l.id = s.learner_id WHERE s.token_hash = ? AND s.expires_at > ? AND s.code_epoch = l.code_epoch').bind(await hash(t),Date.now()).first();
  insist(row,'Enter your code again.',401);
  const {success} = await env.ACTIVITY_LIMITER.limit({key:row.id}); insist(success,'Take a moment, then try again.',429); return row;
}
async function learnerView(env, learner) {
  const plan = JSON.parse(learner.plan_json);
  const {results} = await env.DB.prepare('SELECT id, lesson_id, revision, complete, snapshot_json, updated_at FROM runs WHERE learner_id = ? AND plan_version = ? ORDER BY updated_at DESC LIMIT 200').bind(learner.id,learner.plan_version).all();
  const last = results.find(r => !r.complete && plan.includes(r.lesson_id));
  const storiesId=CONTENT.lessons.find(l=>l.kind==='stories').id;
  const completedStories=[...new Set(results.filter(r=>r.complete&&r.lesson_id===storiesId).map(r=>JSON.parse(r.snapshot_json).story))];
  const completed = [...new Set(results.filter(r => r.complete && r.lesson_id!==storiesId).map(r => r.lesson_id))];
  if(completedStories.length===CONTENT.stories.length)completed.push(storiesId);
  return { readerNumber: learner.reader_number, plan, planVersion: learner.plan_version, completed, completedStories,
    resume: last ? {runId:last.id,lessonId:last.lesson_id,revision:last.revision,snapshot:JSON.parse(last.snapshot_json)} : null };
}
function plan(value) { const a = array(value,0,38).map(id => pick(id,[...lessons.keys()])); insist(new Set(a).size === a.length); return a; }
async function routes(request, env, ctx) {
  const url = new URL(request.url), path = url.pathname;
  if (path === '/health' && request.method === 'GET') { config(env); return json({ok:true,version:1}); }
  config(env);
  if (path.startsWith('/teacher')) {
    const who = await teacher(request,env,ctx);
    if (path === '/teacher' && request.method === 'GET') return teacherPage();
    if (path === '/teacher/api/readers' && request.method === 'GET') {
      const {results} = await env.DB.prepare('SELECT id, reader_number, plan_json, plan_version, created_at FROM learners WHERE owner_id = ? ORDER BY reader_number').bind(who.owner).all();
      return json({email:who.email,catalog:CONTENT.lessons.map(({id,name,stage,kind})=>({id,name,stage,kind:kind||'words'})),observations,readers:results.map(r=>({id:r.id,readerNumber:r.reader_number,plan:JSON.parse(r.plan_json),planVersion:r.plan_version}))});
    }
    if (path === '/teacher/api/readers' && request.method === 'POST') {
      const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM learners WHERE owner_id = ?').bind(who.owner).first(); insist(count.n < 100,'This pilot supports up to 100 readers per teacher.',409);
      const c = code(), id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO learners (id, owner_id, code_hash, created_at) VALUES (?, ?, ?, ?)').bind(id,who.owner,await secretHash('code:'+c,env),Date.now()).run();
      const row = await owned(env,who.owner,id); return json({id,readerNumber:row.reader_number,code:c.match(/.{4}/g).join('-')},201);
    }
    const match = path.match(/^\/teacher\/api\/readers\/([a-f0-9-]+)(?:\/(plan|code|observation))?$/);
    if (match) {
      const learner = await owned(env,who.owner,match[1]);
      if (match[2] === 'plan' && request.method === 'PUT') {
        const b = await body(request), ids = plan(b.lessonIds); int(b.planVersion,1,1000000);
        const result = await env.DB.prepare('UPDATE learners SET plan_json = ?, plan_version = plan_version + 1 WHERE id = ? AND owner_id = ? AND plan_version = ?').bind(JSON.stringify(ids),learner.id,who.owner,b.planVersion).run();
        insist(result.meta.changes === 1,'The plan changed in another window. Reload and try again.',409); return json({ok:true,planVersion:b.planVersion+1});
      }
      if (match[2] === 'code' && request.method === 'POST') {
        const c = code(); await env.DB.batch([
          env.DB.prepare('UPDATE learners SET code_hash = ?, code_epoch = code_epoch + 1 WHERE id = ? AND owner_id = ?').bind(await secretHash('code:'+c,env),learner.id,who.owner),
          env.DB.prepare('DELETE FROM sessions WHERE learner_id = ?').bind(learner.id)
        ]); return json({code:c.match(/.{4}/g).join('-')});
      }
      if (match[2] === 'observation' && request.method === 'POST') {
        const b = await body(request); const lessonId = pick(b.lessonId,[...lessons.keys()]), observation = pick(b.observation,observations);
        await env.DB.prepare('INSERT INTO observations (id, learner_id, lesson_id, observation, created_at) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(),learner.id,lessonId,observation,Date.now()).run(); return json({ok:true},201);
      }
      if (!match[2] && request.method === 'DELETE') { await env.DB.prepare('DELETE FROM learners WHERE id = ? AND owner_id = ?').bind(learner.id,who.owner).run(); return json({ok:true}); }
    }
    if (path === '/teacher/api/report' && request.method === 'GET') {
      const from = Number(url.searchParams.get('from')), to = Number(url.searchParams.get('to'));
      int(from,0,Date.now()+86400000); int(to,from+1,Date.now()+86400000); insist(to-from<=32*86400000);
      const {results} = await env.DB.prepare('SELECT r.id AS run_id, l.reader_number, r.lesson_id, e.total, e.first_try, e.helped, e.review, e.complete, e.targets_json, r.snapshot_json, e.created_at AS updated_at FROM activity_events e JOIN runs r ON r.id = e.run_id JOIN learners l ON l.id = r.learner_id WHERE l.owner_id = ? AND e.created_at >= ? AND e.created_at < ? ORDER BY l.reader_number, e.created_at').bind(who.owner,from,to).all();
      const grouped = new Map();
      for (const e of results) {
        if (!grouped.has(e.run_id)) grouped.set(e.run_id,{runId:e.run_id,reader_number:e.reader_number,lesson_id:e.lesson_id,lessonName:lessons.get(e.lesson_id).name,storyTitle:JSON.parse(e.snapshot_json).type==='story'?CONTENT.stories[JSON.parse(e.snapshot_json).story].title:null,total:0,first_try:0,helped:0,review:0,complete:0,targets:[],updated_at:0});
        const r=grouped.get(e.run_id); for(const key of ['total','first_try','helped','review','complete'])r[key]+=e[key];
        r.targets=[...new Set([...r.targets,...JSON.parse(e.targets_json)])]; r.updated_at=e.updated_at;
      }
      const obs = await env.DB.prepare('SELECT l.reader_number, o.lesson_id, o.observation, o.created_at FROM observations o JOIN learners l ON l.id = o.learner_id WHERE l.owner_id = ? AND o.created_at >= ? AND o.created_at < ? ORDER BY l.reader_number, o.created_at').bind(who.owner,from,to).all();
      return json({from,to,runs:[...grouped.values()],observations:obs.results.map(o=>({...o,lessonName:lessons.get(o.lesson_id).name}))});
    }
    if (path === '/teacher/api/export' && request.method === 'GET') {
      const readers=await env.DB.prepare('SELECT id, reader_number, plan_json, plan_version, created_at FROM learners WHERE owner_id = ? ORDER BY reader_number').bind(who.owner).all();
      const runs=await env.DB.prepare('SELECT r.* FROM runs r JOIN learners l ON l.id = r.learner_id WHERE l.owner_id = ? ORDER BY r.created_at').bind(who.owner).all();
      const obs=await env.DB.prepare('SELECT o.* FROM observations o JOIN learners l ON l.id = o.learner_id WHERE l.owner_id = ? ORDER BY o.created_at').bind(who.owner).all();
      const events=await env.DB.prepare('SELECT e.* FROM activity_events e JOIN runs r ON r.id = e.run_id JOIN learners l ON l.id = r.learner_id WHERE l.owner_id = ? ORDER BY e.created_at').bind(who.owner).all();
      return json({format:'reading-room-export-1',exportedAt:Date.now(),readers:readers.results,runs:runs.results,observations:obs.results,events:events.results});
    }
    throw new Problem(404,'Page not found.');
  }
  insist(path.startsWith('/v1/'),'Page not found.',404);
  insist(request.headers.get('origin')===env.FRONTEND_ORIGIN,'Open Reading Room to use this service.',403);
  if (request.method === 'OPTIONS') return new Response(null,{status:204});
  if (path === '/v1/login' && request.method === 'POST') {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const rate = await env.LOGIN_LIMITER.limit({key:await secretHash('ip:'+ip,env)}); insist(rate.success,'Too many attempts. Wait a minute and try again.',429);
    const b = await body(request), c = normalCode(b.code), ch = await secretHash('code:'+c,env);
    const cr = await env.CODE_LIMITER.limit({key:ch}); insist(cr.success,'Too many attempts. Wait a minute and try again.',429);
    const learner = await env.DB.prepare('SELECT * FROM learners WHERE code_hash = ?').bind(ch).first(); insist(learner,'Check your code and try again.',401);
    const t = token(), now = Date.now(); await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
      env.DB.prepare('INSERT INTO sessions (token_hash, learner_id, code_epoch, expires_at) VALUES (?, ?, ?, ?)').bind(await hash(t),learner.id,learner.code_epoch,now+8*3600000)
    ]); return json({token:t,...await learnerView(env,learner)});
  }
  const learner = await session(request,env);
  if (path === '/v1/me' && request.method === 'GET') return json(await learnerView(env,learner));
  if (path === '/v1/logout' && request.method === 'POST') { await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await hash(request.headers.get('authorization').slice(7))).run(); return json({ok:true}); }
  if (path === '/v1/progress' && request.method === 'PUT') {
    const b = await body(request); safeId(b.runId); int(b.revision,1,1000000);
    insist(b.planVersion===learner.plan_version,'Your teacher changed your practice. Return to your practice list.',409);
    insist(JSON.parse(learner.plan_json).includes(b.lessonId),'This lesson is not in your practice plan.',403);
    const snap = cleanSnapshot(b.snapshot,b.lessonId), text = JSON.stringify(snap); insist(enc.encode(text).length<=24000,'Practice data is too large.',413);
    const existing = await env.DB.prepare('SELECT learner_id, lesson_id, plan_version, revision, total, first_try, helped, review, complete FROM runs WHERE id = ?').bind(b.runId).first();
    insist(!existing || (existing.learner_id===learner.id && existing.lesson_id===b.lessonId && existing.plan_version===b.planVersion),'Start a new practice.',409);
    if (existing && existing.revision>=b.revision) return json({ok:true,revision:existing.revision});
    const st = snap.type==='story'?snap.storyStats:snap.stats, complete=Number(['finish','story-finish'].includes(snap.screen));
    insist(!existing || (st.total>=existing.total && st.first>=existing.first_try && st.help>=existing.helped && st.review>=existing.review && !existing.complete),'Start a new practice.',409);
    const targets = snap.type==='practice'?[...new Set(snap.missed.map(q=>q.mode==='quiz'?q.prompt:q.word))]:[];
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare('PRAGMA defer_foreign_keys = ON'),
      env.DB.prepare('INSERT OR IGNORE INTO activity_events (run_id, revision, total, first_try, helped, review, complete, targets_json, created_at) SELECT ?, ?, ? - COALESCE(total,0), ? - COALESCE(first_try,0), ? - COALESCE(helped,0), ? - COALESCE(review,0), ?, ?, ? FROM (SELECT 1) LEFT JOIN runs ON runs.id = ? WHERE COALESCE(runs.revision,0) < ? AND COALESCE(runs.complete,0) = 0 AND (runs.id IS NULL OR (runs.learner_id = ? AND runs.lesson_id = ? AND runs.plan_version = ? AND runs.total <= ? AND runs.first_try <= ? AND runs.helped <= ? AND runs.review <= ?))').bind(b.runId,b.revision,st.total,st.first,st.help,st.review,complete,JSON.stringify(targets),now,b.runId,b.revision,learner.id,b.lessonId,b.planVersion,st.total,st.first,st.help,st.review),
      env.DB.prepare('INSERT INTO runs (id, learner_id, lesson_id, plan_version, revision, snapshot_json, total, first_try, helped, review, complete, targets_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision, snapshot_json=excluded.snapshot_json, total=excluded.total, first_try=excluded.first_try, helped=excluded.helped, review=excluded.review, complete=excluded.complete, targets_json=excluded.targets_json, updated_at=excluded.updated_at WHERE runs.revision < excluded.revision AND runs.complete=0 AND runs.learner_id=excluded.learner_id AND runs.lesson_id=excluded.lesson_id AND runs.plan_version=excluded.plan_version AND runs.total<=excluded.total AND runs.first_try<=excluded.first_try AND runs.helped<=excluded.helped AND runs.review<=excluded.review').bind(b.runId,learner.id,b.lessonId,b.planVersion,b.revision,text,st.total,st.first,st.help,st.review,complete,JSON.stringify(targets),now,now),
      env.DB.prepare('PRAGMA defer_foreign_keys = OFF')
    ]);
    return json({ok:true,revision:b.revision});
  }
  throw new Problem(404,'Page not found.');
}
export default {
  async fetch(request, env, ctx) {
    let response; try { response=await routes(request,env,ctx); }
    catch (e) { response=json({error:e instanceof Problem?e.message:'The classroom service is unavailable. Try again shortly.'}, e instanceof Problem?e.status:503); }
    const headers=new Headers(response.headers);
    headers.set('Cache-Control','no-store'); headers.set('X-Content-Type-Options','nosniff'); headers.set('Referrer-Policy','no-referrer');
    headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    headers.set('Content-Security-Policy',response.headers.get('Content-Security-Policy')||"default-src 'none'; frame-ancestors 'none'");
    if (request.headers.get('origin')===env.FRONTEND_ORIGIN && new URL(request.url).pathname.startsWith('/v1/')) {
      headers.set('Access-Control-Allow-Origin',env.FRONTEND_ORIGIN); headers.set('Vary','Origin');
      headers.set('Access-Control-Allow-Methods','GET, POST, PUT, OPTIONS'); headers.set('Access-Control-Allow-Headers','Content-Type, Authorization');
    }
    return new Response(response.body,{status:response.status,headers});
  }
};

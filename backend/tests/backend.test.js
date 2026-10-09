import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker, { cleanSnapshot } from '../worker.js';
import { CONTENT } from '../catalog.js';

function database() {
  const db=new DatabaseSync(':memory:'); db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
  class Statement {
    constructor(sql, values=[]) { this.sql=sql; this.values=values; }
    bind(...values) { return new Statement(this.sql,values); }
    async first() { return db.prepare(this.sql).get(...this.values)||null; }
    async all() { return {results:db.prepare(this.sql).all(...this.values)}; }
    async run() { const r=db.prepare(this.sql).run(...this.values); return {meta:{changes:Number(r.changes)}}; }
  }
  return {raw:db,prepare:sql=>new Statement(sql),async batch(statements){db.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}};
}
const frontend='https://averj9292.github.io', origin='https://classroom.example.workers.dev';
const aud='teacher-app';
const context=email=>({access:{aud,async getIdentity(){return {email};}}});
const allow={async limit(){return {success:true};}};
function env(){return {DB:database(),ACCESS_AUD:aud,FRONTEND_ORIGIN:frontend,CODE_PEPPER:'test-only-pepper-with-at-least-32-characters',LOGIN_LIMITER:allow,CODE_LIMITER:allow,ACTIVITY_LIMITER:allow};}
async function request(e,path,{method='GET',body,token,ctx={},originHeader,headers={}}={}) {
  const h={'Content-Type':'application/json',...headers};
  if(path.startsWith('/teacher')&&method!=='GET'){h.Origin=origin;h['X-Reading-Room']='teacher';}
  if(path.startsWith('/v1/'))h.Origin=frontend;
  if(originHeader!==undefined)h.Origin=originHeader;
  if(token)h.Authorization='Bearer '+token;
  return worker.fetch(new Request(origin+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)}),e,ctx);
}
async function data(r,status=200){assert.equal(r.status,status,await r.clone().text());return r.json();}
const lesson=CONTENT.lessons.find(l=>!l.kind&&l.id==='sh')||CONTENT.lessons.find(l=>!l.kind);
function q(word=lesson.words[0]) {const parts=word.match(/sh|ch|th|ck|ai|ay|ee|ea|oa|ow|oo|ar|or|er|ir|ur|oi|oy|ou|./g)||[];return {word,mode:'listen',choices:[word,...lesson.words.filter(w=>w!==word).slice(0,2)],parts,tiles:[...parts,...['a','e','i','o','u','m','n','s','t','p','f','r'].filter(c=>!parts.includes(c)).slice(0,2)]};}
function snapshot(total=0){const practice=Array.from({length:12},()=>q());return {type:'practice',screen:'practice',index:total,demo:total===0,done:false,attempts:0,assisted:false,practice,current:practice[total%12],built:[],missed:[],reviewCreated:false,stats:{total,first:total,help:0,review:0}};}

test('authenticated classroom workflow, resume, weekly deltas, ownership, code rotation and cascade deletion',async()=>{
  const e=env(),a=context('teacher-a@example.com'),b=context('teacher-b@example.com');
  const created=await data(await request(e,'/teacher/api/readers',{method:'POST',body:{},ctx:a}),201);
  assert.match(created.code,/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(e.DB.raw.prepare('SELECT code_hash FROM learners').get().code_hash.includes(created.code.replaceAll('-','')),false);
  await data(await request(e,'/teacher/api/readers/'+created.id+'/plan',{method:'PUT',body:{lessonIds:[lesson.id],planVersion:1},ctx:a}));
  const login=await data(await request(e,'/v1/login',{method:'POST',body:{code:created.code.toLowerCase()}}));
  assert.deepEqual(login.plan,[lesson.id]); assert.equal(login.planVersion,2);assert.equal(login.resume,null);
  const runId=crypto.randomUUID();
  const save=(revision,snapshot)=>request(e,'/v1/progress',{method:'PUT',token:login.token,body:{runId,lessonId:lesson.id,planVersion:2,revision,snapshot}});
  await data(await save(1,snapshot()));
  await data(await save(2,snapshot(1)));
  const resumed=await data(await request(e,'/v1/me',{token:login.token}));
  assert.equal(resumed.resume.snapshot.index,1);assert.equal(resumed.resume.revision,2);
  const start=Date.now()-10000,pivot=Date.now()+1000,originalNow=Date.now;
  Date.now=()=>pivot+1000;
  try{await data(await save(3,snapshot(2)));}finally{Date.now=originalNow;}
  await data(await save(2,snapshot(1))); // out-of-order retry has no additional event
  assert.equal(e.DB.raw.prepare('SELECT COUNT(*) AS n FROM activity_events').get().n,3);
  const firstWeek=await data(await request(e,'/teacher/api/report?from='+start+'&to='+pivot,{ctx:a}));
  assert.equal(firstWeek.runs[0].total,1);
  Date.now=()=>pivot+3000;
  try{const secondWeek=await data(await request(e,'/teacher/api/report?from='+pivot+'&to='+(pivot+2000),{ctx:a}));assert.equal(secondWeek.runs[0].total,1);}finally{Date.now=originalNow;}
  assert.equal((await data(await request(e,'/teacher/api/report?from='+start+'&to='+pivot,{ctx:b}))).runs.length,0);
  await data(await request(e,'/teacher/api/readers/'+created.id+'/plan',{method:'PUT',body:{lessonIds:[],planVersion:2},ctx:b}),404);
  const evil={...snapshot(3),studentName:'Never save this',current:{...q(),extra:'Never save this'}};
  await data(await save(4,evil));assert.equal(e.DB.raw.prepare('SELECT snapshot_json FROM runs').get().snapshot_json.includes('Never save this'),false);
  await data(await request(e,'/teacher/api/readers/'+created.id+'/observation',{method:'POST',body:{lessonId:lesson.id,observation:'Read with support'},ctx:a}),201);
  const backup=await data(await request(e,'/teacher/api/export',{ctx:a}));assert.equal(backup.readers.length,1);assert.equal(JSON.stringify(backup).includes('code_hash'),false);assert.equal(JSON.stringify(backup).includes(login.token),false);
  const rotated=await data(await request(e,'/teacher/api/readers/'+created.id+'/code',{method:'POST',body:{},ctx:a}));
  await data(await request(e,'/v1/login',{method:'POST',body:{code:created.code}}),401);
  await data(await request(e,'/v1/me',{token:login.token}),401);
  assert.equal((await data(await request(e,'/v1/login',{method:'POST',body:{code:rotated.code}}))).resume.snapshot.index,3);
  await data(await request(e,'/teacher/api/readers/'+created.id,{method:'DELETE',body:{},ctx:a}));
  for(const table of ['learners','sessions','runs','activity_events','observations'])assert.equal(e.DB.raw.prepare('SELECT COUNT(*) AS n FROM '+table).get().n,0);
});

test('fails closed for forged teacher header, wrong app identity, CSRF, invalid origin, missing configuration and throttling',async()=>{
  const e=env();
  await data(await request(e,'/teacher/api/readers',{headers:{'Cf-Access-Jwt-Assertion':'fake'}}),403);
  await data(await request(e,'/teacher/api/readers',{ctx:{access:{aud:'wrong',getIdentity:async()=>({email:'teacher@example.com'})}}}),403);
  await data(await request(e,'/teacher/api/readers',{method:'POST',body:{},ctx:context('t@example.com'),originHeader:'https://evil.example'}),403);
  await data(await request(e,'/v1/login',{method:'POST',body:{code:'AAAAAAAAAAAA'},originHeader:'https://evil.example'}),403);
  await data(await request({...e,CODE_PEPPER:''},'/health'),503);
  await data(await request({...e,LOGIN_LIMITER:{limit:async()=>({success:false})}},'/v1/login',{method:'POST',body:{code:'AAAAAAAAAAAA'}}),429);
  const preflight=await request(e,'/v1/progress',{method:'OPTIONS'});assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),frontend);
  const bad=await request(e,'/v1/login',{method:'POST',body:{code:'AAAAAAAAAAAA'}});assert.equal(bad.headers.get('Cache-Control'),'no-store');assert.equal(bad.headers.has('Set-Cookie'),false);
});

test('rejects unassigned lessons, stale plan versions, malformed snapshots, arbitrary observations and reader enumeration',async()=>{
  const e=env(),ctx=context('teacher@example.com');const r=await data(await request(e,'/teacher/api/readers',{method:'POST',body:{},ctx}),201);
  const l=await data(await request(e,'/v1/login',{method:'POST',body:{code:r.code}}));const base={runId:crypto.randomUUID(),lessonId:lesson.id,planVersion:1,revision:1,snapshot:snapshot()};
  await data(await request(e,'/v1/progress',{method:'PUT',body:base,token:l.token}),403);
  await data(await request(e,'/v1/readers',{token:l.token}),404);
  await data(await request(e,'/teacher/api/readers/'+r.id+'/plan',{method:'PUT',body:{lessonIds:[lesson.id],planVersion:1},ctx}));
  await data(await request(e,'/v1/progress',{method:'PUT',body:base,token:l.token}),409);
  base.planVersion=2;base.snapshot.current.word='student name';await data(await request(e,'/v1/progress',{method:'PUT',body:base,token:l.token}),400);
  await data(await request(e,'/teacher/api/readers/'+r.id+'/observation',{method:'POST',body:{lessonId:lesson.id,observation:'Personal student information'},ctx}),400);
  assert.throws(()=>cleanSnapshot({...snapshot(),stats:{total:1,first:2,help:0}},lesson.id));
});

test('teacher HTML uses a matching CSP hash and no external scripts',async()=>{
  const r=await request(env(),'/teacher',{ctx:context('teacher@example.com')});assert.equal(r.status,200);const html=await r.text();const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const digest=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(script))).toString('base64');
  assert.ok(r.headers.get('Content-Security-Policy').includes(digest));assert.equal(/<script[^>]+src/.test(html),false);
});

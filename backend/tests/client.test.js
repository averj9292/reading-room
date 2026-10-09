import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { cleanSnapshot } from '../worker.js';
import { CONTENT } from '../catalog.js';

function fixture() {
  function element(){return {innerHTML:'',hidden:true,style:{},textContent:'',className:'',classList:{add(){},toggle(){}},addEventListener(){},focus(){},setAttribute(){},querySelector(){return element();},querySelectorAll(){return [];},append(){},after(){},remove(){}};}
  const nodes={app:element(),overlay:element()};
  const document={getElementById(id){return nodes[id]??(nodes[id]=element());},querySelector(){return element();},createElement:element,body:element(),activeElement:element(),addEventListener(){}};
  class Audio {pause(){}play(){return Promise.resolve();}addEventListener(){}}
  const writes=[],saved=new Map();let fail=false;
  const sandbox={document,Audio,window:{scrollTo(){}},setTimeout(){return 1;},clearTimeout(){},queueMicrotask(fn){fn();},crypto,Math,Blob,URL,location:{protocol:'https:'},AbortController,
    async fetch(url,options){if(fail)throw Error('Network offline');const b=options.body?JSON.parse(options.body):{};
      if(url.endsWith('/progress')){cleanSnapshot(b.snapshot,b.lessonId);writes.push(b);saved.set(b.runId,b);return new Response(JSON.stringify({ok:true,revision:b.revision}));}
      if(url.endsWith('/logout'))return new Response('{"ok":true}');throw Error('Unexpected endpoint');}};
  Object.defineProperty(sandbox,'top',{value:{},configurable:false,writable:false});
  const c=vm.createContext(sandbox);const script=readFileSync(new URL('../../index.html',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1].replace('const BACKEND_URL="";','const BACKEND_URL="https://classroom.example.workers.dev";');vm.runInContext(script,c);
  const run=s=>vm.runInContext(s,c);run('connected.token="test-token";connected.profile={readerNumber:1,plan:CONTENT.lessons.map(l=>l.id),planVersion:1,completed:[],completedStories:[],resume:null}');
  function validate(){const snap=run('runSnapshot()');if(snap)cleanSnapshot(JSON.parse(JSON.stringify(snap)),run('connected.run.lessonId'));}
  function solve(){const q=run('state.current');if(q.mode==='build'){const used=new Set();for(const part of q.parts){const i=q.tiles.findIndex((t,j)=>t===part&&!used.has(j));used.add(i);run('addTile('+i+')');validate();}run('checkBuild()');}else run('choose('+q.choices.indexOf(q.word)+')');validate();run('nextQuestion()');validate();}
  return {run,validate,solve,writes,saved,fail(value){fail=value;}};
}

test('all learner activity snapshots round-trip through backend validation',async()=>{
  const f=fixture();let main=0,review=0;
  for(let i=0;i<CONTENT.lessons.length;i++){
    if(CONTENT.lessons[i].kind==='stories')continue;
    f.run('teach('+i+');startPractice()');f.validate();f.solve();
    for(let j=0;j<12;j++){if(j===0){f.run('hint()');f.validate();}if(j===2){const q=f.run('state.current');f.run('choose('+q.choices.findIndex(w=>w!==q.word)+')');f.validate();}f.solve();main++;}
    while(f.run('state.screen')==='practice'){f.solve();review++;}
    await f.run('flushProgress()');
  }
  for(let s=0;s<CONTENT.stories.length;s++){
    f.run('startStory('+s+')');f.validate();f.run('state.storyReadCount=1;readStoryRoutine();state.screen="story";prepareStoryQuestion();markProgress()');f.validate();
    for(let j=0;j<3;j++){const answer=f.run('CONTENT.stories[state.story].questions[state.question].correct');if(j===0){f.run('answerStory('+((answer+1)%3)+')');f.validate();}f.run('answerStory('+answer+');nextStoryQuestion()');f.validate();}
    await f.run('flushProgress()');
  }
  assert.equal(main,444);assert.equal(review,74);assert.equal(f.writes.length,47);
  assert.equal(f.run('connected.profile.completed.length'),38);
});

test('restores the same question, hint state and tiles, including a saved correct answer',async()=>{
  const f=fixture();const i=CONTENT.lessons.findIndex(l=>l.id==='sh');f.run('teach('+i+');startPractice()');f.solve();f.run('hint()');
  const saved=JSON.parse(JSON.stringify(f.run('connected.profile.resume')));assert.equal(saved.snapshot.assisted,true);
  f.run('state.index=7;state.attempts=0;state.assisted=false;resumeRun()');
  assert.equal(f.run('state.index'),saved.snapshot.index);assert.equal(f.run('state.assisted'),true);assert.equal(f.run('state.current.word'),saved.snapshot.current.word);
  const q=f.run('state.current');f.run('choose('+q.choices.indexOf(q.word)+')');assert.equal(f.run('state.done'),true);const total=f.run('state.stats.total');f.run('resumeRun()');assert.equal(f.run('state.done'),true);f.run('nextQuestion()');assert.equal(f.run('state.stats.total'),total);
  const build=f.run('state.current');assert.equal(build.mode,'build');const tile=build.tiles.findIndex(t=>t===build.parts[0]);f.run('addTile('+tile+')');f.run('state.built=[];state.chosen.clear();resumeRun()');assert.equal(f.run('state.built.length'),1);assert.equal(f.run('state.built[0].text'),build.parts[0]);
});

test('keeps separate runs queued during failures and avoids duplicate writes for unchanged snapshots',async()=>{
  const f=fixture();const ids=CONTENT.lessons.map((l,i)=>!l.kind?i:-1).filter(i=>i>=0);f.fail(true);
  f.run('teach('+ids[0]+');startPractice()');await f.run('flushProgress()');
  f.run('teach('+ids[1]+');startPractice()');await f.run('flushProgress()');assert.equal(f.run('connected.pending.size'),2);
  f.fail(false);await f.run('flushProgress()');assert.equal(f.run('connected.pending.size'),0);assert.equal(f.writes.length,2);
  f.run('markProgress();markProgress()');await f.run('flushProgress()');assert.equal(f.writes.length,2);
});

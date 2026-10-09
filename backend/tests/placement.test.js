import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Placement} from '../placement.js';
import {CONTENT} from '../catalog.js';

function complete(scores={}){const answers=[];let q;while(q=Placement.next(answers)){const index=answers.filter(a=>Placement.items.find(i=>i.id===a.id).group===q.group).length;answers.push({id:q.id,answer:index<(scores[q.group]??4)?q.correct:-1});}return {answers,result:Placement.result(answers)};}
test('routes shorten after difficulty, retain listening, and distinguish untested skills from incorrect answers',()=>{
  const low=complete({short:0,sounds:0,listening:4});assert.equal(low.answers.length,12);assert.equal(low.result.focus,'sounds');assert.equal(low.result.scores.find(s=>s.id==='reading').asked,0);
  const teams=complete({teams:2});assert.equal(teams.answers.length,12);assert.equal(teams.result.focus,'teams');
  const vowels=complete({long:2});assert.equal(vowels.answers.length,20);assert.equal(vowels.result.focus,'long');
  const top=complete();assert.equal(top.answers.length,28);assert.equal(top.result.focus,'parts');assert.ok(top.result.plan.includes('stories'));
  for(const focus of ['short','teams','long','patterns','parts','listening','reading']){const c=complete({[focus]:2});assert.equal(c.result.focus,focus);assert.ok(c.result.plan.every(id=>CONTENT.lessons.some(l=>l.id===id)));}
  assert.throws(()=>Placement.validate([{id:'short-cat',answer:'student-name'}]));
  assert.throws(()=>Placement.validate([{id:'reading',answer:0}]));
  assert.throws(()=>Placement.result([]));
});
test('guided steps resume, revisit a supported lesson once, alternate stories, and finish without mastery labels',()=>{
  const p={plan:['sh','ch','stories'],completed:[],completedStories:[],practiceStatus:[]};assert.deepEqual(Placement.nextPractice(p),{kind:'lesson',lessonId:'sh'});
  p.completed=['sh'];p.practiceStatus=[{lessonId:'sh',finishedRuns:1,needsSupport:true}];assert.equal(Placement.nextPractice(p).kind,'review');
  p.practiceStatus[0].finishedRuns=2;assert.equal(Placement.nextPractice(p).lessonId,'ch');
  p.lastCompletedLessonId='sh';assert.equal(Placement.nextPractice(p).kind,'story');
  p.lastCompletedLessonId='stories';assert.equal(Placement.nextPractice(p).lessonId,'ch');
  p.resume={lessonId:'sh'};assert.equal(Placement.nextPractice(p).kind,'resume');
  p.resume=null;p.completed=p.plan;p.completedStories=Array.from({length:10},(_,i)=>i);assert.equal(Placement.nextPractice(p).kind,'finished');
});

test('every starting-check sound has a bundled clip and reading passages have no read-aloud answer aid',async()=>{
  const {readFileSync}=await import('node:fs');
  const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
  const audio=JSON.parse(html.match(/const AUDIO=(.*?);\nconst app=/s)[1]);
  const keys=['placement:soundcheck','placement:readinstructions'];
  for(const q of Placement.items){
    keys.push(q.kind==='listen'?'word:'+q.word:q.kind==='read'?'placement:readinstructions':'placement:question:'+q.id);
    if(q.kind==='read')q.choices.forEach(c=>keys.push('word:'+c));
    if(['sound','meaning','listening'].includes(q.kind))q.choices.forEach((_,i)=>keys.push('placement:choice:'+q.id+':'+i));
    if(q.kind==='reading')assert.ok(!audio.lookup['placement:choice:'+q.id+':0']);
  }
  for(const key of keys){assert.ok(audio.lookup[key],key);assert.match(audio.clips[audio.lookup[key]],/^data:audio\/mpeg;base64,.{1000}/,key);}
});

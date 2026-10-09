// Classroom mode is enabled only when the owner supplies a backend URL at build time.
// Learner codes and session tokens stay in memory; progress is saved by the backend.
const BACKEND_URL=/*BACKEND_URL*/;
const connected={token:'',profile:null,run:null,timer:0,pending:new Map(),chain:Promise.resolve(),notice:'',blocked:false,generation:0};
const openHome=home,openTeach=teach,openCommon=common,openFooter=footer,openPrivacyHTML=privacyHTML;
const classroomTeacherHTML=teacherHTML;
teacherHTML=function(){const html=classroomTeacherHTML();if(!classroomEnabled())return html;return html.replace('or saved student profile','or automatic student placement').replace('<h2>This visit only</h2>','<h2>Activity on this page</h2><p>Code-based practice saves learning records to the classroom backend. Teachers use the protected dashboard for assignments, observations and dated reports. Open practice still stays in page memory.</p>');};
const offlineOnly=typeof location!=='undefined'&&location.protocol==='file:';
function classroomEnabled(){return !!BACKEND_URL&&!offlineOnly;}
function saveNotice(text){connected.notice=text;const e=document.getElementById('saveState');if(e)e.textContent=text;}
async function classroomAPI(path,method='GET',body,token=connected.token){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{const r=await fetch(BACKEND_URL+'/v1/'+path,{method,headers:{'Content-Type':'application/json',...(token?{'Authorization':'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',credentials:'omit',signal:controller.signal});const d=await r.json();if(!r.ok){const error=new Error(d.error||'Practice could not be saved.');error.status=r.status;throw error;}return d;}finally{clearTimeout(timeout);}
}
footer=function(){if(!classroomEnabled())return openFooter();return `<div id="audioState" class="audiostate" role="status" aria-live="polite"></div><p id="saveState" class="small" role="status" aria-live="polite">${esc(connected.notice)}</p><footer class="footer"><span>${connected.token?'Code-based practice · Progress saves online':'Open practice · Progress stays in this visit'} · No ads</span><button class="textbutton" id="privacy">Privacy &amp; offline copy</button>${connected.token?'<button class="textbutton" id="signout">Finish &amp; sign out</button>':'<button class="textbutton" id="codeentry">Enter learner code</button>'}</footer>`;};
common=function(){openCommon();on('codeentry',codeScreen);on('signout',signOutLearner);};
privacyHTML=function(){if(!classroomEnabled())return openPrivacyHTML();return `<p><strong>Choose how you practise.</strong> Open practice uses this page’s memory only. When you enter a learner code, the classroom service saves assignments, question position, activity counts, review targets and dates.</p><p>The system has no student-name, student-email, birthdate, photo or voice-recording fields. Your teacher keeps the student-to-code list separately. Codes link learning records to a reader, so these records are not completely anonymous. Keep codes private.</p><p>Teacher sign-in is handled by Cloudflare Access and uses a teacher’s email address. Cloudflare and GitHub may process IP addresses and other operational information. The app has no advertising or analytics, and never uses the microphone.</p><h2>Shared devices</h2><p>Use Finish &amp; sign out before handing the device to another reader. The learner session stays only in page memory and ends after eight hours. After a reload, enter the code again to retrieve saved progress.</p><h2>Offline open practice</h2><p>The downloaded file contains all lessons and audio, without the current code, session or progress. Opening it as a local file turns off classroom connections. Offline practice does not save to your teacher’s dashboard.</p><button class="primary" id="download">Download offline copy</button>`;};
function codeScreen(){stopAudio();state.screen='code';app.innerHTML=`<section class="panel"><div class="eyebrow">Your reading practice</div><h1>Enter your code.</h1><p class="task">Use the code your teacher gave you.</p><label for="learnercode">Learner code</label><input id="learnercode" class="codeinput" type="text" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD-EFGH-JKLM"><div class="cta"><button class="primary" id="login">Start my practice</button><button class="quiet" id="openpractice">Practise without a code</button></div><p id="loginmessage" role="status" aria-live="polite"></p><p class="small">Your code opens your assigned lessons and saves your progress for your teacher. Keep it private.</p></section>${footer()}`;on('login',loginLearner);on('openpractice',()=>{if(connected.token)signOutLearner();else openHome();});document.getElementById('learnercode').addEventListener('keydown',e=>{if(e.key==='Enter')loginLearner();});common();focusHeading();}
async function loginLearner(){const button=document.getElementById('login'),input=document.getElementById('learnercode');if(!button||button.disabled)return;button.disabled=true;const code=input.value;document.getElementById('loginmessage').textContent='Opening your practice…';try{const profile=await classroomAPI('login','POST',{code},'');input.value='';connected.generation++;connected.token=profile.token;connected.profile=profile;connected.run=null;connected.blocked=false;connected.pending.clear();clearTimeout(connected.timer);state.completed=new Set(profile.completed.map(id=>CONTENT.lessons.findIndex(l=>l.id===id)));state.storyDone=new Set(profile.completedStories||[]);state.results.clear();saveNotice('Your practice plan is ready.');assignedHome();}catch(e){document.getElementById('loginmessage').textContent=e.message||'Could not connect. Try again.';}finally{button.disabled=false;}}
home=function(){if(connected.token)return assignedHome();if(classroomEnabled())return codeScreen();return openHome();};
function assignedHome(){stopAudio();state.screen='home';state.current=null;const p=connected.profile;if(!p)return codeScreen();const next=p.plan.find(id=>!p.completed.includes(id))||p.plan[0],resume=p.resume;app.innerHTML=`<section class="welcome"><div><div class="eyebrow">Your reading practice</div><h1>Ready for your next step?</h1><p>These are the lessons your teacher picked for you.</p></div></section><div class="actions"><button class="primary" id="refreshplan">Check for a new plan</button></div>${resume?`<div class="mapnote"><strong>You have practice to finish.</strong><button class="primary" id="resume">Keep going</button></div>`:next?`<div class="mapnote"><button class="primary" id="startassigned">Start my practice</button></div>`:'<p class="notice">Your teacher is getting your practice ready. Check back with them.</p>'}<div class="lessonmap" style="margin-top:24px">${p.plan.map(id=>{const i=CONTENT.lessons.findIndex(l=>l.id===id),l=CONTENT.lessons[i];return `<button class="lessoncard" data-assigned="${i}"><strong>${esc(l.name)}</strong><span class="examples">${esc(l.stage)}${p.completed.includes(id)?' · Practised':''}</span></button>`;}).join('')}</div>${footer()}`;on('resume',resumeRun);on('startassigned',()=>teach(CONTENT.lessons.findIndex(l=>l.id===next)));on('refreshplan',refreshPlan);app.querySelectorAll('[data-assigned]').forEach(b=>b.addEventListener('click',()=>teach(Number(b.dataset.assigned))));common();focusHeading();}
teach=function(i){if(connected.token&&!connected.profile.plan.includes(CONTENT.lessons[i]?.id))return assignedHome();openTeach(i);};
async function refreshPlan(){await flushProgress();try{const p=await classroomAPI('me');connected.profile=p;connected.blocked=false;connected.run=null;saveNotice('Your practice plan is ready.');assignedHome();}catch(e){saveNotice(e.message);}}
async function signOutLearner(){stopAudio();const button=document.getElementById('signout');if(button)button.disabled=true;await flushProgress();if(connected.pending.size||connected.notice.startsWith('Not saved')){saveNotice('Not saved yet. Keep this page open and try Retry save before signing out.');if(button)button.disabled=false;return;}try{await classroomAPI('logout','POST',{});}catch{}connected.generation++;connected.token='';connected.profile=null;connected.run=null;connected.pending.clear();clearTimeout(connected.timer);state.completed.clear();state.results.clear();state.storyDone.clear();saveNotice('');codeScreen();}
function runSnapshot(){if(!connected.token||!connected.run||connected.blocked)return null;
  if(connected.run.type==='practice'&&['practice','finish'].includes(state.screen))return {type:'practice',screen:state.screen,index:state.index,demo:state.demo,done:state.done,attempts:state.attempts,assisted:state.assisted,practice:state.practice,current:state.current,built:state.built.map(b=>b.i),missed:[...state.missed.values()],reviewCreated:state.reviewCreated,stats:state.stats};
  if(connected.run.type==='story'&&['story-read','story','story-finish'].includes(state.screen))return {type:'story',screen:state.screen,story:state.story,question:state.question,done:state.done,attempts:state.attempts,assisted:state.assisted,storyHelp:state.storyHelp,storyReadCount:state.storyReadCount,storyStats:state.storyStats};
  return null;
}
function markProgress(){const snapshot=runSnapshot();if(!snapshot)return;const run=connected.run;const serialized=JSON.stringify(snapshot);if(run.last===serialized)return;run.last=serialized;const payload={generation:connected.generation,token:connected.token,runId:run.id,lessonId:run.lessonId,planVersion:connected.profile.planVersion,revision:++run.revision,snapshot:JSON.parse(JSON.stringify(snapshot))};connected.pending.set(run.id,payload);connected.profile.resume=['finish','story-finish'].includes(snapshot.screen)?null:{runId:run.id,lessonId:run.lessonId,revision:run.revision,snapshot:payload.snapshot};saveNotice('Saving your place…');clearTimeout(connected.timer);connected.timer=setTimeout(flushProgress,350);}
async function flushProgress(){
  clearTimeout(connected.timer);
  const batch=[...connected.pending.values()];connected.pending.clear();
  for(const payload of batch)connected.chain=connected.chain.then(async()=>{
    if(payload.generation!==connected.generation||connected.blocked)return;
    try{
      await classroomAPI('progress','PUT',{runId:payload.runId,lessonId:payload.lessonId,planVersion:payload.planVersion,revision:payload.revision,snapshot:payload.snapshot},payload.token);
      if(payload.generation!==connected.generation)return;
      if(['finish','story-finish'].includes(payload.snapshot.screen)){
        if(payload.snapshot.type==='practice'){if(!connected.profile.completed.includes(payload.lessonId))connected.profile.completed.push(payload.lessonId);}
        else{const stories=new Set(connected.profile.completedStories||[]);stories.add(payload.snapshot.story);connected.profile.completedStories=[...stories];if(stories.size===CONTENT.stories.length&&!connected.profile.completed.includes(payload.lessonId))connected.profile.completed.push(payload.lessonId);}
      }
      if(!connected.pending.size)saveNotice('Your place is saved.');
      document.getElementById('retrysave')?.remove();
    }catch(e){
      if(payload.generation!==connected.generation)return;
      if(e.status===409){connected.blocked=true;connected.pending.clear();saveNotice(e.message+' Tap Check for a new plan on your practice list.');}
      else{
        const newer=connected.pending.get(payload.runId);if(!newer||newer.revision<payload.revision)connected.pending.set(payload.runId,payload);
        saveNotice('Not saved yet. Keep this page open. '+e.message);
        const box=document.getElementById('saveState');
        if(box&&!document.getElementById('retrysave')){const b=document.createElement('button');b.id='retrysave';b.className='quiet smallbtn';b.textContent='Retry save';b.addEventListener('click',flushProgress);box.after(b);}
      }
    }
  });
  await connected.chain;
}

function newRun(type,lessonId){if(!connected.token)return;connected.run={id:crypto.randomUUID(),lessonId,type,revision:0};}
const offlineStartPractice=startPractice;
startPractice=function(){if(connected.blocked){assignedHome();return;}offlineStartPractice();state.screen='practice';newRun('practice',CONTENT.lessons[state.lesson].id);markProgress();};
const offlineStartStory=startStory;
startStory=function(i){if(connected.blocked){assignedHome();return;}offlineStartStory(i);state.done=false;state.attempts=0;state.assisted=false;newRun('story',CONTENT.lessons[storyLessonIndex].id);markProgress();};
function restoreDone(kind){if(!state.done)return;if(kind==='practice'){app.querySelectorAll('[data-choice],[data-tile],[data-slot]').forEach(b=>b.disabled=true);document.getElementById('hint').disabled=true;const check=document.getElementById('check');if(check)check.hidden=true;setFeedback(state.current.mode==='quiz'?state.current.explanation:'Yes! Read the whole word aloud.');document.getElementById('next').hidden=false;}else{app.querySelectorAll('[data-answer]').forEach(b=>b.disabled=true);document.getElementById('storyhint').disabled=true;document.getElementById('storynext').hidden=false;setFeedback('Your answer is saved. Keep going.');}}
function resumeRun(){const r=connected.profile.resume;if(!r)return assignedHome();const s=r.snapshot;connected.run={id:r.runId,lessonId:r.lessonId,type:s.type,revision:r.revision};state.lesson=CONTENT.lessons.findIndex(l=>l.id===r.lessonId);state.screen=s.screen;state.done=s.done;state.attempts=s.attempts;state.assisted=s.assisted;
  if(s.type==='practice'){state.index=s.index;state.demo=s.demo;state.practice=s.practice;state.current=s.current;state.built=s.built.map(i=>({i,text:s.current.tiles[i]}));state.chosen=new Set(s.built);state.missed=new Map(s.missed.map(q=>[q.mode==='quiz'?q.promptKey:q.word,q]));state.reviewCreated=s.reviewCreated;state.stats=s.stats;renderQuestion();if(state.current.mode==='build')updateBuild();if(state.assisted&&!state.done)hint();restoreDone('practice');playQuestion();}else{state.story=s.story;state.question=s.question;state.storyHelp=s.storyHelp;state.storyReadCount=s.storyReadCount;state.storyStats=s.storyStats;if(s.screen==='story-read')readStoryRoutine();else{renderStory();restoreDone('story');}}focusHeading();}
// Save after direct activity actions. Payloads are captured before the next screen renders.
const connectedChoose=choose;choose=function(i){connectedChoose(i);markProgress();};
const connectedHint=hint;hint=function(){connectedHint();markProgress();};
const connectedCheckBuild=checkBuild;checkBuild=function(){connectedCheckBuild();markProgress();};
const connectedAddTile=addTile;addTile=function(i){connectedAddTile(i);markProgress();};
const connectedRemoveSlot=removeSlot;removeSlot=function(i){connectedRemoveSlot(i);markProgress();};
const connectedClearBuild=clearBuild;clearBuild=function(){connectedClearBuild();markProgress();};
const connectedNextQuestion=nextQuestion;nextQuestion=function(){connectedNextQuestion();markProgress();};
const connectedAnswerStory=answerStory;answerStory=function(i){connectedAnswerStory(i);markProgress();};
const connectedNextStory=nextStoryQuestion;nextStoryQuestion=function(){connectedNextStory();markProgress();};
document.addEventListener('click',()=>{if(connected.token)queueMicrotask(markProgress);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&connected.token)flushProgress();});
if(classroomEnabled()){const teacherLink=document.createElement('a');teacherLink.href=BACKEND_URL+'/teacher';teacherLink.target='_blank';teacherLink.rel='noopener';teacherLink.className='quiet';teacherLink.textContent='Teacher dashboard';document.querySelector('.headeractions').append(teacherLink);}

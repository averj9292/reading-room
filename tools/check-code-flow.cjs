// Optional browser QA against a synthetic in-memory classroom service. No production requests.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const launch=process.env.READING_BROWSER_LAUNCHER ? require(path.resolve(process.env.READING_BROWSER_LAUNCHER)) : () => require(process.env.READING_PLAYWRIGHT_MODULE || 'playwright').chromium.launch({headless:true});
 const {Placement}=await import(root+'/backend/placement.js');
 const b=await launch();try { const context=await b.newContext({viewport:{width:768,height:1024},hasTouch:true,isMobile:true});const p=await context.newPage();
 const profile={token:'synthetic-test-session',readerNumber:0,plan:[],planVersion:1,completed:[],completedStories:[],practiceStatus:[],resume:null,placement:{generation:1,status:'pending',answers:[],result:null}};
 let writes=0,failProgress=0,failPlacement=0,conflictProgress=0;const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',async r=>{
  const req=r.request(),url=req.url();
  if(url==='https://reading.local/')return r.fulfill({contentType:'text/html',body:fs.readFileSync(root+'/index.html','utf8')});
  if(!url.startsWith('https://reading-room.averyjconsulting.workers.dev/v1/'))return r.abort();
  const headers={'Access-Control-Allow-Origin':'https://reading.local','Access-Control-Allow-Headers':'content-type,authorization','Access-Control-Allow-Methods':'GET,POST,PUT'};
  if(req.method()==='OPTIONS')return r.fulfill({status:204,headers});
  const endpoint=url.split('/v1/')[1],payload=req.postDataJSON();
  if(endpoint==='placement'&&failPlacement){failPlacement--;return r.fulfill({status:503,contentType:'application/json',headers,body:'{"error":"Temporary test outage"}'});}
  if(endpoint==='placement'){
   profile.placement.answers=Placement.validate([...profile.placement.answers,{id:payload.itemId,answer:payload.answer}]);
   if(!Placement.next(profile.placement.answers)){profile.placement.status='complete';profile.placement.result=Placement.result(profile.placement.answers);profile.plan=profile.placement.result.plan;profile.planVersion++;}
  }
  if(endpoint==='progress'&&conflictProgress){conflictProgress--;return r.fulfill({status:409,contentType:'application/json',headers,body:'{"error":"Your teacher changed your plan."}'});}
  if(endpoint==='progress'&&failProgress){failProgress--;return r.fulfill({status:503,contentType:'application/json',headers,body:'{"error":"Temporary test outage"}'});}
  if(endpoint==='progress'){writes++;profile.resume={runId:payload.runId,lessonId:payload.lessonId,revision:payload.revision,snapshot:payload.snapshot};}
  return r.fulfill({contentType:'application/json',headers,body:JSON.stringify(endpoint==='progress'||endpoint==='logout'?{ok:true}:profile)});
 });
 async function login(){await p.locator('#learnercode').fill('SYNTHETIC');await p.locator('#login').tap();}
 await p.goto('https://reading.local/');await login();await p.locator('#begincheck').tap();const firstCorrect=Placement.next(profile.placement.answers).correct;await p.locator(`[data-check-answer="${firstCorrect}"]`).tap();await p.waitForFunction(()=>!guided.busy&&!guided.pending);assert.match(await p.locator('.toprow').innerText(),/Question 2/);
 await p.setViewportSize({width:768,height:1024});await p.reload();await login();assert.equal(profile.placement.answers.length,1);await p.locator('#begincheck').tap();assert.match(await p.locator('.toprow').innerText(),/Question 2/);
 let checkedLongPassage=false;
 while(await p.locator('#notsure').count()){
  const current=Placement.next(profile.placement.answers),testFailure=current.kind==='reading'&&!checkedLongPassage;
  if(testFailure){checkedLongPassage=true;failPlacement=1;await p.setViewportSize({width:768,height:507});}
  await p.locator(`[data-check-answer="${current.correct}"]`).tap();
  if(testFailure){await p.locator('#retrycheck').waitFor();const checkRetry=await p.locator('#retrycheck').boundingBox();assert.equal(await p.locator('#retrycheck').evaluate(e=>e===document.activeElement),true);assert.ok(checkRetry.y>=0&&checkRetry.y+checkRetry.height<=507);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.locator('#retrycheck').tap();}
  await p.waitForFunction(()=>!guided.busy&&!guided.pending);
 }
 assert.equal(checkedLongPassage,true);await p.setViewportSize({width:768,height:1024});
 await p.locator('#beginrecommended').tap();await p.locator('#start').tap();
 const choice=await p.evaluate(()=>state.current.choices.indexOf(state.current.word));await p.locator(`[data-choice="${choice}"]`).tap();await p.locator('#next').tap();await p.locator('#hint').tap();await p.locator('#home').tap();await p.locator('#guidedstart').waitFor();assert.ok(writes>0);
 const saved=JSON.stringify(profile.resume.snapshot);await p.reload();await login();await p.locator('#guidedstart').tap();assert.equal(await p.evaluate(()=>state.assisted),true);assert.equal(await p.evaluate(()=>state.index),JSON.parse(saved).index);assert.equal(await p.locator('#hintbox').isVisible(),true);await p.waitForFunction(()=>connected.latest.size===0&&connected.pending.size===0);
 await p.setViewportSize({width:768,height:507});failProgress=1;
 const resumedChoice=await p.evaluate(()=>state.current.choices.indexOf(state.current.word));await p.locator(`[data-choice="${resumedChoice}"]`).tap();
 await p.locator('#retrysave').waitFor();
 const retry=await p.locator('#retrysave').boundingBox();assert.ok(retry.width>=44&&retry.height>=44,`retry target was ${JSON.stringify(retry)}`);assert.ok(retry.y>=0&&retry.y+retry.height<=507,`retry was outside the landscape viewport: ${JSON.stringify(retry)}`);assert.ok(await p.locator('#saveState').innerText().then(t=>t.startsWith('Not saved yet.')));assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.locator('#retrysave').tap();await p.waitForFunction(()=>connected.latest.size===0&&connected.pending.size===0);assert.equal(await p.locator('#saveState').innerText(),'Your place is saved.');
 profile.plan=['ch','stories'];profile.planVersion++;profile.completed=[];profile.practiceStatus=[];profile.resume=null;conflictProgress=1;await p.locator('#next').tap();await p.locator('#reloadplan').waitFor();
 const updateButton=await p.locator('#reloadplan').boundingBox();assert.equal(await p.evaluate(()=>state.screen),'plan-changed');assert.equal(await p.locator('#hint').count(),0);assert.ok(updateButton.y>=0&&updateButton.y+updateButton.height<=507);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.locator('#reloadplan').tap();await p.locator('#guidedstart').waitFor();assert.equal(await p.evaluate(()=>connected.profile.planVersion),profile.planVersion);assert.equal(await p.evaluate(()=>connected.blocked),false);
 await p.locator('#signout').tap();await p.locator('#learnercode').waitFor();assert.equal(await p.locator('#learnercode').isVisible(),true);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({mockCodeLogin:true,startingCheckFailureFocus:true,startingCheckReloadResume:true,recommendedPlan:true,savedPracticeReloadResume:true,splitScreenSaveRetry:true,changedPlanRecovery:true,signOut:true,progressWrites:writes,scriptErrors:errors.length}));} finally {await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

// Synthetic browser checks only. No production classroom requests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const launch=process.env.READING_BROWSER_LAUNCHER?require(path.resolve(process.env.READING_BROWSER_LAUNCHER)):()=>require(process.env.READING_PLAYWRIGHT_MODULE||'playwright').chromium.launch({headless:true});
(async()=>{const browser=await launch(),errors=[];let checks=0;const context=await browser.newContext({hasTouch:true,isMobile:true,acceptDownloads:true});
try{for(const [width,height] of [[768,1024],[1024,768],[507,768],[768,507]]){
 const p=await context.newPage();await p.setViewportSize({width,height});p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url()==='https://reading.local/'?r.fulfill({contentType:'text/html',body:fs.readFileSync(root+'/index.html','utf8')}):r.abort());await p.goto('https://reading.local/');
 await p.locator('#openpractice').tap();
 for(let i=0;i<37;i++){await p.evaluate(i=>teach(i),i);assert.equal(await p.locator('.teaching-model').count(),1);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks+=2;}
 await p.evaluate(()=>teach(CONTENT.lessons.findIndex(l=>l.id==='sh')));await p.locator('#start').tap();
 let q=await p.evaluate(()=>state.current);await p.locator(`[data-choice="${q.choices.indexOf(q.word)}"]`).tap();await p.locator('#next').tap();q=await p.evaluate(()=>state.current);const wrong=q.choices.findIndex(w=>w!==q.word);
 await p.locator(`[data-choice="${wrong}"]`).tap();assert.match(await p.locator('#feedback').innerText(),/Try this:/);assert.equal(await p.locator('#hintbox').isVisible(),false);
 await p.locator(`[data-choice="${wrong}"]`).tap();assert.equal(await p.locator('#hintbox').isVisible(),true);assert.equal(await p.evaluate(()=>state.assisted),true);
 await p.locator(`[data-choice="${q.choices.indexOf(q.word)}"]`).tap();assert.equal(await p.evaluate(()=>state.stats.help),1);assert.equal(await p.evaluate(()=>state.stats.first),0);checks+=6;
 const small=await p.evaluate(()=>[...document.querySelectorAll('button')].filter(e=>e.getClientRects().length&&!e.closest('[hidden]')).some(e=>e.getBoundingClientRect().height<44));assert.equal(small,false);checks++;
 await p.close();const t=await context.newPage();await t.setViewportSize({width,height});t.on('pageerror',e=>errors.push(e.message));
 const report={runs:[{reader_number:1,lessonName:'The sh team',total:5,first_try:3,helped:2,review:1,complete:0,targets:['ship','<unsafe>']}],observations:[{reader_number:2,lessonName:'The sh team',observation:'Read with support',created_at:Date.now()}],placements:[]};
 await t.route('**/*',r=>{const u=r.request().url();if(u==='https://classroom.local/teacher')return r.fulfill({contentType:'text/html',body:fs.readFileSync(root+'/backend/teacher.html','utf8')});if(u.includes('/teacher/api/report?'))return r.fulfill({json:report});if(u.endsWith('/teacher/api/readers'))return r.fulfill({json:{email:'synthetic@example.test',readers:[],catalog:[],observations:[]}});return r.abort();});
 await t.goto('https://classroom.local/teacher');await t.locator('#from').fill('2026-10-01');await t.locator('#through').fill('2026-10-07');await t.locator('#report').tap();await t.locator('.reader-report').first().waitFor();
 assert.equal(await t.locator('.reader-report').count(),2);assert.match(await t.locator('.reader-report').first().innerText(),/5 main answers/);assert.match(await t.locator('.reader-report').nth(1).innerText(),/Check attendance or access/);assert.equal(await t.locator('unsafe').count(),0);assert.ok(await t.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks+=5;
 await t.locator('#from').fill('2026-10-08');const downloaded=t.waitForEvent('download');await t.locator('#csv').tap();const download=await downloaded;assert.equal(download.suggestedFilename(),'reading-room-report-2026-10-01-to-2026-10-07.csv');const csv=fs.readFileSync(await download.path(),'utf8');assert.match(csv,/2026-10-01/);assert.doesNotMatch(csv,/2026-10-08/);checks+=3;
 await t.emulateMedia({media:'print'});assert.equal(await t.locator('.reader-report').first().isVisible(),true);assert.equal(await t.locator('#create').isVisible(),false);checks+=2;
 if(width===768&&height===1024){await t.screenshot({path:'/tmp/rr-report-print.png',fullPage:true});await t.emulateMedia({media:'screen'});await t.screenshot({path:'/tmp/rr-report-screen.png',fullPage:true});}
 await t.close();console.log(`${width}x${height}: teaching and report passed`);
}assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,scriptErrors:errors.length,teachingSupport:true,reportPrintAndCSV:true}));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

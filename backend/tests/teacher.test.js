import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function dashboard(){
  const elements=new Map();let checks=[];
  const node=id=>{if(!elements.has(id))elements.set(id,{value:'',disabled:false,textContent:'',querySelectorAll:selector=>selector==='[data-lesson]'?checks:selector==='[data-lesson]:checked'?checks.filter(b=>b.checked):[]});return elements.get(id);};
  const editor=node('editor');
  Object.defineProperty(editor,'innerHTML',{set(html){this.html=html;for(const id of [...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]))elements.set(id,{value:'',disabled:false,textContent:''});checks=[...html.matchAll(/<input type="checkbox" data-lesson="([^"]+)" ([^>]*)>/g)].map(m=>({dataset:{lesson:m[1]},checked:m[2].includes('checked'),disabled:false}));}});
  const catalog=[{id:'sh',name:'The sh team',stage:'Letter teams',examples:['ship','shop','fish']},{id:'ch',name:'The ch team',stage:'Letter teams',examples:['chip','chop','chin']}];
  const reader={id:'test-reader',readerNumber:1,plan:[],planVersion:1},payloads=[];
  let reject=false;
  const context=vm.createContext({document:{getElementById:node},console,fetch:async(path,options)=>{
    if(options.method==='PUT'){
      if(reject)return {ok:false,json:async()=>({error:'Connection unavailable. Try again.'})};
      const body=JSON.parse(options.body);payloads.push(body);reader.plan=body.lessonIds;reader.planVersion++;return {ok:true,json:async()=>({ok:true})};
    }
    return {ok:true,json:async()=>({email:'teacher@example.com',catalog,observations:['Read with support'],readers:[{...reader,plan:[...reader.plan]}]})};
  }});
  const source=readFileSync(new URL('../teacher.html',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInContext(source.slice(0,source.indexOf("el('create').onclick")),context);
  vm.runInContext('selected="test-reader";',context);
  return {node,reader,payloads,checks:()=>checks,load:()=>vm.runInContext('load()',context),choose:id=>{node('firstlesson').value=id;node('firstlesson').onchange();},save:()=>node('saveplan').onclick(),reject:()=>{reject=true;}};
}

test('starting skill alone saves a usable plan, changing it does not silently retain the old start',async()=>{
  const d=dashboard();await d.load();assert.equal(d.node('saveplan').disabled,true);
  d.choose('sh');assert.equal(d.node('saveplan').disabled,false);
  assert.equal(d.checks().find(b=>b.dataset.lesson==='sh').disabled,true);
  await d.save();assert.deepEqual(d.payloads[0].lessonIds,['sh']);assert.deepEqual(d.reader.plan,['sh']);
  assert.match(d.node('planmessage').textContent,/Saved.*The sh team/);
  d.choose('ch');await d.save();assert.deepEqual(d.payloads[1].lessonIds,['ch']);
  const extra=d.checks().find(b=>b.dataset.lesson==='sh');extra.checked=true;extra.onchange();await d.save();
  assert.deepEqual(d.payloads[2].lessonIds,['ch','sh']);
});

test('save failures are visible beside the button and keep the unsaved selection',async()=>{
  const d=dashboard();await d.load();d.choose('sh');d.reject();await d.save();
  assert.match(d.node('planmessage').textContent,/Connection unavailable/);
  assert.equal(d.node('firstlesson').value,'sh');assert.equal(d.node('saveplan').disabled,false);
  assert.deepEqual(d.reader.plan,[]);
});

test('reader report keeps date-range counts, observations and escaped targets separate',()=>{
  const source=readFileSync(new URL('../teacher.html',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const c=vm.createContext({document:{getElementById(){return {};}}});
  vm.runInContext(source.slice(0,source.indexOf("el('create').onclick")),c);
  const report={runs:[{reader_number:1,lessonName:'The sh team',total:3,first_try:2,helped:1,review:0,targets:['<script>bad</script>']},{reader_number:1,lessonName:'The sh team',total:2,first_try:1,helped:1,review:1,targets:['ship']}],observations:[{reader_number:2,lessonName:'Words',observation:'Read with support',created_at:Date.now()}],placements:[]};
  c.report=report;const groups=vm.runInContext('readerReportGroups(report)',c);assert.equal(groups.length,2);assert.equal(groups[0].total,5);assert.equal(groups[0].help,2);assert.equal(groups[0].review,1);assert.equal(groups[1].total,0);
  const html=vm.runInContext('renderReaderReports(report)',c);assert.match(html,/Reader 02/);assert.match(html,/Check attendance or access/);assert.match(html,/Listen to the reader try/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>bad/);assert.match(html,/do not identify the type or frequency/);
});

test('report retains requested dates when date controls change while loading',async()=>{
  const source=readFileSync(new URL('../teacher.html',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const nodes={from:{value:'2026-10-01'},through:{value:'2026-10-07'},reportbody:{},message:{},planmessage:{}};let release;
  const c=vm.createContext({document:{getElementById:id=>nodes[id]},fetch:async()=>{await new Promise(r=>release=r);return {ok:true,json:async()=>({runs:[],observations:[],placements:[]})};}});
  vm.runInContext(source.slice(0,source.indexOf("el('create').onclick")),c);
  const pending=vm.runInContext('loadReport()',c);nodes.from.value='2026-10-08';release();await pending;
  assert.match(nodes.reportbody.innerHTML,/2026-10-01 to 2026-10-07/);assert.equal(vm.runInContext('reportData.range.from',c),'2026-10-01');
});

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

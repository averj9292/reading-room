// Original, low-stakes starting check. These rules are a practice heuristic,
// not a normed reading assessment, a grade level, or a test of oral fluency.
const Placement=(()=>{
  const groups=[
    {id:'sounds',name:'Rhyming and starting sounds',route:['rhyme','start-sound','syllables','short-a']},
    {id:'short',name:'Short-vowel words',route:['short-a','short-i','short-o','short-u','short-e','vowel-mix']},
    {id:'teams',name:'Letter teams and blends',route:['sh','ch','th-ck','start-blends','end-blends']},
    {id:'long',name:'Long-vowel patterns',route:['a-e','i-e','ee-ea','oa-ow','ai-ay']},
    {id:'patterns',name:'Other vowel patterns',route:['ar','er-ir-ur','oi-oy','ou-ow']},
    {id:'parts',name:'Word parts and meaning',route:['compound','prefixes','suffixes','plurals']},
    {id:'listening',name:'Listening comprehension',route:['vocabulary','prefixes','stories']},
    {id:'reading',name:'Short-passage comprehension',route:['vocabulary','stories']}
  ];
  const items=[];
  function add(group,id,prompt,choices,correct,extra={}){
    // Rotate answer locations to avoid a fixed correct-choice position.
    const shift=items.length%choices.length,ordered=choices.slice(shift).concat(choices.slice(0,shift));
    items.push({id,group,prompt,choices:ordered,correct:ordered.indexOf(choices[correct]),...extra});
  }
  function word(group,id,target,choices,lesson,kind='listen'){
    add(group,id,kind==='listen'?'Listen to the word. Choose its spelling.':'Read the word. Listen to the choices. Choose its sound.',choices,choices.indexOf(target),{kind,word:target,lesson});
  }
  add('sounds','sounds-rhyme-cat','Which word rhymes with cat?',['hat','cup','pin'],0,{kind:'sound',lesson:'rhyme'});
  add('sounds','sounds-start-moon','Which word starts with the same sound as moon?',['map','sun','hat'],0,{kind:'sound',lesson:'start-sound'});
  add('sounds','sounds-rhyme-sun','Which word rhymes with sun?',['run','bed','fish'],0,{kind:'sound',lesson:'rhyme'});
  add('sounds','sounds-start-fish','Which word starts with the same sound as fish?',['fan','map','dog'],0,{kind:'sound',lesson:'start-sound'});
  word('short','short-cat','cat',['cat','cot','cut'],'short-a');
  word('short','short-pin','pin',['pin','pan','pen'],'short-i','read');
  word('short','short-cup','cup',['cup','cap','cop'],'short-u');
  word('short','short-hen','hen',['hen','him','ham'],'short-e','read');
  word('teams','teams-ship','ship',['ship','chip','sip'],'sh');
  word('teams','teams-chin','chin',['chin','shin','thin'],'ch','read');
  word('teams','teams-thin','thin',['thin','tin','fin'],'th-ck');
  word('teams','teams-clap','clap',['clap','cap','clamp'],'start-blends','read');
  word('long','long-cake','cake',['cake','cap','cat'],'a-e');
  word('long','long-bike','bike',['bike','bit','back'],'i-e','read');
  word('long','long-seed','seed',['seed','said','sad'],'ee-ea');
  word('long','long-boat','boat',['boat','boot','bat'],'oa-ow','read');
  word('patterns','patterns-fork','fork',['fork','forks','folk'],'or');
  word('patterns','patterns-bird','bird',['bird','bed','beard'],'er-ir-ur','read');
  word('patterns','patterns-coin','coin',['coin','cone','corn'],'oi-oy');
  word('patterns','patterns-cloud','cloud',['cloud','cold','clod'],'ou-ow','read');
  add('parts','parts-redo','If you redo a drawing, what do you do?',['Draw it again.','Throw it away.','Draw it very quickly.'],0,{kind:'meaning',lesson:'prefixes'});
  add('parts','parts-careless','Which sentence shows someone being careless?',['Jo drops a cup because Jo is not paying attention.','Jo checks the cup for a crack.','Jo puts the cup down gently.'],0,{kind:'meaning',lesson:'suffixes'});
  add('parts','parts-sunset','Which two words make sunset?',['sun and set','sun and sit','sand and set'],0,{kind:'meaning',lesson:'compound'});
  add('parts','parts-plural','Which word means more than one fox?',['foxes','fox','foxing'],0,{kind:'meaning',lesson:'plurals'});
  const listenA='Ari put a spoon in a bag. At the park, Ari used it to dig a small hole. Ari planted a seed in the hole.';
  const listenB='Rain began while Tess was walking home. Tess opened an umbrella and stayed dry. At home, Tess left the wet umbrella by the door.';
  add('listening','listen-seed','What did Ari put in the hole?',['A seed.','A spoon.','A bag.'],0,{kind:'listening',passage:listenA,lesson:'vocabulary'});
  add('listening','listen-spoon','Why did Ari bring a spoon?',['To dig a hole.','To eat lunch.','To carry water.'],0,{kind:'listening',passage:listenA,lesson:'vocabulary'});
  add('listening','listen-umbrella','What helped Tess stay dry?',['An umbrella.','A bag.','The door.'],0,{kind:'listening',passage:listenB,lesson:'vocabulary'});
  add('listening','listen-order','What happened before Tess opened the umbrella?',['Rain began.','Tess got home.','The umbrella dried.'],0,{kind:'listening',passage:listenB,lesson:'vocabulary'});
  const readA='Mila had a red tin and a blue tin. She put three shells in the red tin. The blue tin stayed empty.';
  const readB='Ben wanted to fly his kite. The air was still, so the kite lay on the grass. Then a breeze moved the leaves. Ben tried again, and the kite rose.';
  add('reading','read-tin','Which tin held the shells?',['The red tin.','The blue tin.','Both tins.'],0,{kind:'reading',passage:readA,lesson:'stories'});
  add('reading','read-empty','What does empty tell you about the blue tin?',['Nothing was inside it.','It was very heavy.','It had three shells.'],0,{kind:'reading',passage:readA,lesson:'stories'});
  add('reading','read-kite','Why did the kite stay on the grass at first?',['There was no wind.','Ben had lost the kite.','The kite was wet.'],0,{kind:'reading',passage:readB,lesson:'stories'});
  add('reading','read-breeze','What changed before Ben tried again?',['A breeze began.','It began to rain.','The leaves stopped moving.'],0,{kind:'reading',passage:readB,lesson:'stories'});
  const byId=new Map(items.map(q=>[q.id,q]));
  function routeGroup(answers){
    const seen=group=>answers.filter(a=>byId.get(a.id)?.group===group);
    const score=group=>seen(group).filter(a=>a.answer===byId.get(a.id).correct).length;
    const short=seen('short');if(short.length<4)return 'short';
    if(score('short')<3){if(seen('sounds').length<4)return 'sounds';if(seen('listening').length<4)return 'listening';return null;}
    for(const group of ['teams','long','patterns','parts']){
      if(seen(group).length<4)return group;
      if(score(group)<3)break;
    }
    if(seen('listening').length<4)return 'listening';
    if(score('teams')>=3&&seen('reading').length<4)return 'reading';
    return null;
  }
  function next(answers){const group=routeGroup(answers);return group?items.find(q=>q.group===group&&!answers.some(a=>a.id===q.id)):null;}
  function validate(value){
    if(!Array.isArray(value)||value.length>28)throw Error('Invalid starting-check answers.');
    const clean=[];
    for(const entry of value){const q=next(clean);if(!q||!entry||entry.id!==q.id||!Number.isInteger(entry.answer)||entry.answer< -1||entry.answer>=q.choices.length)throw Error('Invalid starting-check answer.');clean.push({id:q.id,answer:entry.answer});}
    return clean;
  }
  function result(value){
    const answers=validate(value);if(next(answers))throw Error('Finish the starting check first.');
    const scores=groups.map(g=>{const a=answers.filter(x=>byId.get(x.id).group===g.id);return {id:g.id,name:g.name,asked:a.length,correct:a.filter(x=>x.answer===byId.get(x.id).correct).length,skipped:a.filter(x=>x.answer===-1).length};});
    const weak=['sounds','short','teams','long','patterns','parts'].find(id=>{const s=scores.find(s=>s.id===id);return s.asked&&s.correct<3;});
    const reading=scores.find(s=>s.id==='reading'),listening=scores.find(s=>s.id==='listening');
    const focus=weak||(listening.correct<3?'listening':reading.asked&&reading.correct<3?'reading':'parts');
    const group=groups.find(g=>g.id===focus),missed=answers.filter(a=>byId.get(a.id).group===focus&&a.answer!==byId.get(a.id).correct).map(a=>byId.get(a.id).lesson);
    const plan=[...new Set([...missed,...group.route])].slice(0,5);
    if(!plan.includes('stories'))plan.push('stories');
    return {version:1,focus,focusName:group.name,plan,scores,answered:answers.length,teacherReview:true,note:'Suggested practice from a short app check. No grade level, reading diagnosis, oral fluency score, or mastery claim.'};
  }
  function nextPractice(profile){
    if(profile.resume)return {kind:'resume',lessonId:profile.resume.lessonId};
    if(profile.plan.includes('stories')&&profile.lastCompletedLessonId&&profile.lastCompletedLessonId!=='stories'&&(profile.completedStories||[]).length<10)return {kind:'story',lessonId:'stories'};
    const status=profile.practiceStatus||[];
    for(const id of profile.plan){
      const s=status.find(s=>s.lessonId===id);
      if(s?.needsSupport&&s.finishedRuns<2)return {kind:'review',lessonId:id};
      if(!profile.completed.includes(id))return {kind:'lesson',lessonId:id};
    }
    return profile.plan.length?{kind:'finished',lessonId:profile.plan[0]}:{kind:'waiting'};
  }
  return {version:1,groups,items,next,validate,result,nextPractice};
})();

export { Placement };

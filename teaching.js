// Original teaching support. Uses the existing audio and saved activity fields.
const teachingStrategies={
  rhyme:'Say both words. Listen to their endings, even when the first sounds differ.',
  'start-sound':'Say each word slowly. Listen only to the first sound, then compare.',
  syllables:'Say the whole word. Clap once for each spoken beat, then count the claps.',
  prefixes:'Find the prefix at the beginning. Read the base word, then put their meanings together.',
  suffixes:'Find the ending. Read the base word, then ask what the ending adds to its meaning.',
  vocabulary:'Find a clue in the sentence. Try each meaning in its place and check that the sentence makes sense.'
};
function wordStrategy(l){
  if(l.id.startsWith('short-')||l.id==='vowel-mix')return 'Look closely at the vowel. Say each sound from left to right, blend them, then read the whole word.';
  if(['sh','ch','th-ck'].includes(l.id))return 'Look for the letter team. Keep its letters together as you blend the word.';
  if(l.id.includes('blends'))return 'In a blend, hear every consonant sound. Blend across the word without leaving out the last letter.';
  if(['a-e','i-e','o-e','u-e'].includes(l.id))return 'Look for the final e. In these words it is silent and helps the earlier vowel have a long sound.';
  if(['ing','plurals','past-ed'].includes(l.id))return 'Find the base word and its ending. Read both, then say the whole word and think about what changed.';
  if(l.id==='compound')return 'Find the two smaller words. Read each one, then join them and think about the new meaning.';
  if(['soft-c','soft-g'].includes(l.id))return 'Look at the letter after c or g. Use the sound from this lesson, blend, and check the whole word.';
  return 'Find the vowel spelling from this lesson. Listen to the model word, then blend and read the whole word.';
}
function workedWordHTML(l,word,showRule=true){
  let parts=chunks(word);
  if(l.id==='ing')parts=[word.slice(0,-3),'ing'];
  if(l.id==='past-ed')parts=[word.slice(0,-2),'ed'];
  if(l.id==='plurals'){const ending=word.endsWith('es')?'es':'s';parts=[word.slice(0,-ending.length),ending];}
  if(l.id==='compound')parts={sunset:['sun','set'],bathtub:['bath','tub'],bedtime:['bed','time'],sandbox:['sand','box'],raincoat:['rain','coat'],lunchbox:['lunch','box']}[word]||parts;
  return `${showRule?`<p><strong>Look:</strong> ${esc(l.rule||l.intro)}</p>`:''}<p><strong>Try it:</strong> ${esc(wordStrategy(l))}</p><div class="teaching-word" aria-label="Spelling of ${esc(word)}">${parts.map(p=>`<span class="soundbox">${esc(p)}</span>`).join('')} <strong>${esc(word)}</strong></div><p class="small">These boxes show spelling parts, not a count of sounds. Listen to the whole word, then read it aloud.</p>`;
}
function teachingHTML(l){
  if(l.kind==='stories')return '';
  const model=l.kind==='quiz'?`<p><strong>Try it:</strong> ${esc(teachingStrategies[l.id])}</p><p><strong>Watch an example:</strong> ${esc(l.items[0].prompt)}</p><p>${esc(l.items[0].explanation)}</p>`:workedWordHTML(l,l.words[0],false);
  return `<section class="teaching-model" aria-label="Learn together"><h2>Let’s learn together</h2>${model}<p><strong>Your turn:</strong> ${l.kind==='quiz'?'Explain the example to your grown-up. Then try one together.':'Tap another example below. Listen, read it aloud, and point to the pattern.'}</p></section>`;
}
function practiceStrategy(){const l=CONTENT.lessons[state.lesson];return state.current.mode==='quiz'?teachingStrategies[l.id]:wordStrategy(l);}
const teachingHint=hint;
hint=function(){teachingHint();if(state.current.mode!=='quiz'&&!state.done){document.getElementById('hintbox').innerHTML=workedWordHTML(CONTENT.lessons[state.lesson],state.current.word);setFeedback('Listen to the model. Read it aloud, then try again.');}};
function teachAfterMiss(){if(state.done||!state.attempts)return;if(state.attempts>=2){hint();setFeedback('Let’s look at it together. Use the example above, then try again.',true);}else setFeedback('Try this: '+practiceStrategy(),true);}
const teachingChoose=choose;
choose=function(i){const before=state.attempts;teachingChoose(i);if(state.attempts>before)teachAfterMiss();};
const teachingCheckBuild=checkBuild;
checkBuild=function(){const before=state.attempts;teachingCheckBuild();if(state.attempts>before)teachAfterMiss();};

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {shuffle,presentQuestion,selectQuestions,recordAttempt,scoreSession,topicSummary,weakQuestion,emptyState,validateBackup} from '../engine.js';
import {localEndpoint,listModels,streamChat} from '../ollama.js';
const data=JSON.parse(await readFile(new URL('../data/bank.json',import.meta.url),'utf8'));
const bank=data.questions,byId=Object.fromEntries(bank.map(q=>[q.id,q]));
function rng(seed=42){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

test('377 valid, uniquely identified, sourced items; assets exist',async()=>{
 assert.equal(bank.length,377);assert.equal(new Set(bank.map(q=>q.id)).size,377);
 assert.deepEqual(Object.fromEntries(['mc','tf','image','short'].map(type=>[type,bank.filter(q=>q.type===type).length])),{mc:292,tf:30,image:43,short:12});
 for(const q of bank){assert.ok(q.stem.length>15);assert.ok(q.explanation.length>25);assert.ok(data.topics.some(t=>t.id===q.topic));assert.ok(q.source.url.startsWith('https://openstax.org/'));
  if(q.type==='short')assert.equal(q.rubric.length,3);else{assert.equal(q.choices.length,q.type==='tf'?2:4);assert.equal(new Set(q.choices.map(c=>c.text)).size,q.choices.length);assert.ok(q.choices.some(c=>c.id===q.answer));}
  if(q.image)await access(new URL('../'+q.image,import.meta.url));
 }
 assert.equal(new Set(bank.filter(q=>q.type==='mc').map(q=>q.stem)).size,292);
});
test('shuffles preserve content without mutating the bank',()=>{
 const original=[1,2,3,4,5],copy=shuffle(original,rng());assert.deepEqual(original,[1,2,3,4,5]);assert.deepEqual([...copy].sort(),original);
});
test('each repeat moves the correct letter; grading follows IDs across 500 reshuffles',()=>{
 const q=bank[0],random=rng();let last=-1;const seen=new Set();
 for(let i=0;i<500;i++){const p=presentQuestion(q,last,random),position=p.order.indexOf(q.answer);assert.notEqual(position,last);assert.deepEqual([...p.order].sort(),q.choices.map(c=>c.id).sort());seen.add(position);last=position;
  const s={mode:'practice',items:[p],answers:{[q.id]:{selected:p.order[position]}}};assert.equal(scoreSession(s,byId).earned,1);
 }assert.equal(seen.size,4);
});
test('regular selection respects chapter/topic, is unique, and never repeats an image subject',()=>{
 const selected=selectQuestions(bank,{mode:'practice',count:377,chapters:[4],includeShort:true},{},rng());
 assert.ok(selected.length>100);assert.ok(selected.every(q=>q.chapter===4));assert.equal(new Set(selected.map(q=>q.id)).size,selected.length);
 const images=selected.filter(q=>q.image);assert.equal(new Set(images.map(q=>q.image)).size,images.length);
 const topic=selectQuestions(bank,{mode:'practice',count:20,chapters:[3],topic:'transport'},{},rng());assert.ok(topic.every(q=>q.topic==='transport'));
});
test('mock exams have exactly the promised format, balanced MC chapters, and 54 points',()=>{
 for(let i=1;i<=30;i++){
  const qs=selectQuestions(bank,{mode:'exam',chapters:[3,4,5]},{},rng(i));assert.equal(qs.length,44);
  assert.equal(qs.filter(q=>q.type==='mc').length,30);for(const c of [3,4,5])assert.equal(qs.filter(q=>q.type==='mc'&&q.chapter===c).length,10);
  assert.equal(qs.filter(q=>q.subtype==='micrograph').length,3);assert.equal(new Set(qs.filter(q=>q.subtype==='micrograph').map(q=>q.image)).size,3);
  assert.equal(qs.filter(q=>q.subtype==='diagram').length,3);assert.equal(qs.filter(q=>q.type==='tf').length,6);assert.equal(qs.filter(q=>q.type==='short').length,2);
  const s={mode:'exam',items:qs.map(q=>presentQuestion(q,null,rng(i))),answers:Object.fromEntries(qs.map(q=>[q.id,q.type==='short'?{text:'Answer',evaluated:true,score:3}:{selected:q.answer}]))};
  assert.deepEqual(scoreSession(s,byId),{earned:54,total:54,pending:0,answered:44,percent:100});
 }
});
test('weak review includes incorrect or unsure answers, not every old success',()=>{
 const q1=bank[0],q2=bank[1],q3=bank[2],stats={};
 stats[q1.id]=recordAttempt(stats,q1,{selected:q1.choices[1].id,confidence:'high'},1000);
 stats[q2.id]=recordAttempt(stats,q2,{selected:q2.answer,confidence:'low'},1000);
 stats[q3.id]=recordAttempt(stats,q3,{selected:q3.answer,confidence:'high'},1000);
 const selected=selectQuestions(bank,{mode:'weak',chapters:[3],count:20},stats,rng());assert.deepEqual(new Set(selected.map(q=>q.id)),new Set([q1.id,q2.id]));
 assert.ok(weakQuestion(stats[q1.id]));assert.ok(stats[q1.id].due<stats[q3.id].due);
});
test('self-assessment pending points do not deflate the objective score; partial rubric points count',()=>{
 const q=bank[0],short=bank.find(q=>q.type==='short'),s={mode:'exam',items:[{id:q.id},{id:short.id}],answers:{[q.id]:{selected:q.answer},[short.id]:{text:'My explanation'}}};
 assert.deepEqual(scoreSession(s,byId),{earned:1,total:4,pending:3,answered:2,percent:100});
 s.answers[short.id].evaluated=true;s.answers[short.id].score=2;assert.deepEqual(scoreSession(s,byId),{earned:3,total:4,pending:0,answered:2,percent:75});
});
test('topic accuracy, coverage, and mastery measure different things',()=>{
 const q=bank[0],stats={};stats[q.id]=recordAttempt(stats,q,{selected:q.answer,confidence:'high'},1000);stats[q.id]=recordAttempt(stats,q,{selected:q.answer,confidence:'high'},2000);
 const topic=topicSummary(bank,data.topics,stats).find(t=>t.id===q.topic);assert.equal(topic.seen,1);assert.equal(topic.attempts,2);assert.equal(topic.mastered,1);assert.equal(topic.accuracy,100);
});
test('backup restores notes safely and does not import server settings or executable session state',()=>{
 const original=emptyState();original.notes=[{id:'note-safe',text:'<script>not executable</script>',topic:'transport'}];original.settings.endpoint='https://attacker.example';original.session={script:'anything'};
 const clean=validateBackup(original,byId);assert.equal(clean.notes[0].id,'note-safe');assert.equal(clean.notes[0].text,original.notes[0].text);assert.equal(clean.settings.endpoint,'http://localhost:11434');assert.equal(clean.session,null);
 original.notes[0].id='" onmouseover="x';assert.match(validateBackup(original,byId).notes[0].id,/^import-/);
 original.stats[bank[0].id]={attempts:1,correct:2};assert.throws(()=>validateBackup(original,byId),/Invalid/);
 assert.throws(()=>validateBackup({version:999},byId));
});
test('Ollama endpoint validation restricts connections to loopback without credentials',()=>{
 for(const url of ['http://localhost:11434','http://127.0.0.1:11434','http://[::1]:11434'])assert.equal(localEndpoint(url),url);
 for(const url of ['https://example.com','http://localhost.evil:11434','http://user:pass@localhost:11434','http://localhost:11434/api','file:///etc/passwd','http://0.0.0.0:11434'])assert.throws(()=>localEndpoint(url));
});
test('actual downloaded model list excludes cloud-only/zero-size entries and preserves user choices',async()=>{
 const fetcher=async()=>({ok:true,json:async()=>({models:[{name:'local:7b',size:4000000000,details:{parameter_size:'7B'}},{name:'cloud:cloud',size:50},{name:'alias',size:50,remote_host:'ollama.com'},{name:'empty',size:0}]})});
 assert.deepEqual(await listModels('http://localhost:11434',fetcher),[{name:'local:7b',size:4000000000,parameters:'7B'}]);
});
test('streaming parser handles split UTF-8/NDJSON and returns only chat content',async()=>{
 const text='{"message":{"content":"Mesenchymal "}}\n{"message":{"content":"cells → repair."}}\n{"done":true}\n',bytes=new TextEncoder().encode(text),chunks=[];for(let i=0;i<bytes.length;i+=7)chunks.push(bytes.slice(i,i+7));
 const fetcher=async()=>({ok:true,body:new ReadableStream({start(c){for(const chunk of chunks)c.enqueue(chunk);c.close();}})});
 let rendered='';const result=await streamChat({endpoint:'http://localhost:11434',model:'my-model',messages:[],onToken:s=>rendered=s},fetcher);assert.equal(result,'Mesenchymal cells → repair.');assert.equal(rendered,result);
});
test('partial or failed model output is surfaced as an error',async()=>{
 const fetcher=async()=>({ok:true,body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{"message":{"content":"partial"}}\n'));c.close();}})});
 await assert.rejects(streamChat({endpoint:'http://localhost:11434',model:'m',messages:[],onToken:()=>{}},fetcher),/before completion/);
});
test('critical sequence, stop, mesenchymal and burn concepts retain checked answers',()=>{
 const find=text=>bank.find(q=>q.type==='mc'&&q.stem.includes(text));
 const answer=q=>q.choices.find(c=>c.id===q.answer).text;
 assert.equal(answer(find('template is written 5′-CAT')),'5′-AUG-3′');assert.equal(answer(find('template is written 5′-GAC')),'5′-GUC-3′');
 assert.equal(answer(find('What recognizes a stop codon')),'A release factor');
 assert.equal(answer(find('several replacement connective-tissue lineages')),'Mesenchymal stem cell');
 assert.equal(answer(find('anterior trunk plus one whole leg plus')),'40.5%');
});

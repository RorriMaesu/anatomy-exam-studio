import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TUTOR_MODES,SEQUENCE_REFERENCE,questionSection,selectedAnswer,retrieveReadings,makeTutorRequest,citationAudit,renderTutorText,lectureMarkdown} from '../tutor.js';
import {streamChat,modelControls} from '../ollama.js';
import {emptyState,validateBackup} from '../engine.js';
const book=JSON.parse(await readFile(new URL('../data/textbook.json',import.meta.url),'utf8'));
const bank=JSON.parse(await readFile(new URL('../data/bank.json',import.meta.url),'utf8')).questions;
const splice=bank.find(q=>q.type==='mc'&&q.stem.toLowerCase().includes('spliceosome'));

test('the reading catalog spans all 16 assigned sections with unique, traceable printed pages',()=>{
 assert.equal(book.passages.length,224);assert.equal(book.sections.length,16);
 assert.equal(book.license,'CC BY-NC-SA 4.0');assert.match(book.attribution,/Access for free/);
 assert.equal(new Set(book.passages.map(p=>p.id)).size,224);
 for(const s of book.sections)assert.ok(book.passages.some(p=>p.section===s.id));
 for(const p of book.passages){assert.match(p.id,/^T[345]-\d{3}-\d{2}$/);assert.equal(p.pdfPage,p.page+16);assert.ok(book.sections.some(s=>s.id===p.section&&s.url===p.url));assert.ok(p.text.length>80);if(p.originalText)assert.ok(p.notes.length);}
});
test('the supplied printing errors are corrected with the original wording and explicit notes retained',()=>{
 const template=book.passages.find(p=>p.id==='T3-108-02');assert.match(template.originalText,/coding strand/);assert.match(template.text,/template strand/);assert.doesNotMatch(template.text,/referred to as the coding strand/);assert.ok(template.notes.some(n=>/Printing error/.test(n.text)));
 const cftr=book.passages.find(p=>p.notes.some(n=>/CFTR gating/.test(n.text)));assert.match(cftr.text,/flow passively/);assert.match(cftr.originalText,/requires ATP/);
 const nucleus=book.passages.find(p=>p.notes.some(n=>/red blood cells/.test(n.text)));assert.match(nucleus.originalText,/All living cells/);assert.doesNotMatch(nucleus.text,/All living cells in multicellular organisms contain/);
});
test('retrieval prioritizes mesenchymal cells and fibrocytes without unrelated substring matches',()=>{
 const readings=retrieveReadings(book,'Help me reason out the difference between mesenchymal cells and fibrocytes.');assert.ok(readings.length>=2);assert.ok(readings.every(p=>['4.3','3.6'].includes(p.section)));assert.ok(readings.some(p=>p.text.includes('fibrocyte')));assert.ok(readings.some(p=>p.text.includes('mesenchymal')));
 const rna=retrieveReadings(book,'Explain transcription, splicing and translation.',{section:'3.4',mode:'lecture'});assert.ok(rna.some(p=>p.notes.length));assert.ok(rna.every(p=>p.section==='3.4'));assert.ok(rna.length<=14);assert.equal(rna.length,book.passages.filter(p=>p.section==='3.4').length);assert.ok(rna.some(p=>p.id==='T3-108-02'));
 assert.deepEqual(retrieveReadings(book,'Please help.'),[]);
});
test('feedback carries the actual wrong choice, checked key, and the correct question section',()=>{
 assert.ok(splice);assert.equal(questionSection(splice),'3.4');const wrong=splice.choices.find(c=>c.id!==splice.answer),answer={selected:wrong.id,confidence:'high'};
 assert.equal(selectedAnswer(splice,answer),wrong.text);
 const plan=makeTutorRequest({book,prompt:'Explain my mistake.',mode:'feedback',question:splice,answer});const system=plan.messages[0].content;
 assert.ok(system.includes('Student selected/wrote: '+wrong.text));assert.ok(system.includes('Checked answer: '+splice.choices.find(c=>c.id===splice.answer).text));assert.ok(plan.readings.every(p=>p.section==='3.4'));assert.match(system,/possible confusion cautiously/);assert.match(system,/cannot be changed/);
});
test('Socratic turns retain the learner reasoning and ask for one question then a pause',()=>{
 const history=[{role:'user',content:'I think fibrocytes are the stem cells.'},{role:'assistant',content:'What does a stem cell do?'}];
 const plan=makeTutorRequest({book,prompt:'It can differentiate.',mode:'socratic',section:'4.3',history});assert.match(plan.messages[0].content,/exactly ONE main question per turn, then WAIT/);assert.deepEqual(plan.messages.slice(1,3),history);assert.equal(plan.messages.at(-1).content,'It can differentiate.');
 const short=bank.find(q=>q.type==='short');assert.equal(selectedAnswer(short,{text:'My own explanation'}),'My own explanation');
});
test('lectures have a larger output budget, source IDs, page references, and bounded history',()=>{
 const plan=makeTutorRequest({book,prompt:'Teach me protein synthesis.',mode:'lecture',section:'3.4',history:Array.from({length:20},(_,i)=>({role:i%2?'assistant':'user',content:'x'.repeat(20000)}))});
 assert.equal(plan.options.num_predict,TUTOR_MODES.lecture.tokens);assert.ok(plan.options.num_predict>1700);assert.ok(plan.timeout>180000);assert.ok(plan.messages.slice(1,-1).reduce((n,m)=>n+m.content.length,0)<=6000);
 for(const p of plan.readings){assert.ok(plan.messages[0].content.includes('['+p.id+']'));assert.ok(plan.messages[0].content.includes('printed p.'+p.page));}
});
test('continued or citation-repaired lessons reuse the exact supplied readings',()=>{
 const previous=retrieveReadings(book,'mesenchymal cells fibrocytes',{section:'4.3',mode:'lecture'});
 for(const prompt of ['Continue the lecture from where it stopped.','Rewrite the last explanation with exact supplied textbook passage IDs.'])assert.deepEqual(retrieveReadings(book,prompt,{mode:'lecture',previous}).map(p=>p.id),previous.map(p=>p.id));
});
test('only known supplied citation IDs become source links; model markup and URLs remain inert',()=>{
 const p=book.passages[0],text=`## Test\n\n<img src=x onerror=alert(1)> **Recall** [${p.id}] [T5-999-99] [99] [click](javascript:alert(1))`;
 const audit=citationAudit(text,[p]);assert.deepEqual(audit.used,[p.id]);assert.deepEqual(audit.unknown,['T5-999-99','99']);
 const html=renderTutorText(text,[p]);assert.ok(html.includes(`data-source="${p.id}"`));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('<strong>Recall</strong>'));assert.equal((html.match(/data-action="reading"/g)||[]).length,1);assert.doesNotMatch(html,/<img|<a |onclick=|onerror="/);assert.match(html,/unverified T5-999-99/);
});
test('portable cited notes retain references, pages, and attribution and can be backed up',()=>{
 const p=book.passages.find(p=>p.notes.length),message={mode:'lecture',content:`A grounded lesson [${p.id}].`,readings:[p]},markdown=lectureMarkdown(message);
 assert.ok(markdown.includes(p.url));assert.ok(markdown.includes('printed p.'+p.page));assert.match(markdown,/CC BY-NC-SA 4.0/);
 const state=emptyState();state.notes=[{id:'lecture-test',text:markdown+'a'.repeat(26000)}];assert.equal(validateBackup(state,Object.fromEntries(bank.map(q=>[q.id,q]))).notes[0].text,state.notes[0].text);
});
test('lecture options reach Ollama and completion reports allow a truncated lecture to continue',async()=>{
 let payload,completion;const fetcher=async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{"message":{"content":"Lecture text"}}\n{"done":true,"done_reason":"length","eval_count":2900}\n'));c.close();}})};};
 const result=await streamChat({endpoint:'http://localhost:11434',model:'chosen-model',messages:[{role:'user',content:'Teach me.'}],options:{num_predict:2900,num_ctx:8192},onToken:()=>{},onDone:meta=>completion=meta},fetcher);
 assert.equal(result,'Lecture text');assert.equal(payload.options.num_predict,2900);assert.equal(payload.options.num_ctx,8192);assert.equal(payload.model,'chosen-model');assert.deepEqual(completion,{reason:'length',tokens:2900});
});
test('model thinking controls follow actual metadata and older installations can still chat',async()=>{
 const mock=data=>async()=>({ok:true,json:async()=>data});
 assert.deepEqual(await modelControls('http://localhost:11434','test-boolean',mock({thinking:{values:[false,true],default:true}})),{think:false});
 assert.deepEqual(await modelControls('http://localhost:11434','test-levels',mock({thinking:{values:['low','medium','high']}})),{think:'low',extraTokens:2048});
 assert.deepEqual(await modelControls('http://localhost:11434','test-legacy',mock({capabilities:['completion']})),{});
 assert.deepEqual(await modelControls('http://localhost:11434','test-offline',async()=>{throw new Error('Unsupported metadata');}),{});
});
test('supported direct-answer controls are passed separately from generation options',async()=>{
 let payload;const fetcher=async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{"message":{"content":"A hint."},"done":true}\n'));c.close();}})};};
 await streamChat({endpoint:'http://localhost:11434',model:'test',messages:[],think:false,onToken:()=>{}},fetcher);assert.equal(payload.think,false);assert.equal(payload.options.think,undefined);
});
test('the fixed reference is complementary, antiparallel, and included in synthesis lessons',()=>{
 const bases=s=>s.replace(/[35′\-\s]/g,'');
 const template=bases(SEQUENCE_REFERENCE.template),coding=bases(SEQUENCE_REFERENCE.coding),mrna=bases(SEQUENCE_REFERENCE.mrna),anticodons=bases(SEQUENCE_REFERENCE.anticodons);
 assert.equal(template,'TACCACCCT');assert.equal(mrna,'AUGGUGGGA');assert.equal(coding.replaceAll('T','U'),mrna);
 assert.equal([...template].map(c=>({A:'U',T:'A',C:'G',G:'C'}[c])).join(''),mrna);assert.equal([...anticodons].map(c=>({A:'U',U:'A',C:'G',G:'C'}[c])).join(''),mrna);assert.ok(!template.includes('U')&&!coding.includes('U'));assert.ok(!mrna.includes('T')&&!anticodons.includes('T'));
 const system=makeTutorRequest({book,prompt:'Teach me protein synthesis.',section:'3.4',mode:'lecture'}).messages[0].content;assert.ok(system.includes(SEQUENCE_REFERENCE.template));assert.ok(system.includes(SEQUENCE_REFERENCE.anticodons));assert.match(system,/use this exact checked example/);
});

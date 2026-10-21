export const STORAGE_KEY = 'lamina.study.v1';
export const DAY = 86400000;
export function random() { return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296; }
export function shuffle(items, rng=random) {
  const a=[...items];
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
export function presentQuestion(q,lastPosition,rng=random) {
  const choices=shuffle(q.choices||[],rng);
  if(choices.length>2 && Number.isInteger(lastPosition) && choices.findIndex(c=>c.id===q.answer)===lastPosition){
    const positions=choices.map((_,i)=>i).filter(i=>i!==lastPosition);
    const other=positions[Math.floor(rng()*positions.length)];
    [choices[other],choices[lastPosition]]=[choices[lastPosition],choices[other]];
  }
  return {id:q.id,order:choices.map(c=>c.id)};
}
export function weakQuestion(stat) { return !!stat && (stat.lastCorrect===false || stat.confidence==='low' || (stat.attempts>=2 && stat.correct/stat.attempts<.7)); }
export function questionWeight(q,stats,now=Date.now()) {
  const s=stats[q.id];if(!s)return 4;
  return 1+(weakQuestion(s)?6:0)+(s.due<=now?2:0)+(s.attempts?1/s.attempts:1);
}
export function selectQuestions(bank,config,stats={},rng=random) {
  const chapters=config.chapters?.length?config.chapters:[3,4,5];
  let pool=bank.filter(q=>chapters.includes(q.chapter) && (!config.topic||q.topic===config.topic));
  if(config.mode==='weak')pool=pool.filter(q=>weakQuestion(stats[q.id]));
  if(config.mode==='visual')pool=pool.filter(q=>q.type==='image');
  else if(config.mode!=='exam')pool=pool.filter(q=>config.includeShort||q.type!=='short');
  const weighted=list=>list.map(q=>({q,key:Math.pow(Math.max(rng(),Number.EPSILON),1/questionWeight(q,stats))})).sort((a,b)=>b.key-a.key).map(x=>x.q);
  if(config.mode==='exam'){
    const mc=pool.filter(q=>q.type==='mc');
    let chosen=[];
    const quota=Math.floor(30/chapters.length);
    for(const chapter of chapters)chosen.push(...shuffle(mc.filter(q=>q.chapter===chapter),rng).slice(0,quota));
    chosen.push(...shuffle(mc.filter(q=>!chosen.includes(q)),rng).slice(0,30-chosen.length));
    const micros=shuffle(pool.filter(q=>q.type==='image'&&q.subtype==='micrograph'),rng);
    const seen=new Set();const unique=micros.filter(q=>!seen.has(q.image)&&seen.add(q.image));
    chosen.push(...unique.slice(0,3),...shuffle(pool.filter(q=>q.subtype==='diagram'),rng).slice(0,3),...shuffle(pool.filter(q=>q.type==='tf'),rng).slice(0,6),...shuffle(pool.filter(q=>q.type==='short'),rng).slice(0,2));
    // Preserve the first-exam sections while randomizing every question within them.
    return chosen;
  }
  const seenImages=new Set();
  pool=weighted(pool).filter(q=>q.type!=='image'||!seenImages.has(q.image)&&seenImages.add(q.image));
  return pool.slice(0,Math.min(config.count||20,pool.length));
}
export function recordAttempt(stats,q,answer,now=Date.now()) {
  const prev=stats[q.id]||{attempts:0,correct:0,streak:0};
  const correct=q.type==='short'?answer.score===3:answer.selected===q.answer;
  const streak=correct?(prev.streak||0)+1:0;
  return {...prev,attempts:prev.attempts+1,correct:prev.correct+(correct?1:0),streak,lastCorrect:correct,confidence:answer.confidence||'medium',lastSeen:now,due:now+(correct?(streak===1?DAY:streak===2?3*DAY:7*DAY):10*60000)};
}
export function questionPoints(q,mode) { return q.type==='short'?3:(mode==='exam'&&q.type==='image'?2:1); }
export function scoreSession(session,byId) {
  let earned=0,total=0,pending=0,answered=0;
  for(const item of session.items){
    const q=byId[item.id];if(!q)continue;
    const a=session.answers[q.id]||{};const max=questionPoints(q,session.mode);total+=max;
    if(q.type==='short'){
      if(a.text?.trim())answered++;
      if(a.evaluated)earned+=Math.max(0,Math.min(3,a.score||0));
      else if(a.text?.trim())pending+=3;
    }else{
      if(a.selected)answered++;
      if(a.selected===q.answer)earned+=max;
    }
  }
  return {earned,total,pending,answered,percent:total-pending?Math.round(100*earned/(total-pending)):0};
}
export function topicSummary(bank,topics,stats) {
  return topics.map(t=>{
    const qs=bank.filter(q=>q.topic===t.id),seen=qs.filter(q=>stats[q.id]);
    const attempts=seen.reduce((n,q)=>n+stats[q.id].attempts,0),correct=seen.reduce((n,q)=>n+stats[q.id].correct,0);
    return {...t,total:qs.length,seen:seen.length,attempts,correct,accuracy:attempts?Math.round(correct/attempts*100):null,weak:seen.filter(q=>weakQuestion(stats[q.id])).length,mastered:seen.filter(q=>stats[q.id].streak>=2&&stats[q.id].confidence!=='low').length};
  });
}
export function emptyState(){return {version:1,stats:{},notes:[],history:[],lastPositions:{},session:null,settings:{endpoint:'http://localhost:11434',model:'',reducedMotion:false}};}
export function validateBackup(input,byId){
  if(!input||input.version!==1||!Array.isArray(input.notes)||!Array.isArray(input.history)||typeof input.stats!=='object'||input.stats===null)throw new Error('This is not a Lamina backup.');
  if(input.notes.length>1000||input.history.length>500||Object.keys(input.stats).length>10000)throw new Error('This backup is too large.');
  const clean=emptyState();
  for(const [id,s] of Object.entries(input.stats)){
    if(!Object.hasOwn(byId,id))continue;
    if(!s||!Number.isSafeInteger(s.attempts)||s.attempts<0||s.attempts>100000||!Number.isSafeInteger(s.correct)||s.correct<0||s.correct>s.attempts)throw new Error('Invalid question progress in backup.');
    clean.stats[id]={attempts:s.attempts,correct:s.correct,streak:Math.max(0,Math.min(100000,Number(s.streak)||0)),lastCorrect:s.lastCorrect===true,confidence:['low','medium','high'].includes(s.confidence)?s.confidence:'medium',lastSeen:Number(s.lastSeen)||0,due:Number(s.due)||0};
  }
  clean.notes=input.notes.map((n,i)=>{if(!n||typeof n.text!=='string'||n.text.length>20000)throw new Error('Invalid note in backup.');const id=String(n.id||'');return {id:/^[a-zA-Z0-9_-]{1,100}$/.test(id)?id:'import-'+i,text:n.text,topic:String(n.topic||'general').slice(0,100),questionId:Object.hasOwn(byId,n.questionId)?n.questionId:null,resolved:n.resolved===true,created:Number(n.created)||Date.now(),updated:Number(n.updated)||Date.now()};});
  clean.history=input.history.map(h=>({id:String(h.id||'').slice(0,100),mode:String(h.mode||'practice').slice(0,20),date:Number(h.date)||0,earned:Math.max(0,Number(h.earned)||0),total:Math.max(0,Number(h.total)||0),pending:Math.max(0,Number(h.pending)||0),count:Math.max(0,Number(h.count)||0)}));
  for(const [id,pos] of Object.entries(input.lastPositions||{}))if(Object.hasOwn(byId,id)&&Number.isInteger(pos)&&pos>=0&&pos<4)clean.lastPositions[id]=pos;
  // Import deliberately restores learning records, not executable/session state or connection settings.
  return clean;
}

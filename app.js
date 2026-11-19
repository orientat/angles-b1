'use strict';
const app=document.querySelector('#app'), lessons=window.lessons, sets=window.examSets;
const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=(key,fallback)=>{try{return JSON.parse(localStorage.getItem('english-b1:'+key))??fallback}catch{return fallback}};
const save=(key,value)=>{try{localStorage.setItem('english-b1:'+key,JSON.stringify(value));return true}catch{return false}};
const session={course:get('course','2B1'),search:'',exam:0,skill:'reading'};
const skills={reading:'Reading',listening:'Listening',writing:'Writing',speaking:'Speaking',mediation:'Mediación'};
const done=get('done',{}), scores=get('scores',{}), drafts=get('drafts',{});
const bookshelf='https://www.oxfordlearnersbookshelf.com/';
const official='https://eoi.gva.es/es/proves-de-certificacio';
const models='https://grammazzle.com/eoi-b1-cv';
const tab=(key,title,value,selected)=>`<button type="button" data-${key}="${esc(value)}" aria-pressed="${selected}">${esc(title)}</button>`;
const link=(url,title)=>`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(title)}</a>`;
function status(message){const region=document.querySelector('#status');if(region)region.textContent=message}
function speak(text,rate=0.93){
 if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){status('Este navegador no dispone de voz en inglés. Puedes consultar la transcripción.');return}
 speechSynthesis.cancel();
 const msg=new SpeechSynthesisUtterance(text);msg.lang='en-GB';msg.rate=rate;
 const voices=speechSynthesis.getVoices();
 msg.voice=voices.find(v=>v.lang.toLowerCase()==='en-gb')||voices.find(v=>v.lang.toLowerCase().startsWith('en'))||null;
 msg.onerror=({error})=>{if(error!=='canceled'&&error!=='interrupted')status('No se ha podido reproducir la voz. Puedes consultar la transcripción.')};
 speechSynthesis.speak(msg);
}
function main(){
 const last=lessons.find(l=>l.id===get('last',''));
 return `<section class="hero"><div class="hero-inner"><p class="eyebrow">Inglés · EOI</p><h1>Tu cuaderno B1</h1><p>Repasa las unidades de 1B1 y 2B1, practica con corrección inmediata y prepara la certificación por destrezas.</p><div class="actions"><a class="btn" href="${last?'#unit/'+last.id:'#units'}">${last?'Continuar '+esc(last.course+' · '+last.unit):'Ver unidades'}</a><a class="btn secondary" href="#exam">Practicar la EOI</a></div></div></section><section id="units"><h2>Unidades de estudio</h2><div class="toolbar"><div class="tabs" aria-label="Curso">${['1B1','2B1'].map(c=>tab('course',c,c,session.course===c)).join('')}</div><input id="search" type="search" placeholder="Buscar unidad o tema" aria-label="Buscar unidad o tema" value="${esc(session.search)}"></div><div id="cards" class="grid"></div><div class="actions"><a href="#quadern">Ver cuaderno original de 1B1</a>${link('quadern/2B1.pdf','Abrir cuaderno original de 2B1')}</div></section>`;
}
function cards(){
 const container=document.querySelector('#cards');if(!container)return;
 const n=s=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
 const matches=lessons.filter(l=>l.course===session.course&&n([l.unit,l.title,l.topic,...l.vocab.flat()].join(' ')).includes(n(session.search.trim())));
 container.innerHTML=matches.map(l=>`<a class="card" href="#unit/${l.id}"><span class="tag">${l.course} · ${l.unit}</span><strong lang="en">${esc(l.title)}</strong><p>${esc(l.topic)}</p>${done[l.id]?'<span class="done">Repasada</span>':''}</a>`).join('')||'<p>No hay unidades que coincidan con la búsqueda.</p>';
}
function quiz(qs,key){
 return `<form class="quiz" data-quiz="${key}">${qs.map(([q,opts],i)=>{const order=opts.map((_,j)=>(j+i+1)%opts.length);return `<fieldset><legend lang="en">${esc(q)}</legend>${order.map(j=>`<label><input type="radio" name="q${i}" value="${j}"> <span lang="en">${esc(opts[j])}</span></label>`).join('')}<p class="feedback" aria-live="polite"></p></fieldset>`}).join('')}<button class="btn" type="submit">Corregir</button><button class="btn secondary" type="reset">Reintentar</button><p class="feedback" role="status"></p></form>`;
}

function exampleMarkup(sentence) {
 return sentence.split(/(\[[^\]]+\])/).map(part =>
  part.startsWith('[') ? '<mark>'+esc(part.slice(1,-1))+'</mark>' : esc(part)
 ).join('');
}
function grammarGrid(lesson) {
 return '<table class="grammar-grid"><thead><tr><th>Ejemplo</th><th>Cómo se usa</th></tr></thead><tbody>'+
  lesson.examples.map(([sentence,explanation]) =>
   '<tr><td lang="en">'+exampleMarkup(sentence)+'</td><td>'+esc(explanation)+'</td></tr>'
  ).join('')+'</tbody></table>';
}
function wordDeck(lesson) {
 return '<details class="deck"><summary>Tarjetas de memoria · '+lesson.vocab.length+' expresiones</summary><p>Lee la pista en castellano e intenta decir la expresión en inglés antes de verla.</p>'+
  lesson.vocab.map(([en,es],i)=>'<details><summary>'+esc(es)+'</summary><strong lang="en">'+esc(en)+'</strong> <button type="button" data-voice="'+esc(en)+'">Escuchar</button></details>').join('')+'</details>';
}
function unitQuestions(lesson) {
 const original=[[lesson.gap,lesson.options,lesson.note]];
 const vocab=lesson.vocab;
 const indices=[0,Math.floor(vocab.length/2),vocab.length-2,vocab.length-1];
 const grammar=lesson.examples.map(([sentence,explanation],i)=>{
  const marked=sentence.match(/\[([^\]]+)\]/);
  return [sentence.replace(marked[0],'___'),[marked[1],lesson.alternatives[i]],explanation];
 });
 return original.concat(grammar,indices.map(i=>{
  const english=vocab[i][0];
  const choices=[...new Set([english,...vocab.slice(i+1).concat(vocab.slice(0,i)).map(pair=>pair[0])])].slice(0,3);
  return ['¿Cómo se dice «'+vocab[i][1]+'» en inglés?',choices,english+' significa «'+vocab[i][1]+'».'];
 }));
}
function notebookWriting(lesson) {
 const start=lesson.page+1;
 const next=lessons.find(item=>item.course===lesson.course && item.page>lesson.page);
 const end=next?next.page:78;
 let images='';
 for(let page=start;page<end;page++){
  images+='<img loading="lazy" class="notebook-image" src="quadern/p-'+String(page).padStart(3,'0')+'.jpg" alt="Modelo del cuaderno de '+esc(lesson.unit)+', página '+page+'">';
 }
 return '<details><summary>Leer el modelo de mi cuaderno aquí</summary>'+images+'</details>';
}
function examAudio(index,task) {
 return '<p>Escucha cada mensaje dos veces. Responde primero sobre el mensaje 1 y después sobre el 2.</p>'+
  [task.text,task.second].map((script,i)=>'<div class="audio-task"><h3>Mensaje '+(i+1)+'</h3><audio controls preload="none" aria-label="Mensaje '+(i+1)+'" src="audio/'+(index+1)+'-'+(i+1)+'.mp3"></audio><details><summary>Consultar transcripción</summary><p lang="en">'+esc(script)+'</p></details></div>').join('');
}
function writing(key,prompt,model){
 return `<p lang="en" style="white-space:pre-line">${esc(prompt)}</p><label for="draft">Tu borrador</label><textarea spellcheck="false" lang="en" id="draft" data-draft="${esc(key)}">${esc(drafts[key]||'')}</textarea><p class="footnote" id="wordcount"></p><details><summary>Lista de revisión${model?' y modelo':''}</summary><ul><li>¿He respondido a todos los puntos?</li><li>¿El tono y la organización encajan con la tarea?</li><li>¿He revisado los tiempos verbales y los conectores?</li></ul>${model?`<blockquote lang="en">${esc(model)}</blockquote>`:''}</details>`;
}
function unit(l){
 session.course=l.course;save('course',l.course);save('last',l.id);
 const pages=l.course==='1B1'?`<a href="#quadern/${l.page}">Ver apuntes y modelo en el cuaderno 1B1</a>`:`<a href="quadern/2B1.pdf#page=${l.notebook}" target="_blank" rel="noopener">Ver páginas originales del cuaderno 2B1</a>`;
 return `<a href="#units">Todas las unidades</a><h1 class="study-title" lang="en">${esc(l.title)}</h1><p class="eyebrow">${l.course} · ${l.unit}</p><div class="cols"><section class="panel"><h2>Gramática y uso</h2><h3>${esc(l.topic)}</h3><p>${esc(l.note)}</p><blockquote lang="en">${esc(l.gap.replace('___',l.options[0]))}</blockquote>${grammarGrid(l)}${l.detail?`<details><summary>Más ejemplos del cuaderno</summary><p lang="en">${esc(l.detail)}</p></details>`:''}${l.oral?`<h3>Practica en voz alta</h3><p lang="en">${esc(l.oral)}</p><p>Responde con una idea, una razón y un ejemplo. Reutiliza dos palabras de la unidad.</p><p lang="en">${esc(l.pronunciation)}</p>`:''}${pages}${l.course==='2B1'?`<p class="footnote">English File B1, p. ${l.page} · ${link(bookshelf,'Abrir Oxford')}</p>`:''}</section><section class="panel"><h2>Vocabulario</h2><p class="lead">Pulsa una palabra para oírla en inglés.</p>${wordDeck(l)}<details open><summary>Diccionario de la unidad</summary><div class="vocab">${l.vocab.map(([en,es])=>`<button class="word" data-voice="${esc(en)}"><strong lang="en">${esc(en)}</strong><span>${esc(es)}</span></button>`).join('')}</div></details></section></div><section class="panel"><h2>Practica</h2>${quiz(unitQuestions(l),l.id)}</section><section class="panel"><h2>Writing</h2>${l.course==='1B1'?notebookWriting(l):''}${writing(l.id,l.prompt,l.model)}</section><button class="btn" data-done="${l.id}">${done[l.id]?'Desmarcar unidad':'Marcar como repasada'}</button><p id="status" role="status"></p>`;
}
function examQs(set,skill){return set[skill].qs.map(([q,a,b,c,note])=>[q,[a,b,c],note])}
function exam(){
 const set=sets[session.exam], skill=session.skill, task=set[skill], objective=skill==='reading'||skill==='listening';
 return `<h1 class="study-title">Práctica EOI B1</h1><p class="lead">Cinco simulacros de práctica con tareas originales de nivel B1. Cada uno incluye dos tareas de lectura, dos de escucha, escritura, expresión e interacción oral y mediación. La web corrige la comprensión. Para las respuestas abiertas puedes comparar tu propuesta con un modelo.</p><div class="tabs" aria-label="Simulacro">${sets.map((s,i)=>tab('exam',s.title,i,i===session.exam)).join('')}</div><div class="tabs" aria-label="Destreza">${Object.entries(skills).map(([k,t])=>tab('skill',t,k,k===skill)).join('')}</div><section class="panel"><h2>${skills[skill]}</h2>${skill==='reading'?`<blockquote lang="en">${esc(task.text)}</blockquote>`:''}${skill==='reading'?`<h3>Segunda tarea · Relaciona</h3><p>Lee los tres anuncios y elige el más adecuado para cada persona en las tres últimas preguntas.</p>${task.notices.map(n=>'<blockquote lang="en">'+esc(n)+'</blockquote>').join('')}`:''}${skill==='listening'?examAudio(session.exam,task):''}${objective?quiz(examQs(set,skill),'exam-'+session.exam+'-'+skill):skill==='speaking'?`<p lang="en" style="white-space:pre-line">${esc(task.prompt)}</p><div class="actions"><button class="btn" data-timer="90">Empezar 90 s de práctica</button><button class="btn secondary" data-timer-stop>Parar</button><strong id="timer" role="status">1:30</strong></div><details><summary>Guía de respuesta</summary><blockquote lang="en">${esc(task.model)}</blockquote><p>Da razones y ejemplos, y en la interacción reacciona a lo que diga tu compañero.</p></details>`:writing('exam-'+session.exam+'-'+skill,task.prompt,task.model)}</section><div class="panel"><h3>Cómo se han preparado las tareas</h3><p>La muestra de certificación de Cataluña orienta la práctica de comprensión. El modelo de Navarra sirve de referencia para seleccionar información y explicársela a otra persona. Los textos, audios sintéticos y preguntas de esta web son de entrenamiento. Las notas expresan aciertos de práctica.</p><div class="actions">${link(official,'Generalitat Valenciana · PUC')}${link('https://repositori.educacio.gencat.cat/handle/20.500.12694/1436','Generalitat de Catalunya · muestra oficial B1')}${link('https://www.educacion.navarra.es/documents/27590/2697239/ING_B1_MO_MODELO.pdf/0f7b329a-91cb-c0f0-bcd7-6c191ee0e75e','Navarra · modelo de mediación oral B1')}${link('https://sede.gva.es/es/detall-tramit?id_proc=G17070','Información para alumnado oficial')}</div></div><p id="status" role="status"></p>`;
}
function progress(){
 return `<h1 class="study-title">Tu progreso</h1><p class="lead">El progreso, las puntuaciones y los borradores se guardan en este navegador.</p><div class="grid">${['1B1','2B1'].map(c=>{const all=lessons.filter(l=>l.course===c), reviewed=all.filter(l=>done[l.id]);return `<section class="panel"><h2>${c}</h2><p>${reviewed.length} de ${all.length} unidades repasadas</p><progress class="progress" aria-label="Unidades repasadas de ${c}" value="${reviewed.length}" max="${all.length}"></progress></section>`}).join('')}</div><section class="panel"><h2>Últimas puntuaciones por actividad</h2>${Object.keys(scores).length?`<ul>${Object.entries(scores).reverse().map(([k,s])=>{const l=lessons.find(l=>l.id===k);const [,n,skill]=k.split('-');return `<li>${esc(l?l.course+' · '+l.title:sets[n]?.title+' · '+skills[skill])} — ${Number(s.correct)}/${Number(s.total)}</li>`}).join('')}</ul>`:'<p>Completa una actividad autocorrectiva para ver tu resultado.</p>'}</section>`;
}
function notebook(page){
 const p=Math.max(1,Math.min(110,Number(page)||1));
 return `<a href="#units">Todas las unidades</a><h1 class="study-title">Cuaderno de 1B1</h1><div class="actions">${p>1?`<a class="btn secondary" href="#quadern/${p-1}">Anterior</a>`:''}<label>Página <input type="number" id="page" min="1" max="110" value="${p}"> de 110</label>${p<110?`<a class="btn secondary" href="#quadern/${p+1}">Siguiente</a>`:''}</div><img style="width:min(100%,820px);height:auto;background:white;border:1px solid var(--line)" src="quadern/p-${String(p).padStart(3,'0')}.jpg" alt="Página ${p} del cuaderno original de 1B1">`;
}
let timer=null;
function stopTimer(){clearInterval(timer);timer=null}
function updateCount(){
 const d=document.querySelector('#draft');if(d)document.querySelector('#wordcount').textContent=(d.value.trim()?d.value.trim().split(/\s+/u).length:0)+' palabras';
}
function render(){
 stopTimer();if('speechSynthesis' in window)speechSynthesis.cancel();
 const [route,id]=location.hash.slice(1).split('/');
 const lesson=route==='unit'&&lessons.find(l=>l.id===id);
 app.innerHTML=lesson?unit(lesson):route==='exam'?exam():route==='progres'?progress():route==='quadern'?notebook(id):main();
 cards();updateCount();
 document.querySelectorAll('nav a').forEach(a=>{const curr=route==='exam'?'#exam':route==='progres'?'#progres':'#inici';a.toggleAttribute('aria-current',a.hash===curr)});
 if(route==='units')requestAnimationFrame(()=>document.querySelector('#units')?.scrollIntoView());
 else scrollTo(0,0);
}
window.addEventListener('hashchange',render);
app.addEventListener('input',e=>{
 if(e.target.id==='search'){session.search=e.target.value;cards()}
 if(e.target.dataset.draft){drafts[e.target.dataset.draft]=e.target.value;const saved=save('drafts',drafts);updateCount();if(!saved)status('El borrador no se ha podido guardar en este navegador.')}
});
app.addEventListener('change',e=>{if(e.target.id==='page'&&e.target.checkValidity())location.hash='quadern/'+e.target.value});
app.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.course){session.course=d.course;save('course',d.course);document.querySelectorAll('[data-course]').forEach(el=>el.setAttribute('aria-pressed',el===b));cards()}
 if(d.exam!==undefined){session.exam=Number(d.exam);render();document.querySelector(`[data-exam="${d.exam}"]`).focus()}
 if(d.skill){session.skill=d.skill;render();document.querySelector(`[data-skill="${d.skill}"]`).focus()}
 if(d.voice)speak(d.voice,d.slow!==undefined?.72:.93);
 if(d.stop!==undefined&&'speechSynthesis' in window)speechSynthesis.cancel();
 if(d.done){done[d.done]=!done[d.done];const saved=save('done',done);b.textContent=done[d.done]?'Desmarcar unidad':'Marcar como repasada';status(saved?(done[d.done]?'Unidad marcada como repasada.':'Unidad desmarcada.'):'El progreso no se ha podido guardar.')}
 if(d.timer){stopTimer();const end=Date.now()+Number(d.timer)*1000;timer=setInterval(()=>{const el=document.querySelector('#timer');if(!el){stopTimer();return}const sec=Math.max(0,Math.ceil((end-Date.now())/1000));el.textContent=sec?Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0'):'Tiempo terminado';if(!sec)stopTimer()},250)}
 if(d.timerStop!==undefined){stopTimer();document.querySelector('#timer').textContent='1:30'}
});
app.addEventListener('reset',e=>{e.target.querySelectorAll('.feedback').forEach(x=>x.textContent='')});
app.addEventListener('submit',e=>{
 const f=e.target;if(!f.matches('.quiz'))return;e.preventDefault();
 const key=f.dataset.quiz, l=lessons.find(x=>x.id===key), qs=l?unitQuestions(l):examQs(sets[session.exam],session.skill), data=new FormData(f);
 const result=f.querySelector('[role=status]');
 if(qs.some((_,i)=>!data.has('q'+i))){result.textContent='Responde a todas las preguntas antes de corregir.';return}
 let correct=0;
 f.querySelectorAll('fieldset').forEach((field,i)=>{
 const ok=data.get('q'+i)==='0';correct+=Number(ok);
 field.querySelector('.feedback').textContent=(ok?'Correcto. ':'Respuesta correcta: '+qs[i][1][0]+'. ')+qs[i][2];
 });
 scores[key]={correct,total:qs.length};const saved=save('scores',scores);
 result.textContent=`${correct} de ${qs.length} respuestas correctas.${saved?'':' La puntuación no se ha podido guardar.'}`;
});
render();

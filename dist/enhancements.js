import {S,esc,field,select,button,link,workspace,heading,table,row,date,empty} from './ui.js';

export function adultProfileFields() {
 const p=S.user.profile,teacher=S.user.role==='teacher';
 return field('ФИО *','name',p.name,'text','required maxlength="200"')+field(teacher?'Школа / организация':'Организация','organization',p.organization||p.school||'')+field('Должность','position',p.position||'')+(!teacher?field('Специализация','specialty',p.specialty||''):'')+field('Регион','region',p.region||'')+field('Телефон','phone',p.phone||'','tel');
}

export function teacherView(view) {
 const title={invitations:'Приглашения',projects:'Проекты учеников',certificate:'Сертификаты учеников'}[view];
 if(!title)return null;
 let content='';
 if(view==='invitations')content=`<div class="card">${S.mentors.map(m=>`<div class="setting-row"><div><strong>${esc(S.users.find(u=>u.id===m.owner)?.profile.name||m.email||m.owner)}</strong><p>${esc(m.status)}</p></div>${m.status==='Ожидает подтверждения'?button('Принять','accept-invite','mint sm',`data-id="${m.id}"`)+button('Отклонить','cancel-invite','sm',`data-id="${m.id}"`):''}</div>`).join('')||'<p>Приглашений пока нет. Попросите ученика указать ваш email в разделе «Мой руководитель».</p>'}</div>`;
 if(view==='projects')content=S.projects.length?table(['Проект','Участник','Статус','Действие'],S.projects.map(p=>row([esc(p.name),esc(p.author),esc(p.status),button('Открыть','project-details','sm',`data-id="${p.id}"`)]))):empty('Проектов пока нет');
 if(view==='certificate')content=`<div class="card"><h3>Создать сертификат</h3><p>Выберите своего ученика и укажите данные. Это документ, выданный педагогом, без статуса диплома конкурса.</p>${S.users.length?`<form data-form="teacher-certificate"><div class="field"><label for="certificate-student">Ученик</label><select name="student" id="certificate-student">${S.users.filter(u=>u.role==='participant').map(u=>`<option value="${u.id}">${esc(u.profile.name)}</option>`).join('')}</select></div>${field('Название мероприятия','event','Исследование Арктики','text','required maxlength="100"')}${field('Достижение / участие','achievement','За участие в исследовательском проекте','text','required maxlength="150"')}${field('Дата выдачи','issued',new Date().toISOString().slice(0,10),'date','required')}<p class="form-error" role="alert"></p><button class="btn mint">Создать PDF</button></form>`:'<p>Сначала подтвердите приглашение ученика.</p>'}</div>`;
 return workspace('teacher','Кабинет педагога',heading(title)+content,'teacher');
}

export function evaluationFiles(project,index=0) {
 const kind=['presentation','research','video'][index],files=(project?.files||[]).filter(f=>f.kind===kind);
 return `<div class="card" data-evaluation-files data-kind="${kind}"><h3>${['Презентация','Исследование','Видео и дополнительные материалы'][index]}</h3>${files.map(f=>`<p><a class="btn wide" href="/api/files/${encodeURIComponent(f.id)}">${esc(f.name)} ↓</a></p>`).join('')||'<p>Файлы этого типа ещё не загружены.</p>'}${kind==='video'&&project?.video?`<p><a class="btn" href="${esc(project.video)}" target="_blank" rel="noopener">Открыть видео проекта ↗</a></p>`:''}</div>`;
}

export function questionEditor(q={q:'',a:['','','',''],correct:0,topic:'Природа Арктики',difficulty:'Средний',published:true}) {
 const multi=q.type==='multiple',answers=q.correctAnswers||[q.correct??0];
 return `<form class="card" data-form="question"><h3>Редактор вопроса</h3><input type="hidden" name="id" value="${esc(q.id||'')}">${select('Тип вопроса','type',['Один правильный ответ','Несколько правильных ответов'],multi?'Несколько правильных ответов':'Один правильный ответ')}${field('Текст вопроса','q',q.q,'textarea','required maxlength="1000"')}${select('Тема','topic',['Природа Арктики','Научные исследования','Люди Севера','Будущее Арктики'],q.topic)}${select('Сложность','difficulty',['Лёгкий','Средний'],q.difficulty)}<p data-answer-hint>${multi?'В вопросе может быть несколько правильных ответов. Отметьте все верные варианты.':'Отметьте один правильный вариант.'}</p>${q.a.map((a,i)=>`<div class="answer"><label><input type="${multi?'checkbox':'radio'}" name="correct" value="${i}" ${answers.includes(i)?'checked':''} aria-label="Правильный вариант ${i+1}"> ${i+1}.</label><input class="control" name="a-${i}" value="${esc(a)}" required maxlength="500" aria-label="Вариант ${i+1}"></div>`).join('')}<label class="checkbox"><input type="checkbox" name="published" ${q.published?'checked':''}>Опубликован</label><p class="form-error" role="alert"></p><button class="btn primary wide">Сохранить вопрос</button></form>`;
}

export function updateQuestionType(form) {
 const multi=form.elements.type.value==='Несколько правильных ответов';
 const checked=[...form.querySelectorAll('[name="correct"]:checked')];
 form.querySelectorAll('[name="correct"]').forEach(input=>{input.type=multi?'checkbox':'radio';input.checked=multi?checked.includes(input):input===checked[0];});
 form.querySelector('[data-answer-hint]').textContent=multi?'В вопросе может быть несколько правильных ответов. Отметьте все верные варианты.':'Отметьте один правильный вариант.';
}

export function questionStatistics() {
 const count=(key,label)=>`<h3>${label}</h3>${table([label,'Вопросов'],[...new Set(S.questions.map(key))].map(value=>row([esc(value),String(S.questions.filter(q=>key(q)===value).length)])))}`;
 return `<h2>Статистика банка вопросов</h2><div class="columns"><div class="card"><strong>${S.questions.length}</strong><p>Всего вопросов</p></div><div class="card"><strong>${S.questions.filter(q=>q.published).length}</strong><p>Опубликовано</p></div><div class="card"><strong>${S.questions.filter(q=>!q.published).length}</strong><p>Черновики</p></div></div>${count(q=>q.topic,'Темы')}${count(q=>q.difficulty||'Не указана','Сложность')}${count(q=>q.type==='multiple'?'Несколько ответов':'Один ответ','Типы вопросов')}<p>При прохождении теста вопрос с несколькими ответами засчитывается только при точном совпадении всего набора.</p>`;
}

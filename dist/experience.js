import {S,esc,icon,link,button,workspace,heading,metrics,roles} from './ui.js';

export function privacyContent() {
 return `<h2>Согласие на обработку персональных данных</h2><p class="notice">Демонстрационный шаблон. Название оператора, его контакты и окончательные условия заполняются организатором конкурса.</p><p>Я ознакомился(лась) с условиями обработки сведений, которые указываю при регистрации и участии в конкурсе «Арктика».</p><dl class="data-list"><dt>Оператор</dt><dd>Организатор конкурса — сведения уточняются.</dd><dt>Данные</dt><dd>Имя, email, сведения о школе и участии; для несовершеннолетнего — указанные контакты законного представителя.</dd><dt>Цели</dt><dd>Регистрация, организация участия, связь по вопросам конкурса, проверка работ и выдача документов.</dd><dt>Действия</dt><dd>Получение, хранение, уточнение и использование предоставленных сведений для указанных целей.</dd><dt>Срок и отзыв</dt><dd>Срок хранения и порядок отзыва согласия уточняются организатором. Контакты оператора будут опубликованы в разделе «Контакты».</dd></dl><p>Это согласие на обработку данных. Согласие законного представителя на участие ребёнка оформляется отдельно.</p>`;
}

export function wrapCabinet(app, route) {
 const allowed=['dashboard','test-intro','test','test-result','submit','documents','users','mailing','archive'];
 if (!S.user || !allowed.includes(route) || app.querySelector('.workspace,.auth-content')) return;
 const main=app.querySelector('#main');
 if (!main) return;
 app.innerHTML=workspace(route,'Кабинет: '+roles[S.user.role],main.innerHTML,S.user.role);
 const content=app.querySelector('.workspace-content');
 content.dataset.page=route;
 content.classList.add('cabinet-public-content');
}

export function teacherOverview() {
 const pending=S.mentors.filter(m=>m.status==='Ожидает подтверждения').length;
 return workspace('teacher','Кабинет педагога',heading('Рабочий стол','Обзор учеников, проектов и приглашений.')+
 metrics([[S.users.length,'Мои ученики','users'],[S.projects.length,'Проекты учеников','file'],[pending,'Приглашения','mail']])+
 `<div class="columns"><div class="card"><h3>${icon('users')} Мои ученики</h3><p>Следи за прогрессом участников и помогай подготовить исследование.</p>${link('teacher','Открыть список учеников →','btn mint sm')}</div><div class="card"><h3>${icon('mail')} Приглашения</h3><p>Ожидают ответа: ${esc(pending)}.</p>${link('teacher?view=invitations','Перейти к приглашениям →','btn sm')}</div><div class="card"><h3>${icon('file')} Проекты</h3><p>Открой работы учеников и проверь их текущий статус.</p>${button('Открыть проекты →','teacher-projects','sm')}</div></div>`,'teacher');
}

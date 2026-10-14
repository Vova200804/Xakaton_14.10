import {S,esc,field,select,icon,workspace,heading,tabs,metrics,table,row} from './ui.js';

export function analyticsPage() {
 return workspace('analytics','Администратор',heading('Аналитика и отчёты','Показатели из текущих данных конкурса.',`<div class="period-range">${field('С даты','from','','date')}${field('По дату','to','','date')}</div>`)+tabs(['Регионы','Школы','Темы','Этапы','Номинации'],0,'analytics')+'<div data-analytics-panel></div>'+`<form class="card" data-form="report"><h3>Экспорт проектов за выбранный период</h3>${select('Формат','format',['Excel (.xlsx)','CSV (.csv)'])}<button class="btn primary">${icon('download')} Скачать отчёт</button></form>`,'admin');
}

export function updateAnalytics() {
 const target=document.querySelector('[data-analytics-panel]');if(!target)return;
 const from=document.querySelector('[name="from"]')?.value||'',to=document.querySelector('[name="to"]')?.value||'';
 if(from&&to&&from>to){target.innerHTML='<p class="form-error" role="alert">Дата начала позже даты окончания.</p>';return;}
 const matches=value=>{const date=String(value||'').slice(0,10);return (!from&&!to)||!!date&&(!from||date>=from)&&(!to||date<=to);};
 const participants=S.users.filter(u=>u.role==='participant'&&matches(u.created)),projects=S.projects.filter(p=>matches(p.created));
 const index=Number(document.querySelector('[data-key="analytics"].active')?.dataset.tab||0),counts=new Map();
 const add=label=>counts.set(label||'Не указано',(counts.get(label||'Не указано')||0)+1);
 if(index<2)participants.forEach(u=>add(u.profile[index===0?'region':'school']));
 if(index===2)S.questions.forEach(q=>add(q.topic));
 if(index===3)projects.forEach(p=>add(p.status));
 if(index===4)projects.forEach(p=>add(p.nomination));
 const total=[...counts.values()].reduce((a,b)=>a+b,0),labels=['Участники по регионам','Участники по школам','Темы банка вопросов','Проекты по статусам этапа','Проекты по номинациям'];
 const unknown=S.users.filter(u=>u.role==='participant'&&!u.created).length;
 target.innerHTML=metrics([[participants.length,'Участников','users'],[projects.length,'Проектов','file'],[new Set(participants.map(u=>u.profile.region).filter(Boolean)).size,'Регионов','pin'],[new Set(participants.map(u=>u.profile.school).filter(Boolean)).size,'Школ','home']])+`<div class="card"><h2>${labels[index]}</h2>${index===2?'<p>Состав текущего банка вопросов; фильтр дат применяется к участникам и проектам.</p>':''}${unknown?`<p><small>У ${unknown} участников не сохранена дата регистрации. При выборе периода они исключаются из статистики.</small></p>`:''}<div class="analytics-bars">${[...counts].sort((a,b)=>b[1]-a[1]).map(([label,count])=>`<div class="analytics-row"><span>${esc(label)}</span><div class="analytics-track"><i style="width:${count/Math.max(1,total)*100}%"></i></div><strong>${count}</strong></div>`).join('')||'<p>За выбранный период данных нет.</p>'}</div>${table(['Категория','Количество','Доля'],[...counts].map(([label,count])=>row([esc(label),String(count),(count/Math.max(1,total)*100).toFixed(1)+'%'])))}</div>`;
}

import {S,esc,icon,link,button} from './ui.js';

// One ordered menu per role; opening a page never replaces its neighbours.
export function stableNavigation(route) {
 const nav=document.querySelector('.sidebar nav');
 if(!nav||!S.user||S.user.role==='participant')return;
 const role=nav.closest('.workspace').dataset.role;
 const params=new URLSearchParams(location.hash.split('?')[1]||'');
 const item=(id,label,glyph)=>link(id,icon(glyph)+esc(label),location.hash==='#/'+id||(id===route&&!params.size)?'active':'');
 const action=(label,key,glyph)=>`<button type="button" data-action="${key}">${icon(glyph)}${esc(label)}</button>`;
 const sub=(key,index,label)=>`<button type="button" class="nav-sub ${route===key&&Number(params.get('tab')||0)===index?'active':''}" data-action="nav-tab" data-nav-key="${key}" data-nav-tab="${index}">${esc(label)}</button>`;
 let entries=[];
 if(role==='teacher')entries=[item('teacher?view=overview','Рабочий стол','home'),item('teacher','Мои ученики','users'),item('teacher?view=invitations','Приглашения','mail'),item('teacher?view=projects','Проекты','file'),item('teacher?view=certificate','Сертификаты','trophy'),item('documents','Материалы','book'),action('Профиль','account-profile','user')];
 if(role==='expert')entries=[item('expert?view=overview','Рабочий стол','home'),item('expert','Мои задания','users'),item('evaluation','Оценка проекта','file'),action('Номинации','nomination-list','home'),action('Мои рекомендации','expert-comments','check'),item('documents','Материалы','book'),action('Профиль','account-profile','user')];
 if(role==='commission')entries=[item('ranking','Комиссия / Рейтинг','chart'),item('archive','Проекты','file'),action('Номинации','nomination-list','home'),item('documents','Материалы','book'),action('Профиль','account-profile','user')];
 if(role==='admin')entries=[item('admin','Обзор','home'),item('users','Пользователи','users'),item('distribution','Проекты','file'),action('Регионы','region-list','pin'),action('Школы','school-list','cap'),item('content','Контент','book'),sub('content',0,'Страницы'),sub('content',1,'Новости'),sub('content',2,'Видео'),item('settings','Конкурс','settings'),sub('settings',0,'Этапы'),sub('settings',1,'Номинации'),sub('settings',2,'Критерии оценки'),item('questions','Банк вопросов','book'),action('Статистика вопросов','question-stats','chart'),item('mailing','Рассылки','mail'),item('analytics','Отчёты','chart'),item('settings?tab=3','Настройки','settings'),action('Профиль','account-profile','user')];
 nav.innerHTML=entries.join('');
 // Parent context is visually distinct from the single selected child.
 if(params.has('tab')||['content','settings'].includes(route)){
  const parent=nav.querySelector(`a[href="#/${route}"]`);
  if(parent){parent.classList.remove('active');parent.classList.add('nav-parent');}
 }
 nav.querySelectorAll('.active').forEach(el=>el.setAttribute('aria-current','page'));
}

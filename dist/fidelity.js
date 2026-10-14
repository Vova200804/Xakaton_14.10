import {link,icon,imageFile} from './ui.js';

export function selectSection(el){
 const section=document.getElementById(el.dataset.target);
 if(!section)return;
 const article=section.parentElement;
 article.querySelectorAll(':scope > section').forEach(s=>s.hidden=s!==section);
 el.closest('aside')?.querySelectorAll('[data-action="scroll-section"]').forEach(a=>{a.classList.toggle('selected',a===el);a.setAttribute('aria-current',a===el?'true':'false');});
}

export function paginateTables(reset=false){
 document.querySelectorAll('.data-table').forEach(table=>{
  const rows=[...table.querySelectorAll('tbody > tr')];
  if(rows.length<=6&&!table._pager)return;
  if(!table._pager){
   const pager=document.createElement('nav');pager.className='table-pagination';pager.setAttribute('aria-label','Страницы таблицы');
   table.closest('.table-wrap').after(pager);table._pager=pager;table._page=0;
  }
  const eligible=rows.filter(r=>!r.hidden),size=5,count=Math.max(1,Math.ceil(eligible.length/size));
  table._page=reset?0:Math.min(table._page,count-1);
  rows.forEach(r=>r.classList.add('table-page-hidden'));
  eligible.slice(table._page*size,(table._page+1)*size).forEach(r=>r.classList.remove('table-page-hidden'));
  table._pager.replaceChildren();
  const label=document.createElement('span');label.textContent=eligible.length?`${table._page*size+1}–${Math.min(eligible.length,(table._page+1)*size)} из ${eligible.length}`:'Нет результатов';table._pager.append(label);
  for(let i=0;i<count;i++){const b=document.createElement('button');b.type='button';b.textContent=i+1;b.className=i===table._page?'active':'';b.setAttribute('aria-label',`Страница ${i+1}`);if(i===table._page)b.setAttribute('aria-current','page');b.addEventListener('click',()=>{table._page=i;paginateTables();});table._pager.append(b);}
 });
}

export function refineLayout(route){
 document.body.dataset.route=route;
 const main=document.querySelector('#main'),tabs=main?.querySelector('.tabs');
 const nav=document.querySelector('.sidebar nav');
 const navAction=(label,action,glyph,attrs='')=>`<button type="button" data-action="${action}" ${attrs.replaceAll('data-key','data-nav-key').replaceAll('data-tab','data-nav-tab')}>${icon(glyph)}${label}</button>`;
 if(['rules','bear'].includes(route)){
  const article=main.querySelector(route==='rules'?'[data-rules-doc]':'.article-text');
  article?.querySelectorAll(':scope > section').forEach((s,i)=>s.hidden=i>0);
  const first=main.querySelector('[data-action="scroll-section"]');if(first)selectSection(first);
  if(route==='rules'){
   const title=article.querySelector('h2'),meta=title.nextElementSibling,heading=document.createElement('div');heading.className='document-heading';heading.append(title,meta);main.querySelector('.faq-layout').before(heading);
   const download=article.querySelector('.btn');if(download){download.classList.add('tab-download');tabs.append(download);}
  }else{
   main.querySelector('.article-aside .card')?.classList.add('next-article');
  }
 }
 if(route==='about'){
  const actions=main.querySelector('.field-actions');if(actions){actions.className='tab-download';tabs.append(actions);actions.removeAttribute('style');}
 }
 if(route==='news'){const filters=main.querySelector('.filters');if(filters){filters.classList.add('tabs-search');tabs.append(filters);}}
 if(route==='participate'){
  main.querySelector('.hero-banner').insertAdjacentHTML('beforeend',`<div class="participation-actions">${link('register','ЗАРЕГИСТРИРОВАТЬСЯ <span class="arrow-circle">→</span>','btn white')}${link('rules','УЗНАТЬ ПОДРОБНЕЕ ↗','text-link')}</div>`);
  const criteria=main.querySelector('.partner-options');criteria?.insertAdjacentHTML('beforeend','<div><strong>Презентация</strong><div class="mint-text">15 баллов</div><p>Подача материала и защита проекта.</p></div>');
  criteria?.parentElement.querySelector('small')?.remove();
  main.querySelector('.container > div:last-child:not(.card)')?.remove();
 }
 if(route==='register'){
  const code=main.querySelector('[name="code"]'),button=main.querySelector('[data-action="code"]');if(code&&button){code.parentElement.classList.add('code-field');code.parentElement.append(button);}
 }
 if(route==='dashboard'){
  const card=main.querySelector('.floating-card'),cta=card?.querySelector('.section-heading .btn');if(cta){const block=document.createElement('div');block.className='progress-cta';block.append(cta);card.append(block);}
 }
 if(['documents','explore','media','archive','news','contacts'].includes(route))main.querySelector('.breadcrumbs')?.remove();
 if(['users','mailing'].includes(route)){
  const nav=document.querySelector('.topbar .topnav');if(nav){nav.innerHTML=link('admin','Администратор','admin-role-chip');nav.classList.add('ops-nav');}
 }
 if(route==='questions'){
  const notice=main.querySelector('.question-admin > .card .notice');if(notice){notice.className='sampling-card';notice.innerHTML=`<h3>${icon('settings')} Настройки выборки</h3><p>Вопросы выбираются случайно из опубликованного банка. Участник выбирает 5, 10 или 15 вопросов перед началом.</p><div class="sampling-options"><span>Количество вопросов<br><strong>5 / 10 / 15</strong></span><span>Время теста<br><strong>10 / 15 / 20 минут</strong></span></div>`;}
 }
 paginateTables();
}

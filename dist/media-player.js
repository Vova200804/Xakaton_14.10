const audio=new Audio('assets/media/arctic-ambient.m4a');
audio.preload='none';audio.loop=true;audio.volume=.32;audio.dataset.backgroundMusic='true';
let toggle,enabled=false,videoActive=false;
const report=message=>document.dispatchEvent(new CustomEvent('arctic-media-status',{detail:message}));
function update(){
 if(!toggle)return;
 toggle.classList.toggle('playing',!audio.paused);
 toggle.setAttribute('aria-pressed',String(enabled));
 toggle.setAttribute('aria-label',enabled?'Выключить фоновую музыку':'Включить фоновую музыку');
 toggle.title=toggle.getAttribute('aria-label');
 toggle.querySelector('.music-label').textContent=!enabled?'Музыка':audio.paused?'На паузе':'Музыка включена';
}
async function resume(){
 if(!enabled||videoActive||document.hidden)return;
 document.querySelectorAll('audio[data-standalone-music]').forEach(el=>el.pause());
 try{await audio.play();}catch(error){if(error.name!=='AbortError'){enabled=false;report('Не удалось включить музыку. Нажмите кнопку ещё раз.');}}
 update();
}
export function initMediaPlayer(){
 if(toggle)return;
 toggle=document.createElement('button');toggle.type='button';toggle.id='music-toggle';toggle.className='music-toggle';
 toggle.innerHTML='<span aria-hidden="true">♫</span><span class="music-label">Музыка</span><span class="music-bars" aria-hidden="true"><i></i><i></i><i></i></span>';
 toggle.addEventListener('click',()=>{enabled=!enabled;if(enabled)resume();else{audio.pause();update();}});
 document.body.append(audio,toggle);
 audio.addEventListener('play',update);audio.addEventListener('pause',update);
 audio.addEventListener('error',()=>{enabled=false;update();report('Музыка недоступна. Попробуйте перезагрузить страницу.');});
 document.addEventListener('play',event=>{if(event.target.matches?.('audio[data-standalone-music]')){enabled=false;audio.pause();update();}},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.pause();document.querySelectorAll('video[data-arctic-video],audio[data-standalone-music]').forEach(media=>media.pause());}else resume();update();});
 update();
}
export function filmMarkup(){
 return `<div class="film-heading"><span class="eyebrow">АРКТИКА · 30 СЕКУНД</span><h2>Арктическое путешествие</h2></div><video class="arctic-video" data-arctic-video controls playsinline preload="auto" poster="assets/media/arctic-poster.webp" aria-label="Фотофильм Арктическое путешествие"><source src="assets/media/arctic-journey.mp4" type="video/mp4"><track kind="descriptions" src="assets/media/arctic-description.vtt" srclang="ru" label="Описание сцен">Ваш браузер не поддерживает видео. <a href="assets/media/arctic-journey.mp4">Скачать MP4</a></video><p class="film-note">Пейзажи, белый медведь, лёд и северное сияние — фотофильм с оригинальной музыкой.</p><details class="film-transcript"><summary>Текст и описание ролика</summary><p>Арктический пейзаж и надпись «АРКТИКА». Медведь среди снега. Айсберг с отражением и фраза «Начни с любопытства». Ледокол. Северное сияние. Финал: «Исследуй. Создавай. Представь.»</p></details>`;
}
export function bindFilm(root){
 const video=root.querySelector('video[data-arctic-video]');if(!video)return;
 video.addEventListener('play',()=>{videoActive=true;audio.pause();document.querySelectorAll('audio[data-standalone-music]').forEach(el=>el.pause());update();});
 const release=()=>{videoActive=false;resume();};
 video.addEventListener('ended',release);
 video.addEventListener('error',()=>report('Видео не загрузилось. Попробуйте открыть его ещё раз.'));
}
export function stopFilm(root){
 root.querySelectorAll('video[data-arctic-video]').forEach(video=>{video.pause();video.removeAttribute('src');video.querySelectorAll('source').forEach(source=>source.removeAttribute('src'));video.load();});
 videoActive=false;resume();
}
export function stopPageMedia(root){root.querySelectorAll('audio[data-standalone-music]').forEach(media=>media.pause());}

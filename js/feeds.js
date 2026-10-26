/* Подгружает автоматически обновляемые данные (data/*.json) в блоки с атрибутом data-feed. */
(function(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function d(iso){if(!iso)return '';var p=iso.slice(0,10).split('-');return p.length===3?p[2]+'.'+p[1]+'.'+p[0]:''}
  function safeUrl(u){return /^https:\/\//.test(u||'')?u:'#'}
  document.querySelectorAll('[data-feed]').forEach(function(box){
    var kind=box.getAttribute('data-feed'),limit=+box.getAttribute('data-limit')||12,wrap=box.closest('[data-feed-section]');
    fetch('data/'+kind+'.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null}).then(function(data){
      var items=(data&&data.items)||[];
      if(!items.length){if(wrap&&wrap.hasAttribute('data-hide-empty'))wrap.hidden=true;else box.innerHTML='<p class="feed-empty">Свежие материалы появятся после ближайшего обновления — сайт обновляет их раз в день.</p>';return}
      box.innerHTML=items.slice(0,limit).map(function(it){
        if(kind==='channel')return '<a class="feed-item" href="'+esc(safeUrl(it.link))+'" target="_blank" rel="noopener"><div class="feed-meta"><span>Telegram</span><span>'+d(it.date)+'</span></div><p>'+esc(it.text)+'</p></a>';
        var ru=it.title_ru,sum=it.summary_ru||(it.lang!=='en'?it.summary:''),u=safeUrl(it.link);
        var tr='https://translate.yandex.ru/translate?url='+encodeURIComponent(u)+'&lang=en-ru';
        return '<article class="feed-item news-card"><div class="feed-meta">'+(ru?'<span class="lang">перевод</span>':(it.lang==='en'?'<span class="lang">EN</span>':''))+'<span>'+esc(it.source)+'</span><span>'+d(it.date)+'</span></div><h3>'+esc(ru||it.title)+'</h3>'+
          (sum?'<details class="retell"><summary>Коротко о главном</summary><p>'+esc(sum)+'</p></details>':'')+
          '<div class="news-links">'+(it.lang==='en'?'<a href="'+esc(tr)+'" target="_blank" rel="noopener">Читать полностью на русском ↗</a>':'')+'<a class="orig-link" href="'+esc(u)+'" target="_blank" rel="noopener">'+(it.lang==='en'?'Оригинал (англ.)':'Читать')+' ↗</a></div>'+
          (ru?'<p class="orig">'+esc(it.title)+'</p>':'')+'</article>';
      }).join('');
      var up=wrap&&wrap.querySelector('[data-updated]');if(up&&data.updated)up.textContent='Обновлено автоматически: '+d(data.updated);
      if(wrap)wrap.hidden=false;
    }).catch(function(){if(wrap&&wrap.hasAttribute('data-hide-empty'))wrap.hidden=true});
  });
})();

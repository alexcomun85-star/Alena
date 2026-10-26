/* Базовая корзина: чек-лист продуктов + печать в PDF. */
(function(){
  var G=[
    ['Белок',['Яйца','Куриное филе или бедро','Индейка или фарш','Рыба (можно замороженную)','Тунец в собственном соку','Творог','Греческий или натуральный йогурт','Кефир','Сыр','Чечевица, нут или фасоль в банке']],
    ['Крупы и гарниры',['Гречка','Рис','Овсяные хлопья','Булгур','Макароны из твёрдых сортов','Цельнозерновой хлеб','Картофель']],
    ['Овощи и фрукты',['Замороженная овощная смесь','Брокколи или цветная капуста (заморозка)','Замороженные ягоды','Огурцы и помидоры','Морковь','Капуста','Зелень','Яблоки','Бананы']],
    ['Жиры',['Оливковое или подсолнечное масло','Орехи','Семечки','Арахисовая паста']],
    ['Для вкуса и выручки',['Специи и сушёные травы','Томаты в собственном соку','Соевый соус','Лимон','Горький шоколад','Чай и кофе']]
  ];
  var KEY='alenafit_korzina_v1',st={};
  try{st=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){st={}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}}
  var grid=document.getElementById('kzGrid'),cnt=document.getElementById('kzCount'),pr=document.getElementById('kzPrint');
  grid.innerHTML=G.map(function(g,gi){return '<div class="kz-g"><h3>'+g[0]+'</h3>'+g[1].map(function(it,ii){var id='kz'+gi+'_'+ii;return '<label class="kz-it" for="'+id+'"><input type="checkbox" id="'+id+'" data-k="'+gi+'_'+ii+'"'+(st[gi+'_'+ii]?' checked':'')+'><span>'+it+'</span></label>'}).join('')+'</div>'}).join('');
  function upd(){
    var n=Object.keys(st).filter(function(k){return st[k]}).length;
    cnt.innerHTML=n?'<b>'+n+'</b> '+(n%10===1&&n%100!==11?'позиция':(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?'позиции':'позиций'))+' в списке. «Список в PDF» сохранит только отмеченное.':'Ничего не отмечено — в PDF попадёт весь список.';
    var any=n>0;
    pr.innerHTML='<p class="r-brand">ALENAFIT · сила без перегибов · alenafit.com</p><h1>Список покупок</h1>'+G.map(function(g,gi){
      var items=g[1].filter(function(it,ii){return !any||st[gi+'_'+ii]});
      return items.length?'<section><h2>'+g[0]+'</h2><ul class="kz-pl">'+items.map(function(it){return '<li>☐ '+it+'</li>'}).join('')+'</ul></section>':'';
    }).join('');
  }
  grid.addEventListener('change',function(e){var k=e.target.getAttribute('data-k');if(!k)return;if(e.target.checked)st[k]=1;else delete st[k];save();upd()});
  document.getElementById('kzClear').addEventListener('click',function(){st={};save();grid.querySelectorAll('input').forEach(function(i){i.checked=false});upd()});
  upd();
})();

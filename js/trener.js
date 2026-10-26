/* Тест «Нужен ли мне тренер?» */
(function(){
  var Q=[
    ['Вы уверены в технике приседа, тяги и жимов?','Да','Не очень'],
    ['Есть ли боли, травмы или пауза больше полугода?','Нет','Да'],
    ['Тренируетесь регулярно уже 2–3 месяца сами?','Да','Нет'],
    ['Растут ли веса и самочувствие?','Да','Стоит на месте'],
    ['Хотите разобраться с питанием под свой график?','Справлюсь сама','Да, нужна помощь']
  ];
  var box=document.getElementById('trQ'),out=document.getElementById('trOut');if(!box)return;
  box.innerHTML=Q.map(function(q,i){return '<div class="field"><span class="flabel">'+(i+1)+'. '+q[0]+'</span><div class="opts" role="radiogroup"><input type="radio" name="tq'+i+'" id="tq'+i+'a" value="0"><label for="tq'+i+'a">'+q[1]+'</label><input type="radio" name="tq'+i+'" id="tq'+i+'b" value="1"><label for="tq'+i+'b">'+q[2]+'</label></div></div>'}).join('')+'<div class="btn-row"><button type="button" class="tbtn" id="trGo">Посмотреть результат</button></div>';
  document.getElementById('trGo').addEventListener('click',function(){
    var s=0,n=0,pain=false;
    for(var i=0;i<Q.length;i++){var e=document.querySelector('input[name="tq'+i+'"]:checked');if(e){n++;s+=+e.value;if(i===1&&e.value==='1')pain=true}}
    if(n<Q.length){out.innerHTML='<b>Ответьте на все вопросы</b> — так результат будет честнее.';return}
    var html;
    if(s<=1)html='<b>Пока вам хватит бесплатного.</b> Вы уже умеете тренироваться сами. Берите <a href="servisy.html#trenirovka">тренировку дня</a>, ведите <a href="progress.html">журнал прогресса</a> и возвращайтесь, если прогресс встанет.';
    else if(s<=3)html='<b>Можно начать с малого.</b> Попробуйте <a href="./#groups">пробное занятие в мини-группе</a> или напишите «СТАРТ» — разберём, где именно нужна помощь, без обязательств.';
    else html='<b>Сопровождение будет полезно.</b> Техника, нагрузка и питание под вас сэкономят месяцы проб и ошибок. <a href="https://t.me/Gym_mom1988" target="_blank" rel="noopener">Напишите «СТАРТ»</a> — начнём с короткого созвона.';
    if(pain)html+='<br><br>Есть боли, травма или долгая пауза — перед началом тренировок обсудите нагрузку с врачом.';
    out.innerHTML=html;
  });
})();

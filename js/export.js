/* Локальные файлы: PDF с встроенной кириллицей, без сервера и сторонних библиотек. */
(function(){
  'use strict';
  var fontPromise=null,enc=new TextEncoder();
  function font(){if(!fontPromise)fontPromise=fetch('fonts/golos-pdf.ttf').then(function(r){if(!r.ok)throw Error('Не загрузился шрифт PDF');return r.arrayBuffer()}).catch(function(e){fontPromise=null;throw e});return fontPromise}
  function warm(){font().catch(function(){})}
  if(document.querySelector('[data-pdf-root],#pdfBtn,#foodPdf')){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',warm);else warm()}
  function clean(s){return String(s||'').replace(/[\u00a0\u202f]/g,' ').replace(/\u00ad/g,'').replace(/\u2610/g,'[ ]').replace(/\s+/g,' ').trim()}
  function file(blob,name,target){
    var box=typeof target==='string'?document.getElementById(target):target;
    function note(s){if(box)box.textContent=s}
    var f=typeof File==='function'?new File([blob],name,{type:blob.type}):null;
    if(f&&navigator.canShare&&navigator.share&&navigator.canShare({files:[f]})){
      note('В открывшемся меню выберите «Сохранить в Файлы».');
      return navigator.share({files:[f],title:name}).then(function(){note('Файл передан в выбранное приложение.')}).catch(function(e){if(e.name==='AbortError'){note('Сохранение отменено.');return}download()});
    }
    download();return Promise.resolve();
    function download(){
      var u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
      if(box){box.textContent='Файл подготовлен. Если загрузка не началась: ';var link=document.createElement('a');link.href=u;if(blob.type!=='application/pdf')link.download=name;link.textContent=blob.type==='application/pdf'?'Открыть PDF':'Скачать файл';link.target='_blank';link.rel='noopener';box.appendChild(link);box.appendChild(document.createTextNode('. На iPhone используйте «Поделиться» → «Сохранить в Файлы».'))}
      // iOS может читать Blob после открытия системного меню — не отзываем ссылку через секунду.
      setTimeout(function(){URL.revokeObjectURL(u)},300000);
    }
  }
  function parseFont(buffer){
    var d=new DataView(buffer),tables={};function u16(p){return d.getUint16(p)}function s16(p){return d.getInt16(p)}function u32(p){return d.getUint32(p)}
    for(var i=0;i<u16(4);i++){var p=12+i*16,k=String.fromCharCode(d.getUint8(p),d.getUint8(p+1),d.getUint8(p+2),d.getUint8(p+3));tables[k]=u32(p+8)}
    var cmap=tables.cmap,sub=null;
    for(i=0;i<u16(cmap+2);i++){p=cmap+4+i*8;var c=cmap+u32(p+4);if(u16(c)===4){sub=c;if(u16(p)===3)break}}
    if(sub===null)throw Error('Неподдерживаемый шрифт');
    var n=u16(sub+6)/2,end=sub+14,start=end+n*2+2,delta=start+n*2,range=delta+n*2,units=u16(tables.head+18),metrics=u16(tables.hhea+34);
    function glyph(code){for(var j=0;j<n;j++){if(code>u16(end+j*2))continue;if(code<u16(start+j*2))return 0;var off=u16(range+j*2),v=off?u16(range+j*2+off+(code-u16(start+j*2))*2):code;return v?(v+s16(delta+j*2))&65535:0}return 0}
    function width(g){return u16(tables.hmtx+Math.min(g,metrics-1)*4)*1000/units}
    return {glyph:glyph,width:width,bytes:new Uint8Array(buffer),ascent:s16(tables.hhea+4)*1000/units,descent:s16(tables.hhea+6)*1000/units,
      bbox:[36,38,40,42].map(function(x){return Math.round(s16(tables.head+x)*1000/units)})};
  }
  function blocks(root){
    var out=[];
    function walk(el){
      if(el.nodeType!==1)return;
      if(el.matches('button,input,select,textarea,script,style,.no-print,.how-btn,.r-brand,[hidden]'))return;
      var tag=el.tagName,text=clean(el.textContent);
      if(tag==='SVG'){out.push({kind:'text',text:el.getAttribute('aria-label')||'График доступен в печатной версии отчёта.'});return}
      if(tag==='TABLE'){el.querySelectorAll('tr').forEach(function(row){out.push({kind:'row',text:[].map.call(row.children,function(c){return clean(c.textContent)}).join('  |  ')})});return}
      if(/^H[1-4]$/.test(tag)){if(text)out.push({kind:'heading',text:text});return}
      if(['P','LI','FIGCAPTION'].indexOf(tag)>=0){
        var copy=el.cloneNode(true);copy.querySelectorAll('button,.no-print,.how-btn').forEach(function(b){b.remove()});text=clean(copy.textContent);if(text)out.push({kind:'text',text:(tag==='LI'&&!text.startsWith('[ ]')?'• ':'')+text});return;
      }
      if(!el.children.length){if(text)out.push({kind:'text',text:text});return}
      [].forEach.call(el.children,walk);
    }
    [].forEach.call(root.children,walk);return out;
  }
  function make(buffer,title,items){
    var ft=parseFont(buffer),chars=[],byChar=Object.create(null),pages=[],lines=[],y=760;
    function token(s){var hex='';for(var ch of s){var cp=ch.codePointAt(0),g=cp<=65535?ft.glyph(cp):0;if(!g){ch='?';cp=63;g=ft.glyph(cp)}if(!byChar[ch]){chars.push({cp:cp,g:g,w:Math.round(ft.width(g))});byChar[ch]=chars.length}hex+=byChar[ch].toString(16).padStart(4,'0')}return '<'+hex+'>'}
    function measure(s,size){var sum=0;for(var ch of s){var g=ft.glyph(ch.codePointAt(0))||ft.glyph(63);sum+=ft.width(g)*size/1000}return sum}
    function page(){pages.push(lines.join('\n'));lines=[];y=760}
    function text(s,size,color){if(y<48)page();lines.push('BT /F1 '+size+' Tf '+color+' rg 1 0 0 1 46 '+y.toFixed(2)+' Tm '+token(s)+' Tj ET');y-=size*1.5}
    function wrap(s,size){var words=clean(s).split(' '),line='';words.forEach(function(word){
      while(measure(word,size)>503){var cut=word.length-1;while(cut>1&&measure(word.slice(0,cut),size)>503)cut--;if(line){text(line,size,'0.07 0.16 0.14');line=''}text(word.slice(0,cut),size,'0.07 0.16 0.14');word=word.slice(cut)}
      if(line&&measure(line+' '+word,size)>503){text(line,size,'0.07 0.16 0.14');line=word}else line+=(line?' ':'')+word;
    });if(line)text(line,size,'0.07 0.16 0.14')}
    items.forEach(function(b){var size=b.kind==='heading'?15:b.kind==='row'?10:11;if(b.kind==='heading'){if(y<110)page();y-=10}wrap(b.text,size);y-=b.kind==='row'?4:8});page();
    var objs=[null];function add(body){objs.push(body);return objs.length-1}function ascii(s){return enc.encode(s)}
    function stream(bytes,extra){var a=ascii('<< /Length '+bytes.length+(extra?' '+extra:'')+' >>\nstream\n'),z=ascii('\nendstream'),all=new Uint8Array(a.length+bytes.length+z.length);all.set(a);all.set(bytes,a.length);all.set(z,a.length+bytes.length);return all}
    var fontFile=add(stream(ft.bytes,'/Length1 '+ft.bytes.length)),descriptor=add('<< /Type /FontDescriptor /FontName /GolosText /Flags 32 /FontBBox ['+ft.bbox.join(' ')+'] /ItalicAngle 0 /Ascent '+Math.round(ft.ascent)+' /Descent '+Math.round(ft.descent)+' /CapHeight 720 /StemV 80 /FontFile2 '+fontFile+' 0 R >>');
    // Header/footer use the same CID set and are added before the font mapping is sealed.
    var painted=pages.map(function(body,i){return 'BT /F1 10 Tf 0.17 0.43 0.37 rg 1 0 0 1 46 805 Tm '+token('ALENAFIT · Сила без перегибов')+' Tj ET\n0.94 0.66 0.17 RG 46 790 m 549 790 l S\n'+body+'\nBT /F1 9 Tf 0.35 0.42 0.39 rg 1 0 0 1 46 30 Tm '+token('alenafit.com · '+(i+1)+' / '+pages.length)+' Tj ET'});
    var map=new Uint8Array((chars.length+1)*2);chars.forEach(function(c,i){map[(i+1)*2]=c.g>>8;map[(i+1)*2+1]=c.g&255});var mapRef=add(stream(map));
    var cm='/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /AlenaUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n';
    for(var offset=0;offset<chars.length;offset+=100){var chunk=chars.slice(offset,offset+100);cm+=chunk.length+' beginbfchar\n'+chunk.map(function(c,i){return '<'+(offset+i+1).toString(16).padStart(4,'0')+'> <'+c.cp.toString(16).padStart(4,'0')+'>'}).join('\n')+'\nendbfchar\n'}
    cm+='endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';var cmapRef=add(stream(ascii(cm)));
    var cid=add('<< /Type /Font /Subtype /CIDFontType2 /BaseFont /GolosText /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor '+descriptor+' 0 R /CIDToGIDMap '+mapRef+' 0 R /W [1 ['+chars.map(function(c){return c.w}).join(' ')+']] >>');
    var type0=add('<< /Type /Font /Subtype /Type0 /BaseFont /GolosText /Encoding /Identity-H /DescendantFonts ['+cid+' 0 R] /ToUnicode '+cmapRef+' 0 R >>'),pagesRef=add(''),kids=[];
    painted.forEach(function(body){var contents=add(stream(ascii(body)));kids.push(add('<< /Type /Page /Parent '+pagesRef+' 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 '+type0+' 0 R >> >> /Contents '+contents+' 0 R >>'))});
    objs[pagesRef]='<< /Type /Pages /Kids ['+kids.map(function(id){return id+' 0 R'}).join(' ')+'] /Count '+kids.length+' >>';var catalog=add('<< /Type /Catalog /Pages '+pagesRef+' 0 R >>');
    var parts=[ascii('%PDF-1.7\n')],offsets=[0],length=parts[0].length;
    for(var i=1;i<objs.length;i++){offsets.push(length);var pre=ascii(i+' 0 obj\n'),body=typeof objs[i]==='string'?ascii(objs[i]):objs[i],post=ascii('\nendobj\n');parts.push(pre,body,post);length+=pre.length+body.length+post.length}
    var xref=length,tail='xref\n0 '+objs.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(function(n){return String(n).padStart(10,'0')+' 00000 n \n'}).join('')+'trailer\n<< /Size '+objs.length+' /Root '+catalog+' 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';parts.push(ascii(tail));return new Blob(parts,{type:'application/pdf'});
  }
  function pdf(root,title,name,target){var list=Array.isArray(root)?root:blocks(root),box=typeof target==='string'?document.getElementById(target):target;if(box)box.textContent='Готовлю PDF…';return font().then(function(b){return file(make(b,title,list),name,target)}).catch(function(e){if(box)box.textContent='Не удалось подготовить PDF. Попробуйте «Печать» или откройте страницу в Safari/Chrome. '+e.message;throw e})}
  window.AlenaExport={save:file,pdf:pdf,blocks:blocks};
  document.addEventListener('click',function(e){var b=e.target.closest('[data-pdf-root]');if(!b)return;var root=document.getElementById(b.getAttribute('data-pdf-root'));if(!root)return;pdf(root,b.textContent,b.getAttribute('data-pdf-name')||'alenafit.pdf',b.getAttribute('data-pdf-status')).catch(function(){})});
})();

// Проверяем реальный PDF и пути сохранения без браузерного сервера.
const {readFileSync,mkdtempSync,writeFileSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');const {join}=require('node:path');
const {execFileSync}=require('node:child_process');const vm=require('node:vm');const assert=require('node:assert/strict');
const font=readFileSync('fonts/golos-pdf.ttf'),code=readFileSync('js/export.js','utf8');
let blobs=[],clicks=0,status={textContent:'',appendChild(){}};
const doc={querySelector:()=>null,addEventListener(){},getElementById:()=>status,
 createElement:()=>({click(){clicks++},remove(){}}),body:{appendChild(){}},createTextNode:s=>s};
const navigator={};const win={};
vm.runInNewContext(code,{window:win,document:doc,navigator,Blob,File,TextEncoder,
 fetch:async()=>({ok:true,arrayBuffer:async()=>font.buffer.slice(font.byteOffset,font.byteOffset+font.byteLength)}),
 URL:{createObjectURL(b){blobs.push(b);return 'blob:test'},revokeObjectURL(){}},setTimeout(){}});
(async()=>{
 const dir=mkdtempSync(join(tmpdir(),'alena-export-'));
 try{
  const items=[{kind:'heading',text:'Дневник питания'},{text:'Яблоко, 200 г: 104 ккал'}];
  for(let i=0;i<150;i++)items.push({text:'Проверка кириллицы и переносов: присед со штангой, подход '+i});
  await win.AlenaExport.pdf(items,'Отчёт','report.pdf','status');
  assert.equal(blobs[0].type,'application/pdf');
  const b=Buffer.from(await blobs[0].arrayBuffer());assert.ok(b.subarray(0,8).toString().startsWith('%PDF-1.7'));
  writeFileSync(join(dir,'report.pdf'),b);
  const txt=execFileSync('pdftotext',['-layout',join(dir,'report.pdf'),'-'],{encoding:'utf8'});
  assert.ok(txt.includes('Дневник питания')&&txt.includes('104 ккал')&&txt.includes('подход 149'));
  assert.ok((txt.match(/ALENAFIT/g)||[]).length>1);assert.equal(clicks,1);
  assert.equal(typeof status.textContent,'string');
  navigator.canShare=()=>true;navigator.share=async({files})=>{assert.equal(files[0].type,'application/json')};
  await win.AlenaExport.save(new Blob(['{}'],{type:'application/json'}),'backup.json','status');assert.equal(clicks,1);
  navigator.share=async()=>{throw Object.assign(new Error(),{name:'AbortError'})};
  await win.AlenaExport.save(new Blob(['{}']),'backup.json','status');assert.equal(clicks,1);assert.equal(status.textContent,'Сохранение отменено.');
  navigator.share=async()=>{throw new Error('share unavailable')};
  await win.AlenaExport.save(new Blob(['{}']),'backup.json','status');assert.equal(clicks,2);
  const pdfBlob=await win.AlenaExport.blob(items,'Рацион');
  const eml=await win.AlenaExport.email(pdfBlob,'alex@example.org','alenafit-week.pdf');
  const mime=await eml.text();assert.ok(mime.includes('To: alex@example.org')&&mime.includes('X-Unsent: 1')&&mime.includes('Content-Disposition: attachment; filename="alenafit-week.pdf"'));
  const part=mime.split('Content-Transfer-Encoding: base64')[2].split('--AlenafitPdfAttachment--')[0].trim();
  assert.deepEqual(Buffer.from(part,'base64'),Buffer.from(await pdfBlob.arrayBuffer()));
  await assert.rejects(()=>win.AlenaExport.email(pdfBlob,'a@example.org\r\nBcc: other@example.org','x.pdf'));
  console.log('PDF: кириллица, несколько страниц, полный текст; JSON share, отмена и fallback — OK');
 }finally{rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});

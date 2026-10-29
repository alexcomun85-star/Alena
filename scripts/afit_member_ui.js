// AFIT_MEMBER_UI_V1
const memberPanel=document.querySelector('#afit-member-panel');
const memberForm=document.querySelector('#afit-member-form');
const memberStatus=document.querySelector('#afit-member-status');
const quotaNote=document.querySelector('#afit-quota');
function setAccessState(data){
 const locked=!data.member&&data.remaining===0;
 memberPanel.hidden=!locked;
 form.hidden=locked;
 quotaNote.textContent=data.member?'Доступ участника ALENAFIT':`Доступно вопросов: ${data.remaining} из 30`;
 if(locked)status.textContent='Войдите, чтобы продолжить разговор';
}
async function refreshAccess(){
 try{const r=await fetch('/session',{cache:'no-store'});if(r.ok)setAccessState(await r.json())}catch(e){quotaNote.textContent=''}
}
memberForm.addEventListener('submit',async e=>{
 e.preventDefault();const submit=memberForm.querySelector('button');if(submit.disabled)return;
 submit.disabled=true;memberStatus.textContent='Проверяю доступ…';
 try{
  const r=await fetch('/member-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login:memberForm.elements.login.value.trim(),password:memberForm.elements.password.value})});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Не удалось войти');
  memberForm.elements.password.value='';setAccessState({member:true,remaining:0});status.textContent='Можно продолжать';input.focus();
 }catch(err){memberStatus.textContent=err.message}
 finally{submit.disabled=false}
});
button.setAttribute('aria-label','Отправить сообщение');button.title='Отправить сообщение';
button.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
refreshAccess();

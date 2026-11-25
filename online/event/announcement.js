// Until submissions open, visitors can inspect the same form without entering personal data.
const submission=document.querySelector('#submission');
document.querySelector('#entry-fields').disabled=true;
document.querySelector('#post-button').disabled=true;
document.querySelector('#post-button').textContent='受付開始前';
document.querySelector('#entry-form').addEventListener('submit',event=>event.preventDefault());
for(const button of document.querySelectorAll('[data-open-submission]')){
  button.textContent='投稿フォームを見る';
  button.onclick=()=>submission.showModal();
}
for(const button of submission.querySelectorAll('[data-close-submission]'))button.onclick=()=>submission.close();
for(const button of document.querySelectorAll('[data-event-jump]')){
  button.onclick=()=>{
    const target=document.getElementById(button.dataset.eventJump);
    const details=target.closest('details');
    if(details)details.open=true;
    target.scrollIntoView({block:'start'});
    target.focus({preventScroll:true});
  };
}

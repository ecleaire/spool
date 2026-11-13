const eventView=document.querySelector("#eventView");
const eventOriginalNavigate=showBookingView;
showBookingView=function(show){eventView.hidden=true;for(const id of ['#navEvents','#showEvents']){const el=document.querySelector(id);el.classList.remove('active','selected');el.removeAttribute('aria-current');el.setAttribute('aria-pressed','false')}eventOriginalNavigate(show)};
function showEventView(){
 showBookingView(false);
 for(const selector of ['.stats','.inventory','.footnote','#add','#openLibrary','#addBooking'])document.querySelector(selector).hidden=true;
 eventView.hidden=false;
 for(const id of ['#navInventory','#navBookings','#showInventory','#showBookings']){const el=document.querySelector(id);el.classList.remove('active','selected');el.removeAttribute('aria-current');el.setAttribute('aria-pressed','false')}
 document.querySelector('#navEvents').classList.add('active');document.querySelector('#navEvents').setAttribute('aria-current','page');document.querySelector('#showEvents').classList.add('selected');document.querySelector('#showEvents').setAttribute('aria-pressed','true');
 document.querySelector('.page-title h1').textContent='イベント';document.querySelector('.page-title .eyebrow').textContent='EVENTS';document.querySelector('.page-title p').textContent='つくる楽しさを、みんなで。';document.querySelector('header strong').textContent='イベント';
}
document.querySelector('#navEvents').onclick=document.querySelector('#showEvents').onclick=showEventView;

for(const button of document.querySelectorAll('#eventView [data-event-jump]'))button.addEventListener('click',()=>{const target=document.getElementById(button.dataset.eventJump);if(!target)return;if(target.tagName==='DETAILS')target.open=true;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;target.scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'});target.focus({preventScroll:true})});

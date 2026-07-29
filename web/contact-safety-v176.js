(function(){
  'use strict';
  if(window.BTVContactSafety)return;

  async function check(surface,parts){
    const content=(Array.isArray(parts)?parts:[parts]).filter(Boolean).join('\n').trim();
    if(!content||!window.btvSupabase)return true;
    const {data,error}=await window.btvSupabase.rpc('btv_enforce_contact_sharing',{p_surface:surface,p_content:content,p_user:null});
    if(error){
      console.warn('Contact-safety preflight unavailable:',error.message||error);
      return true;
    }
    if(data?.allowed!==false)return true;
    alert(data.message||'Keep conversations and bookings on Beyond The Visa, then try again.');
    return false;
  }

  function submission(event){
    const form=event.target;
    if(!(form instanceof HTMLFormElement)||form.dataset.contactSafetyApproved==='1'){
      if(form?.dataset)delete form.dataset.contactSafetyApproved;
      return null;
    }
    if(form.id==='btvBookingForm')return ['booking_notes',[form.elements.role?.value,form.elements.notes?.value]];
    if(form.matches('.cvServicePanel'))return ['cv_service_notes',[form.elements.band?.value,form.elements.role?.value,form.elements.notes?.value]];
    if(form.matches('.gqCommentForm'))return ['public_comment',form.querySelector('textarea')?.value];
    if(form.id==='contactForm')return ['support_request',[document.getElementById('contactReason')?.value,document.getElementById('contactMessage')?.value]];
    if(form.id==='feedbackForm')return ['feedback',[document.getElementById('feedbackTitle')?.value,document.getElementById('feedbackDetails')?.value]];
    if(form.id==='chatForm')return ['zibur_question',document.getElementById('question')?.value];
    return null;
  }

  document.addEventListener('submit',async event=>{
    const request=submission(event);if(!request)return;
    event.preventDefault();event.stopImmediatePropagation();
    const form=event.target,submitter=event.submitter;
    if(!await check(request[0],request[1]))return;
    form.dataset.contactSafetyApproved='1';
    form.requestSubmit(submitter?.form===form?submitter:undefined);
  },true);

  window.BTVContactSafety={check};
})();

(function(){
 const features=[
  {id:'dashboard',title:'Dashboard',description:'Your personalised mission control.',icon:'home',category:'main',target:{screen:'home'},desktopOrder:1,mobileOrder:1},
  {id:'study',title:'Study',description:'Learning, guides and preparation resources.',icon:'book',category:'main',target:{screen:'learn'},desktopOrder:2,mobileOrder:2},
  {id:'mock-tests',title:'Mock Tests',description:'Timed CBT, NCLEX and IELTS mock examinations.',icon:'target',category:'main',target:{screen:'learn',action:'mock-tests'},desktopOrder:3,mobileOrder:3},
  {id:'journey',title:'Journey',description:'Follow every stage of your international journey.',icon:'route',category:'main',target:{screen:'checklist'},desktopOrder:4,mobileOrder:4},
  {id:'jobs',title:'Job Search',description:'Find and save suitable opportunities.',icon:'briefcase',category:'career',target:{screen:'jobs'},desktopOrder:5,mobileOrder:5},
  {id:'community',title:'Community',description:'Connect with nurses and midwives worldwide.',icon:'users',category:'career',target:{screen:'community'},desktopOrder:6,mobileOrder:6},
  {id:'assistant',title:'AI Assistant',description:'Ask Zibur for personalised guidance.',icon:'sparkle',category:'main',target:{screen:'assistant'},desktopOrder:7,mobileOrder:7},
  {id:'resources',title:'Resources',description:'Open books, articles, videos and guides.',icon:'library',category:'study',target:{screen:'learn'},desktopOrder:8,mobileOrder:8},
  {id:'ielts',title:'IELTS Academic',description:'Reading, writing and future speaking/listening tools.',icon:'language',category:'study',target:{screen:'learn',action:'ielts'}},
  {id:'cbt',title:'CBT',description:'Nursing CBT practice and full mock exams.',icon:'clipboard',category:'study',target:{url:'cbt.html'}},
  {id:'nclex',title:'NCLEX',description:'Clinical practice and adaptive preparation.',icon:'pulse',category:'study',target:{url:'nclex.html'}},
  {id:'osce',title:'OSCE',description:'Stations, marking criteria and practical guidance.',icon:'stethoscope',category:'study',target:{screen:'learn',action:'osce'}},
  {id:'adult-nursing',title:'Adult Nursing',description:'Core nursing knowledge and clinical topics.',icon:'heart',category:'study',target:{screen:'learn',action:'adult'}},
  {id:'calculations',title:'Drug Calculations',description:'Practise medication calculations safely.',icon:'calculator',category:'study',target:{screen:'learn',action:'calculations'}},
  {id:'interview',title:'Interview Coach',description:'Prepare strong answers and book support.',icon:'messages',category:'career',target:{screen:'learn',action:'interview'}},
  {id:'mentors',title:'Mentor Marketplace',description:'Find experienced professional support.',icon:'mentor',category:'career',target:{hub:'mentors'}},
  {id:'stories',title:'Success Stories',description:'Learn from nurses who completed the journey.',icon:'star',category:'career',target:{hub:'stories'}},
  {id:'wallet',title:'Beyond Coins',description:'Balance, purchases, refunds and transactions.',icon:'coin',category:'account',target:{hub:'wallet'}},
  {id:'analytics',title:'Analytics',description:'Results, readiness and learning statistics.',icon:'chart',category:'account',target:{hub:'analytics'}},
  {id:'notifications',title:'Notifications',description:'Updates and recommended actions.',icon:'bell',category:'account',target:{hub:'notifications'}},
  {id:'profile',title:'My Profile',description:'Manage your journey details and preferences.',icon:'profile',category:'account',target:{action:'profile'}},
  {id:'saved-jobs',title:'Saved Jobs',description:'Review saved opportunities.',icon:'bookmark',category:'account',target:{hub:'jobs'}},
  {id:'study-plan',title:'Study Plan',description:'Review today’s learning plan.',icon:'calendar',category:'account',target:{screen:'learn',action:'study-plan'}}
 ];
 const by=id=>features.find(x=>x.id===id);
 function open(id){const f=by(id);if(!f)return false;const t=f.target;if(t.url){location.href=t.url;return true}if(t.hub){window.BTVPlatform?.open(t.hub);return true}if(t.action==='profile'){window.showOnboarding?.();return true}if(t.screen){window.openScreen?.(t.screen);if(t.screen==='jobs')window.renderJobs?.();setTimeout(()=>window.dispatchEvent(new CustomEvent('btv:feature-action',{detail:{action:t.action,id}})),50);return true}return false}
 window.BTVFeatures={all:features,by,open};
})();

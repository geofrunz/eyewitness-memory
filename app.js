import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,signInAnonymously,signInWithEmailAndPassword,signOut,onAuthStateChanged,setPersistence,browserLocalPersistence} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,collection,doc,setDoc,onSnapshot,getDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
const $=id=>document.getElementById(id),show=id=>$(id).classList.remove('hidden'),hide=id=>$(id).classList.add('hidden');
const cfg=window.STUDY_CONFIG||{}, demo=!cfg.firebase?.apiKey;let auth=null,db=null,unsubscribe=null,rows=[];let group=null;
const studentHref=()=>location.href.split('?')[0].split('#')[0];
if(!demo){const fb=initializeApp(cfg.firebase);auth=getAuth(fb);db=getFirestore(fb);}
const studentMode=new URLSearchParams(location.search).get('view')!=='admin';
if(studentMode){$('studentView').classList.remove('hidden');hide('adminView');if(demo){$('modeAlert').textContent='DEMO MODE: Responses are stored only on this device. Connect Firebase before using this with a class.';show('modeAlert');}initStudent();}
else{hide('studentView');show('adminView');initAdmin();}
function randomGroup(){const arr=new Uint32Array(1);crypto.getRandomValues(arr);return arr[0]/4294967296<0.5?'A':'B';}
function makeGroup(){const saved=localStorage.getItem('vm_group');if(saved==='A'||saved==='B')return saved;const value=randomGroup();localStorage.setItem('vm_group',value);return value;}
function setStep(step){['intro','quizStep','doneStep'].forEach(x=>x===step?show(x):hide(x));}
function initStudent(){
  if(localStorage.getItem('vm_done')==='1'){setStep('doneStep');return;}
  $('startBtn').onclick=async()=>{
    $('startBtn').disabled=true;
    try{
      if(!demo){
        await signInAnonymously(auth);
        const exists=await getDoc(doc(db,'responses',auth.currentUser.uid));
        if(exists.exists()){localStorage.setItem('vm_done','1');setStep('doneStep');return;}
      }
      group=makeGroup();
      $('speedQuestion').textContent=group==='A'
        ? 'In your opinion, how fast was the car going when it smashed into the wall?'
        : 'In your opinion, how fast was the car going when it hit the wall?';
      setStep('quizStep');
    }catch(e){
      $('startBtn').disabled=false;
      $('modeAlert').textContent='Could not connect to the database. '+e.message;
      show('modeAlert');
    }
  };
  $('quizForm').onsubmit=async e=>{
    e.preventDefault();
    if(!group)return;
    const speed=Number($('speed').value);
    const glass=document.querySelector('input[name="glass"]:checked')?.value;
    if(!Number.isFinite(speed)||speed<0||speed>500||!['Yes','No'].includes(glass))return;
    hide('submitError');$('submitBtn').disabled=true;
    try{
      if(demo){
        const existing=JSON.parse(localStorage.getItem('vm_demo_responses')||'[]');
        existing.push({group,speed,glass,submittedAt:new Date().toISOString()});
        localStorage.setItem('vm_demo_responses',JSON.stringify(existing));
      }else{
        if(!auth.currentUser)await signInAnonymously(auth);
        await setDoc(doc(db,'responses',auth.currentUser.uid),{
          group,speed,glass,submittedAt:serverTimestamp()
        });
      }
      localStorage.setItem('vm_done','1');setStep('doneStep');
    }catch(e){
      $('submitError').textContent='Submission failed; please try again. '+e.message;
      show('submitError');$('submitBtn').disabled=false;
    }
  };
}
function initAdmin(){const url=studentHref();$('studentUrl').href=url;$('studentUrl').textContent=url;$('qrImg').src='https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=10&data='+encodeURIComponent(url);$('copyLinkBtn').onclick=()=>navigator.clipboard.writeText(url).then(()=>{$('copyLinkBtn').textContent='Link copied ✓'});
$('exportBtn').onclick=exportCsv;if(demo){show('adminDemoAlert');hide('loginPanel');show('dashboard');rows=JSON.parse(localStorage.getItem('vm_demo_responses')||'[]');render();return;}
$('loginForm').onsubmit=async e=>{e.preventDefault();hide('loginError');try{await setPersistence(auth,browserLocalPersistence);await signInWithEmailAndPassword(auth,$('adminEmail').value,$('adminPassword').value);}catch(err){show('loginError');$('loginError').textContent='Sign-in failed: '+err.message;}};
$('signOutBtn').onclick=()=>signOut(auth);onAuthStateChanged(auth,user=>{if(unsubscribe){unsubscribe();unsubscribe=null;}if(user&&user.uid===cfg.instructorUid&&!user.isAnonymous){hide('loginPanel');show('dashboard');unsubscribe=onSnapshot(collection(db,'responses'),snapshot=>{rows=snapshot.docs.map(d=>({id:d.id,...d.data()}));render();$('liveStatus').textContent='● Live results';},error=>{$('liveStatus').textContent='⚠ Data access error: '+error.message;});}else{show('loginPanel');hide('dashboard');if(user&&!user.isAnonymous){show('loginError');$('loginError').textContent='This account is not the configured instructor. Check instructorUid in config.js and firestore.rules.';}}});}
function mean(arr){return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;}function sem(arr){if(arr.length<2)return null;const m=mean(arr);return Math.sqrt(arr.reduce((a,v)=>a+(v-m)**2,0)/(arr.length-1))/Math.sqrt(arr.length)}
function fmt(v){return v==null?'—':v.toFixed(1)}
function render(){const groups={A:rows.filter(x=>x.group==='A'),B:rows.filter(x=>x.group==='B')};$('totalN').textContent=rows.length;$('nA').textContent=groups.A.length;$('nB').textContent=groups.B.length;$('lastUpdated').textContent='Updated '+new Date().toLocaleTimeString();const speeds=['A','B'].map(g=>groups[g].map(x=>Number(x.speed)).filter(Number.isFinite));const means=speeds.map(mean),ses=speeds.map(sem);const ymax=Math.max(10,...means.map((x,i)=>(x||0)+(ses[i]||0)))*1.18;
$('speedChart').innerHTML=['A','B'].map((g,i)=>{const m=means[i],se=ses[i],height=m==null?0:Math.min(100,m/ymax*100),seh=se==null?0:se/ymax*100;return `<div class="bar-group"><div class="bar-value">${fmt(m)} ${se==null?'':'± '+fmt(se)} <small>(n=${speeds[i].length})</small></div><div class="bar-track"><div class="bar ${g.toLowerCase()}" style="height:${height}%">${se!=null?`<div class="errorbar" style="bottom:calc(100% - ${seh}%);height:${seh*2}%"></div>`:''}</div><div class="bar-label">Group ${g}</div></div></div>`}).join('');
$('glassChart').innerHTML=['A','B'].map(g=>{const n=groups[g].length,y=groups[g].filter(x=>x.glass==='Yes').length,no=groups[g].filter(x=>x.glass==='No').length;return `<div class="glass-row"><div class="glass-label"><span>Group ${g} (n=${n})</span><span>Yes: ${y} (${n?(100*y/n).toFixed(1):'0.0'}%) · No: ${no} (${n?(100*no/n).toFixed(1):'0.0'}%)</span></div><div class="stack"><div class="yes" style="width:${n?100*y/n:0}%"><span>${y?'Yes '+(100*y/n).toFixed(0)+'%':''}</span></div><div class="no" style="width:${n?100*no/n:0}%"><span>${no?'No '+(100*no/n).toFixed(0)+'%':''}</span></div></div></div>`}).join('');}
function exportCsv(){const lines=[['group','speed_kmh','glass','submitted_at'],...rows.map(x=>[x.group,x.speed,x.glass,x.submittedAt?.toDate?.()?.toISOString?.()||x.submittedAt||''])];const csv=lines.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='visual_memory_responses.csv';link.click();URL.revokeObjectURL(link.href);}

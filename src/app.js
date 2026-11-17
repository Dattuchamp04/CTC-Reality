// CTC Reality UI: renders the two offer sheets, the letter reader (PDF.js, Tesseract.js), languages and share cards.
// Depends on engine.js and i18n.js, which build.js inlines before this file.
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const inr=n=>(n<0?'−':'')+'₹'+Math.round(Math.abs(n)).toLocaleString('en-IN');
let lang='en';
const t=(k,v)=>{let s=(T[lang]&&T[lang][k]!=null?T[lang][k]:T.en[k]);if(v&&typeof s==='string')for(const x in v)s=s.split('{'+x+'}').join(v[x]);return s};
const span=p=>p?p.n+' '+t('unit')[p.u]:'';
const flagText=f=>t('f_'+f.code,{p:span(f.p),x:inr(f.x||0),y:inr(f.y||0),pct:f.pct});
const TINT={'Rent':'#1a2333','Food':'#4d5f82','Travel':'#8493b3','Bills, phone, fun':'#b9c3d6','EMI + sent home':'#7b5aa6','Left over':'#1a8a5c'};
const DEF=[{name:'Offer A',mode:'quick',lpa:12,varPct:10,basicPct:50,pf:'full',city:'Bengaluru',home:1,food:1,ride:0,other:6500,emi:0,rent:null,comp:null,flags:[]},
           {name:'Offer B',mode:'quick',lpa:10,varPct:5,basicPct:50,pf:'full',city:'Pune',home:1,food:1,ride:0,other:6500,emi:0,rent:null,comp:null,flags:[]}];
const SAMPLE=`ANNEXURE A - COMPENSATION DETAILS
Component                        Per Annum (INR)
Basic Salary                     4,80,000
House Rent Allowance             2,40,000
Special Allowance                1,86,312
Employer's contribution to PF    57,600
Gratuity                         23,088
Medical Insurance Premium        13,000
Performance Linked Bonus         1,00,000
Joining Bonus (one time)         1,00,000
Total Cost to Company            12,00,000

The joining bonus shall be recovered in full if you resign within 12 months of joining.
Your notice period will be 90 days. You will be on probation for 6 months.`;
let S,R=[],target=0,shareText='',view=0,fmt='45';
function show(k){view=k;$('desk').dataset.show=k;$('tabs').querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',+b.dataset.k===k));if(matchMedia('(max-width:760px)').matches)$('tabs').scrollIntoView({block:'start',behavior:'smooth'})}

function sheet(i){const o=S[i],p='o'+i+'-';
const sel=k=>`<select id="${p}${k}" aria-label="${k}">${t(k).map((x,j)=>`<option value="${j}"${j==o[k]?' selected':''}>${x}</option>`).join('')}</select>`;
const city=`<select id="${p}city" aria-label="City">${Object.keys(CITIES).map(c=>`<option${c===o.city?' selected':''}>${c}</option>`).join('')}</select>`;
const num=(k,a)=>`<input id="${p}${k}" type="number" inputmode="decimal" ${a} value="${o[k]}" aria-label="${k}">`;
return `<article class="sheet" id="${p}sheet" data-stamp="${esc(t('stamp'))}">
 <div class="lh"><input id="${p}name" value="${esc(o.name)}" maxlength="22" aria-label="Offer name"><button class="link" id="${p}read">${t('read')}</button></div>
 <p class="typed">${t('dear')}<br>${t('letter')}</p>
 <div class="claim"><span class="paper"><span class="struck" id="${p}ctc"></span><span class="onpaper" id="${p}paper"></span></span><span class="real"><b id="${p}in"></b>${t('inbank')}</span></div>
 <p class="fill" id="${p}quick">${t('quick',{lpa:num('lpa','min="1" max="300" step="0.5"'),var:num('varPct','min="0" max="60" step="1"')})}</p>
 <p class="fill" id="${p}fromletter" hidden>${t('fromletter')} <button class="link" id="${p}back">${t('back')}</button></p>
 <h2>${t('annex')}</h2>
 <table><tbody id="${p}rows"></tbody></table>
 <p class="margin" id="${p}never"></p>
 <ul class="flags" id="${p}flags"></ul>
 <h2>${t('month')}</h2>
 <p class="fill">${t('life',{city,home:sel('home'),food:sel('food'),ride:sel('ride')})}</p>
 <div class="boxes" id="${p}boxes" role="img"></div>
 <ul class="key" id="${p}key"></ul>
 <div class="end"><span>${t('left30')}</span><b id="${p}left"></b><small id="${p}runout"></small></div>
 <div class="foot"><button class="btn" id="${p}share">${t('share')}</button>
 <details><summary>${t('own')}</summary><div class="own">
  <label>${t('rentl')}<input id="${p}rent" type="number" inputmode="numeric" min="0" step="500" placeholder="${t('est')}" value="${o.rent??''}"></label>
  <label>${t('billsl')}<input id="${p}other" type="number" inputmode="numeric" min="0" step="500" value="${o.other}"></label>
  <label>${t('emil')}<input id="${p}emi" type="number" inputmode="numeric" min="0" step="500" value="${o.emi}"></label>
  <label>${t('basicl')}<input id="${p}basicPct" type="number" inputmode="numeric" min="30" max="60" step="5" value="${o.basicPct}"></label>
  <label>${t('pfl')}<select id="${p}pf">${['full','cap','none'].map((v,j)=>`<option value="${v}"${o.pf===v?' selected':''}>${t('pfo')[j]}</option>`).join('')}</select></label>
 </div></details></div>
</article>`}

function paint(){R=S.map(compute);
  R.forEach((r,i)=>{const o=S[i],p='o'+i+'-',c=r.c;
    const ink=(id,v)=>{const el=$(id);if(el.textContent!==v){el.textContent=v;const host=el.closest('.claim');host.classList.remove('ink');void host.offsetWidth;host.classList.add('ink')}};
    ink(p+'ctc',inr(r.ctc));$(p+'paper').textContent=t('onpaper',{x:inr(r.ctc/12)});ink(p+'in',inr(r.inHand));
    $(p+'quick').hidden=o.mode==='letter';$(p+'fromletter').hidden=o.mode!=='letter';
    const row=(a,b,m,cl)=>`<tr${cl?` class="${cl}"`:''}><td>${a}</td><td class="n">${b}</td><td class="m">${m||''}</td></tr>`;
    let h='';[['basic',c.basic],['hra',c.hra],['allow',c.special]].forEach(x=>{if(x[1]>0)h+=row(t(x[0]),inr(x[1]))});
    [['epf',c.epfEmployer,'n_epf'],['grat',c.gratuity,'n_grat'],['vari',c.variable,'n_var'],['once',c.oneTime,'n_once'],['ben',c.other,'n_ben'],['unexp',r.gap>r.ctc*.02?r.gap:0,'n_unexp']].forEach(x=>{if(x[1]>0)h+=row(t(x[0]),inr(x[1]),t(x[2]),'gone')});
    h+=row(t('ctcline'),inr(r.ctc),'','tot')+row(t('gross'),inr(r.gross/12))+(r.epf?row(t('yourpf'),inr(-r.epf/12),t('n_yourpf')):'')+row(t('tax'),inr(-r.taxFixed/12),r.taxFixed?(inRelief(r.gross)?t('n_relief'):''):t('n_taxnil'))+(r.pt?row(t('pt'),inr(-r.pt/12)):'')+row(t('bank'),inr(r.inHand),'','bank');
    $(p+'rows').innerHTML=h;
    $(p+'never').textContent=t('never',{x:inr(r.neverMonthly),p:Math.round(100*r.neverMonthly/r.ctc)});
    $(p+'flags').innerHTML=(o.mode==='letter'?o.flags:[]).filter(f=>f.code).map(f=>`<li class="${f.level}">${esc(flagText(f))}</li>`).join('');
    const mb=monthBoxes(r),cells=[];mb.boxes.forEach(x=>{for(let k=0;k<x.n;k++)cells.push(`<i style="background:${TINT[x.label]}"></i>`)});
    $(p+'boxes').innerHTML=cells.map((cell,k)=>r.left<0&&k>=mb.funded?'<i class="owe"></i>':cell).join('');
    $(p+'boxes').setAttribute('aria-label',r.left<0?`Money covers ${mb.funded} of 30 days`:'30 days of spending by category');
    $(p+'key').innerHTML=mb.boxes.map(x=>`<li><i style="background:${TINT[x.label]}"></i>${t('cat')[x.label]}<b>${inr(x.amount)}</b></li>`).join('')+(r.left<0?`<li><i style="background:var(--pen)"></i>${t('owe')}<b>${inr(-r.left)}</b></li>`:'');
    const l=$(p+'left');l.textContent=inr(r.left);l.className=r.left<0?'neg':'pos';
    $(p+'runout').textContent=r.left<0?t('runout',{d:r.runOutDay}):r.saveRate<.15?t('tight'):'';
  });
  const d=R[0].left-R[1].left,w=d>=0?0:1,l=1-w,gap=Math.abs(d);
  $('o0-sheet').classList.toggle('pick',w===0&&gap>=500);$('o1-sheet').classList.toggle('pick',w===1&&gap>=500);
  $('tabs').innerHTML=[0,1].map(k=>`<button role="tab" aria-selected="${k===view}" data-k="${k}"><span>${esc(S[k].name)}</span><b class="${R[k].left<0?'neg':'pos'}">${inr(R[k].left)}</b><small>${t('tleft')}</small></button>`).join('');
  $('tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>show(+b.dataset.k));$('desk').dataset.show=view;
  $('verdict').textContent=gap<500?t('v_same',{a:S[0].name,b:S[1].name}):t('v_more',{a:S[w].name,x:inr(gap)})+(R[w].ctc<R[l].ctc?t('v_even',{b:S[l].name,y:inr(R[l].ctc-R[w].ctc)}):t('v_end'));
  try{localStorage.setItem('ctc-reality-v3',JSON.stringify({S,lang}))}catch(e){}
}
function bind(){[0,1].forEach(i=>{const p='o'+i+'-',o=S[i],num=['lpa','varPct','home','food','ride','other','emi','basicPct'];
  ['name','city','pf','rent',...num].forEach(k=>$(p+k).addEventListener('input',e=>{const v=e.target.value;
    if(k==='rent')o.rent=v===''?null:Math.max(0,+v);else if(num.includes(k))o[k]=Math.max(0,+v||0);else o[k]=v;
    if(k==='city'||k==='home'){o.rent=null;$(p+'rent').value=''}paint()}));
  $(p+'read').onclick=()=>{target=i;$('rd-err').textContent='';$('reader').hidden=false;$('rd-text').focus()};
  $(p+'back').onclick=()=>{o.mode='quick';paint()};
  $(p+'share').onclick=()=>card(i)})}
function render(){document.documentElement.lang=lang;
  [['priv','priv'],['f45','f45'],['f169','f169'],['tag','tag'],['rd-t','rd_t'],['rd-i','rd_i'],['rd-go','rd_go'],['rd-sample','rd_s'],['rd-x','rd_x'],['sh-t','sh_t'],['sh-h','sh_h'],['sh-copy','sh_c'],['sh-x','sh_x']].forEach(([id,k])=>{$(id).textContent=t(k)});
  $('how').innerHTML=t('how');document.querySelectorAll('.langs button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.lang===lang));
  $('desk').innerHTML=sheet(0)+sheet(1);bind();paint()}
document.querySelectorAll('.langs button').forEach(b=>b.onclick=()=>{lang=b.dataset.lang;render()});
(()=>{let x0=null,y0=0;const d=$('desk');d.addEventListener('touchstart',e=>{if(e.target.closest('input,select,textarea,details'))return;x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
  d.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;if(Math.abs(dx)>70&&Math.abs(dx)>2*Math.abs(dy)&&matchMedia('(max-width:760px)').matches)show(dx<0?1:0)},{passive:true})})();

// ---------- offer letter reader ----------
function applyLetter(text){const r=parseLetter(text);
  if(!r.ok){$('rd-err').textContent=t(text.trim().length<20?'e_empty':'e_nobasic');return}
  const o=S[target];o.mode='letter';o.comp=r.comp;o.flags=r.flags;o.lpa=Math.round(r.comp.ctc/10000)/10;$('reader').hidden=true;paint();$('o'+target+'-sheet').scrollIntoView({block:'start',behavior:'smooth'})}
async function pdfText(file){
  if(!window.pdfjsLib)await new Promise((ok,no)=>{const s=document.createElement('script');s.src='vendor/pdf.min.js';s.onload=ok;s.onerror=()=>no(new Error('load'));document.head.appendChild(s)});
  pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
  const doc=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let out='';
  for(let n=1;n<=Math.min(doc.numPages,30);n++){const tc=await (await doc.getPage(n)).getTextContent(),lines={};
    for(const it of tc.items){if(!it.str.trim())continue;const y=Math.round(it.transform[5]/3);(lines[y]=lines[y]||[]).push([it.transform[4],it.str])}
    out+=Object.keys(lines).sort((a,b)=>b-a).map(y=>lines[y].sort((a,b)=>a[0]-b[0]).map(x=>x[1]).join('  ')).join('\n')+'\n'}
  return out}
let ocrWorker=null;
async function ocrText(file){const abs=p=>new URL(p,location.href).href;
  if(!ocrWorker){$('rd-err').textContent=t('ocrload');
    if(!window.Tesseract)await new Promise((ok,no)=>{const s=document.createElement('script');s.src='vendor/ocr/tesseract.min.js';s.onload=ok;s.onerror=()=>no(new Error('load'));document.head.appendChild(s)});
    const lang=new Uint8Array(await (await fetch('vendor/ocr/eng-traineddata.wasm')).arrayBuffer());
    ocrWorker=await Tesseract.createWorker([{code:'eng',data:lang}],1,{workerPath:abs('vendor/ocr/worker.min.js'),corePath:abs('vendor/ocr/'),workerBlobURL:false,cacheMethod:'none',
      logger:m=>{if(m.status==='recognizing text')$('rd-err').textContent=t('ocr',{p:Math.round(100*m.progress)})}})}
  const {data}=await ocrWorker.recognize(file);return cleanOcr(data.text)}
$('rd-file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;$('rd-err').textContent=t('reading');
  const isImg=/^image\//.test(f.type)||/\.(png|jpe?g|webp|heic)$/i.test(f.name);
  if(isImg){try{const x=await ocrText(f);$('rd-text').value=x;const r=parseLetter(x);if(!r.ok){$('rd-err').textContent=t('e_ocr');e.target.value='';return}$('rd-err').textContent='';applyLetter(x)}catch(err){$('rd-err').textContent=t('e_ocr')}e.target.value='';return}
  try{const x=/pdf$/i.test(f.name)||f.type==='application/pdf'?await pdfText(f):await f.text();
    if(x.replace(/\s/g,'').length<40){$('rd-err').textContent=t('e_scan');return}
    $('rd-text').value=x;$('rd-err').textContent='';applyLetter(x)}
  catch(err){$('rd-err').textContent=t('e_file')}e.target.value=''});
$('rd-go').onclick=()=>applyLetter($('rd-text').value);
$('rd-sample').onclick=()=>{$('rd-text').value=SAMPLE;applyLetter(SAMPLE)};
$('rd-x').onclick=()=>{$('reader').hidden=true};$('sh-x').onclick=()=>{$('share').hidden=true};
addEventListener('keydown',e=>{if(e.key==='Escape'){$('reader').hidden=true;$('share').hidden=true}});
document.querySelectorAll('.veil').forEach(v=>v.addEventListener('pointerdown',e=>{if(e.target===v)v.hidden=true}));

// ---------- share card ----------
function site(){const h=location.hostname;return location.protocol==='https:'&&h&&!/claude|localhost|127\.0\.0\.1|usercontent/.test(h)?h.replace(/^www\./,''):''}
async function card(i,f){if(f)fmt=f;const o=S[i],r=R[i],wide=fmt==='169',W=wide?1600:1080,H=wide?900:1350,cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');target=i;
  const TY=lang==='hi'?'"Noto Sans Devanagari"':lang==='kn'?'"Noto Sans Kannada"':'"Courier Prime"',UI=lang==='en'?'"Instrument Sans"':TY,NUM='"Courier Prime"';
  try{await Promise.all([[`700 40px ${TY}`,t('c1')],[`400 40px ${TY}`,t('c1')],[`500 40px ${UI}`,t('c_bank')],[`600 40px ${UI}`,t('c_month')],[`700 40px ${NUM}`,'₹0'],['700 40px Kalam','₹0']].map(x=>document.fonts.load(x[0],x[1])))}catch(e){}
  const fit=(txt,font,size,max)=>{do{c.font=font.replace('$',size)}while(c.measureText(txt).width>max&&(size-=2)>14);return txt};
  const mb=monthBoxes(r),cells=[];mb.boxes.forEach(b=>{for(let k=0;k<b.n;k++)cells.push(TINT[b.label])});
  const boxes=(x,y,s,g)=>cells.forEach((col,k)=>{const bx=x+(k%15)*(s+g),by=y+Math.floor(k/15)*(s+g);
    if(r.left<0&&k>=mb.funded){c.strokeStyle='#d42a3c';c.lineWidth=Math.max(3,s/12);c.strokeRect(bx+2,by+2,s-4,s-4);c.beginPath();c.moveTo(bx+6,by+s-6);c.lineTo(bx+s-6,by+6);c.stroke()}else{c.fillStyle=col;c.fillRect(bx,by,s,s)}});
  const strike=(x,y,size)=>{c.font=`700 ${size}px ${NUM}`;c.fillStyle='#6b7588';const s0=inr(r.ctc);c.fillText(s0,x,y);const tw=c.measureText(s0).width;
    c.strokeStyle='#d42a3c';c.lineWidth=size/9.5;c.lineCap='round';c.beginPath();c.moveTo(x-size*.2,y-size*.19);c.lineTo(x+tw+size*.2,y-size*.55);c.stroke()};
  const foot=(x,y,max)=>{c.fillStyle='#6b7588';const w=site();c.fillText(fit(w?w+'  ·  '+t('c_foot').split('·').pop().trim():t('c_foot'),`700 $px ${w?NUM:TY}`,26,max),x,y)};
  c.fillStyle='#16202c';c.fillRect(0,0,W,H);c.save();c.translate(W/2,H/2);c.rotate(wide?-.008:-.012);c.translate(-W/2,-H/2);
  c.shadowColor='rgba(0,0,0,.45)';c.shadowBlur=50;c.shadowOffsetY=20;c.fillStyle='#fbfbf7';c.fillRect(wide?60:70,wide?55:70,W-(wide?120:140),H-(wide?110:140));c.shadowColor='transparent';
  if(!wide){const x=130,M=W-260;
    c.fillStyle='#1a2333';c.fillText(fit(o.name.toUpperCase(),`700 $px ${TY}`,34,M),x,160);c.fillRect(x,180,M,4);
    c.fillText(fit(t('c1'),`400 $px ${TY}`,34,M),x,260);c.fillText(fit(t('c2'),`400 $px ${TY}`,34,M),x,308);
    strike(x,430,96);c.fillStyle='#6b7588';c.fillText(fit(t('onpaper',{x:inr(r.ctc/12)}),`400 $px ${UI}`,30,M),x,482);
    c.fillStyle='#d42a3c';c.save();c.translate(x,625);c.rotate(-.035);c.font='700 150px Kalam';c.fillText(inr(r.inHand),0,0);c.fillText(fit(t('c_bank'),`500 $px ${UI}`,40,M-20),6,66);c.restore();
    c.fillStyle='#6b7588';c.fillText(fit(t('c_month')+'  ·  '+o.city.toUpperCase(),`600 $px ${UI}`,26,M),x,800);
    boxes(x,825,48,7);
    mb.boxes.forEach((b,k)=>{const kx=x+(k%2)*420,yy=985+Math.floor(k/2)*42;c.fillStyle=TINT[b.label];c.fillRect(kx,yy-22,24,24);c.fillStyle='#1a2333';c.fillText(fit(t('cat')[b.label]+'  '+inr(b.amount),`400 $px ${UI}`,28,370),kx+38,yy)});
    c.fillStyle='#1a2333';c.fillRect(x,1125,M,4);c.fillStyle='#6b7588';c.fillText(fit(lang==='en'?t('left30').toUpperCase():t('left30'),`600 $px ${UI}`,26,380),x,1180);
    c.font='700 92px Kalam';c.fillStyle=r.left<0?'#d42a3c':'#1a8a5c';c.textAlign='right';c.fillText(inr(r.left),W-130,1205);c.textAlign='left';foot(x,1252,M)}
  else{const x=120,L=700,rx=880,RW=600;
    c.fillStyle='#1a2333';c.fillText(fit(o.name.toUpperCase(),`700 $px ${TY}`,32,L),x,150);c.fillRect(x,168,W-240,4);
    c.fillText(fit(t('c1')+' '+t('c2'),`400 $px ${TY}`,26,L),x,230);
    strike(x,340,84);c.fillStyle='#6b7588';c.fillText(fit(t('onpaper',{x:inr(r.ctc/12)}),`400 $px ${UI}`,28,L),x,388);
    c.fillStyle='#d42a3c';c.save();c.translate(x,540);c.rotate(-.03);c.font='700 136px Kalam';c.fillText(inr(r.inHand),0,0);c.fillText(fit(t('c_bank'),`500 $px ${UI}`,36,L-20),6,60);c.restore();
    c.fillStyle='#6b7588';c.fillText(fit(t('c_month')+'  ·  '+o.city.toUpperCase(),`600 $px ${UI}`,22,RW),rx,240);
    boxes(rx,262,34,6);
    mb.boxes.forEach((b,k)=>{const kx=rx+(k%2)*300,yy=380+Math.floor(k/2)*36;c.fillStyle=TINT[b.label];c.fillRect(kx,yy-18,20,20);c.fillStyle='#1a2333';c.fillText(fit(t('cat')[b.label]+'  '+inr(b.amount),`400 $px ${UI}`,22,270),kx+30,yy)});
    c.fillStyle='#1a2333';c.fillRect(rx,560,RW,3);c.fillStyle='#6b7588';c.fillText(fit(lang==='en'?t('left30').toUpperCase():t('left30'),`600 $px ${UI}`,22,300),rx,606);
    c.font='700 84px Kalam';c.fillStyle=r.left<0?'#d42a3c':'#1a8a5c';c.textAlign='right';c.fillText(inr(r.left),rx+RW,630);c.textAlign='left';
    if(r.left<0){c.fillStyle='#d42a3c';c.fillText(fit(t('runout',{d:r.runOutDay}),`500 $px ${UI}`,24,RW),rx,680)}
    foot(x,790,W-240)}
  c.restore();
  shareText=t('s_text',{name:o.name,ctc:inr(r.ctc),inh:inr(r.inHand),city:o.city,left:inr(r.left)})+(site()?' '+location.href.split('#')[0]:'');
  $('sh-img').src=cv.toDataURL('image/png');document.querySelectorAll('.fmt button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.f===fmt));$('share').hidden=false}
document.querySelectorAll('.fmt button').forEach(b=>b.onclick=()=>card(target,b.dataset.f));
$('sh-copy').onclick=async()=>{const b=$('sh-copy');try{await navigator.clipboard.writeText(shareText);b.textContent=t('copied')}catch(e){b.textContent=t('blocked')}setTimeout(()=>b.textContent=t('sh_c'),1600)};

function start(data){let saved=data&&data.S?data:null;if(!saved)try{saved=JSON.parse(localStorage.getItem('ctc-reality-v3'))}catch(e){}
  S=((saved&&Array.isArray(saved.S)&&saved.S.length===2)?saved.S:DEF).map((o,i)=>({...DEF[i],...o}));if(saved&&T[saved.lang])lang=saved.lang;
  S.forEach(o=>{if(o.mode==='letter'&&!o.comp)o.mode='quick';if(!CITIES[o.city])o.city=DEF[0].city;o.flags=(o.flags||[]).filter(f=>f&&f.code)});render()}
const hot=window.claude&&window.claude.hot;if(hot&&hot.snapshot)hot.snapshot(()=>({S,lang}));
if(hot&&hot.ready)hot.ready(start);else start(hot&&hot.data||{});
window.__ctc={get S(){return S},get R(){return R},get lang(){return lang}};
})();

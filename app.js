(function(){
const STATUSES=['Pass','Fail','Blocked','Not Run','N/A'];
const COLORS={'Pass':'--pass','Fail':'--fail','Blocked':'--blocked','Not Run':'--notrun','N/A':'--na'};
const SEVERITIES=['','Critical','Major','Minor','Trivial'];
const KEY='uat-overrides-'+window.APP_NAME;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const col=s=>`var(${COLORS[s]})`;

let base=window.TEST_CASES;
let ov={};try{ov=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(ov))}catch(e){}};
const data=()=>base.map(t=>({...t,...(ov[t.id]||{})}));
const open=new Set();

function counts(list,keyFn){
  const m={};
  list.forEach(t=>{const k=keyFn(t);(m[k]=m[k]||{total:0,Pass:0,Fail:0,Blocked:0,'Not Run':0,'N/A':0}).total++;m[k][t.status]++;});
  return m;
}
const pct=(n,d)=>d?Math.round(n/d*100):0;
const barHtml=(c,total)=>STATUSES.map(s=>c[s]?`<span title="${s}: ${c[s]}" style="width:${c[s]/total*100}%;background:${col(s)}"></span>`:'').join('');

function renderSummary(list){
  const total=list.length,c=counts(list,()=>'all').all||{total:0,Pass:0,Fail:0,Blocked:0,'Not Run':0,'N/A':0};
  const executed=total-c['Not Run']-c['N/A'];
  const bugs=list.filter(t=>t.defect||t.status==='Fail');
  const items=[
    ['Total Test Case',total,'',null],
    ['Pass',c.Pass,pct(c.Pass,total)+'%','Pass'],
    ['Fail',c.Fail,pct(c.Fail,total)+'%','Fail'],
    ['Blocked',c.Blocked,pct(c.Blocked,total)+'%','Blocked'],
    ['Not Run',c['Not Run'],pct(c['Not Run'],total)+'%','Not Run'],
    ['N/A',c['N/A'],pct(c['N/A'],total)+'%','N/A'],
    ['Bug / Defect',bugs.length,'dari test Fail / Defect ID',null],
    ['Pass Rate',pct(c.Pass,executed)+'%',executed+' test dieksekusi',null]
  ];
  $('kpis').innerHTML=items.map(([l,v,p,s])=>`<div class="card kpi"><div class="label">${s?`<span class="dot" style="background:${col(s)}"></span>`:l==='Bug / Defect'?'<span class="dot" style="background:var(--bug)"></span>':''}${l}</div><div class="val">${v}</div><div class="pct">${p||'&nbsp;'}</div></div>`).join('');
  $('mainBar').innerHTML=barHtml(c,total||1);
  $('progressText').textContent=`· ${pct(executed,total)}% selesai dieksekusi (${executed}/${total})`;
  $('legend').innerHTML=STATUSES.map(s=>`<span><i style="background:${col(s)}"></i>${s} ${c[s]}</span>`).join('');
  // donut
  let acc=0;const stops=STATUSES.filter(s=>c[s]).map(s=>{const a=acc,b=acc+c[s]/total*100;acc=b;return `${col(s)} ${a}% ${b}%`});
  $('donut').style.background=stops.length?`conic-gradient(${stops.join(',')})`:'var(--notrun-bg)';
  $('donutLabel').innerHTML=`<span>${pct(c.Pass,total)}%<small>Pass</small></span>`;
  $('donutLegend').innerHTML=STATUSES.map(s=>`<span><i style="background:${col(s)}"></i>${s}: <b>${c[s]}</b></span>`).join('');
  // bugs
  $('bugs').innerHTML=bugs.length?bugs.map(t=>`<div class="bug"><div><b>${esc(t.defect||'(belum ada Defect ID)')}</b> · ${esc(t.id)}<div class="sub">${esc(t.scenario)}</div></div><div style="text-align:right"><span class="badge s-${t.status.replace(/\W/g,"")}">${t.status}</span><div class="sub">${esc(t.severity||'severity –')}</div></div></div>`).join(''):'<div class="empty">Belum ada bug tercatat 🎉</div>';
  breakdown('byModule',counts(list,t=>t.module));
  const order=['Critical','High','Medium','Low'];
  breakdown('byPriority',counts(list,t=>t.priority),order);
}
function breakdown(id,m,order){
  const keys=order?order.filter(k=>m[k]):Object.keys(m);
  $(id).innerHTML=keys.map(k=>{const c=m[k];return `<div class="row"><div class="top"><span>${esc(k)}</span><span>${c.Pass} pass · ${c.Fail} fail · ${c.Blocked} blocked · ${c['Not Run']} not run / ${c.total}</span></div><div class="bar">${barHtml(c,c.total)}</div></div>`}).join('');
}

function fill(sel,label,vals){sel.innerHTML=`<option value="">${label}</option>`+vals.map(v=>`<option>${esc(v)}</option>`).join('')}
function initFilters(){
  const l=data();
  fill($('fModule'),'Semua module',[...new Set(l.map(t=>t.module))]);
  fill($('fStatus'),'Semua status',STATUSES);
  fill($('fPriority'),'Semua prioritas',['Critical','High','Medium','Low']);
}

function renderTable(list){
  const q=$('q').value.toLowerCase(),m=$('fModule').value,s=$('fStatus').value,p=$('fPriority').value;
  const f=list.filter(t=>(!m||t.module===m)&&(!s||t.status===s)&&(!p||t.priority===p)&&(!q||[t.id,t.feature,t.scenario,t.module].join(' ').toLowerCase().includes(q)));
  $('rows').innerHTML=f.length?f.map(t=>{
    let h=`<tr class="tc" data-id="${t.id}"><td class="id">${esc(t.id)}</td><td>${esc(t.module)}</td><td>${esc(t.feature)}</td><td>${esc(t.scenario)}</td><td>${esc(t.type)}</td><td class="p-${t.priority}">${esc(t.priority)}</td><td><span class="badge s-${t.status.replace(/\W/g,"")}">${t.status}</span></td></tr>`;
    if(open.has(t.id)) h+=`<tr class="detail"><td colspan="7"><div class="dgrid">
      <div><h4>Requirement</h4><p>${esc(t.req)}</p></div>
      <div><h4>Precondition</h4><p>${esc(t.pre)}</p></div>
      <div><h4>Test Data</h4><p>${esc(t.data)}</p></div>
      <div><h4>Langkah</h4><ol>${t.steps.map(x=>`<li>${esc(x.replace(/^\d+\.\s*/,''))}</li>`).join('')}</ol></div>
      <div><h4>Expected Result</h4><p>${esc(t.expected)}</p></div></div>
      <div class="edit" data-id="${t.id}">
        <label>Status<select data-f="status">${STATUSES.map(x=>`<option ${x===t.status?'selected':''}>${x}</option>`).join('')}</select></label>
        <label>Severity<select data-f="severity">${SEVERITIES.map(x=>`<option ${x===t.severity?'selected':''}>${x}</option>`).join('')}</select></label>
        <label>Defect ID<input data-f="defect" value="${esc(t.defect)}" placeholder="BUG-001"></label>
        <label>Tester<input data-f="tester" value="${esc(t.tester)}"></label>
        <label>Tanggal<input type="date" data-f="date" value="${esc(t.date)}"></label>
        <label style="flex:1;min-width:220px">Actual Result<input data-f="actual" value="${esc(t.actual)}"></label>
      </div></td></tr>`;
    return h}).join(''):'<tr><td colspan="7" class="empty">Tidak ada test case yang cocok.</td></tr>';
}

function render(){const l=data();renderSummary(l);renderTable(l);
  $('updated').textContent=`${l.length} test case · ditampilkan ${new Date().toLocaleDateString('id-ID',{dateStyle:'long'})}`;}

$('appName').textContent=window.APP_NAME;
initFilters();render();
['q','fModule','fStatus','fPriority'].forEach(id=>$(id).addEventListener('input',()=>renderTable(data())));

$('rows').addEventListener('click',e=>{
  if(e.target.closest('.edit'))return;
  const tr=e.target.closest('tr.tc');if(!tr)return;
  const id=tr.dataset.id;open.has(id)?open.delete(id):open.add(id);renderTable(data());
});
$('rows').addEventListener('change',e=>{
  const f=e.target.dataset.f,box=e.target.closest('.edit');if(!f||!box)return;
  const id=box.dataset.id;ov[id]=ov[id]||{};ov[id][f]=e.target.value;
  if(f==='status'&&e.target.value!=='Not Run'&&!ov[id].date&&!(base.find(t=>t.id===id).date))ov[id].date=new Date().toISOString().slice(0,10);
  save();render();
});

function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
$('exportCsv').onclick=()=>{
  const h=['id','module','feature','scenario','type','priority','status','severity','defect','tester','date','actual'];
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  download('uat-results.csv',[h.join(',')].concat(data().map(t=>h.map(k=>q(t[k])).join(','))).join('\n'),'text/csv');
};
$('exportJson').onclick=()=>download('data.js','window.APP_NAME='+JSON.stringify(window.APP_NAME)+';\nwindow.TEST_CASES = '+JSON.stringify(data(),null,1)+';\n','text/javascript');
$('reset').onclick=()=>{if(confirm('Hapus semua perubahan lokal?')){ov={};save();render()}};
$('theme').onclick=()=>{const r=document.documentElement,dark=getComputedStyle(r).getPropertyValue('--bg').trim()==='#12151c';r.dataset.theme=dark?'light':'dark'};
})();

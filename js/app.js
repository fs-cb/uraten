  const artists = {
    a1:{n:"あおい かな",h:"@aoi_kana_art",on:true,g:"g1",bio:"天神を拠点に、ネオン街と猫をよく描いています。\nアイコン・配信素材・ジャケットなどお気軽に。\n作業中はいつもURATEN流してます。"},
    a2:{n:"みなと れい",h:"@minato_rei",on:true,g:"g2",bio:"ポップで明るい色が得意。\nVTuberの立ち絵・ロゴまわりよくやってます。"},
    a3:{n:"しおり",h:"@shiori_draws",on:false,g:"g3",bio:"水彩風の柔らかいタッチ。\n今は受付を止めていますが、再開したらここに出します。"},
    a4:{n:"クロ",h:"@kuro_ill",on:true,g:"g4",bio:"モノクロ・線画中心。\nCDジャケットやフライヤーのご相談どうぞ。"},
    a5:{n:"ゆの",h:"@yuno_art",on:true,g:"g5",bio:"ゆるいキャラ絵描いてます。\nスタンプ・グッズ向けの絵も。"},
    a6:{n:"はる",h:"@haru_paint",on:false,g:"g6",bio:"背景・風景がメイン。\n受付停止中です。"},
    a7:{n:"ねむ",h:"@nemu_doodle",on:true,g:"g7",bio:"落書きみたいな勢い重視の絵。\n配信のサムネとかよく描きます。"},
    a8:{n:"そら",h:"@sora_canvas",on:true,g:"g8",bio:"アナログ油彩を取り込んで加工してます。\n一点物の雰囲気が出せます。"},
    a9:{n:"いと",h:"@ito_e",on:true,g:"g9",bio:"和風モチーフが得意。\n御朱印帳みたいな細かい絵も描きます。"},
    a10:{n:"ましろ",h:"@mashiro_d",on:true,g:"g10",bio:"パステル系の女の子イラスト。\nグッズ・名刺デザインなど。"},
    a11:{n:"げん",h:"@gen_works",on:false,g:"g11",bio:"メカ・ロボット系。\n今は本業が忙しく受付停止。"},
    a12:{n:"こはく",h:"@kohaku_art",on:true,g:"g12",bio:"あたたかい色のイラスト。\n絵本のような世界観が好きです。"},
  };
  const keys = Object.keys(artists);

  // ===== ページ切替 =====
  function showTop(){document.getElementById('topPage').classList.add('active');document.getElementById('galleryPage').classList.remove('active');window.scrollTo(0,0)}
  function showGallery(){document.getElementById('galleryPage').classList.add('active');document.getElementById('topPage').classList.remove('active');window.scrollTo(0,0)}
  function scrollTo2(id){showTop();setTimeout(()=>document.getElementById(id).scrollIntoView({behavior:'smooth'}),50)}

  // ===== 一覧グリッド生成 =====
  const grid = document.getElementById('galleryGrid');
  keys.forEach(k=>{
    const a=artists[k];
    const el=document.createElement('div');
    el.className='card';el.onclick=()=>openModal(k);
    el.innerHTML=`<div class="card-art ${a.g}"><span class="recv ${a.on?'on':'off'}">${a.on?'受付中':'受付停止'}</span><span class="mini">ART</span></div><div class="card-foot"><b>${a.n}</b><span>${a.h}</span></div>`;
    grid.appendChild(el);
  });

  // ===== 巡回スライドショー（順送り・全員一巡） =====
  const showOrder = [...keys]; // 登録順で全員を巡回
  let showIdx = 0;
  const dotsEl = document.getElementById('dots');
  showOrder.slice(0,8).forEach((_,i)=>{const d=document.createElement('i');dotsEl.appendChild(d)});
  function renderShow(){
    const a=artists[showOrder[showIdx]];
    const art=document.getElementById('showArt');
    art.className='show-art '+a.g;
    art.innerHTML=`<div class="show-frame"></div><div class="ph-note">ILLUSTRATION</div><div class="dots" id="dots"></div>`;
    const dd=art.querySelector('#dots');
    showOrder.slice(0,8).forEach((_,i)=>{const d=document.createElement('i');if(i===showIdx%8)d.className='on';dd.appendChild(d)});
    document.getElementById('showName').textContent=a.n;
    document.getElementById('showHandle').textContent=a.h;
    document.getElementById('showBio').textContent=a.bio.replace(/\n/g,' ');
    const st=document.getElementById('showStatus');
    st.innerHTML=`<i></i>${a.on?'依頼受付中':'依頼受付停止中'}`;
    st.style.color=a.on?'var(--lime)':'var(--dim)';
    st.style.borderColor=a.on?'rgba(200,255,61,.4)':'var(--line)';
    st.querySelector('i').style.background=a.on?'var(--lime)':'#9a98c4';
  }
  setInterval(()=>{showIdx=(showIdx+1)%showOrder.length;renderShow()},3500);
  renderShow();

  // ===== モーダル =====
  const modal=document.getElementById('modal');
  function openModal(key){
    const a=artists[key];if(!a)return;
    document.getElementById('mName').textContent=a.n;
    document.getElementById('mHandle').textContent=a.h;
    document.getElementById('mBio').textContent=a.bio;
    document.getElementById('mArt').className='modal-art '+a.g;
    const st=document.getElementById('mStatus');
    st.innerHTML=`<i></i>${a.on?'依頼受付中':'依頼受付停止中'}`;
    st.style.color=a.on?'var(--lime)':'var(--dim)';
    st.style.borderColor=a.on?'rgba(200,255,61,.4)':'var(--line)';
    st.querySelector('i').style.background=a.on?'var(--lime)':'#9a98c4';
    modal.classList.add('open');
  }
  function closeModal(){modal.classList.remove('open')}

  // ===== スケジュール =====
  const sched=[
    ["20:00","夕方のゆるトーク",""],["21:00","天神シンガーズ",""],
    ["22:00","深夜のうたい場","ON AIR"],["23:00","天神トラックメイカー集会","NEXT"],
    ["23:30","深夜の作業用BGM",""],["24:00","ナイトラジオ URATEN",""],
  ];
  const sl=document.getElementById('schedList');
  sched.forEach(s=>{
    const live=s[2]==='ON AIR';const nx=s[2]==='NEXT';
    const row=document.createElement('div');
    row.style.cssText="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px dashed rgba(255,255,255,.08);font-size:13px";
    row.innerHTML=`<b style="color:${live?'var(--pink)':'var(--cyan)'};font-variant-numeric:tabular-nums;min-width:48px">${s[0]}</b>
      <span style="flex:1;color:${live?'var(--ink)':'var(--dim)'}">${s[1]}</span>
      ${s[2]?`<span style="font-size:10px;font-weight:800;color:${live?'var(--pink)':'var(--violet)'}">${s[2]}</span>`:''}`;
    sl.appendChild(row);
  });
  function openSched(){document.getElementById('schedModal').classList.add('open')}
  function closeSched(){document.getElementById('schedModal').classList.remove('open')}

  // ===== イベントカレンダー（data/events.json から描画） =====
  // Sheets→JSON変換スクリプトが吐く公開JSONを読む。ここがパイプラインの終端。
  (async function renderCal(){
    const box=document.getElementById('calList');
    const MONTHS=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const WDAYS=["日","月","火","水","木","金","土"];
    try{
      const res=await fetch('./data/events.json',{cache:'no-store'});
      if(!res.ok)throw new Error('HTTP '+res.status);
      const data=await res.json();
      const today=new Date();today.setHours(0,0,0,0);
      const events=(data.events||[])
        .filter(e=>{const d=new Date(e.date+'T00:00:00');return !isNaN(d)&&d>=today;})
        .sort((a,b)=>a.date.localeCompare(b.date)||String(a.time||'').localeCompare(String(b.time||'')));
      if(events.length===0){
        box.innerHTML='<div class="cal-empty" style="padding:20px;font-size:13px;color:var(--dim)">現在掲載中のイベントはありません</div>';
        return;
      }
      box.innerHTML='';
      events.forEach(e=>{
        const d=new Date(e.date+'T00:00:00');
        const row=document.createElement(e.url?'a':'div');
        row.className='cal-row';
        if(e.url){row.href=e.url;row.target='_blank';row.rel='noopener';row.style.textDecoration='none';row.style.color='inherit';}
        const place=[e.venue,e.area].filter(Boolean).join(' / ');
        row.innerHTML=`<div class="cal-date"><b>${String(d.getDate()).padStart(2,'0')}</b><span>${MONTHS[d.getMonth()]} ${WDAYS[d.getDay()]}</span></div>`
          +`<div class="cal-info"><b></b><span></span></div>`
          +`<div class="cal-time">${e.time||''}</div>`;
        row.querySelector('.cal-info b').textContent=e.name||'';
        row.querySelector('.cal-info span').textContent=place;
        box.appendChild(row);
      });
    }catch(err){
      box.innerHTML='<div class="cal-empty" style="padding:20px;font-size:13px;color:var(--dim)">イベント情報を読み込めませんでした。時間をおいて再度お試しください。</div>';
      console.error('events.json load failed:',err);
    }
  })();

  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeSched();closeMenu()}});


// ===== ハンバーガーメニュー =====
function closeMenu(){
  const nav=document.getElementById('globalNav');
  const btn=document.querySelector('.menu-toggle');
  if(nav) nav.classList.remove('open');
  if(btn){
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
  }
}
function toggleMenu(){
  const nav=document.getElementById('globalNav');
  const btn=document.querySelector('.menu-toggle');
  if(!nav||!btn)return;
  const open=nav.classList.toggle('open');
  btn.classList.toggle('open',open);
  btn.setAttribute('aria-expanded',open?'true':'false');
}
document.addEventListener('click',e=>{
  const nav=document.getElementById('globalNav');
  const btn=document.querySelector('.menu-toggle');
  if(!nav||!btn)return;
  if(nav.contains(e.target)||btn.contains(e.target))return;
  closeMenu();
});
document.querySelectorAll('#globalNav a').forEach(a=>a.addEventListener('click',closeMenu));


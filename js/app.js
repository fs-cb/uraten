  const artists = {
    a1:{n:"あおい かな",h:"@aoi_kana_art",g:"g1",img:"./images/sample-01.webp",bio:"天神を拠点に、ネオン街と猫をよく描いています。\nアイコン・配信素材・ジャケットなどお気軽に。\n作業中はいつもURATEN流してます。"},
    a2:{n:"みなと れい",h:"@minato_rei",g:"g2",img:"./images/sample-02.webp",bio:"女の子をイラストを描いています。\nVTuberの立ち絵・ロゴまわりよくやってます。"},
    a3:{n:"しおり",h:"@shiori_draws",g:"g3",img:"./images/sample-03.webp",bio:"ダークなイラストがメインです。\n漫画も大好きです。"},
    a4:{n:"クロ",h:"@kuro_ill",g:"g4",img:"./images/sample-04.webp",bio:"色々描いてます。最近は和服が好きです。\nCDジャケットやフライヤーのご相談どうぞ。"},
    a5:{n:"ゆの",h:"@yuno_art",g:"g5",img:"./images/sample-05.webp",bio:"メカ・ロボット系。\nスタンプ・グッズ向けの絵も。"},
    a6:{n:"はる",h:"@haru_paint",g:"g6",img:"./images/sample-06.webp",bio:"ファンタジーとかゲームとか。\nトレカのイラストもやってます。"},
    a7:{n:"ねむ",h:"@nemu_doodle",g:"g7",img:"./images/sample-07.webp",bio:"ポップで落書きみたいな勢い重視の絵。\n配信のサムネとかよく描きます。"},
    a8:{n:"そら",h:"@sora_canvas",g:"g8",img:"./images/sample-08.webp",bio:"水彩画風にハマってます。\n是非ギャラリーも見てください。"},
  };
  const keys = Object.keys(artists);

  // ===== 作品画像の敷き込み =====
  // img があれば実画像を敷く。無い／読み込めない絵師は従来のダミー塗り（.g1〜）のまま。
  // パスは src プロパティ経由で入れる（innerHTML へ展開しない）。
  function paintArt(el, a, lazy){
    if(!el) return;
    el.querySelectorAll('.art-img').forEach(n=>n.remove());
    el.classList.remove('has-img');
    if(!a || !a.img) return;
    const img=document.createElement('img');
    img.className='art-img';
    img.alt='';
    if(lazy) img.loading="lazy";   // 一覧のカードのみ遅延。大枠・モーダルは即読み込み（切替時の空白を避ける）
    img.decoding='async';
    img.addEventListener('error',()=>{img.remove();el.classList.remove('has-img')});
    img.src=a.img;
    el.prepend(img);
    el.classList.add('has-img');
  }

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
    el.innerHTML=`<div class="card-art ${a.g}"><span class="mini">ART</span></div><div class="card-foot"><b>${a.n}</b><span>${a.h}</span></div>`;
    paintArt(el.querySelector(".card-art"), a, true);
    grid.appendChild(el);
  });

  // ===== 巡回スライドショー（順送り・全員一巡） =====
  // 4秒ごとに innerHTML でサブツリーを作り直すと、切替のたびにスタイル再計算・
  // レイアウト・画像デコードがメインスレッドで走り、旧端末ではスクロール中の
  // カクつきになる。そこで
  //   (1) 中身は初回に1回だけ組み立てて使い回す（以降 innerHTML を使わない）
  //   (2) 画像は A/B の2枚を重ねて常設し、次の画像は表示中の4秒間に先読み＋
  //       decode() まで済ませておく。切替時は class の付け替えだけにする
  //   (3) 見えていない間（画面外・裏タブ・ギャラリーページ表示中）は止める
  // 見た目は従来どおり。フェードは付けない（瞬間切替のまま）。
  const showOrder = [...keys];   // 登録順で全員を巡回
  const SHOW_DOT_MAX = 8;        // ドットの表示上限（従来どおり）
  const SHOW_MS = 4000;
  let showIdx = 0;

  const showArtEl  = document.getElementById('showArt');
  const showNameEl = document.getElementById('showName');
  const showHandEl = document.getElementById('showHandle');
  const showBioEl  = document.getElementById('showBio');

  // --- 中身の組み立て（初回のみ） ---
  showArtEl.textContent = '';
  // 画像は2枚（A/B）を重ねて置き、表示側にだけ .on を付ける。
  const showImgs = [0,1].map(()=>{
    const img = document.createElement('img');
    img.className = 'art-img';
    img.alt = '';
    img.decoding = 'async';
    showArtEl.appendChild(img);
    return img;
  });
  // 画像より後ろに追加することで、従来（画像を prepend）と同じ重なり順を保つ。
  const showFrameEl = document.createElement('div');
  showFrameEl.className = 'show-frame';
  showArtEl.appendChild(showFrameEl);
  const showNoteEl = document.createElement('div');
  showNoteEl.className = 'ph-note';
  showNoteEl.textContent = 'ILLUSTRATION';
  showArtEl.appendChild(showNoteEl);
  const showDotsBox = document.createElement('div');
  showDotsBox.className = 'dots';
  showDotsBox.id = 'dots';
  showArtEl.appendChild(showDotsBox);
  const showDotEls = showOrder.slice(0,SHOW_DOT_MAX).map(()=>{
    const d = document.createElement('i');
    showDotsBox.appendChild(d);
    return d;
  });
  // 初回に ILLUSTRATION 枠が一瞬見えないよう先に付けておく
  // （従来も paintArt が src セット直後に has-img を付けていた）。
  if(artists[showOrder[0]] && artists[showOrder[0]].img) showArtEl.classList.add('has-img');

  let showLive = 0;              // いま表示している showImgs のインデックス
  let showBusy = false;          // 切替の多重発火よけ
  const showFailed = new Set();  // 読み込みに失敗した絵師キー

  // 待機側スロットに画像を読み込み、デコードまで終わらせる。
  // 戻り値: 表示できるなら true ／ 画像なし・失敗なら false（従来のダミー塗りに戻す）
  async function showPreload(slot, key){
    const a = artists[key];
    const img = showImgs[slot];
    if(!a || !a.img || showFailed.has(key)) return false;
    if(img.dataset.key === key && img.dataset.ready === '1') return true;
    img.dataset.key = key;
    img.dataset.ready = '';
    img.src = a.img;
    try{
      // 表示する「前に」オフスレッドでデコードを終わらせるのが目的。
      // decode() 未対応のブラウザでは従来どおりブラウザ任せにする。
      if(typeof img.decode === 'function') await img.decode();
      if(img.dataset.key !== key) return false;   // 途中で次の画像に追い越された
      img.dataset.ready = '1';
      return true;
    }catch(e){
      // 追い越しによる中断は失敗として数えない。
      if(img.dataset.key === key) showFailed.add(key);
      return false;
    }
  }

  async function showGoTo(idx){
    if(showBusy) return;
    showBusy = true;
    try{
      const key = showOrder[idx];
      const a   = artists[key];
      const standby = 1 - showLive;

      // 読み込み＋デコードを先に済ませる（この間、表示中の画像はそのまま出ている）
      const ok = await showPreload(standby, key);

      // ここから先は class とテキストの付け替えだけ（デコードを伴わない）
      showIdx = idx;
      showArtEl.className = 'show-art ' + a.g + (ok ? ' has-img' : '');
      showImgs[showLive].classList.remove('on');
      if(ok){
        showImgs[standby].classList.add('on');
        showLive = standby;
      }
      showDotEls.forEach((d,i)=>{ d.className = (i === idx % SHOW_DOT_MAX) ? 'on' : ''; });
      showNameEl.textContent = a.n;
      showHandEl.textContent = a.h;
      showBioEl.textContent  = a.bio.replace(/\n/g,' ');

      // 次の画像を、この4秒の間に先読みしておく（次の切替の作業をゼロにする）
      showPreload(1 - showLive, showOrder[(idx + 1) % showOrder.length]);
    }finally{
      showBusy = false;
    }
  }

  // --- タイマー：見えていない間は止める ---
  let showTimer = null;
  let showOnScreen = true;       // IntersectionObserver 未対応なら常時 true 扱い

  function showShouldRun(){ return showOnScreen && !document.hidden; }
  function showStart(){
    if(showTimer || !showShouldRun()) return;
    showTimer = setInterval(()=>showGoTo((showIdx + 1) % showOrder.length), SHOW_MS);
  }
  function showStop(){
    if(showTimer){ clearInterval(showTimer); showTimer = null; }
  }
  function showUpdateTimer(){
    if(showShouldRun()) showStart(); else showStop();
  }

  if('IntersectionObserver' in window){
    // #topPage が display:none のとき（ギャラリー表示中）も交差しないので止まる。
    new IntersectionObserver(es=>{
      showOnScreen = es[es.length-1].isIntersecting;
      showUpdateTimer();
    },{rootMargin:'120px'}).observe(showArtEl);
  }
  document.addEventListener('visibilitychange', showUpdateTimer);

  showGoTo(0);
  showUpdateTimer();

  // ===== モーダル =====
  const modal=document.getElementById('modal');
  function openModal(key){
    const a=artists[key];if(!a)return;
    document.getElementById('mName').textContent=a.n;
    document.getElementById('mHandle').textContent=a.h;
    document.getElementById('mBio').textContent=a.bio;
    document.getElementById('mArt').className='modal-art '+a.g;
    paintArt(document.getElementById("mArt"), a);
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


// ===== 放送プレイヤー（ストリーム再生 + nowplaying メタ取得） =====
// - 素のJSのみ・ストレージ不使用・外部ライブラリなし
// - 再生はユーザーのタップ起点のみ（オートプレイなし）
// - メタはベストエフォート：取得失敗や内部ファイル名っぽい値は表示しない
(function initRadio(){
  const STREAM_URL = 'https://radio.ura-ten.jp/listen/uraten/radio.mp3';
  const NP_API     = 'https://radio.ura-ten.jp/api/nowplaying/uraten';
  const POLL_MS    = 20000; // 15〜30秒の範囲
  const FALLBACK_TITLE = 'URATEN';

  const audio   = document.getElementById('radioAudio');
  const playBtn = document.getElementById('playBtn');
  const titleEl = document.getElementById('npTitle');
  const artistEl= document.getElementById('npArtist');
  const artEl   = document.getElementById('npArt');
  const vinylEl = document.getElementById('npVinyl');
  if(!audio || !playBtn) return;

  let wantPlaying = false;          // ユーザーの再生意図
  let reconnectTimer = null;
  let backoff = 2000;               // 再接続の待ち時間（指数バックオフ）
  let pollTimer = null;             // メタ取得ポーリングの interval
  let curMeta = {title:FALLBACK_TITLE, artist:'', art:''};

  // --- メタの検証：値が無い / 内部ファイル名っぽい / artist空 は不採用 ---
  const FILE_EXT = /\.(mp3|m4a|aac|ogg|oga|flac|wav|wma|opus|aif|aiff|alac|webm)\b/i;
  const clean = s => (typeof s === 'string' ? s.trim() : '');
  const looksInternal = s => FILE_EXT.test(s);

  // --- 表示反映 ---
  function renderMeta(title, artist, art){
    curMeta = { title: title || FALLBACK_TITLE, artist: artist || '', art: art || '' };
    titleEl.textContent  = curMeta.title;
    artistEl.textContent = curMeta.artist;
    if(art){
      artEl.src = art;
      artEl.hidden = false;
      if(vinylEl) vinylEl.style.display = 'none';
    }else{
      artEl.hidden = true;
      artEl.removeAttribute('src');
      if(vinylEl) vinylEl.style.display = '';
    }
    setMediaMetadata();
  }
  // アート読み込み失敗時は盤面へフォールバック
  if(artEl){
    artEl.addEventListener('error', ()=>{
      artEl.hidden = true;
      artEl.removeAttribute('src');
      if(vinylEl) vinylEl.style.display = '';
    });
  }

  function applyNowPlaying(np){
    let title = '', artist = '', art = '';
    try{
      const song = np && np.now_playing && np.now_playing.song;
      if(song){
        const t = clean(song.title), a = clean(song.artist), ar = clean(song.art);
        const valid = t && a && !looksInternal(t) && !looksInternal(a);
        if(valid){
          title = t;
          artist = a;
          if(/^https?:\/\//i.test(ar)) art = ar;
        }
      }
    }catch(e){ /* 壊れたJSONは黙って空扱い */ }
    renderMeta(title, artist, art);
  }

  async function poll(){
    try{
      const res = await fetch(NP_API, {cache:'no-store'});
      if(!res.ok) return;                 // 404等は黙って据え置き
      applyNowPlaying(await res.json());
    }catch(e){ /* ネットワーク/CORS失敗も黙って空扱い（プレイヤーは動き続ける） */ }
  }
  // ポーリングは「表示中」または「再生中」のときだけ回す。
  // 非表示かつ停止中は無駄な取得を止める。
  function shouldPoll(){ return !document.hidden || wantPlaying; }
  function startPolling(){
    if(pollTimer) return;
    poll();                               // 開始時に即1回
    pollTimer = setInterval(poll, POLL_MS);
  }
  function stopPolling(){
    if(pollTimer){ clearInterval(pollTimer); pollTimer = null; }
  }
  function updatePolling(){
    if(shouldPoll()) startPolling(); else stopPolling();
  }

  // --- Media Session ---
  function setMediaMetadata(){
    if(!('mediaSession' in navigator) || typeof window.MediaMetadata !== 'function') return;
    const art = curMeta.art;
    const artwork = art
      ? [96,128,192,256,384,512].map(s=>({src:art, sizes:s+'x'+s, type:''}))
      : [];
    try{
      navigator.mediaSession.metadata = new MediaMetadata({
        title: curMeta.title || FALLBACK_TITLE,
        artist: curMeta.artist || '',
        album: 'URATEN Radio',
        artwork
      });
    }catch(e){ /* 一部環境では失敗しうる。無視 */ }
  }
  function setPlaybackState(state){
    if('mediaSession' in navigator){
      try{ navigator.mediaSession.playbackState = state; }catch(e){}
    }
  }
  if('mediaSession' in navigator){
    try{
      navigator.mediaSession.setActionHandler('play',  ()=>startPlay());
      navigator.mediaSession.setActionHandler('pause', ()=>stopPlay());
      navigator.mediaSession.setActionHandler('stop',  ()=>stopPlay());
    }catch(e){}
  }

  // --- UI ---
  function updateUI(loading){
    const playing = wantPlaying && !audio.paused;
    playBtn.classList.toggle('playing', playing);
    playBtn.classList.toggle('loading', !!loading && wantPlaying && audio.paused);
    playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    playBtn.setAttribute('aria-label', wantPlaying ? '停止' : '再生');
    setPlaybackState(playing ? 'playing' : 'paused');
  }

  // --- 接続/再接続 ---
  function connect(){
    // ライブ配信の最新エッジを掴むためキャッシュバスターを付けて張り直す
    audio.src = STREAM_URL + (STREAM_URL.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now();
    audio.load();
  }
  function clearReconnect(){
    if(reconnectTimer){ clearTimeout(reconnectTimer); reconnectTimer = null; }
    backoff = 2000;
  }
  function scheduleReconnect(){
    if(!wantPlaying || reconnectTimer) return;
    reconnectTimer = setTimeout(()=>{
      reconnectTimer = null;
      if(!wantPlaying) return;
      connect();
      const p = audio.play();
      if(p && p.catch) p.catch(()=>scheduleReconnect());
      backoff = Math.min(Math.round(backoff * 1.6), 15000);
    }, backoff);
    updateUI(true);
  }

  function startPlay(){
    wantPlaying = true;
    connect();
    const p = audio.play();
    if(p && p.catch) p.catch(()=>{ /* 再生開始失敗（未ジェスチャ等）→ 意図は保持しUIのみ更新 */ updateUI(); });
    updateUI(true);
    poll();          // 再生開始時にメタを即更新
    updatePolling(); // 再生中はポーリングを確実に動かす
  }
  function stopPlay(){
    wantPlaying = false;
    clearReconnect();
    audio.pause();
    audio.removeAttribute('src'); // 停止で回線を解放（裏で鳴り続けない）
    audio.load();
    updateUI();
    updatePolling(); // 停止中かつ非表示ならポーリングを止める
  }
  function toggle(){ wantPlaying ? stopPlay() : startPlay(); }

  playBtn.addEventListener('click', toggle);

  audio.addEventListener('playing', ()=>{ clearReconnect(); updateUI(); });
  audio.addEventListener('pause',   ()=>updateUI());
  audio.addEventListener('waiting', ()=>updateUI(true));
  audio.addEventListener('error',   ()=>{ if(wantPlaying) scheduleReconnect(); });
  audio.addEventListener('ended',   ()=>{ if(wantPlaying) scheduleReconnect(); });
  audio.addEventListener('stalled', ()=>{ if(wantPlaying) scheduleReconnect(); });

  // 表示状態が変わったらポーリングの要否を見直す
  document.addEventListener('visibilitychange', updatePolling);

  // 読み込み時からメタを取得（放送中の曲は再生前でも「取れたら出す」）
  // ※非表示で開かれた場合は shouldPoll() が false になり取得しない
  updatePolling();
})();


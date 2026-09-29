  // ===== ページ切替 =====
  function showTop(){document.getElementById('topPage').classList.add('active');document.getElementById('galleryPage').classList.remove('active');window.scrollTo(0,0)}
  // ギャラリーは絞り込みオフで開く（「スライドショー」の絞り込みは一覧の中のボタンでだけ切り替える）
  function showGallery(){galleryFilterOn=false;document.getElementById('galleryPage').classList.add('active');document.getElementById('topPage').classList.remove('active');window.scrollTo(0,0);renderGallery()}
  function scrollTo2(id){showTop();setTimeout(()=>document.getElementById(id).scrollIntoView({behavior:'smooth'}),50)}

  // ===== イラスト（トップのスライドショー・#galleryPage の一覧） =====
  // データは公開JSON（uraten-ops が承認済みの掲載だけを R2 に置く）1ファイルだけ。
  // ページを開いたときに1回だけ読み、トップと一覧で同じデータを使う。
  //   items     … 一覧に出す作品（1人1点）
  //   slideshow … 今トップのスライドショーに出す作品（掲載が古い順。この順番のまま使う）
  // - url・image が http(s) 以外の作品は出さない。url2 も http(s) のときだけリンクにする
  // - 申請由来の文字列は textContent / プロパティで入れる（innerHTML に展開しない）
  const GALLERY_URL = 'https://media.ura-ten.jp/gallery/gallery.json';

  function isHttp(u){ return typeof u === 'string' && /^https?:\/\//i.test(u); }
  function posInt(v){ return (Number.isInteger(v) && v > 0) ? v : 0; }
  // 2つ目のボタンの文言（リンク先のホスト名。先頭の www. は外す）
  function hostLabel(u){
    try{ return new URL(u).hostname.replace(/^www\./i, ''); }catch(e){ return ''; }
  }

  function shuffle(list){
    for(let i = list.length - 1; i > 0; i--){
      const r = Math.floor(Math.random() * (i + 1));
      [list[i], list[r]] = [list[r], list[i]];
    }
    return list;
  }

  function normWorks(src){
    if(!Array.isArray(src)) return [];
    return src
      .filter(it=>it && isHttp(it.url) && isHttp(it.image))
      .map(it=>({
        name:  (typeof it.name === 'string') ? it.name : '',
        url:   it.url,
        url2:  (isHttp(it.url2) && hostLabel(it.url2)) ? it.url2 : null,
        bio:   (typeof it.bio === 'string' && it.bio.trim()) ? it.bio : null,
        image: it.image,
        w:     posInt(it.w),
        h:     posInt(it.h)
      }));
  }

  function setImg(img, w){
    img.alt = w.name + 'のイラスト';
    if(w.w && w.h){ img.width = w.w; img.height = w.h; }
    else { img.removeAttribute('width'); img.removeAttribute('height'); }
    img.src = w.image;
  }
  function workImg(w, lazy){
    const img = document.createElement('img');
    img.className = 'work-img';
    if(lazy) img.loading = 'lazy';
    img.decoding = 'async';
    setImg(img, w);
    return img;
  }

  // 自己紹介・2つ目のリンクは、あるときだけ欄ごと出す（トップの大枠とモーダルで共用）
  function fillExtras(bioEl, link2El, w){
    bioEl.textContent = w.bio || '';
    bioEl.hidden = !w.bio;
    if(w.url2){
      link2El.href = w.url2;
      link2El.textContent = hostLabel(w.url2);
      link2El.hidden = false;
    }else{
      link2El.removeAttribute('href');
      link2El.textContent = '';
      link2El.hidden = true;
    }
  }

  let galleryItems = null;      // 読み込み前は null。一覧用にシャッフル済み
  let slides = [];              // slideshow（並びはそのまま）
  let galleryFilterOn = false;

  // --- 一覧（#galleryPage） ---
  // 一覧の画像はトップを開いた時点では読ませたくないので、ギャラリーを開いたときに初めて描く。
  // - オフ：items を読み込みごとにシャッフルした順（掲載の間で露出に偏りを作らないため）
  // - オン：slideshow をそのままの順
  // - カードは掲載名だけ（有料・無料で見た目に差を付けない）
  // - 0件・読み込み失敗はどちらも「まだ掲載はありません」
  const grid = document.getElementById('galleryGrid');
  const galleryEmpty = document.getElementById('galleryEmpty');
  const galleryFilterBtn = document.getElementById('galleryFilter');

  function renderGallery(){
    if(galleryItems === null) return;                     // 読み込み中は「読み込んでいます…」のまま
    if(!document.getElementById('galleryPage').classList.contains('active')) return;
    galleryFilterBtn.hidden = !slides.length;
    if(!slides.length) galleryFilterOn = false;
    galleryFilterBtn.setAttribute('aria-pressed', galleryFilterOn ? 'true' : 'false');

    const list = galleryFilterOn ? slides : galleryItems;
    grid.textContent = '';
    if(!list.length){
      galleryEmpty.textContent = 'まだ掲載はありません';
      galleryEmpty.hidden = false;
      return;
    }
    galleryEmpty.hidden = true;
    list.forEach(w=>{
      const el = document.createElement('div');
      el.className = 'card';
      el.onclick = ()=>openWork(w);
      const art = document.createElement('div');
      art.className = 'card-art work-art';
      art.appendChild(workImg(w, true));
      const foot = document.createElement('div');
      foot.className = 'card-foot';
      const name = document.createElement('b');
      name.textContent = w.name;
      foot.appendChild(name);
      el.appendChild(art);
      el.appendChild(foot);
      grid.appendChild(el);
    });
  }
  function toggleGalleryFilter(){
    galleryFilterOn = !galleryFilterOn;
    renderGallery();
  }

  // --- 作品の詳細モーダル（大枠・一覧で共用） ---
  const workModal = document.getElementById('workModal');
  function openWork(w){
    const art = document.getElementById('wArt');
    art.textContent = '';
    art.appendChild(workImg(w, false));
    document.getElementById('wName').textContent = w.name;
    document.getElementById('wLink').href = w.url;
    fillExtras(document.getElementById('wBio'), document.getElementById('wLink2'), w);
    workModal.classList.add('open');
  }
  function closeWork(){ workModal.classList.remove('open'); }

  // --- トップのスライドショー ---
  // 1枚6秒。表示する番号は時計で決める（Math.floor(Date.now()/6000) % 件数）。
  // 誰がいつ開いても同じ時刻には同じ作品が出るので、「いつも最初に出る人」がいない。
  // 重さ対策：
  //   - 画像は A/B の2枚だけを重ねて常設し、読み込むのは「今の1枚」と「次の1枚」だけ
  //   - 次の1枚は切り替えの少し前に先読み＋decode() しておき、切替時は class の付け替えだけにする
  //   - 見えていない間（裏タブ・画面外・ギャラリー表示中）はタイマーを止め、戻ったら時計から計算し直す
  const SHOW_MS = 6000;
  const SHOW_PRELOAD_MS = 1500;  // 切り替えのこれだけ前に次の画像を読み始める

  const showEl       = document.getElementById('show');
  const showStatusEl = document.getElementById('showStatus');
  const showWantedEl = document.getElementById('showWanted');
  const showArtEl    = document.getElementById('showArt');
  const showNameEl   = document.getElementById('showName');
  const showBioEl    = document.getElementById('showBio');
  const showLinkEl   = document.getElementById('showLink');
  const showLink2El  = document.getElementById('showLink2');

  const showImgs = [];
  let showLive = 0;              // いま表示している showImgs のインデックス
  let showCur = -1;              // いま表示している slides のインデックス
  let showToken = 0;             // 追い越された切替を捨てるための番号
  let showTimers = [];
  let showOnScreen = true;       // IntersectionObserver 未対応なら常時 true 扱い

  function showClockIdx(){ return Math.floor(Date.now() / SHOW_MS) % slides.length; }

  // 指定スロットに slides[idx] を読み込み、デコードまで済ませる。表示できるなら true。
  function showLoad(slot, idx){
    const img = showImgs[slot];
    if(img.dataset.idx === String(idx)) return img._ready;
    img.dataset.idx = String(idx);
    setImg(img, slides[idx]);
    img._ready = (typeof img.decode === 'function' ? img.decode() : Promise.resolve())
      .then(()=>img.dataset.idx === String(idx), ()=>false);
    return img._ready;
  }

  async function showGoTo(idx){
    if(idx === showCur) return;
    const token = ++showToken;
    const standby = 1 - showLive;
    const ok = await showLoad(standby, idx);   // この間、表示中の作品はそのまま出ている
    if(token !== showToken) return;
    const w = slides[idx];
    showImgs[showLive].classList.remove('on');
    showImgs[standby].classList.toggle('on', ok);
    showLive = standby;
    showCur = idx;
    showNameEl.textContent = w.name;
    showLinkEl.href = w.url;
    fillExtras(showBioEl, showLink2El, w);
  }

  function showClear(){
    showTimers.forEach(clearTimeout);
    showTimers = [];
  }
  function showSchedule(){
    showClear();
    if(slides.length < 2) return;              // 1件だけのときは切り替えない
    const now = Date.now();
    const next = (Math.floor(now / SHOW_MS) + 1) * SHOW_MS;
    const nextIdx = Math.floor(next / SHOW_MS) % slides.length;
    showTimers.push(setTimeout(()=>showLoad(1 - showLive, nextIdx), Math.max(0, next - SHOW_PRELOAD_MS - now)));
    showTimers.push(setTimeout(()=>{ showGoTo(nextIdx); showSchedule(); }, next - now + 20));
  }
  function showUpdate(){
    if(!slides.length) return;
    if(showOnScreen && !document.hidden){
      showGoTo(showClockIdx());
      showSchedule();
    }else{
      showClear();
    }
  }
  function openShowWork(){ if(showCur >= 0) openWork(slides[showCur]); }

  function startShow(){
    showStatusEl.hidden = true;
    if(!slides.length){
      // 空の枠やサンプルは出さず、募集の案内だけを出す
      showWantedEl.hidden = false;
      return;
    }
    for(let i = 0; i < 2; i++){
      const img = document.createElement('img');
      img.className = 'work-img';
      img.decoding = 'async';
      showArtEl.appendChild(img);
      showImgs.push(img);
    }
    showEl.hidden = false;
    if('IntersectionObserver' in window){
      // #topPage が display:none のとき（ギャラリー表示中）も交差しないので止まる。
      new IntersectionObserver(es=>{
        showOnScreen = es[es.length-1].isIntersecting;
        showUpdate();
      },{rootMargin:'120px'}).observe(showArtEl);
    }else{
      showUpdate();
    }
    document.addEventListener('visibilitychange', showUpdate);
  }

  // --- 読み込み（1回だけ） ---
  fetch(GALLERY_URL, { cache: 'no-store' })
    .then(res=>{ if(!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(data=>{
      galleryItems = shuffle(normWorks(data && data.items));
      slides = normWorks(data && data.slideshow);
    })
    .catch(()=>{ galleryItems = []; slides = []; })
    .then(()=>{ startShow(); renderGallery(); });

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

  // ===== イベントカレンダー =====
  // 読み込み・日付判定・描画は js/calendar.js（calendar.html と共用）に置いてある。
  // ここでは直近5件の描画を呼ぶだけ。
  if(window.uratenCalendar) window.uratenCalendar.renderTop();

  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeWork();closeSched();closeMenu()}});


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


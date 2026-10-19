  // ===== ページ切替 =====
  function showTop(){document.getElementById('topPage').classList.add('active');document.getElementById('galleryPage').classList.remove('active');window.scrollTo(0,0)}
  // ギャラリーは絞り込みオフで開く（「スライドショー」の絞り込みは一覧の中のボタンでだけ切り替える）
  function showGallery(){galleryFilterOn=false;document.getElementById('galleryPage').classList.add('active');document.getElementById('topPage').classList.remove('active');window.scrollTo(0,0);renderGallery()}
  // ヘッダー・タブ・メニューのページ内リンク。イラスト一覧を開いているときはトップに戻してから移動する
  function goSec(id){
    closeMenu();
    const onTop = document.getElementById('topPage').classList.contains('active');
    if(!onTop) showTop();
    const el = document.getElementById(id);
    if(el) el.scrollIntoView({behavior: onTop ? 'smooth' : 'auto', block:'start'});
  }

  // ===== URATENとは（モーダル。説明は準備中） =====
  function openAbout(){ closeMenu(); document.getElementById('aboutModal').classList.add('open'); }
  function closeAbout(){ const m = document.getElementById('aboutModal'); if(m) m.classList.remove('open'); }

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

  // --- トップの SHOWCASE（ILLUSTRATION / PHOTO / INFO の3枠） ---
  // 3枠はそれぞれ独立したスライドショー。大・小・小のどこに入るかは、ページを開くたびにランダムで決める。
  // 1枚12秒。表示する番号は時計で決める（Math.floor((Date.now() + offset) / 12000) % 件数）。
  // 誰がいつ開いても同じ時刻には同じ作品が出るので、「いつも最初に出る人」がいない。
  // offset を枠ごとに4秒ずつずらし、3枠が同時に切り替わらないようにする。
  // 重さ対策（枠ごと）：
  //   - 画像は A/B の2組だけを重ねて常設し、読み込むのは「今の1枚」と「次の1枚」だけ
  //     （ぼかした背景は同じ画像なので、通信は1枚分で済む）
  //   - 次の1枚は切り替えの少し前に先読み＋decode() しておき、切替時は class の付け替えだけにする
  //   - 見えていない間（裏タブ・画面外・ギャラリー表示中）はタイマーを止め、戻ったら時計から計算し直す
  // PHOTO・INFO はまだ公開データが無いので、募集の案内だけを出す（画像は読まない）。
  const SHOW_MS = 12000;
  const SHOW_PRELOAD_MS = 1500;  // 切り替えのこれだけ前に次の画像を読み始める
  const SHOWCASE = {
    illust: { en:'ILLUSTRATION', ja:'イラストレーション', offset:0,    wanted:'イラスト枠 掲載募集中', href:'./menu.html#illust' },
    photo:  { en:'PHOTO',        ja:'フォト',             offset:4000, wanted:'フォト枠 掲載募集中',   href:'./menu.html' },
    info:   { en:'INFO',         ja:'イベント告知',       offset:8000, wanted:'告知枠 掲載募集中',     href:'./menu.html' }
  };
  const SHOW_DOTS_MAX = 8;
  const ICON_HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C1 8.6 3 5 6.6 5c2 0 3.4 1.1 4.4 2.5C12 6.1 13.4 5 15.4 5 19 5 21 8.6 19.6 11.8 17.5 16.4 12 21 12 21z"/></svg>';
  const ICON_GO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

  function mk(tag, cls, text){
    const n = document.createElement(tag);
    if(cls) n.className = cls;
    if(text != null) n.textContent = text;
    return n;
  }
  // 固定の SVG だけを入れる（申請由来の文字列は入れない）
  function mkIcon(cls, svg){
    const n = mk('span', cls);
    n.innerHTML = svg;
    return n;
  }
  function pad2(n){ return (n < 10 ? '0' : '') + n; }

  // 1枠分を組み立てる。list が空なら募集の案内だけを出す
  function makeSlot(key, size, list){
    const cat = SHOWCASE[key];
    const root = mk('article', 'vcard vcard--' + size);
    root.dataset.cat = key;

    const head = mk('div', 'vc-head');
    const label = mk('div');
    label.appendChild(mk('h3', 'vc-cat', cat.en));
    label.appendChild(mk('span', 'vc-ja', cat.ja));
    const count = mk('div', 'vc-count');
    head.appendChild(label);
    head.appendChild(count);

    const s = { key, root, list, offset:cat.offset, count,
                layers:[], live:0, cur:-1, token:0, timers:[], onScreen:true };

    if(!list.length){
      const a = mk('a', 'vc-wanted');
      a.href = cat.href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.appendChild(mk('b', null, cat.wanted));
      a.appendChild(mk('span', null, 'この場所で、あなたの作品を紹介しませんか →'));
      root.appendChild(head);
      root.appendChild(a);
      return s;
    }

    for(let i = 0; i < 2; i++){
      const box = mk('div', 'vc-layer');
      const blur = mk('img', 'vc-blur');
      blur.alt = '';
      blur.setAttribute('aria-hidden', 'true');
      blur.decoding = 'async';
      const img = mk('img', 'vc-img');
      img.decoding = 'async';
      box.appendChild(blur);
      box.appendChild(img);
      root.appendChild(box);
      s.layers.push({ box, blur, img, idx:-1, ready:null });
    }

    const foot = mk('div', 'vc-foot');
    s.text = mk('div', 'vc-text');
    s.name = mk('div', 'vc-name');
    s.bio  = mk('p', 'vc-bio');
    s.bio.hidden = true;
    s.text.appendChild(mk('span', 'vc-eyebrow', 'NOW SHOWING'));
    s.text.appendChild(s.name);
    s.text.appendChild(s.bio);
    s.btn = mk('a', 'vc-btn');
    s.btn.target = '_blank';
    s.btn.rel = 'noopener noreferrer';
    s.btn.appendChild(mkIcon('', ICON_HEART).firstChild);
    s.btn.appendChild(document.createTextNode('推す'));
    s.btn.addEventListener('click', e=>e.stopPropagation());
    foot.appendChild(s.text);
    foot.appendChild(s.btn);
    foot.appendChild(mkIcon('vc-go', ICON_GO));

    const prog = mk('div', 'vc-prog');
    s.prog = mk('i');
    prog.appendChild(s.prog);
    s.dots = mk('div', 'vc-dots');
    for(let i = 0; i < Math.min(list.length, SHOW_DOTS_MAX); i++) s.dots.appendChild(mk('i'));
    if(list.length < 2){ prog.hidden = true; s.dots.hidden = true; }

    root.appendChild(head);
    root.appendChild(foot);
    root.appendChild(prog);
    root.appendChild(s.dots);

    // 枠を押すと作品の詳細モーダル（一覧と共用）
    root.tabIndex = 0;
    root.setAttribute('role', 'button');
    const open = ()=>{ if(s.cur >= 0) openWork(s.list[s.cur]); };
    root.addEventListener('click', open);
    root.addEventListener('keydown', e=>{
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); }
    });
    return s;
  }

  function slotClockIdx(s){ return Math.floor((Date.now() + s.offset) / SHOW_MS) % s.list.length; }

  // 指定の組に list[idx] を読み込み、デコードまで済ませる。表示できるなら true。
  function slotLoad(s, layer, idx){
    const L = s.layers[layer];
    if(L.idx === idx) return L.ready;
    L.idx = idx;
    const w = s.list[idx];
    setImg(L.img, w);
    L.blur.src = w.image;
    L.ready = (typeof L.img.decode === 'function' ? L.img.decode() : Promise.resolve())
      .then(()=>L.idx === idx, ()=>false);
    return L.ready;
  }

  async function slotGoTo(s, idx){
    if(idx === s.cur) return;
    const token = ++s.token;
    const standby = 1 - s.live;
    const ok = await slotLoad(s, standby, idx);   // この間、表示中の作品はそのまま出ている
    if(token !== s.token) return;
    const w = s.list[idx];
    s.layers[s.live].box.classList.remove('on');
    s.layers[standby].box.classList.toggle('on', ok);
    s.live = standby;
    s.cur = idx;

    s.name.textContent = w.name;
    s.bio.textContent = w.bio || '';
    s.bio.hidden = !w.bio;
    s.btn.href = w.url;
    s.root.setAttribute('aria-label', w.name + 'のイラストを開く');
    s.count.textContent = '';
    s.count.appendChild(mk('b', null, pad2(idx + 1)));
    s.count.appendChild(document.createTextNode(' / ' + pad2(s.list.length)));
    const dots = s.dots.children;
    for(let i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i === idx % dots.length);
    s.text.classList.remove('in');
    void s.text.offsetWidth;          // アニメーションをかけ直す
    s.text.classList.add('in');
  }

  // 進み具合のバー。時計から「今の1枚の経過時間」を出して途中から動かす
  function slotProgress(s, running){
    if(!s.prog || s.list.length < 2) return;
    const p = s.prog;
    if(!running){ p.style.animationPlayState = 'paused'; return; }
    p.style.animation = 'none';
    void p.offsetWidth;
    p.style.animation = 'vcprog ' + SHOW_MS + 'ms linear ' + (-((Date.now() + s.offset) % SHOW_MS)) + 'ms forwards';
  }

  function slotClear(s){
    s.timers.forEach(clearTimeout);
    s.timers = [];
  }
  function slotSchedule(s){
    slotClear(s);
    if(s.list.length < 2) return;              // 1件だけのときは切り替えない
    const now = Date.now() + s.offset;
    const next = (Math.floor(now / SHOW_MS) + 1) * SHOW_MS;
    const nextIdx = Math.floor(next / SHOW_MS) % s.list.length;
    s.timers.push(setTimeout(()=>slotLoad(s, 1 - s.live, nextIdx), Math.max(0, next - SHOW_PRELOAD_MS - now)));
    s.timers.push(setTimeout(()=>{ slotGoTo(s, nextIdx); slotSchedule(s); slotProgress(s, true); }, next - now + 20));
  }
  function slotUpdate(s){
    if(!s.list.length) return;
    if(s.onScreen && !document.hidden){
      slotGoTo(s, slotClockIdx(s));
      slotSchedule(s);
      slotProgress(s, true);
    }else{
      slotClear(s);
      slotProgress(s, false);
    }
  }

  function startShow(){
    const box = document.getElementById('visual');
    box.textContent = '';
    const data = { illust:slides, photo:[], info:[] };
    const slots = shuffle(Object.keys(SHOWCASE)).map((key, i)=>makeSlot(key, i === 0 ? 'lg' : 'sm', data[key]));
    slots.forEach(s=>box.appendChild(s.root));

    const live = slots.filter(s=>s.list.length);
    if(!live.length) return;
    if('IntersectionObserver' in window){
      // #topPage が display:none のとき（ギャラリー表示中）も交差しないので止まる。
      const io = new IntersectionObserver(es=>{
        es.forEach(e=>{
          const s = live.find(x=>x.root === e.target);
          if(!s) return;
          s.onScreen = e.isIntersecting;
          slotUpdate(s);
        });
      },{rootMargin:'120px'});
      live.forEach(s=>io.observe(s.root));
    }else{
      live.forEach(slotUpdate);
    }
    document.addEventListener('visibilitychange', ()=>live.forEach(slotUpdate));
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

  // ===== 放送予定（このあと・当日のスケジュール） =====
  // 読み込み・放送日の判定・描画は js/onair.js（schedule.html と共用）に置いてある。
  // ここでは読み込みを始め、モーダルの開閉だけを持つ。
  if(window.uratenOnair) window.uratenOnair.start();

  function openSched(){
    // 開くたびに描き直して、放送中の印と終了済みの表示を最新にする
    if(window.uratenOnair) window.uratenOnair.renderToday();
    document.getElementById('schedModal').classList.add('open');
  }
  function closeSched(){document.getElementById('schedModal').classList.remove('open')}

  // ===== 歌い手枠の曲目モーダル（プレーヤーの「詳細を見る」から開く） =====
  // 放送中の回の歌い手名・曲名・作詞／作曲だけを出す。描画は js/onair.js の
  // fillSongs に任せる（当日のスケジュールと同じ songsEl を通すので見た目が一致する）。
  let songsModalId = '';   // 放送中の歌い手枠の放送回ID（initRadio が入れる）
  function openSongs(){
    const oa = window.uratenOnair;
    if(!songsModalId || !oa || !oa.fillSongs) return;
    const p = oa.findById(songsModalId);
    const t = document.getElementById('songsTitle');
    if(t) t.textContent = (p && p.title) || '';
    if(!oa.fillSongs(document.getElementById('songsList'), songsModalId)) return;  // 曲目が無ければ開かない
    document.getElementById('songsModal').classList.add('open');
  }
  function closeSongs(){
    const m = document.getElementById('songsModal');
    if(m) m.classList.remove('open');
  }

  // ===== イベントカレンダー =====
  // 読み込み・日付判定・描画は js/calendar.js（calendar.html と共用）に置いてある。
  // ここでは直近5件の描画を呼ぶだけ。
  if(window.uratenCalendar) window.uratenCalendar.renderTop();

  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeWork();closeSched();closeSongs();closeAbout();closeMenu()}});


// ===== 三本線のメニュー（画面幅が狭いとき） =====
function closeMenu(){
  const drawer=document.getElementById('drawer');
  const btn=document.getElementById('menuBtn');
  if(drawer) drawer.classList.remove('open');
  if(btn) btn.setAttribute('aria-expanded','false');
}
function toggleMenu(){
  const drawer=document.getElementById('drawer');
  const btn=document.getElementById('menuBtn');
  if(!drawer||!btn)return;
  const open=drawer.classList.toggle('open');
  btn.setAttribute('aria-expanded',open?'true':'false');
}
// ヘッダーの外を押したら閉じる。メニューの項目を選んだときも閉じる
document.addEventListener('click',e=>{
  const hd=document.querySelector('.hd');
  if(hd && !hd.contains(e.target)) closeMenu();
});
document.querySelectorAll('#drawer a').forEach(a=>a.addEventListener('click',closeMenu));


// ===== 放送プレイヤー（ストリーム再生 + 放送中メタの取得） =====
// - 素のJSのみ・ストレージ不使用・外部ライブラリなし
// - 再生はユーザーのタップ起点のみ（オートプレイなし）
// - 「放送中」の表示は AzuraCast から取る（いま放送中API ＋ スケジュールAPI）。
//   番組かどうかは song.custom_fields.oa_id の有無で判定する。
//     oa_id あり → 番組：放送時間・番組タイトル・出演者・紹介URL
//     oa_id なし → BGM：「URATEN ミュージック」・曲名・アーティスト・音源の紹介URL
//   運営が手で入れた番組は oa_id が無く BGM と同じ出方になる。それでよい。
// - 放送時間はスケジュールAPIの is_now の start〜end を使う（played_at/duration は
//   実ファイルの長さで枠より短いため使わない）。is_now が無いときは
//   programs.json の同じ id から拾う（js/onair.js の findById）
// - 取得できない・is_online が false のときは「放送中」を出さず、その旨を出す。
//   「このあと」は programs.json 側（js/onair.js）が独立に出す
(function initRadio(){
  // ステーション。js/env.js の window.URATEN_ENV.station で切り替える。
  // URL に ?station=uraten / ?station=uraten-test を付けた場合はそれを優先する
  // （その表示だけの一時的な切り替え）。どちらも無効なら本番にする。
  const STATION_PROD = 'uraten';
  const STATION_TEST = 'uraten-test';
  const STATION = (function(){
    const allow = [STATION_PROD, STATION_TEST];
    try{
      const q = new URLSearchParams(location.search).get('station');
      if(allow.indexOf(q) >= 0) return q;
    }catch(e){ /* URLSearchParams が無い環境は無視して env.js を見る */ }
    try{
      const env = window.URATEN_ENV;
      if(env && allow.indexOf(env.station) >= 0) return env.station;
    }catch(e){ /* env.js が無い・壊れている */ }
    return STATION_PROD;
  })();

  const STREAM_URL   = 'https://radio.ura-ten.jp/listen/' + STATION + '/radio.mp3';
  const NP_API       = 'https://radio.ura-ten.jp/api/nowplaying/' + STATION;
  const SCHEDULE_API = 'https://radio.ura-ten.jp/api/station/' + STATION + '/schedule';
  const POLL_MS      = 20000; // 15〜30秒の範囲
  const FALLBACK_TITLE = 'URATEN';
  const BGM_LABEL      = 'URATEN ミュージック';
  const OFFLINE_TEXT   = 'ただいま放送の情報を取得できません';
  const LINK_TEXT      = '詳細を見る →';

  const audio    = document.getElementById('radioAudio');
  const playBtn  = document.getElementById('playBtn');
  const titleEl  = document.getElementById('npTitle');
  const artistEl = document.getElementById('npArtist');
  const timeEl   = document.getElementById('npTime');
  const npLinkEl = document.getElementById('npLink');
  const npSongsEl= document.getElementById('npSongs');
  const artEl    = document.getElementById('npArt');
  const vinylEl  = document.getElementById('npVinyl');
  const onairEl  = document.getElementById('npOnair');
  const onairTxt = document.getElementById('npOnairLabel');
  const playerEl = document.getElementById('player');      // 再生中は .is-playing（盤が回る・波形が出る）
  const playLabelEl = document.getElementById('playLabel'); // LISTEN ⇔ PLAYING
  if(!audio || !playBtn) return;

  let wantPlaying = false;          // ユーザーの再生意図
  let reconnectTimer = null;
  let backoff = 2000;               // 再接続の待ち時間（指数バックオフ）
  let pollTimer = null;             // メタ取得ポーリングの interval
  let schedule = [];                // スケジュールAPIの配列
  let curOaId = '';                 // 放送中の放送回ID（無ければ空＝BGM）
  let curMeta = {title:FALLBACK_TITLE, artist:'', art:''};

  // --- 表示ガード：値が無い / 内部ファイル名っぽい値は表示しない ---
  const FILE_EXT = /\.(mp3|m4a|aac|ogg|oga|flac|wav|wma|opus|aif|aiff|alac|webm)\b/i;
  const clean = s => (typeof s === 'string' ? s.trim() : '');
  const looksInternal = s => FILE_EXT.test(s);
  const safe = s => { const v = clean(s); return looksInternal(v) ? '' : v; };
  const httpUrl = s => { const v = clean(s); return /^https?:\/\//i.test(v) ? v : ''; };

  // AzuraCast のアートワークURLは、音源に画像が埋まっているときだけ
  //   /art/{id}-{更新時刻}.jpg
  // の形になる。画像が無い音源は /art/{id} になり、ステーションの既定画像
  // （中身が全曲で同じ画像）が返ってくる。既定画像はサイトの見た目に合わないので、
  // この形のときはアートを出さず、CSS のレコード盤（#npVinyl / .pl-disc）に落とす。
  // 判定は保守的にし、URL の形が変わったときは「画像あり」として従来どおり表示する。
  const DEFAULT_ART = /\/art\/[0-9a-f]{8,}(\?|$)/i;
  const songArt = s => { const u = httpUrl(s); return (u && DEFAULT_ART.test(u)) ? '' : u; };

  // --- 放送時間（番組のときだけ） ---
  function rangeLabel(startIso, endIso){
    const oa = window.uratenOnair;
    if(!oa || !oa.timeRange) return '';
    return oa.timeRange(startIso, endIso, oa.currentDay());
  }
  function programTime(oaId){
    // スケジュールAPIの is_now が番組の枠の時間
    for(let i = 0; i < schedule.length; i++){
      const s = schedule[i];
      if(s && s.is_now) return rangeLabel(s.start, s.end);
    }
    // is_now が無いときは番組表の JSON から同じ id を引く
    const oa = window.uratenOnair;
    const p = oa && oa.findById ? oa.findById(oaId) : null;
    return p ? rangeLabel(p.start, p.end) : '';
  }

  // --- 1行に収めつつ、はみ出す分だけ横に往復させる ---
  // CSS だけでは「はみ出しているか」を判定できないため、幅を測って
  // はみ出す行にだけ .is-scrolling を付ける。動かすのは transform のみ
  // （GPU 合成で済む）。prefers-reduced-motion の端末では CSS 側で止める。
  const MQ_SPEED = 25;   // px/秒。流れる速さ
  const MQ_HOLD  = 3;    // 左端・右端でそれぞれ止まる秒数

  // 止まる時間を「秒」で揃えるには、はみ出し量ごとにキーフレームの % を変える必要がある
  // （@keyframes の % は var() にできない）。そのため要素ごとの定義をここで書き出し、
  // animation は内側の span にインラインで指定する。対象は番組名と出演者の2行だけ。
  const mqStyle = document.createElement('style');
  document.head.appendChild(mqStyle);
  const mqRules = {};
  let mqSeq = 0;
  function setLine(el, text){
    if(!el) return;
    let inner = el.firstElementChild;
    if(!inner || !inner.classList.contains('mq-in')){
      el.textContent = '';
      inner = document.createElement('span');
      inner.className = 'mq-in';
      el.appendChild(inner);
    }
    inner.textContent = text || '';
    measureLine(el);
  }
  function measureLine(el){
    const inner = el && el.firstElementChild;
    if(!inner) return;
    // 測る前に一度止める（前回の transform が残っていると幅を誤る）
    el.classList.remove('is-scrolling');
    inner.style.animation = '';
    const over = inner.scrollWidth - el.clientWidth;
    if(el.clientWidth <= 0 || over <= 1) return;   // 非表示中や収まっているときは動かさない

    // 左端で MQ_HOLD 秒 → 流れる → 右端で MQ_HOLD 秒 → 先頭へ戻る、を繰り返す。
    // 止まる時間が常に MQ_HOLD 秒になるよう、全体の長さから % を計算する。
    // 名前は要素ごとに固定する。id が無くても他の行と衝突しないようにする
    const name = el._mqName || (el._mqName = 'mq-' + (el.id || 'line' + (++mqSeq)));
    const dur  = MQ_HOLD * 2 + over / MQ_SPEED;
    const hold = MQ_HOLD / dur * 100;
    mqRules[name] = '@keyframes ' + name + '{'
      + '0%,' + hold.toFixed(3) + '%{transform:translateX(0)}'
      + (100 - hold).toFixed(3) + '%,100%{transform:translateX(' + (-over) + 'px)}}';
    mqStyle.textContent = Object.keys(mqRules).map(k => mqRules[k]).join('\n');
    inner.style.animation = name + ' ' + dur.toFixed(2) + 's linear infinite';
    el.classList.add('is-scrolling');
  }
  // 幅が変わると収まり方も変わるので測り直す
  let mqTimer = null;
  window.addEventListener('resize', ()=>{
    clearTimeout(mqTimer);
    mqTimer = setTimeout(()=>{ measureLine(titleEl); measureLine(artistEl); }, 200);
  });

  // --- 表示反映 ---
  // v = {mode:'program'|'bgm'|'offline', title, cast, url, songsId, art, time}
  function render(v){
    const offline = v.mode === 'offline';
    if(onairEl)  onairEl.classList.toggle('is-offline', offline);
    if(onairTxt) onairTxt.textContent = offline ? 'OFF AIR' : 'ON AIR';

    setLine(titleEl, offline ? OFFLINE_TEXT : (v.title || FALLBACK_TITLE));

    // 出演者は空でも行を残す（.pl-detail-row と同じく位置を固定するため）
    setLine(artistEl, v.cast || '');
    // 番組なら放送時間、BGM なら「URATEN ミュージック」をこの行に出す
    if(timeEl) timeEl.textContent = v.time || '';
    // 紹介URLがあれば外部リンク、無くて曲目があれば曲目モーダルのボタン。
    // 歌い手枠は url が null なので、曲目モーダル側が出る。
    songsModalId = v.songsId || '';
    if(npLinkEl){
      npLinkEl.hidden = !v.url;
      if(v.url){ npLinkEl.href = v.url; npLinkEl.textContent = LINK_TEXT; }
      else { npLinkEl.removeAttribute('href'); npLinkEl.textContent = ''; }
    }
    if(npSongsEl){
      const showSongs = !v.url && !!v.songsId;
      npSongsEl.hidden = !showSongs;
      npSongsEl.textContent = showSongs ? LINK_TEXT : '';
    }
    setArt(v.art);

    curMeta = {title: v.title || FALLBACK_TITLE, artist: v.cast || '', art: v.art || ''};
    setMediaMetadata();
  }

  function setArt(art){
    if(!artEl) return;
    if(art){
      artEl.src = art;
      artEl.hidden = false;
      if(vinylEl) vinylEl.style.display = 'none';
    }else{
      artEl.hidden = true;
      artEl.removeAttribute('src');
      if(vinylEl) vinylEl.style.display = '';
    }
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
    // is_online が無いレスポンスは online 扱い（項目が増減しても落ちないように）
    if(np && np.is_online === false){ curOaId = ''; render({mode:'offline'}); return; }

    const song = np && np.now_playing && np.now_playing.song;
    if(!song){ curOaId = ''; render({mode:'offline'}); return; }

    const cf     = song.custom_fields || {};
    const oaId   = clean(cf.oa_id);
    const title  = safe(song.title);
    const artist = safe(song.artist);
    const art    = songArt(song.art);

    if(oaId){
      curOaId = oaId;
      // 歌い手枠は紹介URLが無い代わりに曲目を持つ。あれば曲目モーダルを出せるようにする
      const prog = (window.uratenOnair && window.uratenOnair.findById) ? window.uratenOnair.findById(oaId) : null;
      const hasSongs = !!(prog && prog.songs && prog.songs.length);
      render({mode:'program', title, cast:artist, url:httpUrl(cf.url),
              songsId: hasSongs ? oaId : '', art, time:programTime(oaId)});
    }else{
      curOaId = '';
      render({mode:'bgm', title, cast:artist, url:httpUrl(cf.url), art, time:BGM_LABEL});
    }
  }

  async function poll(){
    let np = null, sc = null;
    try{
      const res = await fetch(NP_API, {cache:'no-store'});
      if(res.ok) np = await res.json();
    }catch(e){ /* ネットワーク/CORS失敗は offline 扱い */ }
    try{
      const res = await fetch(SCHEDULE_API, {cache:'no-store'});
      if(res.ok){
        const j = await res.json();
        if(j && typeof j.length === 'number') sc = j;
      }
    }catch(e){ /* スケジュールが取れなくても番組表の JSON で代替する */ }

    schedule = sc || [];              // programTime より先に入れる
    if(np) applyNowPlaying(np);
    else { curOaId = ''; render({mode:'offline'}); }

    // 「このあと」から放送中の番組を外し、当日スケジュールに ON AIR の印を付ける
    if(window.uratenOnair) window.uratenOnair.setNowId(curOaId);
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
    if(playerEl) playerEl.classList.toggle('is-playing', playing);
    if(playLabelEl) playLabelEl.textContent = playing ? 'PLAYING' : 'LISTEN';
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

  // 読み込み時から取得する（放送中の番組・曲は再生前でも「取れたら出す」）
  // ※非表示で開かれた場合は shouldPoll() が false になり取得しない
  updatePolling();
})();


// ===== 共鳴ビジュアル（試作） =====
// 画面全体の canvas（#fxCanvas）に光を描く。CLAUDE.md 11章。
// - LEVEL（0〜4）、Pattern（景色）、Presence（今ほかに聴いている人の多さ。0〜4 の段階）を別々に扱う
// - LEVEL 0 はデフォルト（元の背景のまま。何も描かず、描画も止める）。
//   各景色は LEVEL 1〜4 で、段ごとに要素が加わって育つ
// - 景色も強さもサイト全体で共通。本人の操作や再生状態では見え方を変えない
// - 再生処理（initRadio）とは切り離す。audio・poll・render には触らない。ここが失敗しても放送は止めない
// - 軽さ：毎秒30回まで・解像度を落とす・粒子の上限・重い端末では自動で減らす・
//   非表示やモーダル表示中は止める・動きを減らす設定では止まった絵にする
// - 入力は、uraten-ops が R2 に置く resonance.json（CLAUDE.md 4-5）。表示中だけ60秒ごとに取りに行く。
//   URL パラメータ（?level= 等）や ?resonance=panel があるときは、確認用にそちらを使う（JSON は読まない）
// - ?resonance=live：env.js のフラグがオフでも JSON を読んで描き、右下に受け取った値を出す（公開前の確認用）
(function initResonance(){
  const canvas = document.getElementById('fxCanvas');
  const front  = document.getElementById('fxFront');   // Presence の光の玉だけを描く手前の層
  if(!canvas || !front) return;
  let shutdown = null;   // 描画中に例外が出たときの後始末
  try{
    let q;
    try{ q = new URLSearchParams(location.search); }catch(e){ return; }
    const KEYS = ['level','pattern','presence','status'];
    const usePanel = q.get('resonance') === 'panel';   // 確認用パネル（?resonance=panel）
    const liveCheck = q.get('resonance') === 'live';   // 公開前の確認（?resonance=live）
    const manual = usePanel || KEYS.some(k=>q.has(k)); // 手で値を与える（JSON は読まない）
    const env = window.URATEN_ENV || {};
    if(env.resonance !== true && !manual && !liveCheck) return;   // フラグもパラメータも無ければ従来の見た目のまま
    const live = !manual;                              // resonance.json を読んで描く

    const backCtx = canvas.getContext('2d'), frontCtx = front.getContext('2d');
    if(!backCtx || !frontCtx) return;
    let ctx = backCtx;   // dot / haze が描く先。光の玉を描く間だけ frontCtx に切り替える

    const PATTERNS = ['star','flow','forest'];
    const MAX_LV   = 4;
    const STALE_MS = 10 * 60 * 1000;  // これより古い値は「集計が止まっている」とみなす
    const FADE_MS  = 30000;           // 景色のクロスフェード
    const TICK_MS  = 5000;            // 入力を見直す間隔（受け取った値が古くなっていないかも、ここで見直す）
    const RES_URL  = 'https://media.ura-ten.jp/resonance/resonance.json';
    const FETCH_MS = 60000;           // resonance.json を取りに行く間隔（R2 のキャッシュも60秒）
    const FRAME_MS = 1000 / 30;       // 描くのは毎秒30回まで
    const CAPS     = [0, 80, 160, 250, 340];   // LEVEL ごとの粒子数の上限（PC。スマホは半分）
    const SLOW_MS  = 12;              // 1フレームの描画がこれを超え続けたら粒子を減らす
    let decayFrom = Date.now();
    let instantMode = false;          // 確認用パネルの「即時」

    // 試作の入力の元。URL から作り、確認用パネルが書き換える
    const params = {};
    KEYS.forEach(k=>{ params[k] = q.get(k); });

    // --- resonance.json の取得（表示中だけ。端末ごとに数秒ずらす） ---
    // 確認用に ?src= で同じオリジンの JSON に差し替えられる（例：?resonance=live&src=./test.json）。
    // ほかのオリジンは受け付けない
    const liveSrc = (function(){
      const src = q.get('src');
      if(!src) return RES_URL;
      try{ const u = new URL(src, location.href); return u.origin === location.origin ? u.href : RES_URL; }
      catch(e){ return RES_URL; }
    })();
    let liveData = null, liveFirst = true, fetchTimer = null, lastFetch = 0, liveError = '';
    function fetchLive(){
      lastFetch = Date.now();
      fetch(liveSrc, { cache:'no-cache' })
        .then(res=>{ if(!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(j=>{
          if(!j || typeof j !== 'object') throw new Error('形が違う');
          const at = Date.parse(j.generated_at);
          liveData = { status: j.status === 'ok' ? 'ok' : 'unknown', level: j.level, pattern: j.pattern,
                       presence: j.presence, generatedAt: isNaN(at) ? 0 : at, raw: j };
          liveError = '';
          // 開いて最初に届いた値は、遷移させずにその状態で描く（来た瞬間に光が立ち上がって見せないため）
          tick(liveFirst);
          liveFirst = false;
        })
        .catch(err=>{ liveError = String(err && err.message || err); });   // 前の値のまま。古くなればデフォルトに戻る
    }
    function scheduleFetch(){
      clearTimeout(fetchTimer);
      fetchTimer = null;
      if(!live || document.hidden) return;
      const wait = Math.max(0, lastFetch + FETCH_MS - Date.now());
      fetchTimer = setTimeout(()=>{ fetchLive(); scheduleFetch(); }, wait + Math.random() * 5000);
    }

    // --- 入力。{status, level, pattern, presence, generatedAt} を返す ---
    function readInput(){
      if(live) return liveData;   // まだ届いていなければ null（＝デフォルト）
      const now = Date.now();
      const lv = params.level;
      let level = 0;
      if(lv === 'decay') level = Math.max(0, MAX_LV - Math.floor((now - decayFrom) / 40000));  // 4 から約2.5分で 0 へ
      else if(/^[0-4]$/.test(lv || '')) level = Number(lv);
      let pattern = params.pattern || 'star';
      if(pattern === 'cycle') pattern = PATTERNS[Math.floor(now / 60000) % PATTERNS.length];
      const st = params.status;
      return {
        status: st === 'unknown' ? 'unknown' : 'ok',
        level, pattern,
        presence: /^[0-4]$/.test(params.presence || '') ? Number(params.presence) : 0,
        generatedAt: st === 'stale' ? now - STALE_MS - 60000 : now
      };
    }

    // --- 受け取った値の扱い（CLAUDE.md 4-5 のフロント側仕様） ---
    // 状態不明・古い値・壊れた値は level 0（デフォルト）/ presence 0（誰かがいると偽らない）。
    // 知らない pattern は star（星屑の海）として描く
    function normalize(v){
      const pattern = (v && PATTERNS.indexOf(v.pattern) >= 0) ? v.pattern : 'star';
      const fresh = !!v && v.status === 'ok' && typeof v.generatedAt === 'number'
                    && Date.now() - v.generatedAt <= STALE_MS;
      if(!fresh) return { level:0, pattern, presence:0 };
      const level = (Number.isInteger(v.level) && v.level >= 0 && v.level <= MAX_LV) ? v.level : 0;
      const presence = (Number.isInteger(v.presence) && v.presence >= 0 && v.presence <= 4) ? v.presence : 0;
      return { level, pattern, presence };
    }

    // ---------- 描画の下ごしらえ ----------
    const rand = (a, b)=> a + Math.random() * (b - a);
    const pick = list=> list[Math.floor(Math.random() * list.length)];
    const smooth = x=> x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
    const TAU = Math.PI * 2;
    const COL = {
      pink:[255,62,165], violet:[139,108,255], cyan:[63,227,255], white:[246,240,255],
      amber:[255,176,92], gold:[255,222,160],
      sun:[255,232,170], leaf:[150,230,140], moss:[90,200,150], firefly:[214,255,140],
      aurora:[110,255,170], teal:[70,225,215]
    };
    // 光の画像を色ごとに1回だけ作る。以後は drawImage で貼るだけ
    //   SPRITE … 芯のある光の粒   HAZE … 芯のない柔らかい光（もや・ヴェール・後光）
    const SPRITE = {}, HAZE = {};
    function makeGlow(c, size, stops){
      const s = document.createElement('canvas');
      s.width = s.height = size;
      const g = s.getContext('2d');
      const r = size / 2;
      const grd = g.createRadialGradient(r, r, 0, r, r, r);
      stops.forEach(([at, rgb, a])=>grd.addColorStop(at, 'rgba(' + (rgb || c) + ',' + a + ')'));
      g.fillStyle = grd;
      g.fillRect(0, 0, size, size);
      return s;
    }
    Object.keys(COL).forEach(name=>{
      const c = COL[name];
      SPRITE[name] = makeGlow(c, 64, [[0,'255,255,255',1],[.2,null,1],[.5,null,.32],[1,null,0]]);
      HAZE[name]   = makeGlow(c, 128, [[0,null,.85],[.45,null,.3],[1,null,0]]);
    });
    function dot(name, x, y, size, a){
      if(a <= 0.003 || size < 0.5) return;
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.drawImage(SPRITE[name], x - size / 2, y - size / 2, size, size);
    }
    function haze(name, x, y, w, h, a){
      if(a <= 0.003) return;
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.drawImage(HAZE[name], x - w / 2, y - h / 2, w, h);
    }
    // 景色ごとの色のもや。{ col, x, y（画面に対する位置 0〜1）, r（大きさ）, s（揺れの速さ）, p, a（濃さ） }
    function nebula(list, k, alpha, e){
      const big = Math.max(W, H);
      for(let i = 0; i < list.length; i++){
        const n = list[i];
        const x = W * (n.x + 0.06 * Math.sin(e.t * n.s + n.p));
        const y = H * (n.y + 0.05 * Math.cos(e.t * n.s * 0.8 + n.p));
        const size = big * n.r;
        haze(n.col, x, y, size, size, 0.22 * (n.a || 1) * k * alpha * e.bright);
      }
    }

    // canvas の大きさ。光はぼけているので、解像度を落として描く
    let W = 0, H = 0, K = 0.75, MOBILE = false;
    function resize(){
      MOBILE = window.innerWidth <= 860;
      K = MOBILE ? 0.6 : 0.75;
      const nw = Math.max(1, Math.round(window.innerWidth * K));
      const nh = Math.max(1, Math.round(window.innerHeight * K));
      if(W && H) scenes.forEach(sc=>sc.rescale(nw / W, nh / H));
      W = canvas.width = front.width = nw;
      H = canvas.height = front.height = nh;
    }

    // 粒子の数を目標に近づける（増やすときは少しずつ現れ、減らすときはゆっくり消える）
    function settle(parts, want, spawn){
      let alive = 0;
      for(let i = 0; i < parts.length; i++) if(!parts[i].dying) alive++;
      let add = Math.min(want - alive, 8);
      while(add-- > 0) parts.push(spawn());
      for(let i = parts.length - 1; i >= 0 && alive > want; i--){
        if(!parts[i].dying){ parts[i].dying = true; alive--; }
      }
    }
    function fade(p, dt){
      p.f = p.dying ? p.f - dt / 2 : Math.min(1, p.f + dt / 2.5);
      return p.f > 0;
    }
    function sweep(parts, dt){
      for(let i = parts.length - 1; i >= 0; i--) if(!fade(parts[i], dt)) parts.splice(i, 1);
    }

    // ---------- 景色 ----------
    // どの景色も { pattern, update(dt, e), draw(alpha, e), count(), rescale(sx, sy) } を持つ。
    // e … { lv（0〜4 の連続値）, L[1..4]（各段の現れ具合 0〜1）, want（この景色に割り当てた粒子数）, bright, t }
    // 段 k の要素は、lv が k-1 から k に上がる間にふわっと現れる

    // Star（表示名「星屑の海」）
    //   段1 まばらな星屑がゆっくり瞬く・青紫のもや
    //   段2 奥行き（手前の大きな粒と奥の小さな粒が別の速さで漂う）・シアンのもや
    //   段3 斜めに淡い天の川・ときどき星がふわりと強く輝く・色が増える
    //   段4「星降る夜」 明るい星どうしが淡い線でつながり、星座がゆっくり現れては消える・
    //       ごく淡い流れ星がまれに落ちる・もやの色がゆっくり移ろう
    const HAZE_STAR1 = [ { col:'violet', x:0.25, y:0.3, r:0.95, s:0.04, p:0 },
                            { col:'violet', x:0.75, y:0.8, r:0.7,  s:0.05, p:3, a:0.6 } ];
    const HAZE_STAR2 = [ { col:'cyan',   x:0.82, y:0.35, r:0.75, s:0.04, p:2, a:0.7 } ];
    const HAZE_STAR4A = [ { col:'pink',  x:0.55, y:0.6,  r:0.85, s:0.03, p:1, a:0.6 } ];
    const HAZE_STAR4B = [ { col:'cyan',  x:0.3,  y:0.7,  r:0.85, s:0.03, p:4, a:0.6 } ];
    function sceneStars(){
      const stars = [], band = [], consts = [], shooting = [];
      let warmCols = 0, bandOn = false, nextConst = 0, nextShoot = 0;
      // 星座：明るい星を1つ選び、近い明るい星を順にたどって3〜6個つなぐ
      function makeConst(){
        const cand = stars.filter(p=>!p.dying && p.z > 0.55 && p.f > 0.9);
        if(cand.length < 4) return null;
        const pts = [pick(cand)];
        const want = 3 + Math.floor(Math.random() * 4);
        const reach = Math.max(W, H) * 0.22;
        while(pts.length < want){
          const last = pts[pts.length - 1];
          let best = null, bd = reach;
          for(let i = 0; i < cand.length; i++){
            const c = cand[i];
            if(pts.indexOf(c) >= 0) continue;
            const d = Math.hypot(c.x - last.x, c.y - last.y);
            if(d < bd){ bd = d; best = c; }
          }
          if(!best) break;
          pts.push(best);
        }
        return pts.length >= 3 ? { pts, age:0, life:rand(10, 14) } : null;
      }
      function spawn(){
        return { x:rand(0, W), y:rand(0, H), z:Math.random(), f:0, dying:false,
                 dx:rand(-0.6, 0.6), dy:rand(-1, -0.3), ph:rand(0, TAU), tw:rand(0.4, 1.6),
                 col: Math.random() < warmCols ? pick(['pink','amber']) : pick(['violet','cyan','white','white']) };
      }
      function makeBand(){
        // 天の川：左下から右上へ斜めの帯。位置は固定で、瞬くだけ
        band.length = 0;
        const n = MOBILE ? 50 : 100;
        for(let i = 0; i < n; i++){
          const off = (Math.random() + Math.random() + Math.random() - 1.5) * 0.09;
          band.push({ u:Math.random(), off, ph:rand(0, TAU), s:rand(0.5, 1.4) });
        }
      }
      makeBand();
      return {
        pattern:'star',
        count:()=>stars.length + (bandOn ? band.length : 0) + shooting.length,
        rescale(sx, sy){ stars.forEach(p=>{ p.x *= sx; p.y *= sy; }); makeBand(); consts.length = 0; shooting.length = 0; },
        update(dt, e){
          warmCols = 0.3 * e.L[3];
          settle(stars, e.want, spawn);
          sweep(stars, dt);
          for(let i = 0; i < stars.length; i++){
            const p = stars[i];
            const v = (1.5 + (3 + 14 * p.z) * e.L[2]) * K;   // 段1 ではほとんど動かない
            p.x += p.dx * v * dt;
            p.y += p.dy * v * dt;
            if(p.y < -30) p.y = H + 30;
            if(p.x < -30) p.x = W + 30; else if(p.x > W + 30) p.x = -30;
          }
          // 段4：星座と流れ星
          if(e.L[4] > 0.01){
            if(e.t >= nextConst){
              nextConst = e.t + rand(5, 9);
              if(consts.length < 2){ const c = makeConst(); if(c) consts.push(c); }
            }
            if(e.t >= nextShoot){
              nextShoot = e.t + rand(9, 18);
              const ang = rand(0.35, 0.6), v = W * 0.35;
              shooting.push({ x:rand(0.1, 0.7) * W, y:rand(0, 0.35) * H,
                              vx:Math.cos(ang) * v, vy:Math.sin(ang) * v, age:0, life:1.4 });
            }
          }
          for(let i = consts.length - 1; i >= 0; i--){
            const c = consts[i];
            c.age += dt;
            // 星が消えかけたら、その星座も消す
            const far = Math.max(W, H) * 0.3;
            let broken = c.age >= c.life;
            for(let j = 0; j < c.pts.length && !broken; j++){
              const p = c.pts[j], q = c.pts[j - 1];
              if(p.dying || stars.indexOf(p) < 0) broken = true;   // 星が消えかけたら、その星座も消す
              else if(q && Math.hypot(p.x - q.x, p.y - q.y) > far) broken = true;   // 端を回り込んだ
            }
            if(broken) consts.splice(i, 1);
          }
          for(let i = shooting.length - 1; i >= 0; i--){
            const m = shooting[i];
            m.age += dt;
            if(m.age >= m.life){ shooting.splice(i, 1); continue; }
            m.x += m.vx * dt; m.y += m.vy * dt;
          }
        },
        draw(alpha, e){
          const t = e.t, L = e.L;
          nebula(HAZE_STAR1, L[1], alpha, e);
          nebula(HAZE_STAR2, L[2], alpha, e);
          // 段4：もやの色がゆっくり移ろう
          if(L[4] > 0.01){
            const drift = 0.5 + 0.5 * Math.sin(t * 0.05);
            nebula(HAZE_STAR4A, L[4] * drift, alpha, e);
            nebula(HAZE_STAR4B, L[4] * (1 - drift), alpha, e);
          }
          // 天の川
          bandOn = L[3] > 0.01;
          if(bandOn){
            const x0 = W * 0.05, y0 = H * 0.95, x1 = W * 0.95, y1 = H * 0.05;
            const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny);
            const hs = Math.max(W, H) * 0.32;
            for(let i = 0; i < 6; i++){
              const u = (i + 0.5) / 6;
              haze(i % 2 ? 'violet' : 'white', x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, hs, hs,
                   0.09 * L[3] * alpha * e.bright);
            }
            for(let i = 0; i < band.length; i++){
              const b = band[i];
              const x = x0 + (x1 - x0) * b.u + nx / nl * b.off * H;
              const y = y0 + (y1 - y0) * b.u + ny / nl * b.off * H;
              dot('white', x, y, 3.2 * K, (0.25 + 0.25 * Math.sin(t * b.s + b.ph)) * L[3] * alpha * e.bright);
            }
          }
          // 星屑
          for(let i = 0; i < stars.length; i++){
            const p = stars[i];
            const tw = 0.55 + 0.45 * Math.sin(t * p.tw + p.ph);
            const depth = p.z * p.z * L[2];                     // 段2 で手前の粒が大きくなる
            let size = (2.5 + 4 * p.z + 22 * depth) * K;
            let a = (0.3 + 0.55 * p.z) * tw * p.f;
            // 段3：ときどき星がふわりと強く輝く
            const glint = Math.pow(Math.max(0, Math.sin(t * 0.3 + p.ph * 3)), 30) * L[3];
            size *= 1 + 1.6 * glint;
            a = Math.min(1, a + 0.6 * glint);
            dot(p.col, p.x, p.y, size, a * L[1] * alpha * e.bright);
          }
          // 段4：星座（ゆっくり現れて、ゆっくり消える）
          if(consts.length){
            ctx.strokeStyle = 'rgb(' + COL.white + ')';
            ctx.lineWidth = 1.2 * K;
            for(let i = 0; i < consts.length; i++){
              const c = consts[i];
              const a = smooth(Math.min(c.age / 3, (c.life - c.age) / 3, 1)) * L[4] * alpha * e.bright;
              ctx.globalAlpha = 0.22 * a;
              ctx.beginPath();
              ctx.moveTo(c.pts[0].x, c.pts[0].y);
              for(let j = 1; j < c.pts.length; j++) ctx.lineTo(c.pts[j].x, c.pts[j].y);
              ctx.stroke();
              for(let j = 0; j < c.pts.length; j++) dot('white', c.pts[j].x, c.pts[j].y, 12 * K, 0.4 * a);
            }
          }
          // 段4：ごく淡い流れ星
          for(let i = 0; i < shooting.length; i++){
            const m = shooting[i];
            const a = Math.sin(Math.PI * m.age / m.life) * L[4] * alpha * e.bright;
            const tx = m.x - m.vx * 0.18, ty = m.y - m.vy * 0.18;
            const g = ctx.createLinearGradient(tx, ty, m.x, m.y);
            g.addColorStop(0, 'rgba(' + COL.white + ',0)');
            g.addColorStop(1, 'rgba(' + COL.white + ',1)');
            ctx.globalAlpha = 0.4 * a;
            ctx.strokeStyle = g;
            ctx.lineWidth = 1.5 * K;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
            dot('white', m.x, m.y, 8 * K, 0.6 * a);
          }
        }
      };
    }

    // Flow（表示名「オーロラ」）
    //   段1 極夜：澄んだ夜空に星が瞬く・地平の上にかすかな緑の光・
    //       左から右へ流れる、細かく明滅する光の粒子（LEVEL が上がるほど数と速さが増す）
    //   段2 オーロラの帯：緑のカーテンが1枚、裾をゆらしながらゆっくりうねる
    //   段3 ゆらめくカーテン：上空にもう1枚（青緑）。光の筋の明るさが波のように走る・
    //       地上のもやが緑に照らされる
    //   段4 ブレイクアップ：裾がピンクに染まる・さらに高い空に紫の帯・ところどころがゆっくり明滅する・
    //       画面の下の湖面にオーロラが映り込む
    // カーテンは、細い光の筋（裾が明るく、上へ向かって紫に溶ける）を曲線に沿って並べて作る
    const HAZE_AURORA1 = [ { col:'violet', x:0.5,  y:0.0,  r:1.1,  s:0.02, p:0, a:0.8 },
                           { col:'aurora', x:0.3,  y:0.68, r:0.8,  s:0.03, p:2, a:0.5 },
                           { col:'cyan',   x:0.75, y:0.62, r:0.8,  s:0.03, p:4, a:0.55 } ];
    const HAZE_AURORA3 = [ { col:'cyan',   x:0.6,  y:0.88, r:1.0,  s:0.03, p:1, a:0.7 },
                           { col:'pink',   x:0.2,  y:0.8,  r:0.8,  s:0.03, p:3, a:0.5 },
                           { col:'violet', x:0.85, y:0.4,  r:0.8,  s:0.03, p:5, a:0.6 } ];
    function makeRay(bottom, top){
      const s = document.createElement('canvas');
      s.width = 32; s.height = 256;
      const g = s.getContext('2d');
      const hot = bottom.map(v=>Math.round((v + 255) / 2));   // 裾のいちばん明るいところ
      const v = g.createLinearGradient(0, 0, 0, 256);
      v.addColorStop(0,    'rgba(' + top + ',0)');
      v.addColorStop(0.45, 'rgba(' + top + ',.3)');
      v.addColorStop(0.8,  'rgba(' + bottom + ',.85)');
      v.addColorStop(0.93, 'rgba(' + hot + ',1)');
      v.addColorStop(1,    'rgba(' + bottom + ',0)');
      g.fillStyle = v;
      g.fillRect(0, 0, 32, 256);
      g.globalCompositeOperation = 'destination-in';
      const h = g.createLinearGradient(0, 0, 32, 0);
      h.addColorStop(0, 'rgba(0,0,0,0)');
      h.addColorStop(0.5, 'rgba(0,0,0,1)');
      h.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = h;
      g.fillRect(0, 0, 32, 256);
      return s;
    }
    // 色の違う光の筋。stops は上（0）から裾（1）へ [位置, 色, 濃さ]。裾ほど明るく、上へ向かって色が移る
    function makeRayStops(stops){
      const s = document.createElement('canvas');
      s.width = 32; s.height = 256;
      const g = s.getContext('2d');
      const v = g.createLinearGradient(0, 0, 0, 256);
      stops.forEach(([at, rgb, a])=>v.addColorStop(at, 'rgba(' + rgb + ',' + a + ')'));
      g.fillStyle = v;
      g.fillRect(0, 0, 32, 256);
      g.globalCompositeOperation = 'destination-in';
      const h = g.createLinearGradient(0, 0, 32, 0);
      h.addColorStop(0, 'rgba(0,0,0,0)');
      h.addColorStop(0.5, 'rgba(0,0,0,1)');
      h.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = h;
      g.fillRect(0, 0, 32, 256);
      return s;
    }
    const hot = c=>c.map(v=>Math.round((v + 255) / 2));   // 裾のいちばん明るいところ
    const AC = { lime:[190,255,140], emerald:[60,230,150], blue:[90,140,255], magenta:[220,90,255] };
    const RAY = {
      lime:    makeRayStops([[0,COL.violet,0],[0.4,COL.violet,0.25],[0.65,COL.aurora,0.55],[0.82,AC.lime,0.9],[0.93,hot(AC.lime),1],[1,AC.lime,0]]),
      green:   makeRayStops([[0,COL.violet,0],[0.4,COL.violet,0.3],[0.62,COL.teal,0.45],[0.8,COL.aurora,0.88],[0.93,hot(COL.aurora),1],[1,COL.aurora,0]]),
      emerald: makeRayStops([[0,COL.pink,0],[0.38,COL.violet,0.3],[0.6,AC.emerald,0.6],[0.82,COL.aurora,0.9],[0.93,hot(COL.aurora),1],[1,AC.emerald,0]]),
      tealg:   makeRayStops([[0,AC.blue,0],[0.42,AC.blue,0.28],[0.65,COL.teal,0.6],[0.83,COL.aurora,0.85],[0.93,hot(COL.teal),1],[1,COL.teal,0]]),
      teal:    makeRayStops([[0,COL.violet,0],[0.45,AC.blue,0.3],[0.7,COL.cyan,0.6],[0.85,COL.teal,0.9],[0.94,hot(COL.teal),1],[1,COL.teal,0]]),
      high:    makeRayStops([[0,COL.pink,0],[0.45,COL.pink,0.3],[0.75,COL.violet,0.8],[0.92,hot(COL.violet),0.9],[1,COL.violet,0]]),
      highm:   makeRayStops([[0,COL.violet,0],[0.45,AC.magenta,0.35],[0.75,COL.pink,0.7],[0.92,hot(COL.pink),0.85],[1,COL.pink,0]]),
      cyan:    makeRayStops([[0,COL.violet,0],[0.42,AC.blue,0.3],[0.66,COL.cyan,0.6],[0.83,COL.cyan,0.9],[0.93,hot(COL.cyan),1],[1,COL.cyan,0]]),
      cyanm:   makeRayStops([[0,AC.magenta,0],[0.4,AC.magenta,0.3],[0.62,COL.violet,0.5],[0.82,COL.cyan,0.88],[0.93,hot(COL.cyan),1],[1,COL.cyan,0]]),
      violet:  makeRayStops([[0,AC.magenta,0],[0.42,AC.magenta,0.3],[0.65,COL.violet,0.6],[0.83,COL.violet,0.9],[0.93,hot(COL.violet),1],[1,COL.violet,0]]),
      magenta: makeRayStops([[0,COL.violet,0],[0.42,COL.violet,0.3],[0.65,AC.magenta,0.6],[0.83,AC.magenta,0.9],[0.93,hot(AC.magenta),1],[1,AC.magenta,0]]),
      pink:    makeRay(COL.pink, COL.aurora)
    };
    // 各カーテンが使う色の並び。筋ごとに、場所と時間でゆっくり変わる模様から選ぶ
    const CURTAINS = [
      { base:0.62, amp:0.07, freq:1.3, w:0.04,   ph:0,   h:0.44, fold:0.035, rs:0.35, stage:2,
        pal:['green','cyan','violet','tealg','magenta','emerald','cyanm','violet'] },
      { base:0.40, amp:0.06, freq:1.9, w:-0.03,  ph:2.2, h:0.32, fold:0.03,  rs:0.28, stage:3,
        pal:['cyan','teal','violet','cyanm','magenta','cyan'] },
      { base:0.22, amp:0.05, freq:1.1, w:0.025,  ph:4.1, h:0.24, fold:0.025, rs:0.22, stage:4,
        pal:['high','highm','magenta','violet','highm'] }
    ];
    function sceneFlow(){
      const stars = [], motes = [];
      let strips = 0;
      // 左から右へ流れる、細かく明滅する光の粒子。fresh のときは画面のどこからでも、流れ直すときは左端から
      function spawnMote(fresh){
        return { x:fresh ? rand(0, W) : rand(-40, -10), y:rand(0.05, 0.95) * H, f:0, dying:false,
                 sp:rand(0.6, 1.4), ph:rand(0, TAU), size:rand(0.6, 1.4), pf:rand(1.2, 3.2),
                 col:pick(['aurora','cyan','cyan','violet','violet','pink','white','teal']) };
      }
      function spawnStar(){
        return { x:rand(0, W), y:rand(0, H * 0.9), z:Math.random(), f:0, dying:false,
                 ph:rand(0, TAU), tw:rand(0.5, 1.8), col:pick(['white','white','cyan']) };
      }
      // カーテン1枚を描く。fringe は段4の裾のピンク
      function curtain(c, k, t, L, br, fringe){
        const n = MOBILE ? 38 : 72;   // 筋の本数（多いほど色と縞が細かくなる）
        const sw = W / n * 2.4;
        for(let i = 0; i <= n; i++){
          const u = i / n;
          const x = W * (-0.05 + 1.1 * u + c.fold * Math.sin(u * 9 + t * 0.07 + c.ph));
          const yb = H * (c.base + c.amp * Math.sin(u * c.freq * Math.PI + t * c.w + c.ph)
                          + 0.02 * Math.sin(u * 7.3 - t * 0.12 + c.ph));
          const hh = H * c.h * (0.7 + 0.3 * Math.sin(u * 11 + t * 0.09 + c.ph));
          // 光の筋の明るさ：ゆっくり流れる波（段3 で強く速くなる）
          const wave = Math.sin(u * 22 - t * c.rs * (1 + L[3]));
          const bright = 0.65 + (0.12 + 0.3 * L[3]) * wave;
          const edge = smooth(Math.min(u, 1 - u) * 6);
          // 段4：ところどころがゆっくり明滅する
          const patch = 1 + 0.7 * L[4] * Math.pow(Math.max(0, Math.sin(u * 5 + t * 0.35 + c.ph)), 4);
          const a = 0.42 * k * bright * edge * patch * br;   // 筋が細かく重なる分、1本は淡く
          if(a <= 0.003) continue;
          // 色：2つの波を重ねた模様で、筋ごとに色を選ぶ（隣どうしが少しずつ違う色になる）
          const m = 0.5 + 0.5 * (0.6 * Math.sin(u * 13.7 + c.ph + t * 0.05) + 0.4 * Math.sin(u * 37.1 - t * 0.09 + c.ph * 2));
          const ray = RAY[c.pal[Math.min(c.pal.length - 1, Math.floor(m * c.pal.length))]];
          ctx.globalAlpha = Math.min(1, a);
          ctx.drawImage(ray, x - sw / 2, yb - hh, sw, hh);
          if(fringe > 0.01){
            ctx.globalAlpha = Math.min(1, 0.9 * a * fringe);
            ctx.drawImage(RAY.pink, x - sw / 2, yb - hh * 0.12, sw, hh * 0.2);
          }
          strips++;
        }
      }
      return {
        pattern:'flow',
        count:()=>stars.length + motes.length + strips,
        rescale(sx, sy){ stars.forEach(p=>{ p.x *= sx; p.y *= sy; }); motes.forEach(p=>{ p.x *= sx; p.y *= sy; }); },
        update(dt, e){
          // 星はほとんど動かない（夜空の奥行き）。粒子数の上限は星と流れる粒子で分け合う
          settle(stars, Math.round(e.want * 0.35), spawnStar);
          sweep(stars, dt);
          settle(motes, Math.round(e.want * 0.65), ()=>spawnMote(true));
          sweep(motes, dt);
          const v = (10 + 14 * e.lv) * K;
          for(let i = 0; i < motes.length; i++){
            const p = motes[i];
            p.x += v * p.sp * dt;
            p.y += Math.sin(e.t * 0.4 + p.ph + p.x / W * 3) * 6 * K * dt;   // ゆるやかにうねりながら
            if(p.x > W + 20){ const n = spawnMote(false); p.x = n.x; p.y = n.y; }
          }
        },
        draw(alpha, e){
          const t = e.t, L = e.L, br = alpha * e.bright;
          strips = 0;
          nebula(HAZE_AURORA1, L[1], alpha, e);
          nebula(HAZE_AURORA3, L[3], alpha, e);
          // 星
          for(let i = 0; i < stars.length; i++){
            const p = stars[i];
            const tw = 0.5 + 0.5 * Math.sin(t * p.tw + p.ph);
            dot(p.col, p.x, p.y, (2.5 + 4 * p.z) * K, (0.25 + 0.6 * p.z) * tw * p.f * L[1] * br);
          }
          // 左から右へ流れる光の粒子。1つずつ自分の周期で明滅する（パルス状の細かい光）
          for(let i = 0; i < motes.length; i++){
            const p = motes[i];
            const pulse = 0.2 + 0.8 * Math.pow(Math.max(0, Math.sin(t * p.pf + p.ph)), 2);
            const a = (0.5 + 0.4 * L[2]) * pulse * p.f * L[1] * br;
            dot(p.col, p.x, p.y, (3.5 + 2.5 * p.size) * K * (0.8 + 0.4 * pulse), a);
          }
          // カーテン（高い空から順に）
          for(let ci = CURTAINS.length - 1; ci >= 0; ci--){
            const c = CURTAINS[ci];
            const k = L[c.stage];
            if(k > 0.01) curtain(c, k, t, L, br, ci === 0 ? L[4] : 0);
          }
          // 段4：湖面への映り込み（地平の線を境に上下を返し、縦につぶして淡く描く）
          if(L[4] > 0.01){
            const H0 = H * 0.86;
            haze('teal', W / 2, H0, W * 1.3, H * 0.06, 0.16 * L[4] * br);
            ctx.setTransform(1, 0, 0, -0.35, 0, H0 * 1.35);
            for(let ci = 1; ci >= 0; ci--){
              const c = CURTAINS[ci];
              const k = L[c.stage] * 0.3 * L[4];
              if(k > 0.003) curtain(c, k, t, L, br, 0);
            }
            ctx.setTransform(1, 0, 0, 1, 0, 0);
          }
        }
      };
    }

    // Forest（表示名「木漏れ日の森」）
    //   段1 森の気配：足もとの苔色のもやと、左上から差す陽のもや・光の塵がゆっくりただよう
    //   段2 木漏れ日：左上から斜めに差し込む光芒が、ゆっくり明るさを変えながら揺れる。
    //       光芒の中を通る塵がきらりと光る
    //   段3 揺れる光斑：地面に落ちた木漏れ日の光の斑が、葉の揺れに合わせてちらちら揺らぐ・
    //       光芒が増える・光を受けた葉がくるくると舞い落ちる
    //   段4 森の精：蛍がゆっくり明滅しながらさまよう・低く霧が流れる・
    //       ときどき風が吹き抜け、光芒と葉と塵がいっせいにそよぐ
    // ※ Presence の金色の光の玉と取り違えないよう、景色側には大きな金色の玉を置かない
    const HAZE_FOREST1 = [ { col:'moss', x:0.2,  y:0.98, r:1.0,  s:0.03, p:0, a:1.3 },
                           { col:'leaf', x:0.8,  y:0.95, r:0.85, s:0.04, p:2, a:1.0 },
                           { col:'sun',  x:0.08, y:0.02, r:0.9,  s:0.03, p:4, a:1.2 } ];
    // 段2：森全体を包む緑の気配
    const HAZE_FOREST2 = [ { col:'moss', x:0.55, y:0.55, r:1.1,  s:0.02, p:1, a:0.9 },
                           { col:'leaf', x:0.15, y:0.45, r:0.8,  s:0.03, p:3, a:0.6 },
                           { col:'sun',  x:0.35, y:0.12, r:0.7,  s:0.03, p:5, a:0.8 } ];
    // 光芒の画像：横は中央が明るく、縦は上で強く下へ向かって薄れる
    function makeBeam(c){
      const s = document.createElement('canvas');
      s.width = 64; s.height = 256;
      const g = s.getContext('2d');
      const h = g.createLinearGradient(0, 0, 64, 0);
      h.addColorStop(0, 'rgba(' + c + ',0)');
      h.addColorStop(0.5, 'rgba(' + c + ',1)');
      h.addColorStop(1, 'rgba(' + c + ',0)');
      g.fillStyle = h;
      g.fillRect(0, 0, 64, 256);
      g.globalCompositeOperation = 'destination-in';
      const v = g.createLinearGradient(0, 0, 0, 256);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(0.12, 'rgba(0,0,0,.9)');
      v.addColorStop(0.55, 'rgba(0,0,0,.45)');
      v.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = v;
      g.fillRect(0, 0, 64, 256);
      return s;
    }
    const BEAM = { sun:makeBeam(COL.sun), pale:makeBeam(COL.white) };
    function sceneForest(){
      const motes = [], spots = [], leaves = [], flies = [];
      let beams = [], wind = 0;
      // 光芒：左上の梢のすき間から右下へ斜めに差す。段2 で5本、段3 で3本増える
      function makeBeams(){
        beams = [];
        for(let i = 0; i < 8; i++){
          beams.push({ x:W * (0.02 + 0.09 * i + rand(-0.03, 0.03)), y:-H * 0.06,
                       a:rand(0.38, 0.55), w:W * rand(0.07, 0.16), len:H * rand(1.15, 1.5),
                       ph:rand(0, TAU), sp:rand(0.05, 0.12), col:Math.random() < 0.7 ? 'sun' : 'pale',
                       stage:i < 5 ? 2 : 3, k:0 });
        }
      }
      // 光斑：画面の下半分に、木漏れ日の落ちた斑をまとまりで置く
      function makeSpots(){
        spots.length = 0;
        const n = MOBILE ? 14 : 26;
        for(let i = 0; i < n; i++){
          spots.push({ x:rand(0.03, 0.97) * W, y:rand(0.4, 0.98) * H, r:rand(36, 90) * K,
                       f1:rand(0.4, 1.1), f2:rand(0.15, 0.5), ph:rand(0, TAU), ph2:rand(0, TAU),
                       col:Math.random() < 0.75 ? 'sun' : 'leaf' });
        }
      }
      makeBeams();
      makeSpots();
      function spawnMote(){
        return { x:rand(0, W), y:rand(0, H), f:0, dying:false, ph:rand(0, TAU),
                 vx:rand(-2, 2) * K, vy:rand(-4, -1) * K, glow:0 };
      }
      function spawnLeaf(){
        return { x:rand(-0.05, 1) * W, y:rand(-0.1, 0.9) * H, f:0, dying:false,
                 vy:rand(6, 12) * K, vx:rand(1, 4) * K, rot:rand(0, TAU), vr:rand(-1.2, 1.2),
                 size:rand(16, 26) * K, ph:rand(0, TAU), col:pick(['leaf','leaf','sun','moss']) };
      }
      function spawnFly(){
        return { x:rand(0.05, 0.95) * W, y:rand(0.35, 0.95) * H, f:0, dying:false,
                 ax:rand(0.05, 0.12), ay:rand(0.04, 0.1), rx:rand(20, 60) * K, ry:rand(12, 40) * K,
                 ph:rand(0, TAU), bf:rand(0.5, 1.1), bp:rand(0, TAU) };
      }
      // 光芒の中にいるとき、どれだけ明るくなるか（0〜1）
      function inBeam(px, py){
        let best = 0;
        for(let i = 0; i < beams.length; i++){
          const b = beams[i];
          if(b.k <= 0.01) continue;
          const dx = px - b.x, dy = py - b.y;
          const sa = Math.sin(b.a), ca = Math.cos(b.a);
          const along = dx * sa + dy * ca;
          if(along < 0 || along > b.len) continue;
          const perp = Math.abs(dx * ca - dy * sa);
          if(perp < b.w / 2) best = Math.max(best, (1 - perp / (b.w / 2)) * b.k);
        }
        return best;
      }
      return {
        pattern:'forest',
        count:()=>motes.length + leaves.length + flies.length,
        rescale(sx, sy){
          motes.forEach(p=>{ p.x *= sx; p.y *= sy; });
          leaves.forEach(p=>{ p.x *= sx; p.y *= sy; });
          flies.forEach(p=>{ p.x *= sx; p.y *= sy; });
          makeBeams(); makeSpots();
        },
        update(dt, e){
          const t = e.t, L = e.L;
          // 風：ふだんは凪いでいて、段4 ではときどき吹き抜ける
          const gust = Math.pow(Math.max(0, Math.sin(t * 0.045)), 6);
          wind = 0.15 * Math.sin(t * 0.11) + gust * L[4];
          for(let i = 0; i < beams.length; i++){
            const b = beams[i];
            b.k = b.stage === 2 ? L[2] : L[3];
          }
          settle(motes, e.want, spawnMote);
          sweep(motes, dt);
          for(let i = 0; i < motes.length; i++){
            const p = motes[i];
            p.x += (p.vx + Math.sin(t * 0.3 + p.ph) * 3 * K + wind * 24 * K) * dt;
            p.y += (p.vy + Math.cos(t * 0.25 + p.ph) * 2 * K) * dt;
            if(p.y < -10) p.y = H + 10;
            if(p.x < -10) p.x = W + 10; else if(p.x > W + 10) p.x = -10;
            // 光芒の中を通るときだけ、きらりと光る（毎フレームではなく間引いて調べる）
            if(L[2] > 0.01 && ((i + Math.floor(t * 30)) % 3 === 0)) p.glow = inBeam(p.x, p.y);
            else if(L[2] <= 0.01) p.glow = 0;
          }
          settle(leaves, Math.round((MOBILE ? 8 : 16) * L[3] + (MOBILE ? 4 : 8) * L[4]), spawnLeaf);
          sweep(leaves, dt);
          for(let i = 0; i < leaves.length; i++){
            const p = leaves[i];
            p.y += p.vy * dt;
            p.x += (p.vx + Math.sin(t * 0.7 + p.ph) * 8 * K + wind * 40 * K) * dt;
            p.rot += (p.vr + wind * 2) * dt;
            if(p.y > H + 20){ p.y = -20; p.x = rand(-0.05, 1) * W; }
            if(p.x > W + 20) p.x = -20;
          }
          settle(flies, Math.round((MOBILE ? 18 : 36) * L[4]), spawnFly);
          sweep(flies, dt);
        },
        draw(alpha, e){
          const t = e.t, L = e.L, br = alpha * e.bright;
          nebula(HAZE_FOREST1, L[1], alpha, e);
          nebula(HAZE_FOREST2, L[2], alpha, e);
          // 段4：低く流れる霧
          if(L[4] > 0.01){
            const n = MOBILE ? 5 : 8, off = (t * 0.008) % 1;
            for(let i = -1; i <= n; i++){
              const u = (i + off) / n;
              haze(i % 2 ? 'moss' : 'white', u * W, H * (0.86 + 0.04 * Math.sin(u * 5 + t * 0.15)),
                   W / n * 2.4, H * 0.24, 0.2 * L[4] * br);
            }
          }
          // 段2・3：光芒
          for(let i = 0; i < beams.length; i++){
            const b = beams[i];
            if(b.k <= 0.01) continue;
            const breath = 0.55 + 0.45 * Math.sin(t * b.sp + b.ph);
            const a = b.a + 0.025 * Math.sin(t * 0.05 + b.ph) + 0.04 * wind;
            const ca = Math.cos(a), sa = Math.sin(a);
            ctx.setTransform(ca, -sa, sa, ca, b.x, b.y);
            ctx.globalAlpha = Math.min(1, 0.5 * breath * b.k * br);
            ctx.drawImage(BEAM[b.col], -b.w / 2, 0, b.w, b.len);
          }
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          // 段3：地面の光斑。葉の揺れに合わせてちらちら揺らぐ
          if(L[3] > 0.01){
            for(let i = 0; i < spots.length; i++){
              const s = spots[i];
              const flick = 0.35 + 0.65 * Math.abs(Math.sin(t * s.f1 + s.ph) * Math.sin(t * s.f2 + s.ph2 + wind));
              haze(s.col, s.x, s.y, s.r * 2, s.r, 0.55 * flick * L[3] * br);
              dot('white', s.x, s.y, s.r * 0.4, 0.3 * flick * L[3] * br);
            }
          }
          // 光の塵
          for(let i = 0; i < motes.length; i++){
            const p = motes[i];
            const tw = 0.6 + 0.4 * Math.sin(t * 0.8 + p.ph);
            const g = p.glow;
            dot(g > 0.05 ? 'sun' : 'white', p.x, p.y, (3.5 + 6 * g) * K,
                (0.3 + 0.7 * g) * tw * p.f * L[1] * br);
          }
          // 段3：光を受けた葉（細長い光が、回りながら舞い落ちる）
          for(let i = 0; i < leaves.length; i++){
            const p = leaves[i];
            const c = Math.cos(p.rot), s = Math.sin(p.rot);
            const shine = 0.45 + 0.55 * Math.abs(Math.cos(p.rot * 2));
            ctx.setTransform(c, s, -s, c, p.x, p.y);
            ctx.globalAlpha = Math.min(1, 0.85 * shine * p.f * Math.max(L[3], L[4]) * br);
            ctx.drawImage(SPRITE[p.col], -p.size / 2, -p.size * 0.22, p.size, p.size * 0.44);
          }
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          // 段4：蛍（小さな黄緑の光が、ゆっくり明滅しながらさまよう）
          for(let i = 0; i < flies.length; i++){
            const p = flies[i];
            const x = p.x + Math.sin(t * p.ax * TAU + p.ph) * p.rx;
            const y = p.y + Math.sin(t * p.ay * TAU + p.ph * 1.7) * p.ry;
            const blink = Math.pow(Math.max(0, Math.sin(t * p.bf + p.bp)), 3);
            const a = (0.12 + 0.88 * blink) * p.f * L[4] * br;
            haze('firefly', x, y, 48 * K, 48 * K, 0.5 * a);
            dot('firefly', x, y, (8 + 5 * blink) * K, a);
          }
        }
      };
    }
    const MAKERS = { star:sceneStars, flow:sceneFlow, forest:sceneForest };

    // Presence「浮遊する光の玉」：今ほかに聴いている人がいるときだけ、温かい光の玉がゆっくり浮かぶ。
    // 人数は段階（presence 0〜4）でしか受け取らず、段階が上がるほど玉が増える。数は段階ごとの範囲で
    // 揺らぐので、玉の数から正確な人数はわからない。段階が下がったら多い分を約3秒で消す
    const ORB_RANGE = [[0, 0], [1, 2], [3, 5], [6, 9], [12, 16]];
    const orbs = [];
    let nextOrb = 0;
    function updateOrbs(dt, t, tier){
      const range = ORB_RANGE[tier] || ORB_RANGE[0];
      let alive = 0;
      for(let i = 0; i < orbs.length; i++) if(!orbs[i].kill) alive++;
      for(let i = orbs.length - 1; i >= 0 && alive > range[1]; i--){
        if(!orbs[i].kill){ orbs[i].kill = true; alive--; }
      }
      if(tier > 0 && t >= nextOrb && alive < range[1]){
        nextOrb = t + (alive < range[0] ? rand(0.6, 1.5) : rand(5, 10));   // 少ないうちは早めに足す
        orbs.push({ x:rand(0.06, 0.94) * W, y:rand(0.4, 0.98) * H, vy:-rand(6, 12) * K,
                    sw:rand(10, 24) * K, swf:rand(0.1, 0.2), ph:rand(0, TAU),
                    size:rand(34, 50) * K, age:0, life:rand(20, 30), kill:false, k:1 });
      }
      if(tier === 0 && nextOrb < t) nextOrb = t + rand(1, 4);   // 戻ったときにほどなく出るようにする
      for(let i = orbs.length - 1; i >= 0; i--){
        const o = orbs[i];
        o.age += dt;
        if(o.kill) o.k -= dt / 3;
        if(o.age >= o.life || o.k <= 0){ orbs.splice(i, 1); continue; }
        o.y += o.vy * dt;
      }
    }
    function drawOrbs(t){
      for(let i = 0; i < orbs.length; i++){
        const o = orbs[i];
        const a = Math.sin(Math.PI * o.age / o.life) * Math.max(0, o.k);   // ゆっくり現れて、消える
        const x = o.x + Math.sin(t * o.swf * TAU + o.ph) * o.sw;
        const breath = 0.85 + 0.15 * Math.sin(t * 0.8 + o.ph);
        haze('gold', x, o.y, o.size * 3.2, o.size * 3.2, 0.18 * a);
        dot('gold', x, o.y, o.size * breath, 0.6 * a);
        dot('white', x, o.y, o.size * 0.35, 0.45 * a);
      }
    }

    // ---------- 状態と更新 ----------
    let target = { level:0, pattern:'star', presence:0 };
    let lv = 0;                       // 実際に描く強さ（target.level へゆっくり近づく）
    const scenes = [];                // 切り替え中だけ2つになる
    let quality = 1;                  // 自動で軽くするときの倍率（0.3〜1）
    let galleryOn = false, modalOpen = false;
    const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

    function setTarget(s, instant){
      const first = !scenes.length || !!instant;
      target = s;
      if(first || instantMode) lv = s.level;   // 最初の1回と「即時」は遷移させない
      const cur = scenes[scenes.length - 1];
      if(!cur || cur.pattern !== s.pattern){
        const sc = MAKERS[s.pattern]();
        sc.alpha = (first || instantMode) ? 1 : 0;
        sc.goal = 1;
        scenes.forEach(o=>{ o.goal = 0; if(instantMode || first) o.alpha = 0; });
        scenes.push(sc);
        while(scenes.length > 2) scenes.shift();
      }
      if(first || instantMode) prefill();
    }
    // 最初から粒子がそろった状態で描く（開いた瞬間に光が立ち上がって「今何か起きた」と見せないため）
    function prefill(){
      for(let i = 0; i < 50; i++) step(0.25, true);
    }

    // 時刻は描画側の時計で数える（端末やブラウザの時刻の基準に左右されないように）
    let clock = 0;
    function step(dt, warm){
      clock += dt;
      const t = clock;
      if(instantMode || warm) lv = target.level;
      else lv += (target.level - lv) * Math.min(1, dt / 2);   // 約6秒で目標の LEVEL に近づく
      if(Math.abs(target.level - lv) < 0.002) lv = target.level;
      const useLv = galleryOn ? Math.min(lv, 1) : lv;          // イラスト一覧の間は控えめに
      const lo = Math.floor(useLv), hi = Math.min(MAX_LV, lo + 1);
      const cap = (CAPS[lo] + (CAPS[hi] - CAPS[lo]) * (useLv - lo)) * (MOBILE ? 0.5 : 1) * quality;
      const e = { lv:useLv, L:[1, 0, 0, 0, 0], bright:galleryOn ? 0.5 : 1, want:0, t };
      for(let k = 1; k <= MAX_LV; k++) e.L[k] = smooth(useLv - (k - 1));
      for(let i = scenes.length - 1; i >= 0; i--){
        const sc = scenes[i];
        const da = (instantMode || warm) ? 1 : dt / (FADE_MS / 1000);
        if(sc.goal > sc.alpha) sc.alpha = Math.min(sc.goal, sc.alpha + da);
        else if(sc.goal < sc.alpha) sc.alpha = Math.max(sc.goal, sc.alpha - da);
        if(sc.goal === 0 && sc.alpha <= 0){ scenes.splice(i, 1); continue; }
        e.want = Math.round(cap * sc.alpha);   // 切り替え中も合計が上限を超えないよう、不透明度で分け合う
        sc.update(dt, e);
      }
      updateOrbs(dt, t, galleryOn ? 0 : target.presence);
      return e;
    }
    function clearCanvas(){
      [backCtx, frontCtx].forEach(c=>{
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = 1;
        c.clearRect(0, 0, W, H);
      });
    }
    function draw(e){
      clearCanvas();
      ctx = backCtx;
      ctx.globalCompositeOperation = 'lighter';   // 重なるほど明るくなる
      if(e.lv > 0.001) scenes.forEach(sc=>sc.draw(sc.alpha, e));
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if(orbs.length){
        ctx = frontCtx;
        ctx.globalCompositeOperation = 'lighter';
        drawOrbs(e.t);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx = backCtx;
      }
    }
    // デフォルト（LEVEL 0）に落ち着き、光の玉も無いとき。何も描かないので描画を止める
    function resting(){
      return target.level === 0 && lv === 0 && !target.presence && !orbs.length;
    }
    // 見た目の切り替え：景色が見えている間だけ body.fx-on（パネルを透かす）。
    // LEVEL 0 では公開中と同じ見た目にする。何も描かないときは canvas も隠す。変わったときだけ書き換える
    let shownOn = null, shownFront = null, shownCrowd = null, shownCrowdMax = null;
    function syncLook(){
      // presence 3 以上（人が集まっている）：Discord の参加ボタンの縁を光らせる（css の .fx-crowd）
      const crowd = target.presence >= 3;
      if(crowd !== shownCrowd){ shownCrowd = crowd; document.body.classList.toggle('fx-crowd', crowd); }
      // presence 4（最大）：もっと強く光らせる（css の .fx-crowd-max）
      const crowdMax = target.presence >= 4;
      if(crowdMax !== shownCrowdMax){ shownCrowdMax = crowdMax; document.body.classList.toggle('fx-crowd-max', crowdMax); }
      const on = target.level > 0 || lv > 0;
      if(on !== shownOn){
        shownOn = on;
        document.body.classList.toggle('fx-on', on);
        canvas.style.visibility = on ? '' : 'hidden';
      }
      const fv = orbs.length > 0 || target.presence > 0;
      if(fv !== shownFront){ shownFront = fv; front.style.visibility = fv ? '' : 'hidden'; }
    }

    // ---------- ループ ----------
    let raf = 0, last = 0, lastE = null;
    let costSum = 0, costN = 0, costFrom = 0, costAvg = 0;
    function frame(now){
      raf = requestAnimationFrame(frame);
      if(now - last < FRAME_MS - 2) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const c0 = performance.now();
      try{
        lastE = step(dt, false);
        syncLook();
        if(resting()){ clearCanvas(); cancelAnimationFrame(raf); raf = 0; return; }
        draw(lastE);
      }catch(e){ shutdown(); return; }   // 描画で失敗したら止めて従来の見た目に戻す
      const cost = performance.now() - c0;
      costSum += cost; costN++;
      if(now - costFrom >= 2000){
        costAvg = costN ? costSum / costN : 0;
        // 描画が重い端末では粒子を減らす（このページを開いている間は戻さない）
        if(costAvg > SLOW_MS && quality > 0.3) quality = Math.max(0.3, quality * 0.7);
        costSum = 0; costN = 0; costFrom = now;
      }
    }
    function still(){
      // 動きを減らす設定：その時点の景色を1枚の止まった絵として描く
      for(let i = 0; i < 30; i++) lastE = step(0.1, true);
      syncLook();
      if(resting()) clearCanvas(); else draw(lastE);
    }
    function running(){ return !document.hidden && !modalOpen && !(reduced && reduced.matches); }
    function update(){
      if(raf === -1) return;   // 止めた後は再開しない
      cancelAnimationFrame(raf);
      raf = 0;
      if(reduced && reduced.matches){ still(); return; }
      if(running() && !resting()){
        last = performance.now();
        costFrom = last;
        raf = requestAnimationFrame(frame);
      }else if(resting()) clearCanvas();
      syncLook();
    }

    // 入力の見直し（本番では resonance.json の取得）。表示中だけ回す
    let onApplied = null;   // 確認用パネルが「いま描いている状態」を出すのに使う
    function tick(instant){
      try{
        const s = normalize(readInput());
        setTarget(s, instant === true);
        syncLook();
        if(onApplied) onApplied(s);
        if(reduced && reduced.matches) still();
        else if(!raf) update();   // デフォルトで止まっていたら、育ち始めたときに再開する
      }catch(e){ /* 入力の失敗は無視する（前の状態のまま描き続ける） */ }
    }
    let tickTimer = null, watchTimer = null;
    function updateTick(){
      clearInterval(tickTimer);
      tickTimer = null;
      if(!document.hidden){ tick(); tickTimer = setInterval(tick, TICK_MS); }
    }

    shutdown = ()=>{
      cancelAnimationFrame(raf);
      clearInterval(tickTimer);
      clearInterval(watchTimer);
      clearTimeout(fetchTimer);
      raf = -1;   // 以後 update() から再開させない
      canvas.hidden = true;
      front.hidden = true;
      document.body.classList.remove('fx-ready', 'fx-on', 'fx-crowd', 'fx-crowd-max');
    };

    resize();
    canvas.hidden = false;
    front.hidden = false;
    document.body.classList.add('fx-ready');
    tick();

    let resizeTimer = null;
    window.addEventListener('resize', ()=>{
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(()=>{ try{ resize(); if(reduced && reduced.matches) still(); }catch(e){ shutdown(); } }, 200);
    });
    document.addEventListener('visibilitychange', ()=>{ updateTick(); update(); scheduleFetch(); });
    if(reduced && reduced.addEventListener) reduced.addEventListener('change', update);
    // モーダルとイラスト一覧の開閉は1秒ごとに見る（app.js の他の処理には手を入れない）
    const galleryPage = document.getElementById('galleryPage');
    watchTimer = setInterval(()=>{
      const m = !!document.querySelector('.modal.open');
      const g = !!(galleryPage && galleryPage.classList.contains('active'));
      if(g !== galleryOn) galleryOn = g;
      if(m !== modalOpen){ modalOpen = m; update(); }
    }, 1000);

    // --- 確認用パネル（?resonance=panel のときだけ） ---
    // 開き直さずに入力を切り替える。固定の文字だけを textContent で入れる
    if(usePanel){
      try{
        const ROWS = [
          { key:'pattern',  label:'pattern',  opts:[['star','star'],['flow','flow'],['forest','forest'],['cycle','cycle']], def:'star' },
          { key:'level',    label:'level',    opts:[['0','0'],['1','1'],['2','2'],['3','3'],['4','4'],['decay','decay']], def:'0' },
          { key:'presence', label:'presence', opts:[['0','0'],['1','1'],['2','2'],['3','3'],['4','4']], def:'0' },
          { key:'status',   label:'status',   opts:[['ok','ok'],['unknown','unknown'],['stale','stale']], def:'ok' },
          { key:'_speed',   label:'遷移',     opts:[['slow','ゆっくり'],['instant','即時']], def:'slow' }
        ];
        const el = (tag, cls, text)=>{
          const n = document.createElement(tag);
          if(cls) n.className = cls;
          if(text != null) n.textContent = text;
          return n;
        };
        const panel = el('div', 'aura-panel');
        const head = el('button', 'aura-panel-h', 'RESONANCE');
        head.type = 'button';
        head.setAttribute('aria-expanded', 'true');
        head.addEventListener('click', ()=>{
          const open = panel.classList.toggle('is-closed') === false;
          head.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        panel.appendChild(head);
        const body = el('div', 'aura-panel-body');
        ROWS.forEach(row=>{
          const line = el('div', 'aura-panel-row');
          line.appendChild(el('span', 'aura-panel-k', row.label));
          const btns = [];
          const cur = ()=> row.key === '_speed' ? (instantMode ? 'instant' : 'slow') : (params[row.key] || row.def);
          const mark = ()=> btns.forEach(b=>b.setAttribute('aria-pressed', b.dataset.v === cur() ? 'true' : 'false'));
          row.opts.forEach(([v, text])=>{
            const b = el('button', null, text);
            b.type = 'button';
            b.dataset.v = v;
            b.addEventListener('click', ()=>{
              if(row.key === '_speed') instantMode = v === 'instant';
              else{
                if(row.key === 'level' && v === 'decay') decayFrom = Date.now();   // 押した時点から下がり始める
                params[row.key] = v;
              }
              mark();
              tick();
            });
            btns.push(b);
            line.appendChild(b);
          });
          mark();
          body.appendChild(line);
        });
        const now = el('div', 'aura-panel-now');
        const perf = el('div', 'aura-panel-perf');
        body.appendChild(now);
        body.appendChild(perf);
        panel.appendChild(body);
        document.body.appendChild(panel);
        onApplied = s=>{
          now.textContent = '描画中：' + s.pattern + ' / level ' + s.level + ' / presence ' + s.presence;
        };
        // 実機での計測用：粒子の数・1フレームの描画時間・自動で減らした倍率
        setInterval(()=>{
          let n = orbs.length;
          scenes.forEach(sc=>{ n += sc.count(); });
          const state = raf > 0 ? '' : (resting() ? ' / 停止中（デフォルト）' : ' / 停止中');
          perf.textContent = '粒子 ' + n + ' / 描画 ' + costAvg.toFixed(1) + 'ms / 品質 ' + Math.round(quality * 100) + '%' + state;
        }, 1000);
        tick();
      }catch(e){ /* パネルが作れなくても演出は続ける */ }
    }

    // --- 公開前の確認（?resonance=live）：受け取った値と描画の状態を右下に出す（ボタンは無い） ---
    if(liveCheck && live){
      try{
        const box = document.createElement('div');
        box.className = 'aura-panel';
        const head = document.createElement('div');
        head.className = 'aura-panel-h';
        head.textContent = 'RESONANCE（LIVE）';
        const body = document.createElement('div');
        body.className = 'aura-panel-body';
        const got = document.createElement('div');
        const now = document.createElement('div');
        now.className = 'aura-panel-now';
        const perf = document.createElement('div');
        perf.className = 'aura-panel-perf';
        body.appendChild(got); body.appendChild(now); body.appendChild(perf);
        box.appendChild(head); box.appendChild(body);
        document.body.appendChild(box);
        onApplied = s=>{
          now.textContent = '描画中：' + s.pattern + ' / level ' + s.level + ' / presence ' + s.presence;
        };
        setInterval(()=>{
          const d = liveData && liveData.raw;
          got.textContent = d
            ? '受信：' + d.generated_at + ' / ' + d.status + ' / ' + d.pattern + ' / level ' + d.level + ' / presence ' + d.presence
            : '受信：まだ届いていません' + (liveError ? '（' + liveError + '）' : '');
          let n = orbs.length;
          scenes.forEach(sc=>{ n += sc.count(); });
          const state = raf > 0 ? '' : (resting() ? ' / 停止中（デフォルト）' : ' / 停止中');
          perf.textContent = '粒子 ' + n + ' / 描画 ' + costAvg.toFixed(1) + 'ms / 品質 ' + Math.round(quality * 100) + '%' + state;
        }, 1000);
      }catch(e){ /* 表示が作れなくても演出は続ける */ }
    }

    if(live){ fetchLive(); scheduleFetch(); }
    update();
  }catch(e){
    if(shutdown) shutdown();   // 何かあれば従来の見た目に戻す
    else{ canvas.hidden = true; front.hidden = true; document.body.classList.remove('fx-ready', 'fx-on', 'fx-crowd', 'fx-crowd-max'); }
  }
})();

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
// 画面全体の canvas（#fxCanvas）に光の粒子を描く。CLAUDE.md 11章。
// - LEVEL（0〜3・強さ）、Pattern（景色）、Presence（今ほかに聴いている人がいるか）を別々に扱う
// - 景色も強さもサイト全体で共通。本人の操作や再生状態では見え方を変えない
// - 再生処理（initRadio）とは切り離す。audio・poll・render には触らない。ここが失敗しても放送は止めない
// - 軽さ：毎秒30回まで・解像度を落とす・粒子の上限・重い端末では自動で減らす・
//   非表示やモーダル表示中は止める・動きを減らす設定では止まった絵にする
// - 入力は試作中のため URL パラメータと確認用パネル。
//   本番では readInput を resonance.json（CLAUDE.md 4-5）の取得に差し替える
(function initResonance(){
  const canvas = document.getElementById('fxCanvas');
  if(!canvas) return;
  let shutdown = null;   // 描画中に例外が出たときの後始末
  try{
    let q;
    try{ q = new URLSearchParams(location.search); }catch(e){ return; }
    const KEYS = ['level','pattern','presence','status'];
    const usePanel = q.get('resonance') === 'panel';   // 確認用パネル（?resonance=panel）
    const hasParam = usePanel || KEYS.some(k=>q.has(k));
    const env = window.URATEN_ENV || {};
    if(env.resonance !== true && !hasParam) return;   // フラグもパラメータも無ければ従来の見た目のまま

    const ctx = canvas.getContext('2d');
    if(!ctx) return;

    const PATTERNS = ['ambient','flow','pulse'];
    const STALE_MS = 10 * 60 * 1000;  // これより古い値は「集計が止まっている」とみなす
    const FADE_MS  = 30000;           // 景色のクロスフェード
    const TICK_MS  = 5000;            // 入力を見直す間隔（本番は resonance.json の取得間隔）
    const FRAME_MS = 1000 / 30;       // 描くのは毎秒30回まで
    const CAPS     = [60, 150, 260, 400];   // LEVEL ごとの粒子数の上限（PC。スマホは半分）
    const SLOW_MS  = 12;              // 1フレームの描画がこれを超え続けたら粒子を減らす
    let decayFrom = Date.now();
    let instantMode = false;          // 確認用パネルの「即時」

    // 試作の入力の元。URL から作り、確認用パネルが書き換える
    const params = {};
    KEYS.forEach(k=>{ params[k] = q.get(k); });

    // --- 入力（試作）。{status, level, pattern, presence, generatedAt} を返す ---
    function readInput(){
      const now = Date.now();
      const lv = params.level;
      let level = 0;
      if(lv === 'decay') level = Math.max(0, 3 - Math.floor((now - decayFrom) / 40000));  // 3 から約2分で 0 へ
      else if(/^[0-3]$/.test(lv || '')) level = Number(lv);
      let pattern = params.pattern || 'ambient';
      if(pattern === 'cycle') pattern = PATTERNS[Math.floor(now / 60000) % PATTERNS.length];
      const st = params.status;
      return {
        status: st === 'unknown' ? 'unknown' : 'ok',
        level, pattern,
        presence: params.presence === '1',
        generatedAt: st === 'stale' ? now - STALE_MS - 60000 : now
      };
    }

    // --- 受け取った値の扱い（CLAUDE.md 4-5 のフロント側仕様） ---
    // 状態不明・古い値・壊れた値は level 0 / presence なし（誰かがいると偽らない）。
    // 知らない pattern は ambient として描く
    function normalize(v){
      const pattern = (v && PATTERNS.indexOf(v.pattern) >= 0) ? v.pattern : 'ambient';
      const fresh = !!v && v.status === 'ok' && typeof v.generatedAt === 'number'
                    && Date.now() - v.generatedAt <= STALE_MS;
      if(!fresh) return { level:0, pattern, presence:false };
      const level = (Number.isInteger(v.level) && v.level >= 0 && v.level <= 3) ? v.level : 0;
      return { level, pattern, presence: v.presence === true };
    }

    // ---------- 描画の下ごしらえ ----------
    const rand = (a, b)=> a + Math.random() * (b - a);
    const pick = list=> list[Math.floor(Math.random() * list.length)];
    const COL = {
      pink:[255,62,165], violet:[139,108,255], cyan:[63,227,255], white:[255,244,255], amber:[255,176,92]
    };
    // 光の粒の画像を色ごとに1回だけ作る（中心が白く、外へぼける）。以後は drawImage で貼るだけ
    const SPRITE = {}, HAZE = {};
    Object.keys(COL).forEach(name=>{
      const c = COL[name];
      const s = document.createElement('canvas');
      s.width = s.height = 64;
      const g = s.getContext('2d');
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0,   'rgba(255,255,255,1)');
      grd.addColorStop(.2,  'rgba(' + c + ',1)');
      grd.addColorStop(.5,  'rgba(' + c + ',.35)');
      grd.addColorStop(1,   'rgba(' + c + ',0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      SPRITE[name] = s;
      // 画面の色を作る大きなもや（芯のない柔らかい光）
      const h = document.createElement('canvas');
      h.width = h.height = 128;
      const hg = h.getContext('2d');
      const hgrd = hg.createRadialGradient(64, 64, 0, 64, 64, 64);
      hgrd.addColorStop(0,  'rgba(' + c + ',.9)');
      hgrd.addColorStop(.5, 'rgba(' + c + ',.3)');
      hgrd.addColorStop(1,  'rgba(' + c + ',0)');
      hg.fillStyle = hgrd;
      hg.fillRect(0, 0, 128, 128);
      HAZE[name] = h;
    });
    function dot(name, x, y, size, a){
      if(a <= 0.003 || size < 0.5) return;
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.drawImage(SPRITE[name], x - size / 2, y - size / 2, size, size);
    }
    // 景色ごとの色のもや。list の各要素 { col, x, y（画面に対する位置 0〜1）, r（大きさ）, s（揺れの速さ）, p, a（濃さ） }
    function nebula(list, alpha, e, t){
      const big = Math.max(W, H);
      for(let i = 0; i < list.length; i++){
        const n = list[i];
        const x = W * (n.x + 0.08 * Math.sin(t * n.s + n.p));
        const y = H * (n.y + 0.07 * Math.cos(t * n.s * 0.8 + n.p));
        const size = big * n.r * (1 + 0.12 * e.lv);
        ctx.globalAlpha = Math.min(1, (0.12 + 0.11 * e.lv) * (n.a || 1) * alpha * e.bright);
        ctx.drawImage(HAZE[n.col], x - size / 2, y - size / 2, size, size);
      }
    }
    // LEVEL が上がるほど色の数が増える
    function palette(lv, base){
      const list = base.slice();
      if(lv >= 1.5) list.push('pink');
      if(lv >= 2.5) list.push('amber', 'white');
      return list;
    }

    // canvas の大きさ。光はぼけているので、解像度を落として描く
    let W = 0, H = 0, K = 0.75, MOBILE = false;
    function resize(){
      MOBILE = window.innerWidth <= 860;
      K = MOBILE ? 0.6 : 0.75;
      const nw = Math.max(1, Math.round(window.innerWidth * K));
      const nh = Math.max(1, Math.round(window.innerHeight * K));
      if(W && H) scenes.forEach(sc=>sc.rescale(nw / W, nh / H));
      W = canvas.width = nw;
      H = canvas.height = nh;
    }

    // 粒子の数を目標に近づける（増やすときは少しずつ現れ、減らすときはゆっくり消える）
    function settle(parts, want, spawn){
      let alive = 0;
      for(let i = 0; i < parts.length; i++) if(!parts[i].dying) alive++;
      let add = Math.min(want - alive, 10);
      while(add-- > 0) parts.push(spawn());
      for(let i = parts.length - 1; i >= 0 && alive > want; i--){
        if(!parts[i].dying){ parts[i].dying = true; alive--; }
      }
    }
    function fade(p, dt){
      p.f = p.dying ? p.f - dt / 1.2 : Math.min(1, p.f + dt / 1.5);
      return p.f > 0;
    }

    // ---------- 景色 ----------
    // どの景色も { pattern, update(dt, t, e), draw(alpha, e), count(), rescale(sx, sy) } を持つ。
    // e … { lv（0〜3 の連続値）, want（この景色に割り当てた粒子数）, bright, speed }

    // Ambient「星屑の海」：奥行きのある粒子が漂い、瞬く。LEVEL 2 以上で大きなぼけた光の玉が加わる
    // 星屑の海：深い青紫
    const HAZE_AMBIENT = [
      { col:'violet', x:0.22, y:0.28, r:0.9, s:0.05, p:0 },
      { col:'cyan',   x:0.82, y:0.72, r:0.8, s:0.04, p:2, a:0.7 },
      { col:'violet', x:0.7,  y:0.15, r:0.6, s:0.06, p:4, a:0.6 }
    ];
    function sceneAmbient(){
      const parts = [];
      let lvNow = 0;
      function spawn(){
        const big = lvNow >= 1 && Math.random() < 0.06;
        const z = big ? rand(0.6, 1) : Math.pow(Math.random(), 1.6);
        return { x:rand(0, W), y:rand(0, H), z, big, f:0, dying:false,
                 dx:rand(-0.5, 0.5), dy:rand(-1, -0.25), ph:rand(0, 6.3), tw:rand(0.6, 2.2),
                 col: big ? pick(['violet','pink','cyan']) : pick(palette(lvNow, ['violet','cyan','white'])) };
      }
      return {
        pattern:'ambient',
        count:()=>parts.length,
        rescale(sx, sy){ parts.forEach(p=>{ p.x *= sx; p.y *= sy; }); },
        update(dt, t, e){
          lvNow = e.lv;
          settle(parts, e.want, spawn);
          for(let i = parts.length - 1; i >= 0; i--){
            const p = parts[i];
            if(!fade(p, dt)){ parts.splice(i, 1); continue; }
            const v = (6 + 22 * p.z) * K * e.speed * (p.big ? 0.4 : 1);
            p.x += p.dx * v * dt;
            p.y += p.dy * v * dt;
            if(p.y < -40) p.y = H + 40;
            if(p.x < -40) p.x = W + 40; else if(p.x > W + 40) p.x = -40;
          }
        },
        draw(alpha, e, t){
          nebula(HAZE_AMBIENT, alpha, e, t);
          for(let i = 0; i < parts.length; i++){
            const p = parts[i];
            if(p.big){
              dot(p.col, p.x, p.y, (140 + 220 * p.z) * K, 0.16 * p.f * alpha * e.bright);
            }else{
              const tw = 0.55 + 0.45 * Math.sin(t * p.tw + p.ph);
              dot(p.col, p.x, p.y, (4 + 38 * p.z * p.z) * K * (1 + e.lv * 0.15),
                  (0.3 + 0.7 * p.z) * tw * p.f * alpha * e.bright);
            }
          }
        }
      };
    }

    // Flow「光の川」：曲がりくねった流れに沿って粒子が横切り、尾を引く。LEVEL 2 以上で2本目の川
    // 光の川：ピンクとシアン
    const HAZE_FLOW = [
      { col:'pink',   x:0.18, y:0.38, r:0.85, s:0.07, p:1 },
      { col:'cyan',   x:0.85, y:0.7,  r:0.8,  s:0.06, p:3, a:0.8 },
      { col:'violet', x:0.5,  y:0.1,  r:0.6,  s:0.05, p:5, a:0.6 }
    ];
    function sceneFlow(){
      const parts = [];
      let lvNow = 0;
      const RIVERS = [
        { base:0.36, amp:0.16, freq:2.2, w:0.22, ph:0,   cols:['pink','violet'] },
        { base:0.70, amp:0.12, freq:3.1, w:-0.17, ph:2.1, cols:['cyan','violet'] }
      ];
      const riverY = (r, x, t)=> H * (r.base + r.amp * Math.sin((x / W) * r.freq * Math.PI + t * r.w + r.ph)
                                      + 0.04 * Math.sin((x / W) * 7.3 + t * 0.5 + r.ph));
      function spawn(fresh){
        const second = lvNow >= 1.6 && Math.random() < Math.min(0.5, (lvNow - 1.6) * 0.6);
        const r = second ? 1 : 0;
        const x = fresh ? rand(-30, W) : -30;
        return { r, x, off:(Math.random() + Math.random() + Math.random() - 1.5) * 0.66, f:0, dying:false,
                 sp:rand(0.7, 1.3), size:rand(0.6, 1.4), trail:[],
                 col:pick(palette(lvNow, RIVERS[r].cols)) };
      }
      return {
        pattern:'flow',
        count:()=>parts.length,
        rescale(sx, sy){ parts.forEach(p=>{ p.x *= sx; p.trail.length = 0; }); },
        update(dt, t, e){
          lvNow = e.lv;
          settle(parts, e.want, ()=>spawn(true));
          const width = H * 0.075 * (1 + e.lv * 0.3);
          for(let i = parts.length - 1; i >= 0; i--){
            const p = parts[i];
            if(!fade(p, dt)){ parts.splice(i, 1); continue; }
            p.x += W * 0.07 * p.sp * e.speed * dt;
            if(p.x > W + 30){ Object.assign(p, spawn(false), { f:p.f, dying:p.dying }); continue; }
            const y = riverY(RIVERS[p.r], p.x, t) + p.off * width + Math.sin(t * 1.7 + p.x * 0.02) * width * 0.15;
            p.trail.push(p.x, y);
            if(p.trail.length > 24) p.trail.splice(0, 2);   // 直前の12点だけ覚える
          }
        },
        draw(alpha, e, t){
          nebula(HAZE_FLOW, alpha, e, t);
          ctx.lineCap = 'round';
          for(let i = 0; i < parts.length; i++){
            const p = parts[i], tr = p.trail, n = tr.length;
            if(n < 4) continue;
            const a = p.f * alpha * e.bright;
            const c = COL[p.col];
            ctx.globalAlpha = 0.5 * a;
            ctx.strokeStyle = 'rgb(' + c + ')';
            ctx.lineWidth = (2 + p.size * 2.4) * K * (1 + e.lv * 0.25);
            ctx.beginPath();
            ctx.moveTo(tr[0], tr[1]);
            for(let j = 2; j < n; j += 2) ctx.lineTo(tr[j], tr[j + 1]);
            ctx.stroke();
            dot(p.col, tr[n - 2], tr[n - 1], (14 + 16 * p.size) * K * (1 + e.lv * 0.15), a);
          }
        }
      };
    }

    // Pulse「鼓動」：プレーヤーの中心から、一定のリズムで粒子の輪が広がる。背景の粒は拍に合わせて明るくなる
    // 鼓動：暖色
    const HAZE_PULSE = [
      { col:'amber', x:0.85, y:0.75, r:0.75, s:0.05, p:0, a:0.8 },
      { col:'pink',  x:0.15, y:0.8,  r:0.7,  s:0.06, p:2, a:0.7 }
    ];
    function scenePulse(){
      const dots = [], rings = [], waves = [];
      let lvNow = 0, beatAt = -10, nextBeat = 0, beatNo = 0, cx = 0, cy = 0, centerAt = -1;
      const RING_COLS = ['pink','violet','cyan'];
      function spawnDot(){
        return { x:rand(0, W), y:rand(0, H), z:Math.random(), f:0, dying:false,
                 col:pick(palette(lvNow, ['violet','cyan'])) };
      }
      function center(t){
        if(t - centerAt < 0.25) return;   // プレーヤーの位置は 0.25 秒ごとに測り直す
        centerAt = t;
        const pl = document.getElementById('player');
        const r = pl && pl.offsetParent ? pl.getBoundingClientRect() : null;
        if(r && r.bottom > 0 && r.top < window.innerHeight){
          cx = (r.left + r.width / 2) * K; cy = (r.top + r.height / 2) * K;
        }else{
          cx = W / 2; cy = H * 0.15;
        }
      }
      return {
        pattern:'pulse',
        count:()=>dots.length + rings.length,
        rescale(sx, sy){ dots.forEach(p=>{ p.x *= sx; p.y *= sy; }); rings.length = 0; waves.length = 0; },
        update(dt, t, e){
          lvNow = e.lv;
          center(t);
          // 輪の粒子は拍ごとに出るので、背景の粒には上限の6割を回す
          settle(dots, Math.round(e.want * 0.6), spawnDot);
          for(let i = dots.length - 1; i >= 0; i--) if(!fade(dots[i], dt)) dots.splice(i, 1);
          const period = 60 / (54 + 14 * e.lv);   // 毎分54拍（LEVEL 0）〜96拍（LEVEL 3）
          if(t >= nextBeat){
            nextBeat = t + period;
            beatAt = t;
            const n = Math.round((12 + 12 * e.lv) * Math.min(1, e.want / 60 + 0.2));
            const col = RING_COLS[beatNo++ % RING_COLS.length];
            const v0 = (110 + 70 * e.lv) * K;
            waves.push({ age:0, v0, col });
            for(let i = 0; i < n; i++){
              const ang = (i / n) * Math.PI * 2 + rand(-0.08, 0.08);
              const v = v0 * rand(0.85, 1.15);
              rings.push({ x:cx, y:cy, vx:Math.cos(ang) * v, vy:Math.sin(ang) * v, life:2.6, age:0, col });
            }
          }
          for(let i = rings.length - 1; i >= 0; i--){
            const p = rings[i];
            p.age += dt;
            if(p.age >= p.life){ rings.splice(i, 1); continue; }
            const damp = Math.exp(-dt * 0.9);
            p.vx *= damp; p.vy *= damp;
            p.x += p.vx * dt; p.y += p.vy * dt;
          }
          for(let i = waves.length - 1; i >= 0; i--){
            waves[i].age += dt;
            if(waves[i].age >= 2.6) waves.splice(i, 1);
          }
          this.flash = Math.exp(-(t - beatAt) * 3.5);
        },
        flash:0,
        draw(alpha, e, t){
          const fl = this.flash;
          // 暖色のもや。中心のもやは拍に合わせて明るくなる
          nebula(HAZE_PULSE, alpha, e, t);
          const big = Math.max(W, H);
          ctx.globalAlpha = Math.min(1, (0.18 + 0.1 * e.lv) * (0.5 + fl) * alpha * e.bright);
          ctx.drawImage(HAZE.pink, cx - big * 0.35, cy - big * 0.35, big * 0.7, big * 0.7);
          // 拍の瞬間に、中心がふわっと明るくなる
          dot(RING_COLS[(beatNo + 2) % 3], cx, cy, (380 + 160 * e.lv) * K, 0.35 * fl * alpha * e.bright);
          // 広がる光の輪
          for(let i = 0; i < waves.length; i++){
            const w = waves[i];
            const life = 1 - w.age / 2.6;
            const r = w.v0 * (1 - Math.exp(-0.9 * w.age)) / 0.9;
            ctx.globalAlpha = 0.45 * life * life * alpha * e.bright;
            ctx.strokeStyle = 'rgb(' + COL[w.col] + ')';
            ctx.lineWidth = (2 + 4 * life) * K;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
          }
          for(let i = 0; i < dots.length; i++){
            const p = dots[i];
            dot(p.col, p.x, p.y, (4 + 10 * p.z) * K, (0.18 + 0.3 * p.z + 0.6 * fl * p.z) * p.f * alpha * e.bright);
          }
          for(let i = 0; i < rings.length; i++){
            const p = rings[i];
            const life = 1 - p.age / p.life;
            dot(p.col, p.x, p.y, (16 + 8 * e.lv) * K, life * life * alpha * e.bright);
          }
        }
      };
    }
    const MAKERS = { ambient:sceneAmbient, flow:sceneFlow, pulse:scenePulse };

    // Presence「流れ星」：今ほかに聴いている人がいるときだけ、ときどき画面を横切る（景色とは別に描く）
    const comets = [];
    let nextComet = 0;
    function updateComets(dt, t, on){
      if(on && t >= nextComet){
        nextComet = t + rand(6, 14);
        const fromLeft = Math.random() < 0.5;
        const ang = rand(0.25, 0.6) * (fromLeft ? 1 : -1);
        const v = W * rand(0.55, 0.8);
        comets.push({ x:fromLeft ? rand(-0.1, 0.4) * W : rand(0.6, 1.1) * W, y:rand(-0.05, 0.3) * H,
                      vx:Math.cos(ang) * v * (fromLeft ? 1 : -1), vy:Math.abs(Math.sin(ang)) * v,
                      age:0, life:rand(1.4, 2), trail:[] });
      }
      if(!on && nextComet < t) nextComet = t + rand(2, 6);   // 戻ったときにすぐ出ないようにする
      for(let i = comets.length - 1; i >= 0; i--){
        const c = comets[i];
        c.age += dt;
        if(c.age >= c.life){ comets.splice(i, 1); continue; }
        c.x += c.vx * dt; c.y += c.vy * dt;
        c.trail.push(c.x, c.y);
        if(c.trail.length > 36) c.trail.splice(0, 2);
      }
    }
    function drawComets(){
      for(let i = 0; i < comets.length; i++){
        const c = comets[i], tr = c.trail, n = tr.length;
        if(n < 4) continue;
        const a = Math.sin(Math.PI * c.age / c.life);   // 現れて、消える
        for(let j = 2; j < n; j += 2){
          const k = j / n;
          ctx.globalAlpha = a * k * 0.8;
          ctx.strokeStyle = 'rgb(' + COL.cyan + ')';
          ctx.lineWidth = 3.2 * K * k;
          ctx.beginPath();
          ctx.moveTo(tr[j - 2], tr[j - 1]);
          ctx.lineTo(tr[j], tr[j + 1]);
          ctx.stroke();
        }
        dot('white', tr[n - 2], tr[n - 1], 34 * K, a);
      }
    }

    // ---------- 状態と更新 ----------
    let target = { level:0, pattern:'ambient', presence:false };
    let lv = 0;                       // 実際に描く強さ（target.level へゆっくり近づく）
    const scenes = [];                // [{…景色, alpha, goal}]。切り替え中だけ2つになる
    let quality = 1;                  // 自動で軽くするときの倍率（0.3〜1）
    let galleryOn = false, modalOpen = false;
    const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

    function setTarget(s){
      const first = !scenes.length;
      target = s;
      if(first || instantMode) lv = s.level;   // 最初の1回と「即時」は遷移させない
      const cur = scenes[scenes.length - 1];
      if(!cur || cur.pattern !== s.pattern){
        const sc = MAKERS[s.pattern]();
        sc.alpha = (first || instantMode) ? 1 : 0;
        sc.goal = 1;
        scenes.forEach(o=>{ o.goal = 0; if(instantMode) o.alpha = 0; });
        scenes.push(sc);
        while(scenes.length > 2) scenes.shift();
        if(first || instantMode) prefill();
      }
    }
    // 最初から粒子がそろった状態で描く（開いた瞬間に光が立ち上がって「今何か起きた」と見せないため）
    function prefill(){
      for(let i = 0; i < 40; i++) step(0.25, true);
    }

    // 時刻は描画側の時計で数える（端末やブラウザの時刻の基準に左右されないように）
    let clock = 0;
    function step(dt, warm){
      clock += dt;
      const t = clock;
      if(instantMode || warm) lv = target.level;
      else lv += (target.level - lv) * Math.min(1, dt / 2);   // 約6秒で目標の LEVEL に近づく
      const useLv = galleryOn ? 0 : lv;
      const cap = (CAPS[Math.floor(useLv)] + (CAPS[Math.min(3, Math.floor(useLv) + 1)] - CAPS[Math.floor(useLv)]) * (useLv % 1))
                  * (MOBILE ? 0.5 : 1) * quality;
      const e = { lv:useLv, bright:(0.7 + 0.1 * useLv) * (galleryOn ? 0.5 : 1), speed:1 + 0.35 * useLv, want:0, t };
      for(let i = scenes.length - 1; i >= 0; i--){
        const sc = scenes[i];
        const da = (instantMode || warm) ? 1 : dt / (FADE_MS / 1000);
        if(sc.goal > sc.alpha) sc.alpha = Math.min(sc.goal, sc.alpha + da);
        else if(sc.goal < sc.alpha) sc.alpha = Math.max(sc.goal, sc.alpha - da);
        if(sc.goal === 0 && sc.alpha <= 0){ scenes.splice(i, 1); continue; }
        e.want = Math.round(cap * sc.alpha);   // 切り替え中も合計が上限を超えないよう、不透明度で分け合う
        sc.update(dt, t, e);
      }
      updateComets(dt, t, target.presence && !galleryOn);
      return e;
    }
    function draw(e){
      const t = e.t;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';   // 重なるほど明るくなる
      scenes.forEach(sc=>sc.draw(sc.alpha, e, t));
      drawComets();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
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
      draw(lastE);
    }
    function running(){ return !document.hidden && !modalOpen && !(reduced && reduced.matches); }
    function update(){
      if(raf === -1) return;   // 止めた後は再開しない
      cancelAnimationFrame(raf);
      raf = 0;
      if(reduced && reduced.matches){ still(); return; }
      if(running()){
        last = performance.now();
        costFrom = last;
        raf = requestAnimationFrame(frame);
      }
    }

    // 入力の見直し（本番では resonance.json の取得）。表示中だけ回す
    let onApplied = null;   // 確認用パネルが「いま描いている状態」を出すのに使う
    function tick(){
      try{
        const s = normalize(readInput());
        setTarget(s);
        if(onApplied) onApplied(s);
        if(reduced && reduced.matches) still();
      }catch(e){ /* 入力の失敗は無視する（前の状態のまま描き続ける） */ }
    }
    let tickTimer = null;
    function updateTick(){
      clearInterval(tickTimer);
      tickTimer = null;
      if(!document.hidden){ tick(); tickTimer = setInterval(tick, TICK_MS); }
    }

    let watchTimer = null;
    shutdown = ()=>{
      cancelAnimationFrame(raf);
      clearInterval(tickTimer);
      clearInterval(watchTimer);
      raf = -1;   // 以後 update() から再開させない
      canvas.hidden = true;
      document.body.classList.remove('fx-on');
    };

    resize();
    canvas.hidden = false;
    document.body.classList.add('fx-on');
    tick();

    let resizeTimer = null;
    window.addEventListener('resize', ()=>{
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(()=>{ try{ resize(); if(reduced && reduced.matches) still(); }catch(e){ shutdown(); } }, 200);
    });
    document.addEventListener('visibilitychange', ()=>{ updateTick(); update(); });
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
          { key:'pattern',  label:'pattern',  opts:[['ambient','ambient'],['flow','flow'],['pulse','pulse'],['cycle','cycle']], def:'ambient' },
          { key:'level',    label:'level',    opts:[['0','0'],['1','1'],['2','2'],['3','3'],['decay','decay']], def:'0' },
          { key:'presence', label:'presence', opts:[['0','off'],['1','on']], def:'0' },
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
          now.textContent = '描画中：' + s.pattern + ' / level ' + s.level + ' / presence ' + (s.presence ? 'on' : 'off');
        };
        // 実機での計測用：粒子の数・1フレームの描画時間・自動で減らした倍率
        setInterval(()=>{
          let n = comets.length;
          scenes.forEach(sc=>{ n += sc.count(); });
          perf.textContent = '粒子 ' + n + ' / 描画 ' + costAvg.toFixed(1) + 'ms / 品質 ' + Math.round(quality * 100) + '%'
                             + (raf ? '' : ' / 停止中');
        }, 1000);
        tick();
      }catch(e){ /* パネルが作れなくても演出は続ける */ }
    }

    update();
  }catch(e){
    if(shutdown) shutdown();   // 何かあれば従来の見た目に戻す
    else{ canvas.hidden = true; document.body.classList.remove('fx-on'); }
  }
})();

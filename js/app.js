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

  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeWork();closeSched();closeSongs();closeMenu()}});


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
  // この形のときはアートを出さず、CSS のレコード盤（.vinyl）に落とす。
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

    // 出演者は空でも行を残す（.cast-link-row と同じく位置を固定するため）
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


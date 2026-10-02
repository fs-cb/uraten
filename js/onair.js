/* =========================================================
   URATEN 放送予定（index.html / schedule.html 共用）

   - データは https://media.ura-ten.jp/onair/programs.json を fetch で読む（5分ごとに読み直す）
   - 「放送日」は 5:00〜翌5:00。区切りは JSON の day_start を使う（既定 05:00）
   - 時刻の判定・表示はすべて日本時間（JST, UTC+9 固定）で行う。
     端末のタイムゾーンに依存させない。日本には夏時間がないため、
     Intl ではなく UTC+9 のオフセット計算で扱う（hourCycle の実装差を避ける）
   - 0:00〜4:59 の番組は前の放送日に並べ、時刻は 25:00 形式で出す
   - title / cast / summary / songs は申込者が入力した文字列。必ず textContent で入れる
   - url は http(s) で始まるものだけリンクにする（rel="noopener"・別タブ）
   - 状態はブラウザに保存しない。外部ライブラリを使わない

   トップに出すのは「このあと」だけ。番組内容・曲目・区分（kind）は
   当日のスケジュール（モーダル）と schedule.html にのみ出す。
========================================================= */
(function (global) {
  'use strict';

  var DATA_URL   = 'https://media.ura-ten.jp/onair/programs.json';
  var RELOAD_MS  = 5 * 60 * 1000;   // JSON は15分ごとに作り直される。5分で読み直せば十分
  var TOP_MAX    = 2;               // トップの「このあと」に出す数
  var DAYS       = 7;               // schedule.html に出す日数
  var CLAMP_CHAR = 70;              // 番組内容：この文字数を超えたら畳む（畳んだ状態は2行）
  var CLAMP_LINE = 2;               // 番組内容：この行数を超えたら畳む
  var JST_OFFSET = 9 * 3600 * 1000;
  var WDAY       = ['日', '月', '火', '水', '木', '金', '土'];
  var YMD        = /^\d{4}-\d{2}-\d{2}$/;

  var MSG = {
    loading:   '読み込んでいます…',
    error:     '放送予定を読み込めませんでした。時間をおいて再度お試しください。',
    todayEnd:  '本日の放送は終了しました',
    dayEmpty:  '放送予定はまだありません',
    more:      '続きを読む',
    less:      '閉じる',
    timeNote:  '※ 開始時刻は目安です。編成の都合で前後します。'
  };

  var data      = null;      // 正規化した programs.json
  var loadState = 'loading'; // 'loading' | 'ok' | 'error'
  var nowId     = '';        // 放送中の放送回ID（app.js の initRadio が渡す）
  var timer     = null;

  /* ---------- 値の取り出し ---------- */

  function str(v) {
    return (typeof v === 'string' && v.trim()) ? v.trim() : '';
  }

  function httpUrl(v) {
    var s = str(v);
    return /^https?:\/\//i.test(s) ? s : '';
  }

  /* ---------- 日本時間 ---------- */

  /* 日本時間の年月日時分を取り出す。getUTC* で読めるようにずらした Date を使う */
  function jst(d) {
    var t = new Date(d.getTime() + JST_OFFSET);
    return {
      y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(),
      H: t.getUTCHours(), M: t.getUTCMinutes(), w: t.getUTCDay()
    };
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function ymdOf(p) { return p.y + '-' + pad2(p.m) + '-' + pad2(p.d); }

  /* 放送日の区切り（分）。JSON の day_start（"05:00"）を使う */
  function dayStartMin() {
    var s = data ? data.day_start : '';
    var m = /^(\d{1,2}):(\d{2})$/.exec(s || '05:00');
    return m ? (Number(m[1]) * 60 + Number(m[2])) : 300;
  }

  /* その瞬間が属する放送日を YYYY-MM-DD で返す。
     放送日 = (時刻 − day_start) の日本時間の日付 */
  function broadcastDay(d) {
    return ymdOf(jst(new Date(d.getTime() - dayStartMin() * 60000)));
  }

  /* 放送日キーに n 日足す */
  function addDay(key, n) {
    var d = new Date(key + 'T12:00:00+09:00');
    if (isNaN(d.getTime())) return key;
    return ymdOf(jst(new Date(d.getTime() + n * 86400000)));
  }

  /* 放送日キーの曜日（日本時間） */
  function wdayOf(key) {
    var d = new Date(key + 'T12:00:00+09:00');
    return isNaN(d.getTime()) ? '' : WDAY[jst(d).w];
  }

  /* 「10月2日（木）」 */
  function dayLabel(key) {
    var d = new Date(key + 'T12:00:00+09:00');
    if (isNaN(d.getTime())) return key;
    var p = jst(d);
    return p.m + '月' + p.d + '日（' + wdayOf(key) + '）';
  }

  /* 時刻を「19:15」で返す。放送日をまたいだ未明は「25:15」にする */
  function hhmm(iso, dayKey) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var p = jst(d);
    var h = p.H;
    if (dayKey && ymdOf(p) !== dayKey) h += 24;
    return h + ':' + pad2(p.M);
  }

  /* 「19:15〜19:25」。end が無ければ「19:15〜」。
     「頃」は付けない（時刻が目安であることは一覧の末尾の注釈で示す）。
     トップのプレーヤーの放送時間も app.js からこれを使う */
  function timeRange(startIso, endIso, dayKey) {
    var s = hhmm(startIso, dayKey);
    if (!s) return '';
    var e = hhmm(endIso, dayKey);
    return e ? (s + '〜' + e) : (s + '〜');
  }

  /* ---------- 正規化 ---------- */

  function normProgram(src) {
    if (!src || typeof src !== 'object') return null;
    var start = str(src.start), day = str(src.day);
    var t = new Date(start);
    if (!start || isNaN(t.getTime())) return null;
    if (!YMD.test(day)) day = broadcastDay(t);
    return {
      id:      str(src.id),
      kind:    str(src.kind),
      title:   str(src.title),
      start:   start,
      end:     str(src.end),
      startMs: t.getTime(),
      day:     day,
      cast:    str(src.cast),
      url:     httpUrl(src.url),
      summary: str(src.summary),
      image:   httpUrl(src.image),
      songs:   normSongs(src.songs)
    };
  }

  function normSongs(src) {
    if (!src || !src.length) return [];
    var out = [];
    for (var i = 0; i < src.length; i++) {
      var s = src[i];
      if (!s || typeof s !== 'object') continue;
      var singer = str(s.singer), title = str(s.title);
      if (!singer && !title) continue;
      out.push({ singer: singer, title: title, credit: str(s.credit), url: httpUrl(s.url) });
    }
    return out;
  }

  function normalize(src) {
    if (!src || typeof src !== 'object') return null;
    var list = [];
    var raw = src.programs;
    if (raw && raw.length) {
      for (var i = 0; i < raw.length; i++) {
        var p = normProgram(raw[i]);
        if (p) list.push(p);
      }
    }
    list.sort(function (a, b) { return a.startMs - b.startMs; });
    var mt = src.maintenance && typeof src.maintenance === 'object' ? src.maintenance : null;
    return {
      day_start: str(src.day_start) || '05:00',
      maintenance: mt ? { start: str(mt.start), end: str(mt.end) } : null,
      programs: list
    };
  }

  /* ---------- 小さな DOM 部品 ---------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function linkEl(url, label, cls) {
    var a = el('a', cls, label);
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  function note(box, text) {
    if (!box) return;
    box.textContent = '';
    box.appendChild(el('p', 'oa-empty', text));
  }

  /* ---------- 番組の行（モーダルと schedule.html で共用） ---------- */

  function needsClamp(text) {
    return text.length > CLAMP_CHAR || text.split('\n').length > CLAMP_LINE;
  }

  function summaryEl(text) {
    var wrap = el('div', 'oa-summary-wrap');
    var body = el('p', 'oa-summary', text);
    wrap.appendChild(body);
    if (!needsClamp(text)) return wrap;

    body.classList.add('is-clamped');
    var btn = el('button', 'oa-more', MSG.more);
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var open = body.classList.toggle('is-clamped') === false;
      btn.textContent = open ? MSG.less : MSG.more;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    wrap.appendChild(btn);
    return wrap;
  }

  function songsEl(songs) {
    var ul = el('ul', 'oa-songs');
    for (var i = 0; i < songs.length; i++) {
      var s = songs[i];
      var li = el('li', 'oa-song');
      if (s.singer) li.appendChild(el('b', 'oa-song-singer', s.singer));
      if (s.title) {
        li.appendChild(s.url
          ? linkEl(s.url, s.title, 'oa-song-title is-link')
          : el('span', 'oa-song-title', s.title));
      }
      if (s.credit) li.appendChild(el('span', 'oa-song-credit', s.credit));
      ul.appendChild(li);
    }
    return ul;
  }

  /* 1番組。イベントカレンダー（.cal-row）と同じく、左に時刻・右に中身を置く。
     時刻は開始のみ（終了時刻は出さない） */
  function programRow(p, dayKey, nowMs) {
    var row = el('div', 'oa-row');
    if (p.id && p.id === nowId) row.classList.add('is-now');
    else if (p.end && new Date(p.end).getTime() <= nowMs) row.classList.add('is-done');

    row.appendChild(el('span', 'oa-time', hhmm(p.start, dayKey)));

    var main = el('div', 'oa-main');
    if (p.image) {
      var img = el('img', 'oa-thumb');
      img.src = p.image;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', function () { img.remove(); });
      main.appendChild(img);
    }

    var body = el('div', 'oa-body');
    var titleLine = el('div', 'oa-titleline');
    titleLine.appendChild(el('b', 'oa-title', p.title || '（番組名は未定）'));
    if (p.id && p.id === nowId) titleLine.appendChild(el('span', 'oa-badge', 'ON AIR'));
    else if (p.kind === 'Picks') titleLine.appendChild(el('span', 'oa-badge is-rerun', '再放送'));
    body.appendChild(titleLine);

    if (p.cast) body.appendChild(el('div', 'oa-cast', p.cast));
    if (p.summary) body.appendChild(summaryEl(p.summary));
    if (p.songs.length) body.appendChild(songsEl(p.songs));
    if (p.url) body.appendChild(linkEl(p.url, '番組の紹介を見る →', 'oa-link'));
    main.appendChild(body);

    row.appendChild(main);
    return row;
  }

  /* 1日分の番組行を box に入れる。メンテナンスの時間は出さない */
  function fillDay(box, dayKey, nowMs) {
    var list = programsOf(dayKey);
    if (!list.length) {
      box.appendChild(el('p', 'oa-empty', MSG.dayEmpty));
      return;
    }
    for (var i = 0; i < list.length; i++) box.appendChild(programRow(list[i], dayKey, nowMs));
  }

  /* 一覧の末尾に置く、開始時刻が目安であることの注釈 */
  function timeNote() { return el('p', 'oa-foot', MSG.timeNote); }

  function programsOf(dayKey) {
    if (!data) return [];
    var out = [];
    for (var i = 0; i < data.programs.length; i++) {
      if (data.programs[i].day === dayKey) out.push(data.programs[i]);
    }
    return out;
  }

  /* ---------- トップの「このあと」 ---------- */

  function renderTop() {
    var box = document.getElementById('upNext');
    if (!box) return;
    box.textContent = '';

    if (loadState === 'loading') { box.appendChild(upRow('', MSG.loading, '')); return; }
    if (loadState === 'error')   { box.appendChild(upRow('', MSG.error, '')); return; }

    var now = Date.now();
    var dayKey = broadcastDay(new Date());
    var list = programsOf(dayKey), next = [];
    for (var i = 0; i < list.length && next.length < TOP_MAX; i++) {
      var p = list[i];
      if (p.startMs <= now) continue;            // すでに始まっている
      if (p.id && p.id === nowId) continue;      // 放送中の番組そのもの
      next.push(p);
    }

    if (!next.length) { box.appendChild(upRow('', MSG.todayEnd, '')); return; }
    for (var j = 0; j < next.length; j++) {
      box.appendChild(upRow(
        hhmm(next[j].start, dayKey),
        next[j].title || '（番組名は未定）',
        j === 0 ? 'NEXT' : 'その次'
      ));
    }
  }

  /* 既存のプレーヤーの見た目（.up / .up-time / .up-thumb / .up-name / .up-label）に合わせる */
  function upRow(time, name, label) {
    var row = el('div', 'up');
    if (time) {
      row.appendChild(el('span', 'up-time', time));
      row.appendChild(el('span', 'up-thumb'));
    }
    row.appendChild(el('span', 'up-name', name));
    if (label) row.appendChild(el('span', 'up-label', label));
    return row;
  }

  /* ---------- 当日のスケジュール（モーダル） ---------- */

  function renderToday() {
    var box = document.getElementById('schedList');
    if (!box) return;
    box.textContent = '';

    if (loadState === 'loading') { note(box, MSG.loading); return; }
    if (loadState === 'error')   { note(box, MSG.error); return; }

    var dayKey = broadcastDay(new Date());
    box.appendChild(el('p', 'oa-dayline', dayLabel(dayKey) + ' の放送'));
    fillDay(box, dayKey, Date.now());
    box.appendChild(timeNote());
  }

  /* ---------- schedule.html（7日分） ---------- */

  function renderFull() {
    var box = document.getElementById('onairDays');
    if (!box) return;
    ensureLoaded();
    paintFull();
  }

  function paintFull() {
    var box = document.getElementById('onairDays');
    if (!box) return;
    box.textContent = '';

    if (loadState === 'loading') { note(box, MSG.loading); return; }
    if (loadState === 'error')   { note(box, MSG.error); return; }

    var today = broadcastDay(new Date());
    var nowMs = Date.now();
    for (var i = 0; i < DAYS; i++) {
      var key = addDay(today, i);
      var sec = el('section', 'oa-day');
      var h = el('h2', 'oa-day-head', dayLabel(key));
      if (i === 0) h.appendChild(el('span', 'oa-day-tag', '今日'));
      else if (i === 1) h.appendChild(el('span', 'oa-day-tag', '明日'));
      sec.appendChild(h);
      fillDay(sec, key, nowMs);
      box.appendChild(sec);
    }
    box.appendChild(timeNote());
  }

  /* ---------- 読み込み ---------- */

  function paintAll() {
    renderTop();
    if (document.getElementById('schedList')) renderToday();
    if (document.getElementById('onairDays')) paintFull();
  }

  function load() {
    return fetch(DATA_URL, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('http ' + res.status);
      return res.json();
    }).then(function (json) {
      var norm = normalize(json);
      if (!norm) throw new Error('bad shape');
      data = norm;
      loadState = 'ok';
    }).catch(function (err) {
      loadState = 'error';
      if (global.console) console.error('programs.json load failed:', err);
    }).then(paintAll);
  }

  var started = false;
  function ensureLoaded() {
    if (started) return;
    started = true;
    load();
    startTimer();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopTimer();
      else { load(); startTimer(); }
    });
  }

  function startTimer() {
    if (timer || document.hidden) return;
    timer = setInterval(load, RELOAD_MS);
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  /* ---------- 公開 ---------- */

  /* 放送中の放送回ID。app.js の initRadio が AzuraCast の oa_id を渡す。
     「このあと」から放送中の番組を外し、当日スケジュールに ON AIR の印を付けるために使う */
  function setNowId(id) {
    var v = str(id);
    if (v === nowId) return;
    nowId = v;
    renderTop();
    if (document.getElementById('schedList')) renderToday();
  }

  /* oa_id から番組を引く。AzuraCast のスケジュールAPIに is_now が無いときの
     放送時間のフォールバックに使う */
  function findById(id) {
    var v = str(id);
    if (!v || !data) return null;
    for (var i = 0; i < data.programs.length; i++) {
      if (data.programs[i].id === v) return data.programs[i];
    }
    return null;
  }

  global.uratenOnair = {
    DATA_URL: DATA_URL,
    start: ensureLoaded,
    renderTop: renderTop,
    renderToday: renderToday,
    renderFull: renderFull,
    setNowId: setNowId,
    findById: findById,
    currentDay: function () { return broadcastDay(new Date()); },
    timeRange: timeRange
  };
})(window);

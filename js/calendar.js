/* =========================================================
   URATEN イベントカレンダー（index.html / calendar.html 共用）

   - データは https://media.ura-ten.jp/calendar/calendar.json を fetch で読む
   - 「今日」は閲覧端末の時計ではなく日本時間（Asia/Tokyo）で判定する。
     日付はすべて YYYY-MM-DD の文字列のまま比較する（Date に通すと
     閲覧者のタイムゾーンで前後1日ずれるため）
   - 終了したかどうかだけを見る。開催中の判定・表示は行わない
     （リアルタイムの進行を追う用途ではないため）
   - イベント名・会場は申請者が入力した文字列。必ず textContent で入れる
   - url は http(s) で始まるものだけリンクにする
   - 状態はブラウザに保存しない。外部ライブラリを使わない
========================================================= */
(function (global) {
  'use strict';

  var DATA_URL = 'https://media.ura-ten.jp/calendar/calendar.json';
  var TOP_MAX  = 5;
  var WDAY     = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  var YMD      = /^\d{4}-\d{2}-\d{2}$/;

  var MSG = {
    empty:  '現在掲載中のイベントはありません',
    error:  'イベント情報を読み込めませんでした。時間をおいて再度お試しください。',
    notice: 'お知らせあり・詳細はリンク先で確認'
  };

  /* ---------- 日付 ---------- */

  /* 日本時間の今日を YYYY-MM-DD で返す */
  function todayJst() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(new Date());
      var get = function (type) {
        for (var i = 0; i < parts.length; i++) if (parts[i].type === type) return parts[i].value;
        return '';
      };
      var y = get('year'), m = get('month'), d = get('day');
      if (y && m && d) return y + '-' + m + '-' + d;
    } catch (e) { /* Intl のタイムゾーン未対応環境は下のフォールバックへ */ }
    var t = new Date(Date.now() + 9 * 60 * 60 * 1000);   /* UTC+9 を手計算 */
    return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate());
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(s) { return { y: +s.slice(0, 4), m: +s.slice(5, 7), d: +s.slice(8, 10) }; }

  /* 「10/9」。年は出さない */
  function monthDay(s) { var p = ymd(s); return p.m + '/' + p.d; }

  /* 曜日は英語3文字。数値から組み立てるので閲覧者のタイムゾーンに影響されない */
  function weekday(s) { var p = ymd(s); return WDAY[new Date(p.y, p.m - 1, p.d).getDay()]; }

  function monthLabel(s) { var p = ymd(s); return p.y + '年' + p.m + '月'; }

  /* 終了日。end が無ければ start が終了日 */
  function lastDay(ev) { return ev.end || ev.start; }

  function isEnded(ev, today) { return lastDay(ev) < today; }

  /* ---------- データ ---------- */

  function safeUrl(u) {
    return (typeof u === 'string' && /^https?:\/\//i.test(u)) ? u : '';
  }

  /* 表示に使う項目だけを取り出す。未知のフィールドが増えても無視して動く */
  function normalize(data) {
    var raw = (data && Array.isArray(data.events)) ? data.events : [];
    var out = [];
    raw.forEach(function (ev) {
      if (!ev || typeof ev.start !== 'string' || !YMD.test(ev.start)) return;
      var end = (typeof ev.end === 'string' && YMD.test(ev.end) && ev.end > ev.start) ? ev.end : null;
      out.push({
        name:   typeof ev.name === 'string' ? ev.name : '',
        start:  ev.start,
        end:    end,
        venue:  typeof ev.venue === 'string' ? ev.venue : '',
        url:    safeUrl(ev.url),
        notice: ev.notice === true
      });
    });
    return out;
  }

  function load() {
    return fetch(DATA_URL, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(normalize);
  }

  /* ---------- 並び順 ---------- */

  /* 開始日順（desc なら降順）。同じ開始日のイベントは読み込みごとに入れ替える。
     掲載料をいただいている以上、同日のイベント間で露出に偏りを作らないため。 */
  function byStart(list, desc) {
    var sorted = list.slice().sort(function (a, b) {
      if (a.start === b.start) return 0;
      return (a.start < b.start ? -1 : 1) * (desc ? -1 : 1);
    });
    var out = [];
    var i = 0;
    while (i < sorted.length) {
      var j = i;
      while (j < sorted.length && sorted[j].start === sorted[i].start) j++;
      var group = sorted.slice(i, j);
      for (var k = group.length - 1; k > 0; k--) {        /* Fisher-Yates */
        var r = Math.floor(Math.random() * (k + 1));
        var tmp = group[k]; group[k] = group[r]; group[r] = tmp;
      }
      out = out.concat(group);
      i = j;
    }
    return out;
  }

  /* ---------- 描画 ---------- */

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function note(box, text) {
    if (!box) return;
    box.textContent = '';
    box.appendChild(el('div', 'cal-empty', text));
  }

  /* 1件分の行。url があれば行全体がリンクになる */
  function buildRow(ev, today) {
    var row = el(ev.url ? 'a' : 'div', 'cal-row' + (isEnded(ev, today) ? ' is-done' : ''));
    if (ev.url) {
      row.href = ev.url;
      row.target = '_blank';
      row.rel = 'noopener noreferrer';
    }

    /* 日付枠は2行×（1列 or 3列）のグリッド。上段が日付、下段が曜日。
       期間は「開始 〜 終了」の3列にして、曜日をそれぞれの日付の真下に置く */
    var date = el('div', 'cal-date' + (ev.end ? ' is-range' : ''));
    date.appendChild(el('b', null, monthDay(ev.start)));
    if (ev.end) {
      date.appendChild(el('i', null, '〜'));
      date.appendChild(el('b', null, monthDay(ev.end)));
    }
    date.appendChild(el('span', null, weekday(ev.start)));
    if (ev.end) date.appendChild(el('span', null, weekday(ev.end)));

    var info = el('div', 'cal-info');
    info.appendChild(el('b', 'cal-name', ev.name));        /* 申請者入力 → textContent */
    info.appendChild(el('span', 'cal-venue', ev.venue));   /* 同上 */

    /* 中止・延期があるイベントへ誘導しないよう、トップにも一覧にも出す */
    if (ev.notice) {
      var badges = el('div', 'cal-badges');
      badges.appendChild(el('span', 'cal-badge is-notice', MSG.notice));
      info.appendChild(badges);
    }

    row.appendChild(date);
    row.appendChild(info);
    return row;
  }

  /* 月見出しを挟みながら並べる */
  function fillMonths(box, list, today) {
    var current = '';
    list.forEach(function (ev) {
      var label = monthLabel(ev.start);
      if (label !== current) {
        current = label;
        box.appendChild(el('div', 'cal-month', label));
      }
      box.appendChild(buildRow(ev, today));
    });
  }

  /* ---------- トップページ（直近5件） ---------- */

  function renderTop() {
    var box = document.getElementById('calList');
    if (!box) return;
    var rest = document.getElementById('calRest');

    load().then(function (events) {
      var today = todayJst();
      var open = byStart(events.filter(function (ev) { return !isEnded(ev, today); }));

      if (!open.length) {
        note(box, MSG.empty);
        if (rest) rest.hidden = true;
        return;
      }

      box.textContent = '';
      open.slice(0, TOP_MAX).forEach(function (ev) {
        box.appendChild(buildRow(ev, today));
      });

      if (rest) {
        var over = open.length - TOP_MAX;
        rest.textContent = over > 0 ? ('ほか' + over + '件のイベント') : '';
        rest.hidden = over <= 0;
      }
    }).catch(function (err) {
      note(box, MSG.error);
      if (rest) rest.hidden = true;
      if (global.console) console.error('calendar.json load failed:', err);
    });
  }

  /* ---------- カレンダーページ（全件） ---------- */

  function renderFull() {
    var soonBox = document.getElementById('calSoon');
    var doneBox = document.getElementById('calDone');
    if (!soonBox || !doneBox) return;
    var doneWrap  = document.getElementById('calDoneWrap');
    var doneCount = document.getElementById('calDoneCount');

    if (doneWrap) doneWrap.hidden = true;

    load().then(function (events) {
      var today = todayJst();
      var open = byStart(events.filter(function (ev) { return !isEnded(ev, today); }));
      var done = byStart(events.filter(function (ev) { return isEnded(ev, today); }), true);  /* 新しい順 */

      soonBox.textContent = '';
      if (!open.length) {
        note(soonBox, MSG.empty);
      } else {
        fillMonths(soonBox, open, today);
      }

      doneBox.textContent = '';
      if (done.length) {
        fillMonths(doneBox, done, today);
        if (doneWrap) doneWrap.hidden = false;
        if (doneCount) doneCount.textContent = '（' + done.length + '件）';
      }
    }).catch(function (err) {
      note(soonBox, MSG.error);
      if (global.console) console.error('calendar.json load failed:', err);
    });
  }

  global.uratenCalendar = {
    DATA_URL: DATA_URL,
    todayJst: todayJst,
    renderTop: renderTop,
    renderFull: renderFull
  };
})(window);

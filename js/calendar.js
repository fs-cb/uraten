/* =========================================================
   URATEN イベントカレンダー（index.html / calendar.html 共用）

   - データは https://media.ura-ten.jp/calendar/calendar.json を fetch で読む
   - 「今日」は閲覧端末の時計ではなく日本時間（Asia/Tokyo）で判定する。
     日付はすべて YYYY-MM-DD の文字列のまま比較する（Date に通すと
     閲覧者のタイムゾーンで前後1日ずれるため）
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
    loading: 'イベント情報を読み込んでいます…',
    empty:   '現在掲載中のイベントはありません',
    error:   'イベント情報を読み込めませんでした。時間をおいて再度お試しください。',
    notice:  'お知らせあり・詳細はリンク先で確認',
    live:    '開催中'
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

  /* 'ended' 終了 / 'live' 開催中 / 'soon' これから */
  function phase(ev, today) {
    if (lastDay(ev) < today) return 'ended';
    if (ev.start <= today) return 'live';
    return 'soon';
  }

  /* ---------- データ ---------- */

  function safeUrl(u) {
    return (typeof u === 'string' && /^https?:\/\//i.test(u)) ? u : '';
  }

  function normalize(data) {
    var raw = (data && Array.isArray(data.events)) ? data.events : [];
    var out = [];
    raw.forEach(function (ev) {
      if (!ev || typeof ev.start !== 'string' || !YMD.test(ev.start)) return;
      var end = (typeof ev.end === 'string' && YMD.test(ev.end) && ev.end > ev.start) ? ev.end : null;
      out.push({
        id:     typeof ev.id === 'string' ? ev.id : '',
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

  /* 開始日順。同じ開始日のイベントは読み込みごとに入れ替える。
     掲載料をいただいている以上、同日のイベント間で露出に偏りを作らないため。 */
  function byStart(list) {
    var sorted = list.slice().sort(function (a, b) {
      return a.start < b.start ? -1 : (a.start > b.start ? 1 : 0);
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
  function buildRow(ev, today, opts) {
    var state = phase(ev, today);
    var row = el(ev.url ? 'a' : 'div', 'cal-row' + (state === 'ended' ? ' is-done' : ''));
    if (ev.url) {
      row.href = ev.url;
      row.target = '_blank';
      row.rel = 'noopener noreferrer';
    }

    var date = el('div', 'cal-date' + (ev.end ? ' is-range' : ''));
    var big = el('b');
    if (ev.end) {
      big.appendChild(document.createTextNode(monthDay(ev.start) + '〜'));
      big.appendChild(document.createElement('wbr'));   /* 狭いときだけ「〜」で折る */
      big.appendChild(document.createTextNode(monthDay(ev.end)));
    } else {
      big.textContent = monthDay(ev.start);
    }
    date.appendChild(big);
    date.appendChild(el('span', null, ev.end ? (weekday(ev.start) + '〜' + weekday(ev.end)) : weekday(ev.start)));

    var info = el('div', 'cal-info');
    info.appendChild(el('b', 'cal-name', ev.name));        /* 申請者入力 → textContent */
    info.appendChild(el('span', 'cal-venue', ev.venue));   /* 同上 */

    var badges = el('div', 'cal-badges');
    if (state === 'live') badges.appendChild(el('span', 'cal-badge is-live', MSG.live));
    if (opts && opts.notice && ev.notice) badges.appendChild(el('span', 'cal-badge is-notice', MSG.notice));
    if (badges.childNodes.length) info.appendChild(badges);

    row.appendChild(date);
    row.appendChild(info);
    return row;
  }

  /* 月見出しを挟みながら並べる */
  function fillMonths(box, list, today, opts) {
    var current = '';
    list.forEach(function (ev) {
      var label = monthLabel(ev.start);
      if (label !== current) {
        current = label;
        box.appendChild(el('div', 'cal-month', label));
      }
      box.appendChild(buildRow(ev, today, opts));
    });
  }

  /* ---------- トップページ（直近5件） ---------- */

  function renderTop() {
    var box = document.getElementById('calList');
    if (!box) return;
    var rest = document.getElementById('calRest');

    load().then(function (events) {
      var today = todayJst();
      /* 開催中を先に、そのあと開始日順 */
      var live = byStart(events.filter(function (ev) { return phase(ev, today) === 'live'; }));
      var soon = byStart(events.filter(function (ev) { return phase(ev, today) === 'soon'; }));
      var all  = live.concat(soon);

      if (!all.length) {
        note(box, MSG.empty);
        if (rest) rest.hidden = true;
        return;
      }

      box.textContent = '';
      all.slice(0, TOP_MAX).forEach(function (ev) {
        box.appendChild(buildRow(ev, today, { notice: false }));
      });

      if (rest) {
        var over = all.length - TOP_MAX;
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
      /* 開催中とこれからは、月見出しを付けたいので開始日順でひと続きにする
         （開催中は行のバッジで分かる） */
      var soon = byStart(events.filter(function (ev) { return phase(ev, today) !== 'ended'; }));
      var done = byStart(events.filter(function (ev) { return phase(ev, today) === 'ended'; }));

      soonBox.textContent = '';
      if (!soon.length) {
        note(soonBox, MSG.empty);
      } else {
        fillMonths(soonBox, soon, today, { notice: true });
      }

      doneBox.textContent = '';
      if (done.length) {
        fillMonths(doneBox, done, today, { notice: true });
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

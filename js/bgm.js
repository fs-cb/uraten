/* =========================================================
   URATEN BGM 試聴ページ用スクリプト
   bgm.html と、後続の bgm-dl.html（原本ダウンロード）で共用する。
   DL版は init() に rowExtra を渡して行にボタンを足すだけでよい。

   - データは data/bgm.json / data/bgm-tags.json を fetch で読む
   - 音源URLは bgm.json の preview_base と各行の preview を連結して作る
     （ベースURLをここに書かない。ドメイン変更はJSON1行で済ませる）
   - テキストはすべて textContent で挿入する
   - 状態はブラウザに保存しない
========================================================= */
(function (global) {
  'use strict';

  var DEFAULTS = {
    dataUrl: './data/bgm.json',
    tagsUrl: './data/bgm-tags.json',
    tabs: '.bgm-tab',
    filter: '#bgmFilter',
    count: '#bgmCount',
    clear: '#bgmClear',
    excerpt: '#bgmExcerpt',
    list: '#bgmList',
    msg: '#bgmMsg',
    category: 'cm',
    rowExtra: null   /* function(item, row){} 行の末尾に要素を足すためのフック */
  };

  /* 秒 → M:SS（179 → 2:59） */
  function formatDuration(sec) {
    var n = Math.max(0, Math.round(Number(sec) || 0));
    var s = n % 60;
    return Math.floor(n / 60) + ':' + (s < 10 ? '0' + s : String(s));
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function getJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error(url + ' : ' + res.status);
      return res.json();
    });
  }

  function init(options) {
    var opt = {};
    var key;
    for (key in DEFAULTS) if (Object.prototype.hasOwnProperty.call(DEFAULTS, key)) opt[key] = DEFAULTS[key];
    for (key in (options || {})) if (Object.prototype.hasOwnProperty.call(options, key)) opt[key] = options[key];

    var dom = {
      tabs: Array.prototype.slice.call(document.querySelectorAll(opt.tabs)),
      filter: document.querySelector(opt.filter),
      count: document.querySelector(opt.count),
      clear: document.querySelector(opt.clear),
      excerpt: document.querySelector(opt.excerpt),
      list: document.querySelector(opt.list),
      msg: document.querySelector(opt.msg)
    };
    if (!dom.list) return;

    var state = {
      category: opt.category,
      items: [],
      groups: [],
      previewBase: '',
      selected: {},     /* グループkey → 選択中タグの配列 */
      rows: {},         /* id → 行要素 */
      playingId: null
    };

    var audio = new Audio();
    audio.preload = 'none';

    /* ---------- 再生 ---------- */

    function setRowState(id, mode, message) {
      var row = state.rows[id];
      if (!row) return;
      var btn = row.querySelector('.bgm-play');
      var glyph = row.querySelector('.bgm-glyph');
      var note = row.querySelector('.bgm-state');
      var name = row.getAttribute('data-name') || '';

      row.classList.toggle('is-playing', mode === 'playing');
      row.classList.toggle('is-loading', mode === 'loading');

      if (glyph) glyph.textContent = mode === 'playing' ? '■' : '▶';
      if (btn) {
        btn.setAttribute('aria-pressed', mode === 'playing' ? 'true' : 'false');
        btn.setAttribute('aria-label', mode === 'playing' ? name + ' を停止' : name + ' を試聴');
      }
      if (note) {
        note.textContent = message || '';
        note.hidden = !message;
        note.classList.toggle('is-error', mode === 'error');
      }
    }

    function stopPlayback() {
      var id = state.playingId;
      state.playingId = null;
      audio.pause();
      if (audio.getAttribute('src')) {
        audio.removeAttribute('src');
        audio.load();
      }
      if (id) setRowState(id, 'idle', '');
    }

    function failPlayback(id) {
      state.playingId = null;
      setRowState(id, 'error', '再生できませんでした。時間をおいてお試しください。');
    }

    function play(item) {
      if (state.playingId === item.id) {
        stopPlayback();
        return;
      }
      stopPlayback();
      state.playingId = item.id;
      setRowState(item.id, 'loading', '読み込み中…');
      audio.src = state.previewBase + item.preview;
      var started = audio.play();
      if (started && typeof started.catch === 'function') {
        started.catch(function () {
          if (state.playingId === item.id) failPlayback(item.id);
        });
      }
    }

    audio.addEventListener('playing', function () {
      if (state.playingId) setRowState(state.playingId, 'playing', '');
    });
    audio.addEventListener('ended', function () {
      stopPlayback();
    });
    audio.addEventListener('error', function () {
      /* src を外したときの空エラーは無視する */
      if (state.playingId) failPlayback(state.playingId);
    });

    /* ---------- 絞り込み ---------- */

    function inCategory(item) {
      return item.category === state.category;
    }

    function countWithTag(tag) {
      var n = 0;
      state.items.forEach(function (item) {
        if (inCategory(item) && item.tags.indexOf(tag) !== -1) n++;
      });
      return n;
    }

    function hasSelection() {
      return state.groups.some(function (g) {
        return (state.selected[g.key] || []).length > 0;
      });
    }

    /* 同じグループ内は OR、グループをまたぐと AND */
    function matches(item) {
      return state.groups.every(function (g) {
        var picked = state.selected[g.key] || [];
        if (!picked.length) return true;
        return item.tags.some(function (tag) {
          return picked.indexOf(tag) !== -1;
        });
      });
    }

    function filtered() {
      return state.items.filter(function (item) {
        return inCategory(item) && matches(item);
      });
    }

    function clearSelection() {
      state.groups.forEach(function (g) { state.selected[g.key] = []; });
    }

    /* ---------- 描画 ---------- */

    function renderFilter() {
      dom.filter.textContent = '';
      state.groups.forEach(function (group) {
        /* 選択中のカテゴリで0件のタグはボタンを出さない */
        var usable = group.tags.filter(function (tag) { return countWithTag(tag) > 0; });
        if (!usable.length) return;

        var wrap = el('div', 'bgm-fgroup');
        wrap.appendChild(el('div', 'bgm-flabel', group.label));

        var chips = el('div', 'bgm-fchips');
        usable.forEach(function (tag) {
          var btn = el('button', 'bgm-chip-btn', tag);
          btn.type = 'button';
          btn.setAttribute('aria-pressed', 'false');
          btn.addEventListener('click', function () {
            var picked = state.selected[group.key] || [];
            var at = picked.indexOf(tag);
            if (at === -1) picked.push(tag); else picked.splice(at, 1);
            state.selected[group.key] = picked;
            btn.classList.toggle('is-on', at === -1);
            btn.setAttribute('aria-pressed', at === -1 ? 'true' : 'false');
            renderList();
          });
          chips.appendChild(btn);
        });

        wrap.appendChild(chips);
        dom.filter.appendChild(wrap);
      });
    }

    function renderRow(item) {
      var name = item.title ? item.title : item.id;
      var row = el('div', 'bgm-row');
      row.setAttribute('data-id', item.id);
      row.setAttribute('data-name', name);

      var btn = el('button', 'bgm-play');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', name + ' を試聴');
      btn.appendChild(el('span', 'bgm-glyph', '▶'));
      btn.addEventListener('click', function () { play(item); });
      row.appendChild(btn);

      var info = el('div', 'bgm-info');
      info.appendChild(el('div', 'bgm-name', name));

      var chips = el('div', 'bgm-chips');
      item.tags.forEach(function (tag) { chips.appendChild(el('span', 'bgm-chip', tag)); });
      info.appendChild(chips);

      var note = el('span', 'bgm-state', '');
      note.hidden = true;
      info.appendChild(note);
      row.appendChild(info);

      /* 尺は原本の長さ */
      row.appendChild(el('div', 'bgm-time', formatDuration(item.duration)));

      if (typeof opt.rowExtra === 'function') opt.rowExtra(item, row);
      return row;
    }

    function renderList() {
      var list = filtered();

      dom.list.textContent = '';
      state.rows = {};
      list.forEach(function (item) {
        var row = renderRow(item);
        state.rows[item.id] = row;
        dom.list.appendChild(row);
      });

      if (dom.count) {
        dom.count.textContent = '';
        dom.count.appendChild(el('b', null, String(list.length)));
        dom.count.appendChild(document.createTextNode('件'));
      }
      if (dom.clear) dom.clear.hidden = !hasSelection();
      if (dom.msg) {
        dom.msg.classList.remove('is-error');
        dom.msg.hidden = list.length > 0;
        dom.msg.textContent = list.length ? '' : '選んだ条件に合うBGMはありません。タグを減らしてお試しください。';
      }
      if (dom.excerpt) dom.excerpt.hidden = !(state.category === 'talk' && list.length > 0);

      /* 絞り込みで消えた曲は止める。残っていれば再生中の表示を戻す */
      if (state.playingId) {
        if (state.rows[state.playingId]) {
          var playing = !audio.paused;
          setRowState(state.playingId, playing ? 'playing' : 'loading', playing ? '' : '読み込み中…');
        } else {
          stopPlayback();
        }
      }
    }

    function selectCategory(category) {
      if (!category || state.category === category) return;
      state.category = category;
      stopPlayback();
      clearSelection();
      dom.tabs.forEach(function (tab) {
        var on = tab.getAttribute('data-category') === category;
        tab.classList.toggle('is-on', on);
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      renderFilter();
      renderList();
    }

    dom.tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        selectCategory(tab.getAttribute('data-category'));
      });
    });

    if (dom.clear) {
      dom.clear.addEventListener('click', function () {
        clearSelection();
        renderFilter();
        renderList();
      });
    }

    /* ---------- 読み込み ---------- */

    Promise.all([getJson(opt.dataUrl), getJson(opt.tagsUrl)]).then(function (res) {
      var data = res[0];
      var tags = res[1];

      state.previewBase = data.preview_base || '';
      state.items = (data.items || []).map(function (item) {
        return {
          id: item.id,
          title: item.title || '',
          category: item.category,
          duration: item.duration,
          tags: Array.isArray(item.tags) ? item.tags : [],
          preview: item.preview,
          preview_duration: item.preview_duration
        };
      });
      /* タグの表示順はマスタの配列順に従う */
      state.groups = tags.groups || [];
      clearSelection();

      renderFilter();
      renderList();
    }).catch(function () {
      if (dom.filter) dom.filter.textContent = '';
      if (dom.count) dom.count.textContent = '';
      if (dom.clear) dom.clear.hidden = true;
      if (dom.excerpt) dom.excerpt.hidden = true;
      if (dom.msg) {
        dom.msg.hidden = false;
        dom.msg.classList.add('is-error');
        dom.msg.textContent = 'BGMの一覧を読み込めませんでした。時間をおいて、もう一度お試しください。';
      }
    });
  }

  global.uratenBgm = { init: init, formatDuration: formatDuration };
})(window);

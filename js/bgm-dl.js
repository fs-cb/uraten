/* =========================================================
   URATEN BGM原本ダウンロードページ用スクリプト（bgm-dl.html 専用）

   一覧の描画・絞り込み・試聴の再生は js/bgm.js をそのまま使う。
   このファイルが受け持つのは次の2つだけ。
     1. 合言葉ゲート（Workerに検証を投げる。クライアントで判定しない）
     2. 各行のダウンロードボタン（Worker経由で原本を受け取る）

   - 合言葉はページにもコードにも持たない。利用者の入力をそのまま Worker へ送る
   - 合言葉の保持は sessionStorage のみ（タブを閉じたら消える）。localStorage は使わない
   - ダウンロードのたびに Worker が照合する。ページに入れた＝落とせる、ではない
   - テキストはすべて textContent で挿入する
========================================================= */
(function (global) {
  'use strict';

  var STORE_KEY = 'uraten.bgm-dl.pass';
  var PLACEHOLDER = 'WORKER-URL-HERE';

  var MSG = {
    wrong:    '合言葉が違います。受付メールをご確認ください。',
    network:  '通信できませんでした。電波の状態をご確認のうえ、もう一度お試しください。',
    server:   'ただいま確認できませんでした。時間をおいて、もう一度お試しください。',
    expired:  '合言葉が変わっています。受付メールに記載の合言葉をもう一度ご入力ください。',
    ok:       '合言葉を確認しました。このタブを閉じるまで有効です。',
    unset:    'ダウンロード先が設定されていません。運営（uraten.info@gmail.com）までお知らせください。',
    dlFail:   'ダウンロードできませんでした。もう一度お試しください。',
    dlMissing:'この曲の原本はまだご用意できていません。運営までお知らせください。'
  };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  /* sessionStorage はプライベートモード等で例外を投げることがある */
  function readPass() {
    try { return global.sessionStorage.getItem(STORE_KEY) || ''; } catch (e) { return ''; }
  }
  function writePass(value) {
    try {
      if (value) global.sessionStorage.setItem(STORE_KEY, value);
      else global.sessionStorage.removeItem(STORE_KEY);
    } catch (e) { /* 保存できなくても動作は続ける（毎回入力になるだけ） */ }
  }

  function init(options) {
    var opt = options || {};
    var base = String(opt.workerBase || '').replace(/\/+$/, '');
    var configured = base && base.indexOf(PLACEHOLDER) === -1;

    var dom = {
      gate:  document.getElementById('bgmGate'),
      row:   document.querySelector('.bgm-gate-row'),
      help:  document.getElementById('bgmGateHelp'),
      input: document.getElementById('bgmPass'),
      btn:   document.getElementById('bgmGateBtn'),
      msg:   document.getElementById('bgmGateMsg'),
      library: document.getElementById('library')
    };
    if (!dom.gate || !dom.input || !dom.library) return;

    var listReady = false;
    var list = null;   /* uratenBgm.init() の戻り値 */

    /* ---------- ゲートの表示 ---------- */

    function say(text, kind) {
      if (!dom.msg) return;
      dom.msg.textContent = text || '';
      dom.msg.hidden = !text;
      dom.msg.classList.toggle('is-ok', kind === 'ok');
    }

    function lock(message) {
      writePass('');
      if (list && list.stop) list.stop();
      dom.library.hidden = true;
      if (dom.row) dom.row.hidden = false;
      if (dom.help) dom.help.hidden = false;
      say(message || '', 'error');
      if (message) dom.input.focus();
    }

    function unlock() {
      dom.library.hidden = false;
      if (dom.row) dom.row.hidden = true;
      if (dom.help) dom.help.hidden = true;
      say(MSG.ok, 'ok');
      buildList();
    }

    function busy(on) {
      if (!dom.btn) return;
      dom.btn.disabled = on;
      dom.btn.textContent = on ? '確認中…' : '一覧を表示';
    }

    /* ---------- Worker とのやりとり ---------- */

    function post(path, body) {
      return fetch(base + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }

    /* 合言葉の可否は Worker が返す。ここでは判定しない */
    function verify(pass, fromStore) {
      busy(true);
      say('', 'error');
      post('/verify', { passphrase: pass }).then(function (res) {
        busy(false);
        if (res.ok) {
          writePass(pass);
          unlock();
        } else if (res.status === 401) {
          /* 保存ぶんが弾かれた場合は、運営が合言葉を変えたとき */
          if (fromStore) { lock(MSG.expired); return; }
          say(MSG.wrong, 'error');
          dom.input.focus();
          dom.input.select();
        } else {
          say(MSG.server, 'error');
        }
      }).catch(function () {
        busy(false);
        say(MSG.network, 'error');
      });
    }

    dom.gate.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!configured) { say(MSG.unset, 'error'); return; }
      /* メールからのコピーで前後に空白が入りやすい */
      var pass = String(dom.input.value || '').trim();
      dom.input.value = pass;
      if (!pass) { say(MSG.wrong, 'error'); dom.input.focus(); return; }
      verify(pass);
    });

    /* ---------- ダウンロード ---------- */

    function rowNote(row) {
      var info = row.querySelector('.bgm-info');
      var note = row.querySelector('.bgm-dlstate');
      if (!note && info) {
        note = el('span', 'bgm-dlstate', '');
        note.hidden = true;
        info.appendChild(note);
      }
      return note;
    }

    function setNote(row, text, isError) {
      var note = rowNote(row);
      if (!note) return;
      note.textContent = text || '';
      note.hidden = !text;
      note.classList.toggle('is-error', !!isError);
    }

    function setBusy(btn, on, name) {
      btn.disabled = on;
      btn.classList.toggle('is-busy', on);
      btn.setAttribute('aria-busy', on ? 'true' : 'false');
      btn.setAttribute('aria-label', name + (on ? ' をダウンロード中' : ' の原本をダウンロード'));
      var glyph = btn.querySelector('.bgm-glyph');
      if (glyph) glyph.textContent = on ? '…' : '⬇';
    }

    /* Blob を経由して保存する。ファイル名は {ID}.mp3 */
    function save(blob, id) {
      var url = URL.createObjectURL(blob);
      var a = el('a');
      a.href = url;
      a.download = id + '.mp3';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      global.setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    }

    function download(item, row, btn) {
      var pass = readPass();
      var name = item.title ? item.title : item.id;
      if (!pass) { lock(MSG.expired); return; }

      setBusy(btn, true, name);
      setNote(row, 'ダウンロードしています…', false);

      post('/download', { passphrase: pass, id: item.id }).then(function (res) {
        if (res.status === 401) {
          /* 運営が合言葉を変えた場合など。入力に戻す */
          setBusy(btn, false, name);
          setNote(row, '', false);
          lock(MSG.expired);
          return null;
        }
        if (res.status === 404) {
          setBusy(btn, false, name);
          setNote(row, MSG.dlMissing, true);
          return null;
        }
        if (!res.ok) {
          setBusy(btn, false, name);
          setNote(row, MSG.dlFail, true);
          return null;
        }
        return res.blob().then(function (blob) {
          save(blob, item.id);
          setBusy(btn, false, name);
          setNote(row, '保存しました。', false);
        });
      }).catch(function () {
        setBusy(btn, false, name);
        setNote(row, MSG.network, true);
      });
    }

    /* ---------- 一覧（描画・絞り込み・試聴は bgm.js に任せる） ---------- */

    function buildList() {
      if (listReady || !global.uratenBgm) return;
      listReady = true;

      list = global.uratenBgm.init({
        dataUrl: opt.dataUrl || './data/bgm.json',
        tagsUrl: opt.tagsUrl || './data/bgm-tags.json',
        /* 試聴ページとの差分はこの1点だけ：行にダウンロードボタンを足す */
        rowExtra: function (item, row) {
          var name = item.title ? item.title : item.id;
          var btn = el('button', 'bgm-dl');
          btn.type = 'button';
          btn.setAttribute('aria-label', name + ' の原本をダウンロード');
          btn.appendChild(el('span', 'bgm-glyph', '⬇'));
          btn.addEventListener('click', function () { download(item, row, btn); });
          /* 再生ボタンの隣に置く */
          var play = row.querySelector('.bgm-play');
          if (play && play.nextSibling) row.insertBefore(btn, play.nextSibling);
          else row.appendChild(btn);
        }
      });
    }

    /* ---------- 初期化 ---------- */

    if (!configured) {
      say(MSG.unset, 'error');
      if (dom.btn) dom.btn.disabled = true;
      return;
    }

    /* タブ内で入力済みなら聞き直さない。ただし可否は毎回 Worker に確認する */
    var saved = readPass();
    if (saved) verify(saved, true);
  }

  global.uratenBgmDl = { init: init };
})(window);

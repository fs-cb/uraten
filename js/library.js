/* =========================================================
   URATEN プロフィールライブラリー（library.html 専用）

   - gallery/profile.json の全員をカードで並べ、各カードから profile.html?p=… へ
   - 並びは読み込みごとにシャッフルする（いつも先頭に出る人を作らない）。絞り込んでもその順のまま
   - カードはアイコン・掲載名・ジャンル・活動地域だけ。無料（card）と有料（page）で見た目に差を付けない
   - 絞り込み：活動名（部分一致。＊・？のワイルドカード可）× ジャンル × 活動地域
     ジャンル・活動地域はそれぞれ「どれかに当てはまる」（OR）、3つの条件どうしは「すべて」（AND）
   - ジャンル・活動地域のボタンはフォームの選択肢の順。掲載が1件も無い項目はボタンを出さない
   - 申請由来の文字列は textContent で入れる（innerHTML に展開しない）。条件はブラウザに保存しない
========================================================= */
(function () {
  'use strict';

  const W = window.uratenWorks;

  // フォーム（無料 RWG2Nd・有料 labgop）の選択肢の順
  const GENRES = ['歌い手・ボーカル','音楽制作・バンド・DJ','VTuber・配信者','イラスト','漫画','小説・文章','写真・カメラマン',
    '映像・動画制作','被写体・モデル','コスプレ','ダンス・踊り手','演劇・声優・朗読','アイドル','同人・ハンドメイド・物販','イベント主催・店舗','その他'];
  const AREAS = ['福岡','北海道','東北','関東','中部','近畿','中国','四国','九州・沖縄（福岡以外）','海外','オンライン中心'];

  const MSG = {
    empty:   'まだ掲載はありません。',
    error:   'プロフィールを読み込めませんでした。時間をおいて再度お試しください。',
    noMatch: '条件に合うプロフィールはありません。'
  };

  const $ = id=>document.getElementById(id);
  let all = [];
  const picked = { genre: new Set(), area: new Set() };

  // --- 活動名の検索 ---
  // 全角・半角、大文字・小文字、カタカナ・ひらがなの違いを無視する
  function fold(s){
    return s.normalize('NFKC').toLowerCase()
      .replace(/[ァ-ヶ]/g, c=>String.fromCharCode(c.charCodeAt(0) - 0x60));
  }
  // 空白で区切った語をすべて含むものに当てる。語の中の * は何文字でも、? は1文字
  function compile(q){
    return fold(q).split(/\s+/).filter(Boolean).map(t=>
      new RegExp(t.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')));
  }

  // --- カード ---
  function card(pf){
    const a = document.createElement('a');
    a.className = 'lib-card';
    a.href = W.profileHref(pf.p);
    a.appendChild(W.fillIcon(Object.assign(document.createElement('div'), { className:'pf-icon lib-icon' }), pf));
    const name = document.createElement('b');
    name.className = 'lib-name';
    name.textContent = pf.name;
    a.appendChild(name);
    const tags = document.createElement('ul');
    tags.className = 'pf-tags lib-tags';
    pf.genres.forEach(g=>tags.appendChild(Object.assign(document.createElement('li'), { className:'pf-tag', textContent:g })));
    if(pf.area) tags.appendChild(Object.assign(document.createElement('li'), { className:'pf-tag pf-area', textContent:pf.area }));
    if(tags.children.length) a.appendChild(tags);
    return a;
  }

  // --- 絞り込みのボタン ---
  function chips(box, group, master, values){
    const present = new Set(values);
    // マスタの順に、掲載があるものだけ。マスタに無い値（選択肢が増えたとき）は後ろに足す
    const list = master.filter(v=>present.has(v)).concat([...present].filter(v=>!master.includes(v)));
    box.textContent = '';
    list.forEach(v=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lib-chip' + (group === 'area' ? ' is-area' : '');
      b.textContent = v;
      b.setAttribute('aria-pressed', 'false');
      b.onclick = ()=>{
        const on = !picked[group].has(v);
        on ? picked[group].add(v) : picked[group].delete(v);
        b.setAttribute('aria-pressed', String(on));
        render();
      };
      box.appendChild(b);
    });
    box.parentElement.hidden = !list.length;
  }

  function render(){
    const terms = compile($('libQ').value);
    const g = picked.genre, ar = picked.area;
    const hits = all.filter(x=>
      terms.every(re=>re.test(x.key)) &&
      (!g.size || x.pf.genres.some(v=>g.has(v))) &&
      (!ar.size || ar.has(x.pf.area)));

    const grid = $('libGrid');
    grid.textContent = '';
    hits.forEach(x=>grid.appendChild(x.el));

    const filtering = terms.length || g.size || ar.size;
    $('libClear').disabled = !filtering;
    $('libCount').textContent = filtering ? (all.length + '件中 ' + hits.length + '件') : (all.length + '件');
    $('libCount').hidden = false;
    $('libStatus').textContent = hits.length ? '' : MSG.noMatch;
    $('libStatus').hidden = !!hits.length;
  }

  function clear(){
    $('libQ').value = '';
    picked.genre.clear();
    picked.area.clear();
    document.querySelectorAll('.lib-chip').forEach(b=>b.setAttribute('aria-pressed', 'false'));
    render();
  }

  function start(){
    W.fetchProfiles().then(list=>{
      if(!list.length){ $('libStatus').textContent = MSG.empty; return; }
      all = W.shuffle(list).map(pf=>({ pf, key: fold(pf.name), el: card(pf) }));
      chips($('libGenres'), 'genre', GENRES, list.flatMap(pf=>pf.genres));
      chips($('libAreas'), 'area', AREAS, list.map(pf=>pf.area).filter(Boolean));
      $('libQ').addEventListener('input', render);
      $('libClear').onclick = clear;
      $('libTools').hidden = false;
      render();
    }, ()=>{ $('libStatus').textContent = MSG.error; });
  }

  start();
})();

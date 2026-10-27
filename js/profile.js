/* =========================================================
   URATEN プロフィールページ（profile.html 専用）

   - URL は profile.html?p=12文字（英小文字・数字）。p は uraten-ops が付ける推測されにくい値
   - gallery/profile.json から p が一致するプロフィールを探して描く
     type: card（無料：アイコン・ジャンル・活動地域・自己紹介・リンク1件）
           page（有料：サムネイル・アイコン・ジャンル・活動地域・ひとこと・インタビュー・リンク2件）
     どちらが載るか（後から申し込んだほうが優先）は uraten-ops 側で決まっている
   - 掲載中の作品は gallery.json・photo.json から、profile がこのページの作品を集めて並べる
   - 申請由来の文字列は textContent で入れる（innerHTML に展開しない）
========================================================= */
(function () {
  'use strict';

  const W = window.uratenWorks;
  const MSG = {
    notFound: 'このプロフィールは見つかりませんでした。掲載が終わったか、URLが正しくない可能性があります。',
    error:    'プロフィールを読み込めませんでした。時間をおいて再度お試しください。'
  };

  const $ = id=>document.getElementById(id);
  function mk(tag, cls, text){
    const n = document.createElement(tag);
    if(cls) n.className = cls;
    if(text != null) n.textContent = text;
    return n;
  }
  function status(text){
    $('pfStatus').textContent = text;
    $('pfStatus').hidden = false;
    $('pfBody').hidden = true;
  }

  // --- プロフィール本体 ---
  function renderProfile(pf){
    document.title = (pf.name || 'プロフィール') + '｜URATEN';

    // サムネイル（有料のみ）。枠は 16:9、余白には同じ画像をぼかして敷く
    const thumb = $('pfThumb');
    thumb.textContent = '';
    if(pf.thumb){
      const blur = mk('img', 'pf-thumb-blur');
      blur.alt = '';
      blur.setAttribute('aria-hidden', 'true');
      blur.src = pf.thumb;
      const img = mk('img', 'pf-thumb-img');
      img.alt = pf.name + 'のサムネイル';
      if(pf.thumb_w && pf.thumb_h){ img.width = pf.thumb_w; img.height = pf.thumb_h; }
      img.src = pf.thumb;
      thumb.appendChild(blur);
      thumb.appendChild(img);
    }
    thumb.hidden = !pf.thumb;

    // アイコン（円形に切り抜く）。無いときは掲載名の1文字目
    W.fillIcon($('pfIcon'), pf);

    $('pfName').textContent = pf.name;
    $('pfCatch').textContent = pf.catch || '';
    $('pfCatch').hidden = !pf.catch;

    const tags = $('pfTags');
    tags.textContent = '';
    pf.genres.forEach(g=>tags.appendChild(mk('li', 'pf-tag', g)));
    if(pf.area) tags.appendChild(mk('li', 'pf-tag pf-area', pf.area));
    tags.hidden = !tags.children.length;

    $('pfBio').textContent = pf.bio || '';
    $('pfBio').hidden = !pf.bio;

    const link = $('pfLink');
    if(pf.url){ link.href = pf.url; link.hidden = false; }
    else { link.removeAttribute('href'); link.hidden = true; }
    const link2 = $('pfLink2');
    if(pf.url2){ link2.href = pf.url2; link2.textContent = W.hostLabel(pf.url2); link2.hidden = false; }
    else { link2.removeAttribute('href'); link2.textContent = ''; link2.hidden = true; }

    // インタビュー（有料のみ。Q&A をそのまま載せる）
    const qa = $('pfQa');
    qa.textContent = '';
    pf.answers.forEach((x, i)=>{
      const item = mk('div', 'pf-qa-item');
      const dt = mk('dt');
      dt.appendChild(mk('span', 'pf-qa-no', 'Q' + (i + 1)));
      dt.appendChild(document.createTextNode(x.q));
      item.appendChild(dt);
      item.appendChild(mk('dd', null, x.a));
      qa.appendChild(item);
    });
    $('pfInterview').hidden = !pf.answers.length;

    $('pfStatus').hidden = true;
    $('pfBody').hidden = false;
  }

  // --- 掲載中の作品（イラスト→フォトの順。読めなかった種類は出さない） ---
  function renderWorks(p, lists){
    const mine = [].concat(...lists).filter(w=>w.profile === p);
    const grid = $('pfGrid');
    grid.textContent = '';
    mine.forEach(w=>grid.appendChild(W.workCard(w)));
    $('pfWorks').hidden = !mine.length;
  }

  function start(){
    const p = new URLSearchParams(location.search).get('p');
    if(!W.isProfileKey(p)){ status(MSG.notFound); return; }
    W.setHereProfile(p);

    // 作品は、プロフィールが見つかってから並べる。種類ごとに、読めなければ空として扱う
    const works = Object.keys(W.WORK_KINDS).map(kind=>
      W.fetchWorks(kind).then(W.allWorks, ()=>[]));

    W.fetchProfiles()
      .then(list=>{
        const pf = list.find(x=>x.p === p);
        if(!pf){ status(MSG.notFound); return; }
        renderProfile(pf);
        return Promise.all(works).then(lists=>renderWorks(p, lists));
      }, ()=>status(MSG.error));
  }

  document.addEventListener('keydown', e=>{ if(e.key === 'Escape') W.closeWork(); });
  start();
})();

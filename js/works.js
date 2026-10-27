/* =========================================================
   URATEN 作品（イラスト・フォト）とプロフィール（index.html / profile.html / library.html 共用）

   - データは uraten-ops が承認済みの掲載だけを R2 に置いた公開JSON
       gallery/gallery.json … イラスト   gallery/photo.json … フォト（同じ形）
       gallery/profile.json … プロフィール
   - url・image が http(s) 以外の作品は出さない。url2 も http(s) のときだけリンクにする
   - 申請由来の文字列は textContent / プロパティで入れる（innerHTML に展開しない）
   - 作品の profile は、そのプロフィールページの URL（https://ura-ten.jp/profile.html?p=…）。
     ura-ten.jp のプロフィールページを指すものだけを受け付け、p（12文字の英小文字・数字）だけを取り出して使う
   - 状態はブラウザに保存しない。外部ライブラリを使わない
========================================================= */
(function (global) {
  'use strict';

  const WORK_KINDS = {
    illust: { src:'https://media.ura-ten.jp/gallery/gallery.json', en:'ILLUSTRATION', ja:'イラストギャラリー', alt:'のイラスト',
              intro:'URATENに参加している絵師の作品です。サムネをタップすると作品が大きく開き、「推す」から絵師の紹介ページ（X／pixiv など）へ移動できます。気になった絵師はそのまま依頼へ。' },
    photo:  { src:'https://media.ura-ten.jp/gallery/photo.json',   en:'PHOTO',        ja:'フォトギャラリー',   alt:'の写真',
              intro:'URATENの参加者たちの写真作品です。' }
  };
  const PROFILE_SRC = 'https://media.ura-ten.jp/gallery/profile.json';
  const PROFILE_ORIGIN = 'https://ura-ten.jp';
  const PROFILE_KEY = /^[a-z0-9]{12}$/;

  function isHttp(u){ return typeof u === 'string' && /^https?:\/\//i.test(u); }
  function posInt(v){ return (Number.isInteger(v) && v > 0) ? v : 0; }
  function str(v){ return (typeof v === 'string' && v.trim()) ? v : null; }
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

  // --- プロフィールの URL ---
  function isProfileKey(p){ return typeof p === 'string' && PROFILE_KEY.test(p); }
  // 作品の profile（URL）から p を取り出す。ura-ten.jp/profile(.html) 以外は null
  // （Pages は profile.html を /profile に転送するので、アドレスバーからコピーした形も受け付ける）
  function profileKeyOf(u){
    if(typeof u !== 'string') return null;
    try{
      const x = new URL(u);
      if(x.origin !== PROFILE_ORIGIN || !/^\/profile(\.html)?$/.test(x.pathname)) return null;
      const p = x.searchParams.get('p');
      return isProfileKey(p) ? p : null;
    }catch(e){ return null; }
  }
  // サイト内のリンクは相対パスにする（プレビュー環境でも同じ環境のページへ飛ぶように）
  function profileHref(p){ return './profile.html?p=' + p; }

  // --- 作品 ---
  function normWorks(src, kind){
    if(!Array.isArray(src)) return [];
    return src
      .filter(it=>it && isHttp(it.url) && isHttp(it.image))
      .map(it=>({
        kind,
        name:    (typeof it.name === 'string') ? it.name : '',
        url:     it.url,
        url2:    (isHttp(it.url2) && hostLabel(it.url2)) ? it.url2 : null,
        bio:     str(it.bio),
        image:   it.image,
        w:       posInt(it.w),
        h:       posInt(it.h),
        profile: profileKeyOf(it.profile)
      }));
  }

  // alt を渡さないときは「{掲載名}のイラスト／の写真」
  function setImg(img, w, alt){
    img.alt = (alt != null) ? alt : w.name + WORK_KINDS[w.kind].alt;
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

  // 一覧のカード（掲載名だけ。有料・無料で見た目に差を付けない）
  function workCard(w){
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.kind = w.kind;
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
    return el;
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

  // --- 作品の詳細モーダル（#workModal。index.html と profile.html に同じ作りで置く） ---
  // 「プロフィールを見る」は作品に profile があるときだけ。今開いているプロフィールページの作品には出さない
  let hereProfile = null;
  function setHereProfile(p){ hereProfile = p; }

  function openWork(w){
    const modal = document.getElementById('workModal');
    if(!modal) return;
    modal.dataset.kind = w.kind;
    document.getElementById('wCat').textContent = WORK_KINDS[w.kind].en;
    const art = document.getElementById('wArt');
    art.textContent = '';
    art.appendChild(workImg(w, false));
    document.getElementById('wName').textContent = w.name;
    document.getElementById('wLink').href = w.url;
    fillExtras(document.getElementById('wBio'), document.getElementById('wLink2'), w);
    const pf = document.getElementById('wProfile');
    if(pf){
      if(w.profile && w.profile !== hereProfile){
        pf.href = profileHref(w.profile);
        pf.hidden = false;
      }else{
        pf.removeAttribute('href');
        pf.hidden = true;
      }
    }
    modal.classList.add('open');
  }
  function closeWork(){
    const modal = document.getElementById('workModal');
    if(modal) modal.classList.remove('open');
  }

  // --- 読み込み ---
  function getJson(src){
    return fetch(src, { cache: 'no-store' })
      .then(res=>{ if(!res.ok) throw new Error('HTTP ' + res.status); return res.json(); });
  }
  // 一覧に出す全作品：items とスライドショー掲載中の作品を合わせ、同じ画像は1回だけにする（並べ方は使う側で決める）
  function allWorks(r){
    const seen = new Set();
    return r.items.concat(r.slides).filter(w=>!seen.has(w.image) && seen.add(w.image));
  }
  // { items, slides }（items はシャッフルしない。並べ方は使う側で決める）。読めないときは reject
  function fetchWorks(kind){
    return getJson(WORK_KINDS[kind].src).then(data=>({
      items:  normWorks(data && data.items, kind),
      slides: normWorks(data && data.slideshow, kind)
    }));
  }

  // --- プロフィール ---
  function strList(v, max){
    if(!Array.isArray(v)) return [];
    return v.filter(s=>typeof s === 'string' && s.trim()).slice(0, max);
  }
  function normAnswers(v){
    if(!Array.isArray(v)) return [];
    return v.filter(x=>x && str(x.q) && str(x.a)).map(x=>({ q:x.q, a:x.a }));
  }
  function normProfiles(src){
    if(!Array.isArray(src)) return [];
    return src
      .filter(it=>it && isProfileKey(it.p))
      .map(it=>{
        const page = it.type === 'page';
        return {
          p:       it.p,
          type:    page ? 'page' : 'card',
          name:    (typeof it.name === 'string') ? it.name : '',
          icon:    isHttp(it.icon) ? it.icon : null,
          thumb:   (page && isHttp(it.thumb)) ? it.thumb : null,
          thumb_w: posInt(it.thumb_w),
          thumb_h: posInt(it.thumb_h),
          genres:  strList(it.genres, 3),
          area:    str(it.area),
          bio:     page ? null : str(it.bio),
          catch:   page ? str(it.catch) : null,
          answers: page ? normAnswers(it.answers) : [],
          url:     isHttp(it.url) ? it.url : null,
          url2:    (page && isHttp(it.url2) && hostLabel(it.url2)) ? it.url2 : null
        };
      });
  }
  // プロフィールの配列。読めないときは reject
  function fetchProfiles(){
    return getJson(PROFILE_SRC).then(data=>normProfiles(data && data.profiles));
  }
  // トップのプロフィールのスライドショーに出すプロフィール（profile.json の slideshow の順のまま）。
  // slideshow は p の配列。profiles に無い p・有料（page）でないもの・サムネイルが無いものは出さない。同じ p は1回だけ。
  // 読めないときは reject
  function fetchProfileSlides(){
    return getJson(PROFILE_SRC).then(data=>{
      const byP = new Map(normProfiles(data && data.profiles).map(pf=>[pf.p, pf]));
      const seen = new Set();
      return (Array.isArray(data && data.slideshow) ? data.slideshow : [])
        .filter(p=>isProfileKey(p) && !seen.has(p) && seen.add(p))
        .map(p=>byP.get(p))
        .filter(pf=>pf && pf.type === 'page' && pf.thumb);
    });
  }

  // アイコン（円形の枠に入れる）。無いときは掲載名の1文字目（profile.html と library.html で共用）
  function fillIcon(el, pf){
    el.textContent = '';
    if(pf.icon){
      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.src = pf.icon;
      el.appendChild(img);
    }else{
      const s = document.createElement('span');
      s.textContent = Array.from(pf.name.trim())[0] || '?';
      el.appendChild(s);
    }
    return el;
  }

  global.uratenWorks = {
    WORK_KINDS, isHttp, hostLabel, shuffle,
    isProfileKey, profileHref, setHereProfile,
    setImg, workImg, workCard, fillExtras, openWork, closeWork,
    fetchWorks, allWorks, fetchProfiles, fetchProfileSlides, fillIcon
  };
})(window);

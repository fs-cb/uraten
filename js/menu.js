// menu.html 用スクリプト。
// 三本線のメニュー（ドロワー）の開閉だけ。トップ（index.html）では js/app.js の toggleMenu / closeMenu が同じことをしている。
// 演出（共鳴ビジュアル）やトップ固有の処理は持ち込まない。
(function () {
  var btn = document.getElementById('menuBtn');
  var drawer = document.getElementById('drawer');
  if (!btn || !drawer) return;

  function setOpen(open) {
    drawer.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  btn.addEventListener('click', function () {
    setOpen(!drawer.classList.contains('open'));
  });
  // ドロワーのリンクを押したら閉じる（ページ内リンクで移動したときに開いたまま残さない）
  drawer.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });
})();

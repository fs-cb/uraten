/* =========================================================
   URATEN 環境設定

   ここを書き換えて環境を切り替える。1ファイル・1行で済むようにしてある。

   なぜ .env ではないか：
     このサイトはビルドを行わない静的サイト（CLAUDE.md 1章。フレームワークなし・
     ビルドコマンド空欄・出力ルート）。ブラウザは .env を読めず、ビルド時に
     埋め込む仕組みも持たない。また Cloudflare Pages はリポジトリをそのまま
     配信するため、.env を置いても公開されてしまい秘密にもならない。
     そのため「JS の設定ファイル」という形にしている。秘密情報は書かないこと。

   station … 'uraten'（本番） または 'uraten-test'（テスト）
     この値で切り替わるのは、トップのプレーヤーに関わる次の3つ。
       ・放送中の表示      https://radio.ura-ten.jp/api/nowplaying/{station}
       ・放送時間          https://radio.ura-ten.jp/api/station/{station}/schedule
       ・再生するストリーム https://radio.ura-ten.jp/listen/{station}/radio.mp3

     ※「このあと」「当日のスケジュール」「7日分の放送予定」は programs.json から
       出している。programs.json はステーション別に分かれていないため、
       station を切り替えてもこの3つは変わらない。テスト局の番組表と
       programs.json の内容が違う場合、プレーヤーとスケジュールが食い違って見える。

     ※ URL に ?station=uraten / ?station=uraten-test を付けると、その表示に限り
       この設定より優先される。恒久的な切り替えはこのファイルで行う。

     ※ 未知の値を書いた場合・このファイルが読み込めなかった場合は 'uraten'（本番）
       として動く。公開サイトが意図せずテスト局を向かないようにするため。
========================================================= */
window.URATEN_ENV = {
  station: 'uraten-test'
};

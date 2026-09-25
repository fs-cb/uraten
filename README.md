# URATEN サイト（MVP）

静的サイト。このリポジトリへの git push が公開トリガー。

データの読み先は2つある。

- リポジトリ内の静的 JSON（`data/bgm.json` / `data/bgm-tags.json`）… 手で更新して push する
- R2 の公開 JSON（`https://media.ura-ten.jp/calendar/calendar.json`）… イベントカレンダー。
  `uraten-ops` の変換スクリプトが承認済みデータだけを cron で置く。このリポジトリは読み手であり、生成側のコードは持たない

## 構成

ファイル一覧と各ファイルの役割は `CLAUDE.md` の3章にまとめてある（正本）。

## デプロイ手順（初回のみ）

1. GitHubにリポジトリを作成し、この一式を push する
2. Cloudflareダッシュボード → Workers & Pages → 「Pages」→「Gitに接続」
3. リポジトリを選択し、ビルド設定は以下のとおり
   - フレームワークプリセット：**なし（None）**
   - ビルドコマンド：**空欄**
   - ビルド出力ディレクトリ：**/**（ルート）
4. デプロイ完了後、`https://＜プロジェクト名＞.pages.dev` で公開される

以後は git push するだけで自動で再配信される。`ura-ten.jp` 取得後はPagesのカスタムドメイン設定でDNSを向けるだけ（サイト側の変更は不要）。

## BGM原本ダウンロード用 Worker の置き場所

`bgm-dl.html` が呼ぶ Cloudflare Worker のコードは、**このリポジトリには置かない**。

```
uraten-site/
├ uraten/                  … このリポジトリ（＝Pagesの公開対象。ルートがそのまま配信される）
└ uraten-bgm-dl-worker/    … Worker一式（index.js / wrangler.toml / README.md）
```

ビルドコマンドなし・出力ディレクトリ `/` の構成では、リポジトリ内のファイルはすべてそのまま配信される。
Git接続のPagesにはアップロードを除外する仕組み（`.cfignore` 等）がないため、公開したくないものはリポジトリの外に置く。
デプロイ手順は `uraten-bgm-dl-worker/README.md` を参照。

## ローカル確認の注意

`index.html` をダブルクリックで開くと **fetch が失敗しカレンダー・BGM一覧が表示されない**（`file://` ではJSONを読めない）。必ずローカルサーバー経由で見ること。

```
python -m http.server 8000
# → http://localhost:8000
```

## JSON のスキーマ

連携の契約なので、正本は `CLAUDE.md` の4章に置いてある。

- 4-1 … イベントカレンダー（`calendar/calendar.json`。生成は `uraten-ops`）
- 4-2 … `data/bgm.json`
- 4-3 … `data/bgm-tags.json`

審査メモ・主催者の連絡先など運営用の情報は、**どの公開JSONにも絶対に入れない**（Sheetsに留める）。

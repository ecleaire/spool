# SPOOL 共同作業メモ

## 共通の作業対象

- リポジトリ: https://github.com/ecleaire/spool
- ローカル統合チャット: `01a19604-7c0d-7391-8c97-52f8989696c2`
- クラウド環境確認チャット: `01a19bad-ca0a-7327-992a-1869d2997089`（spoolをセットアップ）
- ローカル作業場所: `C:/Users/echo0/Documents/ChatGPT/創作/spool-manager`
- クラウド側のチェックアウト: `/workspace/spool`

両環境のフォルダーは別物です。GitHubを介して同じソースを取得します。
Gitへの同期はソースのみです。ブラウザー内の在庫・画像・予約などのユーザーデータは、JSONで別管理します。

## セットアップ

```sh
node --version
node build-offline.mjs
node tests/offline.test.mjs
```

Node.js 22以降が必要です。npm installは不要です。
開発用HTTPプレビューは `node preview.mjs`。既定は127.0.0.1:48371です。
クラウド環境で必要な場合のみ、その環境のルールに従ってHOST・PORTを指定してください。

```sh
HOST=0.0.0.0 PORT=5173 node preview.mjs
```

通常のローカル利用は、生成した単体HTMLをブラウザーで開くだけです。

## ファイルの担当

ローカル統合側が、以下のUIとライブラリを仕上げています。

- `public/inventory.html` / `public/style.css`: ワークスペース・保存導線・予約の表／カード
- `public/reservations.js`: 予約の表示・絞り込み・期限表示・登録／編集
- `public/app.js` / `public/elegoo-library.js`: ELEGOOの商品・色・画像の選択
- `public/offline.js`: JSON保存・復元・単体HTMLの書き出し

初期取り込み後、クラウド側はセットアップ確認とレビューから開始します。
変更が必要な場合は `collab/cloud-setup` 等のブランチにし、同じファイルの並行編集を避けます。
修正内容・確認したテスト・未確認点を共有し、担当を決めてmainへの反映と公開を行います。ユーザーの明示依頼により、クラウド側チャットもSites公開・更新を担当できます。

## 公開と配布

- 既存の公開先: https://spool-filament-studio.echo0607chiaki.chatgpt.site/
- 既存Site: `appgprj_6ae6eac9628481918eb60b8004f36986`
- Siteの新規作成や共有範囲の変更は不要です。
- Sites向けの保存・公開はローカル／クラウドの作業担当が行えます。公式Sitesスキルと正規ツールの利用可能性を各環境で確認し、認証用の値はGitに置きません。
- `.openai/hosting.json` は既存Siteの識別子です。別のSiteの識別子へ置き換えないでください。
- 入口はユーザー承認済みの `public`、データはGoogleログイン＋Supabase認可で保護。公開には `save_site_version` → `deploy_site_version` を使います。
- クラウド側への公開・更新スキル設定の依頼は `01a19bad-ca0a-7327-992a-1869d2997089` へ送信済み。設定手順だけでAPI権限を付与できたとは判断せず、スキル／ツール／環境設定の実際の状態を確認します。

## 現在含まれる機能

- 商品画像付きのフィラメント在庫、残量記録、検索・絞り込み、一括追加／削除と復元
- HEX直接入力、商品別の色プリセット、Bambu Lab公式色
- ELEGOO PLA／Matte／Silk／Translucent、4系統46色、商品画像と公式販売ページ
- ワークスペースの「印刷予約」、登録フォーム、個別編集、印刷済み／印刷予定／未定
- デスクトップ予約表、モバイル予約カード、状態別タブ、期限間近・超過の区別
- オフライン単体HTML、JSONによるデータ引き継ぎ、ファイル上書き競合の検出

## クラウド側の追加実装（未公開）

ユーザーの追加依頼で `collab/online-libraries` に実装中。GitHubへのcommit/pushやSites公開は行っていません。

- `public/reservations.js` / `public/inventory.html` / `public/style.css`: 予約のローカル／共有フォルダー／HTTPS関連ファイル。
- `tools/bambu-bridge/`: Windowsの任意導入ツール。Bambu Studio実機確認は未実施。
- `online/`: Googleログイン、個人・共有ライブラリ、JSON移行、競合保存、非公開のオンライン添付。
- `supabase/schema.sql`: 新規Supabaseプロジェクト用の認可と保存スキーマ。Google認証、SQL適用、実接続はユーザー設定が必要。
- オンライン版の出力は `online-dist/`。既存 `.openai/hosting.json` は変更していません。

公開前に `online/README.md` の実接続チェックを実施してください。オフラインJSON出力にオンラインStorageのファイル本体は含まれません。

## ローカル統合側のオンライン公開準備

- ユーザーの許可により24ファイルの差分を取り込み済み。SupabaseのSQL適用・初期メール許可・Google設定・URL設定はユーザーが実施。
- 公開認証設定の読み取りでGoogle provider有効を確認。実アカウントでのOAuth、招待、Storage取得は未確認。
- オンラインビルドは `online-dist/` と公開用 `out/`。既存Siteの静的配信先は `out/`。
- サイトの `offline.html` から従来の在庫を引き続き開ける。オンラインへユーザーデータを自動転送しない。
- ローカルでオフライン互換性、SQL権限、競合保存テストに成功。ブラウザーテストはChrome（Linux既定Chromium、任意で `SPOOL_CHROMIUM_PATH`）を使用。

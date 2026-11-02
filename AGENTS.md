# SPOOL 共同作業のルール

## 現在の公開先：GitHub Pages

- ユーザーの明示依頼で公開先を `https://ecleaire.github.io/spool/` へ移行。既存リポジトリ `ecleaire/spool` を使う。
- main を更新すると `.github/workflows/pages.yml` がテスト・ビルド・`/spool/` 配下のブラウザー確認後に `out/` のみを公開する。GitHub Actions の build/deploy 成功と公開URLの表示を確認する。
- 新しい公開方法は `online/GITHUB-PAGES.md` を参照。公開用キーだけを配布し、Supabaseの権限・非公開添付を維持する。
- 旧Sites版は移行確認用に保持する。通常の更新で旧Sitesへ自動公開しない。以下のSites手順は旧版を明示的に更新する場合だけ適用する。

## 目的と構成

- ユーザーの追加依頼によりオンライン版を併設。Googleログイン・個人／共有ライブラリ・非公開添付は `online/` と `supabase/`。接続設定・検証範囲は `online/README.md` を参照。
- 以下の単体HTML要件はオフライン版に適用。オンライン版は別出力 `online-dist/` とし、オフライン版に認証や通信依存を混ぜない。
- オンライン版は `npm ci --prefix online`、`node build-offline.mjs`、`npm --prefix online run build`、`npm --prefix online test`。RLSを維持し、Publishable/anon以外のキーをブラウザーへ渡さない。

- 最終成果物は、通信・ログイン・追加インストールなしで動く単体HTML。
- 編集対象は `public/`。生成済みの `dist/index.html` を直接編集しない。
- `node build-offline.mjs` でHTMLを生成し、`node tests/offline.test.mjs` で検証する。
- Node.js 22以降のみ。実行時の外部ライブラリ、外部フォント、クラウド必須の保存方式を追加しない。
- ブラウザー保存は補助。JSONデータファイルを使ってHTMLの更新・端末変更をまたいで引き継ぐ。
- 保存キー `spool-inventory-v1` とJSON形式 version 1 / 2の互換性を維持する。ユーザー在庫を初期サンプルで上書きしない。
- 商品名・色・画像のライブラリ追加では出典を残し、参考HEXと測定値を混同しない。

## 共同作業

- 共通リポジトリは `ecleaire/spool`。作業前に `git status` と最新のmainを確認する。
- ローカル／クラウド側チャットは、ユーザーの依頼に応じて実装・統合・Sites公開／更新を担当できる。ユーザーは `01a19bad-ca0a-7327-992a-1869d2997089` にも公開・更新を担当させることを明示した。
- クラウド側の変更は `collab/<作業名>` ブランチへ。公開には、その実行環境で利用できる公式Sitesスキルと正規のSitesツールを使用する。手順ファイルだけで公開API権限も付与されたとは扱わない。
- 同じファイルを同時に変更しない。作業対象と引き継ぎ事項は `COLLABORATION.md` を確認する。
- 強制push、mainの履歴書き換え、ユーザーデータのコミット、別Siteの新規登録、アクセス範囲の変更は行わない。
- 通常の修正やテストは、ユーザーがすでに依頼した作業範囲内で進める。
- `.sites-runtime/`、`.wrangler/`、`node_modules/`、ローカルデータファイル、認証情報は共有しない。

## 確認すること

- フィラメントと印刷予約の切り替え、予約の登録・個別編集・印刷情報の3択。
- 日付と期限の区別。印刷済みの予約を期限超過として強調しない。
- ファイル保存・別バージョンでの復元・画像と色プリセットの保持・上書き競合。
- 旧JSON、ブラウザー保存が制限される環境、File System Access API未対応時の書き出し。
- スマートフォンの予約カードと、デスクトップの一覧。

ブラウザーやファイル操作が環境のポリシーで拒否された場合は回避せず、検証範囲を報告する。

## Sitesの公開・更新

- 既存Site `appgprj_6ae6eac9628481918eb60b8004f36986` と `.openai/hosting.json` を使う。ユーザーの明示依頼により入口は現在 `public`。Googleログイン・Supabaseの利用許可/RLSは維持する。
- 作業開始時に `get_site` で対象・アクセスを確認。正規のSitesスキルを読み、その環境で同じSiteの短期ソース認証を発行する。チャット間でトークンを転送しない。
- ビルドはオフライン版→テスト→オンライン版。公開静的ディレクトリは `out/`、従来の単体HTMLは `dist/` と `deliverables/`。既存データを初期サンプルで上書きしない。
- 公式source helperでソース同期・チェック・コミット/push・アーカイブ作成を行い、その正確なSHAとarchiveで `save_site_version` → `deploy_site_version` を実行する。publicサイトにowner-private専用公開操作を使用しない。
- 公開を別チャットと同時に進めない。対象SHAと確認済みテストを共有し、古いブランチの内容で最新の公開を上書きしない。Sites接続や権限がない環境は、その不足を具体的に報告して統合担当へ引き継ぐ。

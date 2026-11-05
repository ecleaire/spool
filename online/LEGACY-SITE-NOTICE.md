# 旧chatgpt.siteの移行案内

対象は既存Site `appgprj_6ae6eac9628481918eb60b8004f36986`、URLは https://spool-filament-studio.echo0607chiaki.chatgpt.site/ 。公開範囲は既存のpublicを維持します。

旧サイトの先頭に「こちらは旧サイトです」「SPOOLの公開先はGitHub Pagesに移行しました。新機能・更新は最新版をご利用ください。」と表示し、https://ecleaire.github.io/spool/ へのボタンを設置します。自動転送は行わず、既存画面を利用・確認できる状態を維持します。

## 反映方法

Sitesの正規接続を持つ環境で、公式Sitesスキルと `skills/spool-site-publishing/SKILL.md` を読みます。既存Siteをget_siteで確認し、その環境で短期資格情報を発行します。他環境のtokenを転送しません。

既存Siteの現行ソース・ビルド出力を取得し、元のアプリや静的資産を保持したまま、配信中のHTMLに次を適用します。

```sh
node tools/add-legacy-site-notice.mjs path/to/existing/out/index.html path/to/existing/out/index.html
```

このhelperはbody属性と既存scriptを変更せず、静的な案内だけをbody先頭へ追加します。繰り返しても重複しません。GitHub Pages向けの通常ビルドやworkflowからは実行しません。旧Siteへの案内だけが目的の場合、最新版アプリ全体への入れ替えやSQL/OAuth変更は不要です。

320/390/1440pxで案内とリンクを確認し、既存の静的資産を含めて公式source helperでpackage→save_site_version→deploy_site_versionを行います。新しいSiteの作成や公開範囲の変更は行いません。正規接続がない環境では公開済みと報告せず、対象ソースSHAとこの手順を引き継ぎます。

## 検証

`node tests/legacy-site-notice.browser.test.mjs` は現在のオンラインビルドへ適用し、bodyとscriptが保持されること、重複しないこと、320/390/1440pxでの可読性・横はみ出し・遷移先・既存認証画面の起動を確認します。旧Site本番での表示確認は、実際に反映する環境で別途行ってください。

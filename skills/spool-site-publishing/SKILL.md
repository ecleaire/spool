---
name: spool-site-publishing
description: SPOOLの既存Sitesサイトを更新・公開するときのプロジェクト固有手順。公式Sitesスキルと公開ツールが利用できる環境で使い、未接続の場合は検証済みソースを引き継ぐ。ローカルHTMLの編集だけでは公開しない。
---

# SPOOLのサイト公開・更新

既存プロジェクトを更新する。新Siteは作らない。

- 共通ソース: `ecleaire/spool`
- Site ID: `appgprj_6ae6eac9628481918eb60b8004f36986`
- URL: `https://spool-filament-studio.echo0607chiaki.chatgpt.site/`
- 配信先: `.openai/hosting.json` の `out/`
- ユーザー承認済みの入口は `public`。在庫・予約はGoogleログインとSupabaseの利用許可/RLSで保護。

## 実行環境の確認

作業開始時にリポジトリの `AGENTS.md`、`COLLABORATION.md`、未コミット変更と最新mainを確認する。別チャットの未反映作業を消さず、同時公開を避ける。

このスキルは手順であり、Sites接続やAPI権限を付与しない。公式Sitesスキル、source helper、`get_site`、ソース認証発行、バージョン保存、デプロイの正規ツールが利用できるか確認する。利用できる場合は公式Sitesスキルの現在の手順を優先する。

## 検証と公開

1. `get_site` で既存IDと現在のアクセスを確認し、同じSiteの短期ソース認証をその環境で発行する。認証情報をGit・ファイル・ログ・他チャットへ転送しない。
2. 必要な依存だけを `npm ci --prefix online` で準備。`node build-offline.mjs`、`node tests/offline.test.mjs`、`npm --prefix online run build`、`npm --prefix online test` を実行する。画面や登録処理を変更した場合は、利用可能な環境で `npm --prefix online run test:browser` も実行する。模擬通信と本番での確認を区別する。
3. 公式Sitesのsource helperでソース同期・必要なチェック・正確なソースのコミット/push・公開アーカイブ作成を行う。固定した古いコミットや他環境のパスを流用しない。
4. 返されたSHAとarchiveを `save_site_version` に渡し、その返却version IDを `deploy_site_version` で公開する。publicサイトにはowner-private専用操作を使わない。現在のアクセスを再確認し、ユーザー依頼のない範囲変更はしない。
5. 結果が未完了状態の場合のみdeployment IDで状態を確認する。保存済みversion IDを保持し、失敗後に重複保存・重複公開しない。公開URL、実施した検証、残る未確認点を報告する。

オフラインHTMLは `dist/` と `../deliverables/SPOOL-offline.html` に残す。ユーザーの在庫・画像・予約をサンプルで上書きしない。Supabase SQLやOAuth設定は、公開作業に便乗して変更しない。

## Sitesが未接続の場合

ソース編集・ビルド・テスト・アーカイブ作成など実行可能な準備を完了し、対象SHA、ビルド手順、確認結果を公開可能な統合担当へ引き継ぐ。不足しているスキル／正規ツール／権限を具体的に伝える。別環境の資格情報や非公開APIを使って接続制限を回避せず、直接公開できたと報告しない。

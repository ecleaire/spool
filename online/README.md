# SPOOL オンライン試用版

オフライン版と別の出力です。Googleログイン、個人ライブラリ、招待による共有、在庫・予約の保存、予約の非公開添付ファイルを追加します。公開や外部サービスへの設定適用はこの変更では行っていません。

## ビルド・テスト

Node.js 22以降。リポジトリのルートから:

```sh
npm ci --prefix online
node build-offline.mjs
node tests/offline.test.mjs
npm --prefix online run build
npm --prefix online test
node tests/online/browser.test.mjs
```

`online-dist/` がオンライン版です。同じビルドで公開用の `out/` へコピーし、既存Siteはこのディレクトリーを配信します。`dist/` と `../deliverables/SPOOL-offline.html` は従来のオフライン版です。公開サイトの `offline.html` でも従来のブラウザー保存データを開けます。オンラインへはJSONから明示的に移行します。

今回の引き継ぎには、ユーザー指定のSupabaseプロジェクトURLとPublishableキーを `online/config.json` に含めています。どちらもブラウザーに配布する公開接続情報で、秘密情報ではありません。公開キー単体でデータへのアクセスを許可せず、SQLのRLS・RPCとログインJWTで制限します。環境秘密、DBパスワード、Google client secret、secret/service_roleキーは含めません。

## Supabaseの準備（新規プロジェクト推奨）

1. Supabaseのプロジェクトを作成する。「データAPI」は有効、「新しいテーブルを自動的に公開」は無効、「自動RLS」は有効を推奨。管理者のSupabaseアカウントはMFAを有効にする。
2. SQL Editorで `supabase/schema.sql` を一度実行する。空のプロジェクト用で、既存テーブルを置換するスクリプトではない。
3. 最初に利用するGoogleメールを許可する。以下の例を実際のアドレスに置き換えてSQL Editorで実行する（公開リポジトリへ実アドレスを記録しない）。

   ```sql
   insert into public.spool_users(email) values(lower('your-google-email@example.com')) on conflict do nothing;
   ```

4. AuthenticationのGoogle providerを設定する。Google Cloud ConsoleでWebアプリ用OAuthクライアントを作成し、Supabaseが表示するcallback URL（通常 `https://<project-ref>.supabase.co/auth/v1/callback`）を承認済みリダイレクトURIに登録する。Googleのclient IDとclient secretはSupabaseのGoogle provider設定へ保存する。ソースやブラウザーにsecretを入れない。Googleアプリがテスト状態の場合、利用者をテストユーザーに登録する。要求する権限はopenid/email/profileのみ。
5. SupabaseのURL Configurationに既存Siteの正確なURLをSite URLとRedirect URLsとして登録する。ワイルドカードを使用しない。ローカル試用する場合は使用するlocalhostのURLも明示的に登録する。
6. 接続先URLは `online/config.json` に設定済み。Publishableキーを同ファイルの `key` に設定してビルドすれば、各端末での初期入力を省略できる（公開用キーのみ）。未設定の場合はオンライン画面にプロジェクトURLとPublishableキー（旧anonキーも可）を入力する。公開用キーであり、認可はRLSとユーザーのJWTで行う。secret/service_roleキーは使用不可。設定とセッションはタブのsessionStorageへ保存する。別端末では再設定・再ログインする。

Google認証だけではデータへアクセスできません。サーバーの `spool_users` 許可リストが必要です。初期メンバーはSQLで許可し、その後は所有者の共有招待でも許可されます。Supabase側で新規Googleアカウントの認証自体を無効にすると招待済みの初回ログインもできなくなるため、認証とSPOOLの利用許可を区別してください。

## 共有と利用

- 初回ログインで空の個人ライブラリを1つ作成する。既存のオフライン在庫やサンプルを勝手に送信しない。
- 所有者がGoogleメールを指定して共有招待を登録する。メールの自動送信は行わない。相手に既存SiteのURLを伝え、同じメールのGoogleアカウントでログインしてもらう。招待を受けると個人／共有ライブラリを切り替えられる。
- 既存データはオンライン画面の「JSONから取り込み」で明示的に移行する。ライブラリ全体を置き換えるので、事前にJSONで退避する。
- 在庫と予約の保存は800msの遅延で自動実行。15秒ごとに更新を確認する。ローカルに未保存の変更や開いた編集ダイアログがある場合は自動読込しない。競合時は保存を止め、JSONで退避して最新を読み込み、必要な内容を再入力する。自動マージはしない。
- 最後の50世代を `library_history` に保存する。復元UIは未実装。管理者が履歴を確認してJSONへ退避できる。これは別サービスへの災害復旧バックアップの代替ではない。Supabaseの契約に合わせてバックアップ／エクスポートも設定する。
- 共有の解除は以後のアクセスを拒否する。すでに閲覧・取得・出力されたコピーを消すことはできない。招待取消は未承認の共有招待を取り消す操作で、個人ライブラリの利用停止とは異なる。
- サービス全体の利用停止は管理者が `spool_users` の該当emailを削除する。残った未承認招待も管理者が削除する。

## ファイル

- オンライン添付は1件100MB以下、STL/OBJ/3MF/AMF/STEP/STP/GCODE。Supabaseプラン全体の容量や転送量の上限も別途ある。
- bucketは非公開。メンバーだけが取得でき、有効期間60秒の署名URLを使う。一度発行したURLは失効するまで使える。ファイルは実行せずダウンロードする。ファイル内容の安全性検査／ウイルススキャンは未実装。
- 添付は予約IDに紐づく。予約を削除しても添付を自動削除しないので、削除前に添付一覧から整理する。アップロード中断で残ったmetadata/objectは管理者が確認して削除する。
- オンラインのJSON退避には在庫画像と予約・ローカル参照が含まれるが、Storageのモデル本体や添付metadataは含まれない。モデルは別途取得してバックアップする。
- ローカル参照は予約の編集でWindowsの絶対パスまたはUNC共有パスを登録する。参照パスはライブラリの全メンバーに共有される。ローカル連携の設定は `tools/bambu-bridge/README.md` を参照。
- オンライン添付は取得後にBambu Studioで開く。ローカル参照はWindowsの連携ツールで開ける。別のPCを遠隔操作したりプリンターへ送信する機能はない。

## セキュリティ検証と限界

SQLテストは埋め込みPostgresで匿名、未招待、別ライブラリ、閲覧者、編集者、所有者、共有解除、Storageの行権限、競合保存を確認する。Google OAuthおよびSupabase Storage APIの実接続は別途プロジェクト設定後に検証が必要。公開前に2つのGoogleアカウントでログイン・招待・解除・ファイル取得を実機確認する。

画面の非表示は認可の代わりではなく、サーバー側のRLS／RPCが認可する。JWTはブラウザーで扱うため、公開先の安全な運用とXSS対策が必要。共有相手に必要以上の編集権限を与えない。会員一覧は現状ユーザーID表示で、個人メールを一般メンバーへ公開しない。Googleメールを変更した場合の許可リスト更新は管理者が行う。

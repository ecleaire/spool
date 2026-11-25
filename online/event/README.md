# SPOOL イベントの本番接続

作品投稿・一覧・3D表示は GitHub Pages の `/spool/event/index.html`、作品と公開状態は Supabase の `spool_event_records`、写真とモデルは非公開バケット `spool-event-files` に保存する。イベントはライブラリをまたぐ企画で、SPOOL の利用を許可されたアカウントが公開作品を閲覧できる。非公開作品とそのファイルはサービス管理者だけが閲覧できる。

## 初回の有効化

1. 本番プロジェクトの SQL Editor で [event-submissions.sql](../../supabase/event-submissions.sql) を実行する。既存の利用許可関数 `spool_allowed()` と管理者判定関数 `spool_is_admin()` を使用する。
2. Supabase の Storage 設定で S3 互換接続用のアクセスキーを発行する。その画面の region と合わせ、Edge Function の Secrets に `EVENT_S3_REGION`、`EVENT_S3_ACCESS_KEY_ID`、`EVENT_S3_SECRET_ACCESS_KEY` を登録する。このキーはプロジェクトのストレージへの強い権限を持つため、サーバー側だけに保管する。AWS アカウントの作成は不要。
3. 認証済みの Supabase CLI からリポジトリのルートで次を実行する。

   ```sh
   supabase functions deploy spool-events --project-ref mtfmamufpaqpwsuiccoz --no-verify-jwt
   ```

   関数内でリクエストごとに Supabase Auth のユーザーと両方の権限関数を確認する。プリフライトは認証不要。既存SPOOLと同じセッションを利用する。ログイン情報をURLに載せない。

4. 同じコードの Pages 配信後、ログイン済みの許可アカウントで `/spool/event/submissions.html` を開く。小さな作品の投稿、一覧・画像・3D表示、非公開切替後の一般参加者と管理者の見え方を確認する。大きなモデルの分割保存は8 MiBを超えるサンプルでも確認する。実際のファイル上限は Supabase プロジェクトの Storage 設定にも依存する。
5. GitHub Actions のリポジトリ変数 `SPOOL_EVENT_ENABLED` を `true` にして Publish SPOOL を再実行すると、「イベント」タブから作品の投稿と閲覧ができる。未設定の間も同じタブからイベント案内・作品一覧の公開予定・投稿フォームの見本を表示する。アクセス権限は Edge Function が判定する。

## 配布物とローカル検証

`release/` は受領した spool-event-production-integration-20261125.zip の静的配布物。Edge Function の release.mjs は同じ配布物のAPI本体から重複する静的アセットを除いたもの。既存の投稿、管理、分割アップロード、3D表示の実装を使う。ビルド時にイベントページ専用のログインと通信を接続する。Cloudflare 用PRのオリジン変数とCookie引き渡しは使用しない。

```sh
npm ci --prefix online
node build-offline.mjs
SPOOL_EVENT_ENABLED=true node online/build.mjs
node tests/online/event-submissions.test.mjs
node tests/online/event-browser.test.mjs
cd supabase/functions/spool-events
deno check --config deno.json index.ts
```

Storage の S3 署名、読み書き、分割アップロードの確認には、上記と同じディレクトリで次を実行する。接続先はローカルの模擬エンドポイント。

```sh
deno run --config deno.json --allow-net=127.0.0.1 --allow-env --allow-read ../../../tests/online/event-storage.deno.ts
```

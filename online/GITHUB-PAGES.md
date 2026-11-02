# SPOOL の GitHub Pages 公開

公開先: https://ecleaire.github.io/spool/

GitHub の Settings → Pages → Source を GitHub Actions に設定します。
main の更新時に `.github/workflows/pages.yml` が互換性・権限・同期・エラー案内と
`/spool/` 配下のブラウザー動作を確認してから、`out/` の公開ファイルだけを配信します。
SQL、開発ツール、ユーザーのJSONを配信対象に含めません。

Supabase の Authentication → URL Configuration → Redirect URLs に
`https://ecleaire.github.io/spool/` を完全一致で追加します。
旧サイトのURLは移行確認中も維持します。Site URL は新サイトを確認してから切り替えます。
Google Cloud の Supabase callback は変更しません。

データは同じ Supabase に保存されます。Pages へユーザーデータをコピーしたり、
オフライン保存データを自動転送したりしません。新しいドメインでは再ログインします。
オフラインのブラウザー保存はドメイン間で移りません。JSONで書き出して引き継ぎます。

接続設定には公開用キーのみを使い、秘密キー・service_roleキーを配信しません。
公開サイトのHTML/JavaScriptは閲覧可能で、データはSupabaseの招待・所属・RLSで制限します。
同じ `ecleaire.github.io` 配下の別サイトとはブラウザーのオリジンが共通です。
第三者のコードをその配下で動かす場合は、SPOOL専用ドメインでの分離を検討してください。

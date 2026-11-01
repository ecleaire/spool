# SPOOL オフライン版

フィラメント在庫・商品画像・色プリセットと、印刷予約表を扱う単体HTMLです。
外部フォント・JavaScript・サーバー・ログインは不要です。

## 使い方

1. `SPOOL-offline.html` を Chrome または Edge で開きます。
2. 「印刷予約表」から一覧に切り替え、「予約を登録」でフォームを開きます。
3. 登録後は各行の「編集」から修正します。「印刷情報」は印刷済み／印刷予定／未定を選べます。
4. 「データを保存」で、在庫・画像・独自色・予約をまとめたJSONを保存します。
5. 次回やHTMLの更新後は「データファイルを開く」で同じJSONを選びます。

Chrome／Edgeでファイルへの書き込みを許可すると、接続中のJSONへ変更を自動保存します。
対応していないブラウザーではJSONをダウンロードする方式になります。
ブラウザーへの保存は補助です。端末やHTML名を変える前にはJSONを保存してください。
データファイルが別画面で変更されていた場合は上書きを止めるため、読み直すか別名で保存してください。

サイト版を利用中なら「HTMLをダウンロード」で、現在の在庫と予約を含めた単体HTMLを作成できます。
商品販売ページや出典のリンクを開く場合だけ、インターネット接続が必要です。

## ソースと検証

`public/` が編集用ソースです。`node build-offline.mjs` で単体の `dist/index.html` と
隣接する `deliverables/SPOOL-offline.html` を生成します。ビルド・テストに外部パッケージは不要です。

`node tests/offline.test.mjs` は、通信依存がないこと、HTML内のスクリプト、予約の登録・編集、
印刷情報の選択、ファイル保存・復元、旧形式、画像の保持、上書き競合、制限付き保存環境を検証します。

Bambu Labの公式色定義は同社のBambuStudio公開データをもとに同梱しています。
https://github.com/bambulab/BambuStudio/blob/master/resources/profiles/BBL/filament/filaments_color_codes.json

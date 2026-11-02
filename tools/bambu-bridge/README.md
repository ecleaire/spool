# Windows Bambu Studio連携（実機検証待ち）

Windowsのログインユーザーだけに `spool-bambu:` プロトコルを登録します。管理者権限・常駐サーバーは不要です。予約のファイルパスを受け取り、ファイル名を表示して確認後、指定したBambu Studioを起動します。任意コマンドやHTTPSダウンロードの実行はしません。

PowerShellから、Bambu Studioの実際のインストール場所を指定して実行:

```powershell
.\Install.ps1 -BambuStudioPath 'C:\Program Files\Bambu Studio\bambu-studio.exe'
```

組織やPCのPowerShellポリシーで拒否された場合は管理者に確認してください。このツールは実行ポリシーを変更・無効化しません。

予約の関連ファイルに `C:\Models\作品.3mf` や `\\server\prints\作品.stl` を登録して保存します。リンクを押すとブラウザーの外部アプリ許可と、連携ツールの確認が表示されます。各PCで同じ共有パスへアクセスできる必要があります。ネット上のHTTPSファイルはブラウザーで取得してから開きます。拡張子を許可していても、Bambu Studioのバージョンやプリンターに対応しないファイルは開けない場合があります。

削除は `Uninstall.ps1` を実行します。モデル・在庫データは変更しません。

Linuxのクラウド環境ではWindowsレジストリ、PowerShell、Bambu Studioを実行していません。実機でインストール／日本語・空白のパス／共有パス／取消／アンインストールの確認が必要です。

// User-facing recovery paths, separate from optional technical diagnostics.
export function classifyError(error){
 const message=String(error?.message||error||'不明なエラー'),code=String(error?.code||''),status=Number(error?.status||error?.statusCode||0);
 const result=(category,title,action)=>({category,title,action,detail:[code&&'コード: '+code,message].filter(Boolean).join('\n')});
 if(status===401||/jwt.*expired|invalid.*jwt|refresh.token|not authenticated/i.test(message))return result('session','ログインの有効期限が切れました','未保存の内容をJSONで退避してから、ログインし直してください。');
 if(status===403||code==='42501'||/row.level.security|permission denied|not.allowed|招待|利用許可/i.test(message))return result('permission','この操作の権限がありません','正しいアカウント・ライブラリか確認してください。共有ライブラリの場合は管理者に確認してください。');
 if(status===409||/conflict|revision|競合/i.test(message))return result('conflict','ほかの変更と重なりました','JSONで退避してから最新データを読み込み、変更を確認してください。');
 if(status===413||/payload too large|exceeded.*size|サイズ|100MB/i.test(message))return result('file','ファイルを確認してください','対応形式・ファイルサイズを確認し、選び直してください。');
 if(status===429)return result('rate','操作が混み合っています','少し時間を置いて、もう一度お試しください。');
 if(/failed to fetch|network|offline|timeout|timed out|通信|接続でき/i.test(message))return result('network','通信できませんでした','接続を確認して再試行してください。入力内容は画面に保持されています。');
 if(/quota|storage.*full|保存容量/i.test(message))return result('storage','保存容量が不足しています','JSONで退避し、不要な添付やデータを整理してください。');
 if(/秘密キー|公開キー|Publishable|SupabaseのHTTPS|接続設定/i.test(message))return result('settings','接続設定を確認してください',message);
 if(/データ形式|JSON|未対応|対応形式|予約を選択|先に予約|保存が完了/i.test(message))return result('input','入力内容を確認してください',message);
 return result('unknown','処理を完了できませんでした','入力内容を残したまま再試行してください。解決しない場合は「詳細」の内容を確認してください。');
}

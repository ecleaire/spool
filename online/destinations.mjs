// Wording only; authorization remains in the existing permission and RPC checks.
export function describeDestination(active,source,{view=false,readonly=false}={}) {
 const current=(active?.name||'ライブラリ')+'（'+(active?.personal?'個人用':'共有用')+'）';
 const location=(view?'表示先：':'登録・編集先：')+current;
 if(source)return location+' · 原本：'+(source.name||'共有元ライブラリ')+(readonly?' · 閲覧のみ':' · 編集は共有元と同期先に反映されます');
 return location+(readonly?' · 閲覧のみ':'');
}

// Pure preview: no remote identity lookup and no mutation. Target membership is authoritative on save.
export function filamentSharingPreview({items,links,target,checked,automatic,addOnly=false,esc}){
 const link=links.find(x=>x.shared_library_id===target);
 const includes=item=>item.inventoryStatus==='planned'?!!link?.included_ids?.includes(item.id):link?.mode==='all'?!link.excluded_ids?.includes(item.id):!!link?.included_ids?.includes(item.id);
 const before=new Set(items.filter(includes).map(x=>x.id));
 const next=new Set(addOnly?[...before,...checked]:checked);
 const added=items.filter(x=>next.has(x.id)&&!before.has(x.id)),removed=items.filter(x=>before.has(x.id)&&!next.has(x.id)),kept=items.filter(x=>next.has(x.id)&&before.has(x.id));
 const group=(title,rows)=>'<section><h4>'+title+'（'+rows.length+'件）</h4>'+(rows.length?'<ul>'+rows.map(x=>'<li>'+esc([x.name,x.colorName].filter(Boolean).join(' / '))+'</li>').join('')+'</ul>':'<p>なし</p>')+'</section>';
 return '<p><strong>閲覧できる人：</strong>共有先の参加者全員。今後参加する人も対象です。参加者が行える操作は、共有先の権限設定に従います。</p><p><strong>対象の情報：</strong>商品名・画像・色・タグ・メモ・保管場所・残量など、フィラメントの登録情報。予約と添付ファイルはこの操作では共有しません。</p><p><strong>今後の追加：</strong>'+(automatic?'在庫は自動共有します。購入予定・希望は選んだものだけです。':'現在選択した項目のみ。新規追加は自動共有しません。')+'</p>'+group('新しく共有',added)+group('共有を停止',removed)+group('共有を維持',kept)+'<p>共有停止でも原本と他の共有先は残ります。保存するまでは反映されません。</p>';
}

// Exercises canonical automatic sharing in the isolated PGlite database only.
export async function checkAutomaticFilamentSharing({db,as,scalar,source}){
 const {default:assert}=await import('node:assert/strict');
 await as(0,'owner@example.com',async()=>{
  const original=await scalar('select state,revision from public.library_state where library_id=$1',[source]);
  const target=(await scalar("select public.create_shared_library('自動共有の検証') as id")).id;
  const item={id:'auto-stock',name:'自動共有の原本',brand:'QA',material:'PLA',colorName:'白',color:'#FFFFFF',remaining:800,capacity:1000,tags:['独自タグ'],image:''};
  const excluded={...item,id:'auto-excluded'},plan={...item,id:'auto-plan',inventoryStatus:'planned'},wish={...plan,id:'auto-wish',purchaseIntent:'wish'};
  let revision=original.revision,items=[item,excluded,plan,wish];
  const save=async()=>{revision=(await scalar('select public.save_library_state($1,$2,$3) as revision',[source,revision,{...original.state,items}])).revision};
  const rows=async()=> (await scalar('select public.get_shared_filaments($1) as rows',[target])).rows;
  try{
   await save();await db.query("select public.set_filament_sharing($1,$2,'all','{}',$3)",[target,source,[excluded.id]]);
   assert.deepEqual((await rows()).map(x=>x.source_item_id),[item.id]);
   const fresh={...item,id:'auto-new'},newWish={...wish,id:'auto-new-wish'};items.push(fresh,newWish);await save();
   assert.deepEqual((await rows()).map(x=>x.source_item_id).sort(),[item.id,fresh.id].sort(),'new owned stock is automatic; new wishes remain private');
   items=items.map(x=>x.id===item.id?{...x,name:'原本から編集',remaining:321,tags:['更新したタグ']}:x);await save();
   const visible=(await rows()).find(x=>x.source_item_id===item.id);assert.equal(visible.item.name,'原本から編集');assert.equal(visible.item.remaining,321);assert.deepEqual(visible.item.tags,['更新したタグ']);
   await db.query("select public.set_filament_sharing($1,$2,'all',$3,$4)",[target,source,[plan.id,wish.id],[excluded.id]]);
   assert.deepEqual((await rows()).map(x=>x.source_item_id).sort(),[item.id,fresh.id,plan.id,wish.id].sort());
   items=items.filter(x=>x.id!==item.id);await save();assert.equal((await rows()).some(x=>x.source_item_id===item.id),false,'deleted originals disappear');
   await db.query("select public.set_filament_sharing($1,$2,'none','{}')",[target,source]);assert.deepEqual(await rows(),[]);assert.equal((await scalar('select state from public.library_state where library_id=$1',[source])).state.items.length,items.length,'stop retains all originals');
  }finally{
   const current=await scalar('select revision from public.library_state where library_id=$1',[source]);await db.query('select public.save_library_state($1,$2,$3)',[source,current.revision,original.state]);
  }
 });
 console.log('PASS: personal-library auto sharing of future stock, exclusions, canonical edits/remaining/tags, deletion, explicit plan/wish selection and stop preserving originals.');
}

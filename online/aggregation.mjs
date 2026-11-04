export function mergedInventory(ownItems,rows){const items=rows.map(row=>({...row.item,id:'shared-'+row.source_id+'-'+encodeURIComponent(row.item.id),_sharedSource:{id:row.source_id,name:row.source_name}}));return [...ownItems,...items];}
export function withoutSharedItems(state){return {...state,items:state.items.filter(x=>!x._sharedSource)};}

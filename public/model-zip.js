// Uncompressed ZIP32: avoids runtime dependencies and preserves original model bytes.
(function(root){
 const encoder=new TextEncoder(),table=Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
 function crc(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
 function leaf(name){const clean=String(name).replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g,'_').replace(/[. ]+$/,'').slice(0,240);return !clean||/^\.+$/.test(clean)?'model':clean}
 async function archive(entries){
  if(!entries.length||entries.length>100)throw Error('1回に保存できる添付は1〜100件です。');
  let offset=0,total=0;const parts=[],directory=[],used=new Set();
  for(const entry of entries){
   total+=entry.blob.size;if(total>200*1024*1024)throw Error('一括保存は合計200MBまでです。予約を分けて選択してください。');
   const folder=leaf(entry.folder),base=leaf(entry.name);let name=folder+'/'+base,n=2;
   while(used.has(name.toLowerCase())){const dot=base.lastIndexOf('.');name=folder+'/'+(dot>0?base.slice(0,dot):base)+' ('+(n++)+')'+(dot>0?base.slice(dot):'');}used.add(name.toLowerCase());
   const path=encoder.encode(name),bytes=new Uint8Array(await entry.blob.arrayBuffer()),checksum=crc(bytes),header=new Uint8Array(30+path.length),h=new DataView(header.buffer);
   h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(12,33,true);h.setUint32(14,checksum,true);h.setUint32(18,bytes.length,true);h.setUint32(22,bytes.length,true);h.setUint16(26,path.length,true);header.set(path,30);parts.push(header,bytes);
   const central=new Uint8Array(46+path.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);c.setUint32(16,checksum,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,path.length,true);c.setUint32(42,offset,true);central.set(path,46);directory.push(central);offset+=header.length+bytes.length;
  }
  const size=directory.reduce((sum,x)=>sum+x.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);return new Blob([...parts,...directory,end],{type:'application/zip'});
 }
 root.spoolModelZip={archive,leaf};
})(globalThis);

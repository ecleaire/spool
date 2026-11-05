import {readFileSync} from 'node:fs';
const names=['SPOOL.FileOpener.exe'];
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
const crc32=data=>{let crc=0xffffffff;for(const byte of data)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0};
// A reproducible, uncompressed ZIP: no runtime dependency or external download.
export function modelHelperArchive(){
 const files=[],directory=[];let offset=0;
 for(const name of names){
  const filename=Buffer.from(name),data=readFileSync(new URL('./file-bridge/'+name,import.meta.url)),crc=crc32(data),header=Buffer.alloc(30),entry=Buffer.alloc(46);
  header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(filename.length,26);
  entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);entry.writeUInt16LE(33,14);entry.writeUInt32LE(crc,16);entry.writeUInt32LE(data.length,20);entry.writeUInt32LE(data.length,24);entry.writeUInt16LE(filename.length,28);entry.writeUInt32LE(offset,42);
  files.push(header,filename,data);directory.push(entry,filename);offset+=header.length+filename.length+data.length;
 }
 const central=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(names.length,8);end.writeUInt16LE(names.length,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...files,central,end]);
}

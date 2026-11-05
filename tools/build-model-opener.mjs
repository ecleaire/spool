import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
if(process.platform!=='win32')throw Error('Build the Windows helper on Windows; other platforms use the reviewed, checked-in executable.');
const source=fileURLToPath(new URL('./file-bridge/ModelOpener.cs',import.meta.url)),output=fileURLToPath(new URL('./file-bridge/SPOOL.FileOpener.exe',import.meta.url));
const compiler=process.env.SystemRoot+'\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
execFileSync(compiler,['/nologo','/target:winexe','/optimize+','/codepage:65001','/reference:System.Windows.Forms.dll','/out:'+output,source],{stdio:'inherit'});
writeFileSync(new URL('./file-bridge/build.json',import.meta.url),JSON.stringify({sourceSha256:createHash('sha256').update(readFileSync(source)).digest('hex'),exeSha256:createHash('sha256').update(readFileSync(output)).digest('hex')},null,2)+'\n');

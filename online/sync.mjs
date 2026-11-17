import {classifyError} from './errors.mjs';
export class LibrarySync {
  constructor(api, changed=()=>{}) { this.api=api; this.changed=changed; this.epoch=0;this.library=null;this.revision=0;this.sequence=0;this.dirty=false;this.busy=false;this.conflict=false;this.retrying=false;this.recovering=false;this.lastError=null;this.confirmedAt=null; }
  reset(library,revision=0) { this.epoch++; this.library=library; this.revision=revision; this.sequence=0; this.dirty=false; this.busy=false; this.conflict=false; this.retrying=false; this.recovering=false; this.lastError=null; this.confirmedAt=library?Date.now():null; this.changed(); }
  edit() { this.sequence++; this.dirty=true; this.changed(); }
  retry() { if(this.busy){this.retrying=true;this.changed();} }
  async save(state) {
    if(!this.library||!this.dirty||this.busy||this.conflict)return;
    const library=this.library, epoch=this.epoch, sequence=this.sequence, revision=this.revision;
    this.busy=true; this.retrying=false; this.recovering=!!this.lastError&&['network','uncertain'].includes(classifyError(this.lastError).category); this.lastError=null; this.changed();
    try {
      const next=await this.api(library,revision,structuredClone(state));
      if(epoch!==this.epoch)return;
      if(!Number.isInteger(next)||next<revision)throw Object.assign(Error('保存結果の版番号を確認できませんでした。'),{code:'WRITE_RESULT_UNKNOWN'});
      this.revision=next;this.confirmedAt=Date.now(); if(sequence===this.sequence)this.dirty=false;
    } catch(error) { if(epoch===this.epoch){this.lastError=error;if(error.code==='40001')this.conflict=true;} throw error; }
    finally { if(epoch===this.epoch){this.busy=false;this.retrying=false;this.recovering=false;this.changed();} }
  }
}
export function syncStatus(sync,{offline=false}={}) {
 const state=sync.conflict?'conflict':sync.busy?(sync.retrying?'retrying':'busy'):sync.dirty?(offline?'offline':sync.lastError?(sync.lastError.code==='WRITE_RESULT_UNKNOWN'?'uncertain':'error'):'dirty'):'saved';
 const text={conflict:'変更が競合しています',retrying:'再試行中…',busy:'オンライン保存中…',offline:'オフライン・未保存',error:'保存できていません',uncertain:'保存結果が未確認',dirty:'未保存の変更があります',saved:'オンライン保存済み'}[state];
 return {state,text};
}

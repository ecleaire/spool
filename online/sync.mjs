export class LibrarySync {
  constructor(api, changed=()=>{}) { this.api=api; this.changed=changed; this.sequence=0; this.dirty=false; this.busy=false; this.conflict=false; this.library=null; this.revision=0; this.epoch=0; }
  reset(library,revision=0) { this.epoch++; this.library=library; this.revision=revision; this.sequence=0; this.dirty=false; this.busy=false; this.conflict=false; this.changed(); }
  edit() { this.sequence++; this.dirty=true; this.changed(); }
  async save(state) {
    if(!this.library||!this.dirty||this.busy||this.conflict)return;
    const library=this.library, epoch=this.epoch, sequence=this.sequence, revision=this.revision;
    this.busy=true; this.changed();
    try {
      const next=await this.api(library,revision,structuredClone(state));
      if(epoch!==this.epoch)return;
      this.revision=next; if(sequence===this.sequence)this.dirty=false;
    } catch(error) { if(epoch===this.epoch&&error.code==='40001')this.conflict=true; throw error; }
    finally { if(epoch===this.epoch){this.busy=false;this.changed();} }
  }
}

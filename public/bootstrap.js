// A downloaded copy can carry its own snapshot. Browser edits take precedence;
// a separate JSON data file remains the portable source across HTML versions.
const EMBEDDED_DATA=(()=>{try{return JSON.parse(document.getElementById('spool-embedded-data')?.textContent||'{}')}catch{return {}}})();
// File URLs and private windows may restrict browser storage. Keep the app
// usable in memory; the explicit JSON file is the durable portable record.
const storage=(()=>{const memory=new Map();let persistent=true;return {
  get persistent(){return persistent},
  getItem(key){if(memory.has(key))return memory.get(key);try{return localStorage.getItem(key)}catch{persistent=false;return null}},
  setItem(key,value){memory.set(key,String(value));try{localStorage.setItem(key,String(value))}catch{persistent=false}},
  removeItem(key){memory.delete(key);try{localStorage.removeItem(key)}catch{persistent=false}},
}})();

// The main page and event share an origin. The fragment only identifies a
// one-use handoff in this tab, never the account or its authentication token.
const pendingKey='spool-event-entry';
const memberKey='spoolEventMember';

export function eventEntryUrl(userId) {
  const url=new URL('./event/index.html',location.href);
  if(userId) {
    try {
      const nonce=crypto.randomUUID();
      sessionStorage.setItem(pendingKey,JSON.stringify({nonce,userId}));
      url.hash='entry='+nonce;
    } catch { /* The public event also works with storage disabled. */ }
  }
  return url.href;
}

export function eventMember() {
  const url=new URL(location.href);
  if(url.hash.startsWith('#entry=')) {
    let member=null;
    try {
      const entry=JSON.parse(sessionStorage.getItem(pendingKey));
      if(entry?.nonce===url.hash.slice(7)) {
        sessionStorage.removeItem(pendingKey);
        member=entry.userId;
      }
    } catch { /* A shared link has no matching handoff. */ }
    url.hash='';
    history.replaceState({...history.state,[memberKey]:member},'',url);
    return member;
  }
  return history.state?.[memberKey] || null;
}

export function forgetEventMember() {
  history.replaceState({...history.state,[memberKey]:null},'');
}

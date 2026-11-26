export async function eventRequest(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  const response = await fetch('/api' + path, {credentials:'same-origin', ...options, headers});
  const data = await response.json().catch(() => ({error:'サーバーの応答を確認できませんでした。'}));
  if (!response.ok) {
    throw Object.assign(Error(data.error || '処理できませんでした。'), {status:response.status, data});
  }
  return data;
}

export async function eventSession(production) {
  const response = await fetch('/api/session', {credentials:'same-origin'});
  if (response.status === 404) {
    if (production) throw Error('共有APIに接続できません。管理者に連絡してください。');
    return null;
  }
  const data = await response.json();
  if (!response.ok) throw Error(data.error || '共有保存に接続できません。');
  return data;
}

// Each read may finish before the gallery module is ready to consume it.
function settled(read) {
  return read.then(value => ({status:'fulfilled', value}), reason => ({status:'rejected', reason}));
}

export function startGalleryReads() {
  return {
    works:settled(eventRequest('/works')),
    session:settled(eventSession(true)),
    reactions:settled(eventRequest('/reactions'))
  };
}

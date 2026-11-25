// Each entry includes the in-flight tap. Serialize saves per work while accepting
// further taps immediately. The server remains authoritative across devices.
export function createReactionQueue({limit, state, send, acknowledge, changed, failed}) {
  const queues = new Map();
  function full(work) {
    const {batch = 0, until = 0} = state(work);
    return until > Date.now() || (until ? 0 : batch) + (queues.get(work)?.length ?? 0) >= limit;
  }
  function pending(work, type) {
    return queues.get(work)?.filter(item => item === type).length ?? 0;
  }
  async function drain(work, queue) {
    try {
      while (queue.length) {
        const result = await send(work, queue[0]);
        queue.shift();
        acknowledge(work, result);
        if (result.until > Date.now() && queue.length) {
          queue.length = 0;
          failed(work, Error('連続タップの上限に達しました。残りのリアクションは送信されていません。'));
        }
        changed();
      }
    } catch (error) {
      queue.length = 0;
      failed(work, error);
    } finally {
      queues.delete(work);
      changed();
    }
  }
  function tap(work, type) {
    if (full(work)) return;
    const existing = queues.get(work);
    if (existing) { existing.push(type); changed(); return; }
    const queue = [type];
    queues.set(work, queue);
    changed();
    void drain(work, queue);
  }
  return {tap, full, pending, saving:()=>queues.size > 0};
}

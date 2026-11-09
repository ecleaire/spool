import { classifyError } from "./errors.mjs";
async function retryNetwork(operation, { valid = () => true, onRetry = () => {
}, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), delay = 600 } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!valid()) throw Object.assign(Error("操作の対象が変わりました。"), { code: "CANCELLED" });
    try {
      const result = await operation(attempt);
      if (!valid()) throw Object.assign(Error("操作の対象が変わりました。"), { code: "CANCELLED" });
      if (result?.error) throw result.error;
      return result;
    } catch (error) {
      if (attempt || classifyError(error).category !== "network" || !valid()) throw error;
      onRetry();
      await wait(delay);
    }
  }
}
const retryableRpcs = /* @__PURE__ */ new Set(["ensure_my_library", "spool_is_admin", "get_spool_accounts", "get_shared_filaments", "get_shared_bookings", "get_booking_sharing_summary", "get_booking_sharing", "set_booking_sharing", "stop_booking_sharing", "get_filament_sharing", "get_my_library_permissions", "get_library_member_permissions", "get_shared_library_deletion_info", "get_library_member_profiles", "library_is_shared", "my_filaments_shared", "set_filament_sharing", "stop_shared_filaments", "update_library_appearance", "rename_spool_library"]);
// Only identical reads in flight share a response. No saved data or permission cache.
const readRpcs = new Set(["spool_is_admin", "get_spool_accounts", "get_shared_filaments", "get_shared_bookings", "get_booking_sharing_summary", "get_booking_sharing", "get_filament_sharing", "get_my_library_permissions", "get_library_member_permissions", "get_shared_library_deletion_info", "get_library_member_profiles", "library_is_shared", "my_filaments_shared"]);
function retryingFetch(fetcher, { context = () => null, onRetry = () => {
}, timeout = 12e3, downloadTimeout = 12e4 } = {}) {
  const pending = new Map();
  let pendingContext;
  return async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, globalThis.location?.href), method = (init.method || input.method || "GET").toUpperCase(), retryable = method === "GET" || method === "HEAD" || method === "POST" && url.pathname.startsWith("/storage/v1/object/sign/") || method === "POST" && retryableRpcs.has(url.pathname.split("/").pop());
    const bounded = async () => {
      const controller = new AbortController(), external = init.signal || input?.signal;
      let expired = false;
      const cancel = () => controller.abort(external?.reason);
      if (external?.aborted) cancel();
      else external?.addEventListener("abort", cancel, { once: true });
      const timer = setTimeout(() => {
        expired = true;
        controller.abort();
      }, method === "GET" && url.pathname.startsWith("/storage/") ? downloadTimeout : timeout);
      try {
        const response = await fetcher(input, { ...init, signal: controller.signal });
        if (retryable && [502, 503, 504].includes(response.status)) {
          // Release a discarded response so retries do not leave unread streams open.
          void response.body?.cancel().catch(() => {});
          throw new TypeError("Failed to fetch: temporary server error");
        }
        if (response.body && (url.pathname.startsWith("/rest/") || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/storage/") || /\.json$/.test(url.pathname))) {
          const blob = await response.blob();
          return new Response(blob, { status: response.status, statusText: response.statusText, headers: response.headers });
        }
        return response;
      } catch (error) {
        if (!retryable && url.pathname.includes("/rest/v1/rpc/") && !url.pathname.endsWith("/rpc/save_library_state") && !external?.aborted && (expired || classifyError(error).category === "network")) throw Object.assign(Error("保存結果を確認できませんでした。サーバー側で保存済みの可能性があります。"), { code: "WRITE_RESULT_UNKNOWN" });
        if (expired) throw Error("通信がタイムアウトしました。");
        throw error;
      } finally {
        clearTimeout(timer);
        external?.removeEventListener("abort", cancel);
      }
    };
    if (!retryable) return url.pathname.includes("/rest/v1/rpc/") || url.pathname.startsWith("/auth/") ? bounded() : fetcher(input, init);
    const stamp = context();
    const read = () => retryNetwork(bounded, { valid: () => context() === stamp, onRetry });
    // A caller with its own cancellation, or a Request/stream body, keeps its own request.
    const share = (typeof input === "string" || input instanceof URL) && !init.signal &&
      (init.body == null || typeof init.body === "string") && url.pathname.startsWith("/rest/v1/") &&
      ((method === "GET" || method === "HEAD") || method === "POST" && url.pathname.startsWith("/rest/v1/rpc/") && readRpcs.has(url.pathname.split("/").pop()));
    if (!share) return read();
    if (pendingContext !== stamp) { pending.clear(); pendingContext = stamp; }
    const headers = [...new Headers(init.headers)].sort(([a], [b]) => a.localeCompare(b));
    const key = JSON.stringify([url.href, method, init.body ?? null, headers, init.credentials, init.mode, init.cache, init.redirect, init.referrer, init.referrerPolicy, init.integrity]);
    let request = pending.get(key);
    if (!request) {
      request = read().finally(() => { if (pending.get(key) === request) pending.delete(key); });
      pending.set(key, request);
    }
    const response = await request;
    // Every consumer gets its own readable body, including when the response is an error.
    return response instanceof Response ? response.clone() : response;
  };
}
function sameState(a, b) {
  const stable = (x) => Array.isArray(x) ? "[" + x.map(stable).join(",") + "]" : x && typeof x === "object" ? "{" + Object.keys(x).sort().map((k) => JSON.stringify(k) + ":" + stable(x[k])).join(",") + "}" : JSON.stringify(x);
  return stable(a) === stable(b);
}
async function saveWithRetry(api, read, library, revision, state, options) {
  return retryNetwork(async (attempt) => {
    if (attempt) {
      const latest = await read(library);
      if (latest.error) throw latest.error;
      const saved = latest.data;
      if (saved.revision === revision + 1 && sameState(saved.state, state)) return saved.revision;
      if (saved.revision !== revision) throw Object.assign(Error("ほかの変更と重なりました。"), { code: "40001" });
    }
    return api(library, revision, state);
  }, options);
}
export {
  retryNetwork,
  retryingFetch,
  sameState,
  saveWithRetry
};

import { normalizeStlFiles } from "./stl.js";
async function loadGalleryFile(file) {
  if (file.blob) return;
  file.pending ??= fetch(file.url, { credentials: "same-origin" }).then(async (response) => {
    if (!response.ok) throw Error("モデルを取得できません。もう一度お試しください。");
    file.blob = await response.blob();
  }).finally(() => {
    delete file.pending;
  });
  await file.pending;
}
async function readModelBytes(model) {
  const root = model.files.find(file => file.name === model.root);
  if (!root) throw Error("3Dモデル本体が見つかりません。");
  if (model.remoteFiles) await loadGalleryFile(root);
  const metadata = await inspectModel(model);
  if (model.remoteFiles) {
    const resources = [...(metadata.buffers || []), ...(metadata.images || [])];
    await Promise.all(resources
      .filter(resource => resource.uri && !resource.uri.startsWith("data:"))
      .map(resource => loadGalleryFile(resolveModelFile(model, resource.uri))));
  }
  return root.blob.arrayBuffer();
}
var mb = /\.(gltf|glb|bin|png|jpe?g|webp)$/i;
function safeModelPath(i, e = false) {
  let t = i;
  try {
    e && (t = decodeURIComponent(i));
  } catch {
    throw Error("モデルの参照ファイル名を確認してください。");
  }
  let n = t.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!n || n.startsWith("/") || n.split("/").includes("..") || /^[a-z]+:/i.test(n) || /[\x00-\x1f]/.test(n)) throw Error("モデルに外部URLや安全に扱えないファイル名が含まれています。");
  return n;
}
async function packageModelFiles(i, e) {
  if (!i.length || i.length > 20) throw Error("モデル本体と関連ファイルを合わせて1〜20ファイル選んでください。");
  let t = i.reduce((a, o) => a + o.size, 0);
  if (t > 500 * 1024 * 1024 || !t) throw Error("モデル本体と関連ファイルを合わせて500MB以内にしてください。");
  i = await normalizeStlFiles(i);
  let n = i.map((a) => ({ name: safeModelPath(a.webkitRelativePath || a.name), blob: a }));
  if (n.some((a) => !mb.test(a.name))) throw Error("モデル本体・BIN・PNG・JPEG・WebPだけを選んでください。");
  if (new Set(n.map((a) => a.name)).size !== n.length) throw Error("同じ名前のファイルが含まれています。");
  let s = n.filter((a) => /\.(gltf|glb)$/i.test(a.name));
  if (!s.length) throw Error("GLTFまたはGLBのモデル本体を選んでください。");
  let r = { root: s.some((a) => a.name === e) ? e : s[0].name, roots: s.map((a) => a.name), files: n, total: t };
  for (let a of r.roots) await inspectModel({ ...r, root: a });
  return r;
}
async function inspectModel(i) {
  let e = i.files.find((c) => c.name === i.root);
  if (!e) throw Error("3Dモデル本体が見つかりません。");
  let t;
  try {
    if (/\.glb$/i.test(i.root)) {
      let c = await e.blob.slice(0, 20).arrayBuffer(), l = new DataView(c);
      if (c.byteLength < 20 || l.getUint32(0, true) !== 1179937895 || l.getUint32(4, true) !== 2 || l.getUint32(8, true) !== e.blob.size || l.getUint32(16, true) !== 1313821514) throw Error();
      let h = l.getUint32(12, true);
      if (h > e.blob.size - 20) throw Error();
      t = JSON.parse(await e.blob.slice(20, 20 + h).text());
    } else t = JSON.parse(await e.blob.text());
  } catch {
    throw Error("3Dモデルの内容を読み取れません。GLTF 2.0／GLB 2.0のファイルを選んでください。");
  }
  if (t?.asset?.version !== "2.0") throw Error("GLTF 2.0／GLB 2.0に対応しています。");
  if ((t.extensionsRequired || []).some((c) => ["KHR_draco_mesh_compression", "EXT_meshopt_compression", "KHR_texture_basisu"].includes(c))) throw Error("この形式の圧縮モデルは表示できません。圧縮せずGLBで書き出してください。");
  for (let c of [...t.buffers || [], ...t.images || []]) if (c.uri) {
    if (typeof c.uri != "string") throw Error("モデルの参照ファイルが正しくありません。");
    if (c.uri.startsWith("data:")) {
      if (!/^data:(application\/(octet-stream|gltf-buffer)|image\/(png|jpeg|webp));base64,/i.test(c.uri)) throw Error("モデルに対応していない埋め込みデータがあります。");
      continue;
    }
    resolveModelFile(i, c.uri);
  }
  if ((t.nodes?.length || 0) > 1e4 || (t.meshes?.length || 0) > 1e4) throw Error("モデルが複雑すぎます。軽量化してお試しください。");
  let s = 0, r = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }, a = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
  for (let c of t.accessors || []) {
    if (!Number.isSafeInteger(c.count) || c.count < 0 || !r[c.componentType] || !a[c.type]) throw Error("モデルの頂点データを確認してください。");
    if (s += c.count * r[c.componentType] * a[c.type], !Number.isSafeInteger(s) || s > 256 * 1024 * 1024) throw Error("モデルの展開後データが大きすぎます。軽量化してお試しください。");
  }
  let o = 0;
  for (let c of t.meshes || []) for (let l of c.primitives || []) {
    let h = t.accessors?.[l.attributes?.POSITION];
    if (o += h?.count || 0, o > 2e6) throw Error("モデルの頂点数を200万以下に軽量化してください。");
  }
  return t;
}
function resolveModelFile(i, e) {
  let t = safeModelPath(e, true), n = t.split("/").pop(), s = i.files.find((a) => a.name === t || a.name === (i.root.includes("/") ? i.root.slice(0, i.root.lastIndexOf("/") + 1) : "") + t);
  if (s) return s;
  let r = i.files.filter((a) => a.name.split("/").pop() === n);
  if (r.length === 1) return r[0];
  throw Error("モデルに必要な「" + n + "」も一緒に選んでください。");
}
const defaultBackground = "#edf1e7";
function normalizeBackground(i) {
  return /^#[0-9a-f]{6}$/i.test(i || "") ? i.toLowerCase() : defaultBackground;
}
export {
  defaultBackground,
  readModelBytes,
  normalizeBackground,
  packageModelFiles,
  resolveModelFile
};

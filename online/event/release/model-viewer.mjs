import {
  Box3,
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  LoadingManager,
  PerspectiveCamera,
  Scene,
  Shape,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { inspectModel, loadGalleryFile, normalizeBackground, resolveModelFile } from "./model-package.js";
function disposeScene(i) {
  if (!i) return;
  let e = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set();
  i.traverse((s) => {
    s.geometry && n.add(s.geometry);
    for (let r of Array.isArray(s.material) ? s.material : s.material ? [s.material] : []) {
      t.add(r);
      for (let a of Object.values(r)) a?.isTexture && e.add(a);
    }
  });
  for (let s of e) s.source?.data?.close?.(), s.dispose();
  for (let s of t) s.dispose();
  for (let s of n) s.dispose();
}
async function parseModel(i) {
  if (i.remoteFiles) {
    const rootFile = i.files.find((file) => file.name === i.root);
    if (rootFile) await loadGalleryFile(rootFile);
  }
  const metadata = await inspectModel(i);
  if (i.remoteFiles) {
    const resources = [...metadata.buffers || [], ...metadata.images || []];
    await Promise.all(resources.filter((resource) => resource.uri && !resource.uri.startsWith("data:")).map((resource) => loadGalleryFile(resolveModelFile(i, resource.uri))));
  }
  let e = await i.files.find((a) => a.name === i.root).blob.arrayBuffer(), t = [], n = new LoadingManager();
  n.setURLModifier((a) => {
    if (a.startsWith("blob:")) return a;
    if (a.startsWith("data:")) {
      if (!/^data:(application\/(octet-stream|gltf-buffer)|image\/(png|jpeg|webp));base64,/i.test(a)) throw Error("対応していないデータ形式です。");
      return a;
    }
    let o = resolveModelFile(i, a), c = URL.createObjectURL(o.blob);
    return t.push(c), c;
  });
  let s = new GLTFLoader(n), r;
  try {
    r = await s.parseAsync(e, "");
    let a = 0, o = /* @__PURE__ */ new Set();
    if (r.scene.traverse((l) => {
      let h = l.geometry?.attributes?.position;
      a += h?.count || 0;
      let u = h?.array || h?.data?.array;
      if (u && !o.has(u)) {
        o.add(u);
        for (let d = 0; d < u.length; d++) if (!Number.isFinite(u[d])) throw Error("モデルの頂点に不正な数値があります。書き出し直してください。");
      }
    }), a > 2e6) throw Error("モデルが大きすぎます。頂点数を200万以下に軽量化してください。");
    let c = new Box3().setFromObject(r.scene);
    if (c.isEmpty() || ![...c.min.toArray(), ...c.max.toArray()].every(Number.isFinite)) throw Error("表示できる形状がモデルにありません。");
    return { scene: r.scene, box: c, dispose() {
      disposeScene(r.scene), t.forEach((l) => URL.revokeObjectURL(l));
    } };
  } catch (a) {
    throw r && disposeScene(r.scene), t.forEach((o) => URL.revokeObjectURL(o)), Error(a.message?.includes("モデル") || a.message?.includes("選んで") ? a.message : "3Dモデルを開けません。補助ファイルや書き出し形式を確認してください。");
  }
}
function watchGalleryViewer(viewer, controls) {
  const dialog = viewer.closest("#work-detail");
  if (!dialog) return null;
  const listeners = new AbortController();
  const options = { capture: true, passive: true, signal: listeners.signal };
  const pointers = /* @__PURE__ */ new Set();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let lastActivity = performance.now();
  function activity() {
    controls.autoRotate = false;
    lastActivity = performance.now();
  }
  for (const type of ["pointermove", "click", "wheel", "keydown", "scroll"]) {
    dialog.addEventListener(type, activity, options);
  }
  dialog.addEventListener("pointerdown", (event) => {
    pointers.add(event.pointerId);
    activity();
  }, options);
  for (const type of ["pointerup", "pointercancel"]) {
    window.addEventListener(type, (event) => {
      if (pointers.delete(event.pointerId)) activity();
    }, options);
  }
  window.addEventListener("blur", () => {
    pointers.clear();
    activity();
  }, options);
  document.addEventListener("visibilitychange", activity, options);
  controls.autoRotateSpeed = 0.35;
  return {
    update() {
      if (document.hidden || !viewer.offsetParent || !dialog.open || pointers.size || document.querySelector("dialog[open]:not(#work-detail)")) {
        activity();
        return;
      }
      const elapsed = performance.now() - lastActivity;
      controls.autoRotate = elapsed >= 8e3 && !reducedMotion.matches;
      if (elapsed >= 18e4) {
        activity();
        history.replaceState(history.state, "", "#works");
        location.reload();
      }
    },
    dispose() {
      listeners.abort();
    }
  };
}
function renderModel(i, e, t, n) {
  let s;
  try {
    s = new WebGLRenderer({ antialias: true, alpha: false });
  } catch {
    throw e.dispose(), Error("このブラウザーでは3D表示を利用できません。写真・モデル画像は引き続き確認できます。");
  }
  s.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)), s.setClearColor(normalizeBackground(t)), s.outputColorSpace = SRGBColorSpace, i.replaceChildren(s.domElement);
  let r = new Scene(), a = new Group();
  a.add(e.scene);
  let o = e.box.getCenter(new Vector3()), c = e.box.getSize(new Vector3()), l = 2 / Math.max(c.x, c.y, c.z, 1e-4);
  a.scale.setScalar(l), a.position.copy(o.multiplyScalar(-l)), r.add(a), r.add(new HemisphereLight(16777215, 6584414, 3));
  let h = new DirectionalLight(16777215, 3);
  h.position.set(3, 5, 4), r.add(h);
  let u = new DirectionalLight(16777215, 1.5);
  u.position.set(-3, 1, -3), r.add(u);
  let d = new PerspectiveCamera(38, 1, 0.01, 100), f = new OrbitControls(d, s.domElement);
  f.enableDamping = true, f.minDistance = 1.2, f.maxDistance = 12;
  const axes = ["x", "y", "z"].sort((a2, b) => c[a2] - c[b]);
  const thinAxis = c[axes[0]] < 0.25 * c[axes[1]] ? axes[0] : null;
  const direction = new Vector3(0.45, 0.28, 1);
  if (thinAxis) direction[thinAxis] = 2;
  direction.normalize();
  function frameDistance(sight, aspect) {
    const right = new Vector3().crossVectors(d.up, sight);
    if (right.lengthSq() < 1e-10) right.set(1, 0, 0);
    right.normalize();
    const up = new Vector3().crossVectors(sight, right);
    const vertical = Math.tan(d.fov * Math.PI / 360), horizontal = vertical * aspect;
    let distance = f.minDistance;
    for (const x2 of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
      const corner = new Vector3(x2 * c.x, y * c.y, z * c.z).multiplyScalar(l / 2);
      const depth = corner.dot(sight);
      distance = Math.max(distance, depth + 1.08 * Math.max(Math.abs(corner.dot(right)) / horizontal, Math.abs(corner.dot(up)) / vertical));
    }
    return distance;
  }
  function fitModel(sight = direction) {
    const distance = frameDistance(sight, d.aspect);
    f.maxDistance = Math.max(12, distance * 2);
    d.far = Math.max(100, f.maxDistance + 4);
    d.updateProjectionMatrix();
    f.target.set(0, 0, 0);
    d.position.copy(sight).multiplyScalar(distance);
    f.update();
  }
  const saved = n && [n.position, n.target].every((v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite)) && new Vector3().fromArray(n.position).distanceTo(new Vector3().fromArray(n.target)) > 1e-3;
  let initial = true;
  const g = () => fitModel();
  function x() {
    const width = i.clientWidth, height = i.clientHeight;
    if (!width || !height) return;
    const aspect = width / height;
    if (!initial && aspect !== d.aspect) {
      const offset = d.position.clone().sub(f.target);
      const sight = offset.clone().normalize();
      const fit = frameDistance(sight, aspect);
      const distance = offset.length() * fit / frameDistance(sight, d.aspect);
      f.maxDistance = Math.max(12, fit * 2, distance);
      d.far = Math.max(100, f.maxDistance + 4);
      d.position.copy(f.target).addScaledVector(sight, distance);
    }
    d.aspect = aspect;
    d.updateProjectionMatrix();
    s.setSize(width, height, false);
    if (initial) {
      initial = false;
      let initialDirection = direction;
      if (saved) {
        const target = new Vector3().fromArray(n.target);
        const sight = new Vector3().fromArray(n.position).sub(target).normalize();
        if (!thinAxis || Math.abs(sight[thinAxis]) >= 0.35) initialDirection = sight;
      }
      fitModel(initialDirection);
    }
  }
  const m = new ResizeObserver(x);
  const idle = watchGalleryViewer(i, f);
  let previousFrame = performance.now();
  return m.observe(i), x(), s.setAnimationLoop(() => {
    const now = performance.now();
    idle?.update();
    if (i.offsetParent) {
      f.update(Math.min((now - previousFrame) / 1e3, 0.1));
      s.render(r, d);
    }
    previousFrame = now;
  }), { reset: g, snapshot() {
    return f.update(), s.render(r, d), new Promise((p, M) => s.domElement.toBlob((v) => v ? p(v) : M(Error("モデル画像を作成できません。")), "image/png"));
  }, getView() {
    return { position: d.position.toArray(), target: f.target.toArray() };
  }, setBackground(p) {
    s.setClearColor(normalizeBackground(p));
  }, dispose() {
    idle?.dispose(), m.disconnect(), s.setAnimationLoop(null), f.dispose(), e.dispose(), s.dispose(), s.forceContextLoss(), i.replaceChildren();
  } };
}
function demoShapes(i) {
  if (i.kind === "tree") return [[new CylinderGeometry(0.12, 0.12, 0.5, 24), [0, -0.7, 0], "#8a6345"], ...[0, 1, 2].map((t) => [new ConeGeometry(0.8 - t * 0.18, 0.8, 40), [0, -0.35 + t * 0.48, 0], i.color])];
  if (i.kind === "gift") return [[new BoxGeometry(1.3, 1.1, 1.3), [0, 0, 0], i.color], [new BoxGeometry(1.42, 0.16, 1.42), [0, 0.6, 0], i.color], [new BoxGeometry(0.19, 1.25, 1.45), [0, 0.06, 0], "#e8c577"], [new BoxGeometry(1.45, 1.25, 0.19), [0, 0.06, 0], "#e8c577"]];
  let e = new Shape();
  for (let t = 0; t < 10; t++) {
    let n = Math.PI / 2 + t * Math.PI / 5, s = t % 2 ? 0.43 : 1, r = Math.cos(n) * s, a = Math.sin(n) * s;
    t ? e.lineTo(r, a) : e.moveTo(r, a);
  }
  return e.closePath(), [[new ExtrudeGeometry(e, { depth: 0.22, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.04, bevelThickness: 0.04 }), [0, 0, -0.11], i.color]];
}
function createDemoModel(i) {
  let e = [], t = [], n = [], s = [], r = [], a = [], o = 0;
  for (let [f, g, x] of demoShapes(i)) {
    let m = f.index ? f.toNonIndexed() : f, p = {};
    for (let v of ["position", "normal"]) {
      let w = m.attributes[v], I = new Uint8Array(w.array.buffer, w.array.byteOffset, w.array.byteLength);
      e.push(I), t.push({ buffer: 0, byteOffset: o, byteLength: I.length }), o += I.length;
      let E = { bufferView: t.length - 1, componentType: 5126, count: w.count, type: "VEC3" };
      v === "position" && (m.computeBoundingBox(), E.min = m.boundingBox.min.toArray(), E.max = m.boundingBox.max.toArray()), n.push(E), p[v === "position" ? "POSITION" : "NORMAL"] = n.length - 1;
    }
    let M = new Color(x);
    a.push({ pbrMetallicRoughness: { baseColorFactor: [M.r, M.g, M.b, 1], metallicFactor: 0, roughnessFactor: 0.65 } }), s.push({ primitives: [{ attributes: p, material: a.length - 1 }] }), r.push({ mesh: s.length - 1, translation: g }), m.dispose(), f.dispose();
  }
  let c = new Uint8Array(o), l = 0;
  for (let f of e) c.set(f, l), l += f.length;
  let h = "";
  for (let f of c) h += String.fromCharCode(f);
  let u = { asset: { version: "2.0", generator: "SPOOL demo fixtures" }, scene: 0, scenes: [{ nodes: r.map((f, g) => g) }], nodes: r, meshes: s, materials: a, buffers: [{ byteLength: o, uri: "data:application/octet-stream;base64," + btoa(h) }], bufferViews: t, accessors: n }, d = new Blob([JSON.stringify(u)], { type: "model/gltf+json" });
  return { root: i.id + ".gltf", files: [{ name: i.id + ".gltf", blob: d }], total: d.size };
}
export {
  createDemoModel,
  parseModel,
  renderModel
};

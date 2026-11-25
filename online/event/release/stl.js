// Keep event storage and viewers on glTF 2.0. STL contributes triangle positions only.
const maxTriangles = Math.floor(2_000_000 / 3);
const invalid = () => new Error('STLの三角形データを読み取れません。ファイルを確認してください。');
const tooLarge = () => new Error('モデルの頂点数を200万以下に軽量化してください。');

async function positionsFrom(file) {
  if (file.size >= 84) {
    const header = new DataView(await file.slice(0, 84).arrayBuffer());
    const count = header.getUint32(80, true);
    if (file.size === 84 + count * 50) {
      if (!count) throw invalid();
      if (count > maxTriangles) throw tooLarge();
      const data = new DataView(await file.arrayBuffer());
      const positions = new Float32Array(count * 9);
      for (let face = 0; face < count; face++)
        for (let i = 0; i < 9; i++)
          positions[face * 9 + i] = data.getFloat32(96 + face * 50 + i * 4, true);
      return positions;
    }
  }
  // Read ASCII incrementally so a large text STL doesn't require a second full-size string.
  const values = [];
  let pending = '', step = 0, solid = false;
  const number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?';
  const vertex = new RegExp('^vertex\\s+('+number+')\\s+('+number+')\\s+('+number+')$', 'i');
  function line(raw) {
    const text = raw.trim();
    if (!text) return;
    if (!step && /^solid(?:\s|$)/i.test(text) && !solid) { solid = true; return; }
    if (!step && /^endsolid(?:\s|$)/i.test(text) && solid) { solid = false; return; }
    if (!solid) throw invalid();
    if (!step && /^facet\s+normal\s/i.test(text)) {
      if (values.length >= maxTriangles * 9) throw tooLarge();
      step = 1;
    } else if (step === 1 && /^outer\s+loop$/i.test(text)) step++;
    else if (step >= 2 && step <= 4) {
      const match = vertex.exec(text);
      if (!match) throw invalid();
      values.push(Number(match[1]), Number(match[2]), Number(match[3]));
      step++;
    } else if (step === 5 && /^endloop$/i.test(text)) step++;
    else if (step === 6 && /^endfacet$/i.test(text)) step = 0;
    else throw invalid();
  }
  const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      const lines = (pending + value).split(/\r\n|\n|\r/);
      pending = lines.pop();
      if (pending.length > 65536) throw invalid();
      for (const item of lines) line(item);
    }
    line(pending);
  } finally { await reader.cancel(); }
  if (step || solid || !values.length) throw invalid();
  return new Float32Array(values);
}

export async function stlToGlb(file, name) {
  const positions = await positionsFrom(file);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i++) {
    const v = positions[i], axis = i % 3;
    if (!Number.isFinite(v)) throw invalid();
    min[axis] = Math.min(min[axis], v);
    max[axis] = Math.max(max[axis], v);
  }
  // Printing STL coordinates are Z-up. glTF defines Y as the up axis.
  const mesh = {
    asset:{version:'2.0'}, scene:0, scenes:[{nodes:[0]}], nodes:[{mesh:0, rotation:[-Math.SQRT1_2,0,0,Math.SQRT1_2]}],
    meshes:[{primitives:[{attributes:{POSITION:0}}]}],
    buffers:[{byteLength:positions.byteLength}],
    bufferViews:[{buffer:0,byteLength:positions.byteLength,target:34962}],
    accessors:[{bufferView:0,componentType:5126,count:positions.length/3,type:'VEC3',min,max}]
  };
  const json = new TextEncoder().encode(JSON.stringify(mesh));
  const jsonSize = Math.ceil(json.length / 4) * 4;
  const header = new Uint32Array([0x46546c67,2,28+jsonSize+positions.byteLength,jsonSize,0x4e4f534a]);
  const bin = new Uint32Array([positions.byteLength,0x004e4942]);
  return new File([header,json,new Uint8Array(jsonSize-json.length).fill(32),bin,positions],name,{type:'model/gltf-binary'});
}

export async function normalizeStlFiles(files) {
  const names = new Set(files.map(file=>file.name.toLowerCase()));
  const result = [];
  for (const file of files) {
    if (!/\.stl$/i.test(file.name)) { result.push(file); continue; }
    const base = file.name.slice(0,-4);
    let name = base+'.glb', i = 1;
    while (names.has(name.toLowerCase())) { name = base+'-'+i+'.glb'; i++; }
    names.add(name.toLowerCase());
    result.push(await stlToGlb(file,name));
  }
  return result;
}

export function confirmStl(files) {
  const count = files.filter(file=>/\.stl$/i.test(file.name)).length;
  if (!count) return true;
  return confirm('STLが'+count+'件含まれています。作品投稿にはglTFまたはGLBを推奨します。STLで続けますか？') &&
    confirm('STLは形状のみをGLBに変換して保存します。色や素材は引き継がれません。この内容で投稿するには「OK」を押してください。');
}

import * as THREE from "./assets/three.js";
import { artwork } from "./art.js?v=fast-2";
import { kitTexture } from "./kit-texture.js?v=fast-2";
import { shirtMaterial } from "./cloth-material.js?v=fast-2";
async function geometryFile(url) {
  const buffer = await fetch(url).then((r) => {
    if (!r.ok) throw Error("Model unavailable");
    return r.arrayBuffer();
  });
  const view = new DataView(buffer),
    jsonLength = view.getUint32(12, true),
    json = JSON.parse(
      new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)),
    ),
    start = 28 + jsonLength;
  function accessor(index) {
    const a = json.accessors[index],
      b = json.bufferViews[a.bufferView],
      Type =
        a.componentType === 5126
          ? Float32Array
          : a.componentType === 5125
            ? Uint32Array
            : Uint16Array;
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    return new Type(
      buffer,
      start + (b.byteOffset || 0) + (a.byteOffset || 0),
      a.count * size,
    ).slice();
  }
  return json.meshes.map((mesh) => {
    const p = mesh.primitives[0],
      g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(accessor(p.attributes.POSITION), 3),
    );
    g.setAttribute(
      "normal",
      new THREE.BufferAttribute(accessor(p.attributes.NORMAL), 3),
    );
    if (p.attributes.TEXCOORD_0 !== undefined)
      g.setAttribute(
        "uv",
        new THREE.BufferAttribute(accessor(p.attributes.TEXCOORD_0), 2),
      );
    if (p.attributes.COLOR_0 !== undefined) {
      g.setAttribute(
        "color",
        new THREE.BufferAttribute(accessor(p.attributes.COLOR_0), 4, true),
      );
    }
    g.setIndex(new THREE.BufferAttribute(accessor(p.indices), 1));
    return g;
  });
}
let templatePromise;
function getTemplates() {
  return (templatePromise ??= geometryFile("assets/shirt.glb"));
}
export async function buildProduct(product) {
  const art = await artwork(product);
  let meshes = [];
  if (product.kind === "ball") {
    const geometry = new THREE.SphereGeometry(0.43, 32, 24);
    const p = geometry.attributes.position,
      uv = geometry.attributes.uv;
    for (let i = 0; i < p.count; i++)
      uv.setXY(i, 0.5 + p.getX(i) / 0.86, 0.5 + p.getY(i) / 0.86);
    const texture = new THREE.CanvasTexture(art.image);
    texture.colorSpace = THREE.SRGBColorSpace;
    meshes = [
      new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ map: texture, roughness: 0.78 }),
      ),
    ];
  } else {
    const base = await getTemplates();

    const geometry = base[0].clone(),
      p = geometry.attributes.position;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox,
      center = box.getCenter(new THREE.Vector3()),
      height = box.max.y - box.min.y;
    const texture = await kitTexture(product, art, geometry);
    for (let i = 0; i < p.count; i++) {
      p.setXYZ(
        i,
        (p.getX(i) - center.x) / height,
        (p.getY(i) - center.y) / height,
        (p.getZ(i) - center.z) / height,
      );
    }
    p.needsUpdate = true;
    const { material, depth } = shirtMaterial(texture, product, center, height);
    const shirt = new THREE.Mesh(geometry, material);
    shirt.customDepthMaterial = depth;
    shirt.castShadow = shirt.receiveShadow = true;
    meshes.push(shirt);
    for (let i = 1; i < base.length; i++) {
      const g = base[i].clone(),
        a = g.attributes.position;
      for (let j = 0; j < a.count; j++)
        a.setXYZ(
          j,
          (a.getX(j) - center.x) / height,
          (a.getY(j) - center.y) / height,
          (a.getZ(j) - center.z) / height,
        );
      meshes.push(
        new THREE.Mesh(
          g,
          new THREE.MeshStandardMaterial({
            color: i === 1 ? 0xa5a9a0 : 0x252b27,
            metalness: i === 1 ? 0.7 : 0.1,
            roughness: 0.6,
          }),
        ),
      );
    }
  }
  return meshes;
}
export async function createViewer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(34, 1, 0.01, 20);
  camera.position.set(0, 0.02, 2.35);
  scene.add(new THREE.HemisphereLight(0xfff7dd, 0x627478, 2));
  const light = new THREE.DirectionalLight(0xfff6df, 2.1);
  light.position.set(-2, 3, 4);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.left = -1;
  light.shadow.camera.right = 1;
  light.shadow.camera.top = 1;
  light.shadow.camera.bottom = -1;
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = 10;
  light.shadow.normalBias = 0.005;
  scene.add(light);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 3),
    new THREE.ShadowMaterial({ opacity: 0.25 }),
  );
  shadow.position.z = -0.23;
  shadow.receiveShadow = true;
  scene.add(shadow);
  const rim = new THREE.DirectionalLight(0xb8e9ff, 1.3);
  rim.position.set(3, 1, -2);
  scene.add(rim);
  const group = new THREE.Group();
  scene.add(group);
  let current = null,
    cloth = null,
    frame = 0,
    last = 0,
    target = 0,
    rotation = 0,
    bend = 0,
    velocity = 0,
    impulse = 0;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  function resize() {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.position.z = camera.aspect < 0.75 ? 2.6 : 2.35;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(canvas);
  function tick(now) {
    frame = 0;
    if (!current || document.hidden) return;
    if (now - last < 32) { frame = requestAnimationFrame(tick); return; }
    const dt = Math.min((now - last) / 1000 || 0.033, 0.05);
    last = now;
    rotation += (target - rotation) * (1 - Math.exp(-dt * 16));
    group.rotation.y =
      (reduced.matches ? target : rotation) +
      (current.kind === "shirt" ? Math.PI : 0);
    velocity += (-bend * 45 - velocity * 9 + impulse * 38) * dt;
    bend = Math.max(-0.6, Math.min(0.6, bend + velocity * dt));
    impulse *= Math.exp(-dt * 12);
    if (cloth) {
      const uniforms = cloth.material.userData.cloth;
      uniforms.uTime.value = reduced.matches ? 0 : now / 1000;
      uniforms.uAmp.value = reduced.matches ? 0 : 0.012;
      uniforms.uTwist.value = reduced.matches ? 0 : bend * 0.5;
      uniforms.uBend.value.set(bend * 0.018, bend * 0.045);
    }
    renderer.render(scene, camera);
    if (!reduced.matches || Math.abs(target - rotation) > 0.001)
      frame = requestAnimationFrame(tick);
  }
  function start() {
    if (!frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && current) start();
  });
  function dispose() {
    for (const m of group.children) {
      m.geometry.dispose();
      m.customDepthMaterial?.dispose();
      for (const material of Array.isArray(m.material)
        ? m.material
        : [m.material]) {
        if (!material.userData.cloth) material.map?.dispose();
        material.dispose();
      }
    }
    group.clear();
    cloth = null;
  }
  return {
    async show(product, isCurrent) {
      const meshes = await buildProduct(product);
      if (!isCurrent()) {
        for (const m of meshes) {
          m.geometry.dispose();
          m.customDepthMaterial?.dispose();
          for (const mat of Array.isArray(m.material)
            ? m.material
            : [m.material]) {
            if (!mat.userData.cloth) mat.map?.dispose();
            mat.dispose();
          }
        }
        return;
      }
      dispose();
      meshes.forEach((m) => group.add(m));
      current = product;
      cloth = product.kind === "shirt" ? meshes[0] : null;
      target = rotation = bend = velocity = impulse = 0;
      group.rotation.y = 0;
      resize();
      start();
    },
    angle(value) {
      impulse = Math.max(-1.5, Math.min(1.5, impulse + (value - target) * 2));
      target = value;
      start();
    },
    pause() {
      cancelAnimationFrame(frame);
      frame = 0;
      current = null;
    },
  };
}

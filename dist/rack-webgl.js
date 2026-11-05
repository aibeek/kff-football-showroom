import * as THREE from "./assets/three.js";
import { buildProduct } from "./model.js?v=fast-2";

export async function gpuRack(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: true,
  });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(),
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 12);
  camera.position.z = 4;
  scene.add(new THREE.HemisphereLight(0xfff5df, 0x26383b, 0.9));
  const key = new THREE.DirectionalLight(0xfff4de, 3.4);
  key.position.set(-3, 4, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 15;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb7dcf5, 0.8);
  fill.position.set(4, 1, 2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffdc98, 1.7);
  rim.position.set(2, 2, -2);
  scene.add(rim);
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 8),
    new THREE.ShadowMaterial({ opacity: 0.28 }),
  );
  backdrop.position.z = -0.28;
  backdrop.receiveShadow = true;
  scene.add(backdrop);
  const items = [];
  let width = 1,
    height = 1;
  return {
    dispose() {
      for (const item of items) {
        item.group.traverse(mesh => {
          mesh.geometry?.dispose();
          mesh.customDepthMaterial?.dispose();
          mesh.material?.dispose();
        });
      }
      backdrop.geometry.dispose();
      backdrop.material.dispose();
      key.shadow.map?.dispose();
      renderer.dispose();
    },
    async add(product) {
      const meshes = await buildProduct(product),
        group = new THREE.Group();
      meshes.forEach((mesh) => group.add(mesh));
      meshes[1].visible = false;
      group.visible = false;
      scene.add(group);
      const item = { group, uniforms: meshes[0].material.userData.cloth };
      item.uniforms.uPhase.value =
        [...product.id].reduce((n, c) => n + c.charCodeAt(0), 0) % 6.28;
      items.push(item);
      return item;
    },
    resize(w, h) {
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      camera.left = -w / h;
      camera.right = w / h;
      camera.updateProjectionMatrix();
    },
    clear() {
      for (const item of items) item.group.visible = false;
    },
    draw(item, box, clock, yaw, bend, moving) {
      item.group.visible = true;
      const scale = ((box.height / height) * 2) / 1.08;
      item.group.scale.setScalar(scale);
      item.group.position.set(
        ((box.x + box.width / 2) / height) * 2 - width / height,
        1 - ((box.y + box.height / 2) / height) * 2,
        0,
      );
      item.group.rotation.set(
        -0.025,
        yaw + Math.PI,
        0.012 * Math.sin(clock * 0.55),
      );
      const u = item.uniforms;
      u.uTime.value = moving ? clock : 0;
      u.uAmp.value = moving ? 0.012 : 0;
      u.uTwist.value = moving ? bend * 0.7 : 0;
      u.uBend.value.set(moving ? bend * 0.022 : 0, moving ? bend * 0.05 : 0);
    },
    finish() {
      renderer.render(scene, camera);
    },
  };
}

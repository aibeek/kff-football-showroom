import * as THREE from "./assets/three.js";
const cache = new Map();
async function loadImage(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}
export function kitTexture(product, art, geometry) {
  if (!cache.has(product.id))
    cache.set(product.id, bake(product, art, geometry));
  return cache.get(product.id);
}
async function bake(product, art, geometry) {
  const atlas = document.createElement("canvas");
  atlas.width = 1024;
  atlas.height = 662;
  const ctx = atlas.getContext("2d");
  ctx.fillStyle = product.fabric;
  ctx.fillRect(0, 0, atlas.width, atlas.height);
  if (product.id.startsWith("kazakhstan")) {
    const original = await loadImage("assets/" + product.id + ".jpg");
    const away = product.id.endsWith("away"),
      trim = away ? "#f1d32f" : "#196aa1";
    for (let side = 0; side < 2; side++) {
      ctx.save();
      ctx.translate(side * 512, 0);
      ctx.scale(512, 662);
      // Only clean fabric from the centre of the torso is used on seams and sleeves.
      ctx.drawImage(
        original,
        original.width * 0.35,
        original.height * 0.56,
        original.width * 0.3,
        original.height * 0.28,
        0,
        0,
        1,
        1,
      );
      if (side === 0) {
        ctx.drawImage(
          original,
          original.width * 0.28,
          original.height * 0.28,
          original.width * 0.44,
          original.height * 0.64,
          0.25,
          0.22,
          0.5,
          0.76,
        );
        ctx.strokeStyle = trim;
        ctx.lineWidth = 0.023;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(0.365, 0.035);
        ctx.lineTo(0.5, 0.208);
        ctx.lineTo(0.635, 0.035);
        ctx.stroke();
      }
      ctx.strokeStyle = trim;
      ctx.lineWidth = 0.009;
      for (let stripe = 0; stripe < 3; stripe++) {
        const d = stripe * 0.015;
        ctx.beginPath();
        ctx.moveTo(0.19 + d, 0.15);
        ctx.lineTo(0.345 + d, 0.062);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0.81 - d, 0.15);
        ctx.lineTo(0.655 - d, 0.062);
        ctx.stroke();
      }
      ctx.restore();
    }
  } else if (product.id === "kairat") {
    const [front, back] = await Promise.all([
      loadImage("assets/kairat-uv-front.webp"),
      loadImage("assets/kairat-uv-back.webp"),
    ]);
    ctx.drawImage(front, 0, 0, 512, 662);
    ctx.drawImage(back, 512, 0, 512, 662);
  } else {
    const back = document.createElement("canvas");
    back.width = art.image.width;
    back.height = art.image.height;
    const b = back.getContext("2d");
    b.fillStyle = product.fabric;
    b.fillRect(0, 0, back.width, back.height);
    b.drawImage(
      art.image,
      art.image.width * 0.25,
      art.image.height * 0.68,
      art.image.width * 0.5,
      art.image.height * 0.25,
      0,
      0,
      back.width,
      back.height,
    );
    const positions = geometry.attributes.position,
      normals = geometry.attributes.normal,
      uv = geometry.attributes.uv;
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    const width = bounds.max.x - bounds.min.x,
      height = bounds.max.y - bounds.min.y;
    for (let i = 0; i < geometry.index.count; i += 3) {
      const indices = [
        geometry.index.getX(i),
        geometry.index.getX(i + 1),
        geometry.index.getX(i + 2),
      ];
      const front = indices.reduce((sum, j) => sum + normals.getZ(j), 0) <= 0;
      const image = front ? art.image : back;
      const source = indices.map((j) => ({
        x:
          (front
            ? 1 - (positions.getX(j) - bounds.min.x) / width
            : (positions.getX(j) - bounds.min.x) / width) * image.width,
        y: ((bounds.max.y - positions.getY(j)) / height) * image.height,
      }));
      const target = indices.map((j) => ({
        x: uv.getX(j) * atlas.width,
        y: uv.getY(j) * atlas.height,
      }));
      const [a, c, d] = source,
        [p, q, r] = target;
      const sx = c.x - a.x,
        sy = c.y - a.y,
        tx = d.x - a.x,
        ty = d.y - a.y,
        det = sx * ty - sy * tx;
      if (Math.abs(det) < 0.0001) continue;
      const aa = ((q.x - p.x) * ty - (r.x - p.x) * sy) / det,
        bb = ((q.y - p.y) * ty - (r.y - p.y) * sy) / det;
      const cc = ((r.x - p.x) * sx - (q.x - p.x) * tx) / det,
        dd = ((r.y - p.y) * sx - (q.y - p.y) * tx) / det;
      ctx.save();
      ctx.beginPath();
      const cx = (p.x + q.x + r.x) / 3,
        cy = (p.y + q.y + r.y) / 3;
      [p, q, r].forEach((v, index) => {
        const dx = v.x - cx,
          dy = v.y - cy,
          length = Math.max(1, Math.hypot(dx, dy));
        const x = v.x + (dx / length) * 0.75,
          y = v.y + (dy / length) * 0.75;
        if (index) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.clip();
      ctx.setTransform(
        aa,
        bb,
        cc,
        dd,
        p.x - aa * a.x - cc * a.y,
        p.y - bb * a.x - dd * a.y,
      );
      ctx.drawImage(image, 0, 0);
      ctx.restore();
      if (i % 12000 === 0)
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  const texture = new THREE.CanvasTexture(atlas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = 4;
  return texture;
}

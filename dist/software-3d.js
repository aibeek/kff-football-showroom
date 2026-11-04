import { buildProduct } from "./model.js";
import { artwork } from "./art.js";

function simplify(geometry, step) {
  const positions = geometry.attributes.position,
    normals = geometry.attributes.normal;
  const uv = geometry.attributes.uv,
    colors = geometry.attributes.color;
  const vertices = [],
    lookup = new Map(),
    remap = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      z = positions.getZ(i);
    const key = [
      Math.round(x / step),
      Math.round(y / step),
      Math.round(z / step),
      Math.floor(uv.getX(i) * 4),
      Math.floor(uv.getY(i) * 4),
      normals.getZ(i) >= 0,
    ].join("/");
    let index = lookup.get(key);
    if (index === undefined) {
      index = vertices.length;
      lookup.set(key, index);
      vertices.push({
        x: 0,
        y: 0,
        z: 0,
        nx: 0,
        ny: 0,
        nz: 0,
        u: 0,
        v: 0,
        ao: 0,
        count: 0,
      });
    }
    const vertex = vertices[index];
    vertex.x += x;
    vertex.y += y;
    vertex.z += z;
    vertex.nx += normals.getX(i);
    vertex.ny += normals.getY(i);
    vertex.nz += normals.getZ(i);
    vertex.u += uv.getX(i);
    vertex.v += uv.getY(i);
    vertex.ao += colors
      ? (colors.getX(i) + colors.getY(i) + colors.getZ(i)) / 3
      : 1;
    vertex.count++;
    remap.push(index);
  }
  for (const vertex of vertices)
    for (const key of ["x", "y", "z", "nx", "ny", "nz", "u", "v", "ao"])
      vertex[key] /= vertex.count;
  const faces = [];
  for (let i = 0; i < geometry.index.count; i += 3) {
    const face = [
      remap[geometry.index.getX(i)],
      remap[geometry.index.getX(i + 1)],
      remap[geometry.index.getX(i + 2)],
    ];
    if (new Set(face).size === 3) faces.push(face);
  }
  return { vertices, faces };
}
export async function softwareGarment(product, detail = false) {
  const meshes = await buildProduct(product),
    shirt = meshes[0];
  const model = simplify(shirt.geometry, detail ? 0.045 : 0.065);
  const image = shirt.material.map.image;
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  return {
    draw(time, width, height, yaw = 0, bend = 0, moving = true) {
      width = Math.max(1, Math.round(width));
      height = Math.max(1, Math.round(height));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.clearRect(0, 0, width, height);
      yaw += Math.PI;
      const cosine = Math.cos(yaw),
        sine = Math.sin(yaw),
        scale = Math.min(height * 0.92, width / 0.86);
      const clock = moving ? time : 0;
      const projected = model.vertices.map((vertex) => {
        let { x, y, z } = vertex;
        const free = Math.max(0, 0.5 - y),
          sleeve = Math.max(0, (Math.abs(x) - 0.2) * 2.5);
        const weight = Math.min(1, Math.max(free * free, sleeve));
        const wave =
          Math.sin(clock * 1.15 + x * 6 + y * 9) * 0.5 +
          Math.sin(clock * 1.9 + x * 16 - y * 7) * 0.3 +
          Math.sin(clock * 0.55 + y * 2.5);
        if (moving) {
          z += wave * 0.012 * weight + bend * 0.04 * weight;
          x += bend * 0.018 * weight;
        }
        const rx = x * cosine + z * sine,
          rz = z * cosine - x * sine;
        const perspective = 1 / (1 - rz / 4);
        return {
          x: width / 2 + rx * scale * perspective,
          y: height * 0.52 - y * scale * perspective,
          z: rz,
          u: vertex.u * image.width,
          v: vertex.v * image.height,
        };
      });
      const ordered = model.faces
        .map((indices) => ({
          indices,
          depth: indices.reduce((sum, i) => sum + projected[i].z, 0),
        }))
        .sort((a, b) => a.depth - b.depth);
      for (const { indices } of ordered) {
        const [p, q, r] = indices.map((i) => projected[i]);
        const sx = q.u - p.u,
          sy = q.v - p.v,
          tx = r.u - p.u,
          ty = r.v - p.v,
          det = sx * ty - sy * tx;
        if (Math.abs(det) < 0.0001) continue;
        const aa = ((q.x - p.x) * ty - (r.x - p.x) * sy) / det,
          bb = ((q.y - p.y) * ty - (r.y - p.y) * sy) / det;
        const cc = ((r.x - p.x) * sx - (q.x - p.x) * tx) / det,
          dd = ((r.y - p.y) * sx - (q.y - p.y) * tx) / det;
        const cx = (p.x + q.x + r.x) / 3,
          cy = (p.y + q.y + r.y) / 3;
        ctx.save();
        ctx.beginPath();
        [p, q, r].forEach((v, i) => {
          const x = cx + (v.x - cx) * 1.22,
            y = cy + (v.y - cy) * 1.22;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        });
        ctx.closePath();
        ctx.clip();

        ctx.setTransform(
          aa,
          bb,
          cc,
          dd,
          p.x - aa * p.u - cc * p.v,
          p.y - bb * p.u - dd * p.v,
        );
        ctx.drawImage(image, 0, 0);
        ctx.restore();
      }
      ctx.globalCompositeOperation = "source-atop";
      const shade = ctx.createLinearGradient(0, 0, width, height * 0.2);
      shade.addColorStop(0, "rgba(0,0,0,.25)");
      shade.addColorStop(0.32, "rgba(255,245,215,.06)");
      shade.addColorStop(0.65, "rgba(0,0,0,.04)");
      shade.addColorStop(1, "rgba(0,0,0,.32)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";
      return canvas;
    },
  };
}
export function createSoftwareViewer(canvas) {
  const ctx = canvas.getContext("2d");
  let current = null,
    frame = 0,
    last = 0,
    angle = 0,
    target = 0,
    bend = 0,
    velocity = 0,
    impulse = 0;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  function draw(now) {
    frame = 0;
    if (!current || document.hidden) return;
    if (now - last < 50) {
      frame = requestAnimationFrame(draw);
      return;
    }
    const dt = Math.min((now - last) / 1000 || 0.05, 0.06);
    last = now;
    angle += (target - angle) * (1 - Math.exp(-dt * 14));
    velocity += (-bend * 40 - velocity * 8 + impulse * 30) * dt;
    bend = Math.max(-1, Math.min(1, bend + velocity * dt));
    impulse *= Math.exp(-dt * 12);
    const rect = canvas.getBoundingClientRect(),
      w = Math.round(rect.width),
      h = Math.round(rect.height);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.clearRect(0, 0, w, h);
    if (current.surface)
      ctx.drawImage(
        current.surface.draw(
          now / 1000,
          w,
          h,
          reduced.matches ? target : angle,
          bend,
          !reduced.matches,
        ),
        0,
        0,
      );
    else {
      const size = Math.min(w, h) * 0.8;
      ctx.drawImage(
        current.art.image,
        (w - size) / 2,
        (h - size) / 2,
        size,
        size,
      );
    }
    if (!reduced.matches || Math.abs(target - angle) > 0.001)
      frame = requestAnimationFrame(draw);
  }
  function start() {
    if (!frame) frame = requestAnimationFrame(draw);
  }
  new ResizeObserver(start).observe(canvas);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) start();
  });
  return {
    async show(product, isCurrent) {
      const surface =
        product.kind === "shirt" ? await softwareGarment(product, true) : null;
      const art = await artwork(product);
      if (!isCurrent()) return;
      current = { surface, art };
      angle = target = bend = velocity = impulse = 0;
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

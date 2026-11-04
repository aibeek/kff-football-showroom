import { artwork } from "./art.js";
import { softwareGarment } from "./software-3d.js";

export async function mountRack(products) {
  const rail = document.querySelector(".rail"),
    rack = document.getElementById("rack");
  const canvas = document.createElement("canvas");
  canvas.id = "rackCanvas";
  canvas.setAttribute("aria-hidden", "true");
  rail.append(canvas);
  let gpu = null;
  try {
    const module = await import("./rack-webgl.js");
    gpu = await module.gpuRack(canvas);
  } catch {}
  const context = gpu ? null : canvas.getContext("2d");
  if (!gpu && !context) return;
  const visible = [];
  const preparation = products.map(async (product, index) => {
    const button = rack.querySelector('[data-id="' + product.id + '"]');
    try {
      const art = await artwork(product);
      const visual = gpu
        ? await gpu.add(product)
        : await softwareGarment(product);

      const entry = {
        button,
        image: button.querySelector(".shirt-image"),
        visual,
        phase: index * 1.8,
        hover: 0,
        target: 0,
        bend: 0,
        velocity: 0,
      };
      button.addEventListener("pointerenter", () => (entry.target = 1));
      button.addEventListener("pointerleave", () => (entry.target = 0));
      button.addEventListener("focus", () => (entry.target = 1));
      button.addEventListener("blur", () => (entry.target = 0));
      button.classList.add("rendered");
      visible.push(entry);
    } catch (error) {
      console.warn("Unable to prepare kit", product.id, error);
      return null;
    }
  });
  rail.classList.add("cloth-ready");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let last = 0,
    frame = 0;
  function render(now) {
    frame = 0;
    if (document.hidden) return;
    if (now - last < (gpu ? 33 : 66)) {
      frame = requestAnimationFrame(render);
      return;
    }
    const dt = Math.min((now - last) / 1000 || 0.033, 0.05);
    last = now;
    const area = rail.getBoundingClientRect(),
      scale = Math.min(devicePixelRatio, 1.3);
    const width = Math.round(area.width * scale),
      height = Math.round(area.height * scale);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gpu?.resize(width, height);
    }
    if (gpu) gpu.clear();
    else context.clearRect(0, 0, width, height);
    if (!document.getElementById("room").classList.contains("balls-only")) {
      for (const entry of visible) {
        if (entry.button.hidden) continue;
        const rect = entry.image.getBoundingClientRect();
        if (rect.right < area.left || rect.left > area.right) continue;
        entry.hover += (entry.target - entry.hover) * (1 - Math.exp(-dt * 8));
        entry.velocity +=
          ((entry.target - entry.hover) * 30 -
            entry.bend * 35 -
            entry.velocity * 7) *
          dt;
        entry.bend += entry.velocity * dt;
        const time = now / 1000 + entry.phase;
        const yaw = reduced.matches
          ? -0.13
          : -0.58 + entry.hover * 0.68 + Math.sin(time * 0.8) * 0.065;
        const box = {
          x: (rect.left - area.left) * scale,
          y: (rect.top - area.top) * scale,
          width: rect.width * scale,
          height: rect.height * scale,
        };
        if (gpu)
          gpu.draw(entry.visual, box, time, yaw, entry.bend, !reduced.matches);
        else {
          const image = entry.visual.draw(
            time,
            box.width,
            box.height,
            yaw,
            entry.bend,
            !reduced.matches,
          );
          context.save();
          context.shadowColor = "#0008";
          context.shadowBlur = 12 * scale;
          context.shadowOffsetX = 8 * scale;
          context.shadowOffsetY = 10 * scale;
          context.drawImage(image, box.x, box.y);
          context.restore();
        }
      }
    }
    gpu?.finish();
    frame = requestAnimationFrame(render);
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !frame) frame = requestAnimationFrame(render);
  });
  frame = requestAnimationFrame(render);
  await Promise.all(preparation);
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
}

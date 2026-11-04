const cache = new Map();
export function artwork(product) {
  if (!cache.has(product.id)) cache.set(product.id, prepare(product));
  return cache.get(product.id);
}
async function prepare(product) {
  const image = new Image();
  image.src =
    product.kind === "ball"
      ? "assets/conext-source.jpg"
      : "assets/" + product.id + ".jpg";
  await image.decode();
  if (product.kind === "ball") {
    const cutout = document.createElement("canvas");
    cutout.width = cutout.height = 820;
    const c = cutout.getContext("2d");
    c.beginPath();
    c.arc(410, 410, 409, 0, Math.PI * 2);
    c.clip();
    c.drawImage(image, 130, 130, 820, 820, 0, 0, 820, 820);
    return { src: cutout.toDataURL("image/png"), image: cutout };
  }
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d", { willReadFrequently: true });
  const scale = Math.min(1, 900 / image.width);
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const w = canvas.width,
    h = canvas.height;
  if (product.id.startsWith("kazakhstan") || product.id === "kairat") {
    // Trace the garment only, excluding the mannequin and presentation background.
    const points =
      product.id === "kairat"
        ? [
            [0.375, 0.165],
            [0.415, 0.215],
            [0.503, 0.271],
            [0.596, 0.214],
            [0.63, 0.163],
            [0.77, 0.2],
            [0.82, 0.32],
            [0.875, 0.45],
            [0.8, 0.49],
            [0.773, 0.45],
            [0.84, 0.944],
            [0.175, 0.944],
            [0.205, 0.46],
            [0.19, 0.49],
            [0.108, 0.45],
            [0.177, 0.28],
            [0.205, 0.214],
          ]
        : product.id.endsWith("away")
          ? [
              [0.344, 0.204],
              [0.392, 0.235],
              [0.505, 0.261],
              [0.603, 0.226],
              [0.643, 0.195],
              [0.79, 0.237],
              [0.878, 0.279],
              [0.915, 0.488],
              [0.775, 0.508],
              [0.752, 0.446],
              [0.725, 0.58],
              [0.771, 0.927],
              [0.249, 0.927],
              [0.258, 0.585],
              [0.226, 0.463],
              [0.219, 0.5],
              [0.1, 0.493],
              [0.082, 0.35],
              [0.124, 0.283],
              [0.23, 0.237],
            ]
          : [
              [0.395, 0.201],
              [0.427, 0.242],
              [0.506, 0.27],
              [0.595, 0.235],
              [0.615, 0.195],
              [0.751, 0.235],
              [0.854, 0.282],
              [0.916, 0.466],
              [0.804, 0.524],
              [0.778, 0.489],
              [0.748, 0.588],
              [0.754, 0.944],
              [0.243, 0.944],
              [0.224, 0.583],
              [0.212, 0.491],
              [0.191, 0.535],
              [0.087, 0.5],
              [0.073, 0.375],
              [0.123, 0.293],
              [0.268, 0.239],
            ];
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    points.forEach(([x, y], i) =>
      i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h),
    );
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  } else {
    // Remove the connected studio background while preserving white shirt panels.
    const pixels = ctx.getImageData(0, 0, w, h),
      data = pixels.data,
      seen = new Uint8Array(w * h),
      queue = new Int32Array(w * h);
    let head = 0,
      tail = 0;
    function push(i) {
      if (i < 0 || i >= w * h || seen[i]) return;
      seen[i] = 1;
      const n = i * 4;
      if (data[n] > 243 && data[n + 1] > 243 && data[n + 2] > 243)
        queue[tail++] = i;
    }
    for (let x = 0; x < w; x++) {
      push(x);
      push((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      push(y * w);
      push(y * w + w - 1);
    }
    while (head < tail) {
      const i = queue[head++];
      data[i * 4 + 3] = 0;
      if (i % w) push(i - 1);
      if (i % w < w - 1) push(i + 1);
      push(i - w);
      push(i + w);
    }
    ctx.putImageData(pixels, 0, 0);
  }
  const pixels = ctx.getImageData(0, 0, w, h).data;
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (pixels[(y * w + x) * 4 + 3] > 100) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
  const crop = document.createElement("canvas");
  crop.width = maxX - minX + 1;
  crop.height = maxY - minY + 1;
  crop
    .getContext("2d")
    .drawImage(
      canvas,
      minX,
      minY,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height,
    );
  return { src: crop.toDataURL("image/png"), image: crop };
}

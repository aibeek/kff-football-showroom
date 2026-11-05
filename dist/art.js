// Transparent cutouts are prepared once before deployment, not on the visitor's CPU.
const cache = new Map();
export const posterURL = product => 'assets/' + product.id + '-poster.webp';
export function artwork(product) {
  if (!cache.has(product.id)) {
    const job = (async () => {
      const image = new Image();
      image.decoding = 'async';
      image.src = posterURL(product);
      await image.decode();
      return {src: image.src, image};
    })();
    cache.set(product.id, job);
    job.catch(() => cache.delete(product.id));
  }
  return cache.get(product.id);
}

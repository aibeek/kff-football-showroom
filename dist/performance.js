const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
let saved = 'auto';
try { saved = localStorage.getItem('kff-quality') || 'auto'; } catch {}
const requested = new URLSearchParams(location.search).get('quality') || saved;
export const preference = ['auto', 'lite', '3d'].includes(requested) ? requested : 'auto';
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export function needsLite(profile) {
  return Boolean(profile.saveData || /^(slow-2g|2g|3g)$/.test(profile.effectiveType || '') ||
    (profile.downlink > 0 && profile.downlink < 1.5) ||
    (profile.memory > 0 && profile.memory <= 4) ||
    (profile.cores > 0 && profile.cores <= 4));
}
let mode = preference === 'lite' || (preference === 'auto' && needsLite({
  saveData: connection?.saveData, effectiveType: connection?.effectiveType,
  downlink: connection?.downlink, memory: navigator.deviceMemory, cores: navigator.hardwareConcurrency,
})) ? 'lite' : '3d';
let supported;
export function supports3D() {
  if (supported !== undefined) return supported;
  const probe = document.createElement('canvas');
  const options = {failIfMajorPerformanceCaveat:true, powerPreference:'low-power'};
  let gl;
  try { gl = probe.getContext('webgl2', options); } catch {}
  supported = Boolean(gl);
  gl?.getExtension('WEBGL_lose_context')?.loseContext();
  return supported;
}
export function use3D() { return mode === '3d'; }
export function enableLite() {
  mode = 'lite';
  document.documentElement.dataset.quality = 'lite';
  const footer = document.querySelector('footer p');
  if (footer) footer.textContent = 'Листай рейл · Выбирай форму';
  dispatchEvent(new CustomEvent('showroom-quality', {detail:'lite'}));
}
export function setupQuality() {
  if (mode === '3d' && !supports3D()) mode = 'lite';
  document.documentElement.dataset.quality = mode;
  if (mode === 'lite') {
    const footer = document.querySelector('footer p');
    if (footer) footer.textContent = 'Листай рейл · Выбирай форму';
  }
  const select = document.getElementById('quality');
  select.value = preference;
  document.getElementById('qualityStatus').textContent = mode === 'lite' ? 'Лёгкий режим' : '3D-режим';
  select.onchange = () => {
    try { localStorage.setItem('kff-quality', select.value); } catch {}
    const url = new URL(location.href);
    url.searchParams.set('quality', select.value);
    location.assign(url.href);
  };
  addEventListener('showroom-quality', () => {
    document.getElementById('qualityStatus').textContent = 'Лёгкий режим';
  });
}

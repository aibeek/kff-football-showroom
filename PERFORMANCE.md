# Performance modes

`Авто` uses light mode for data saver, 2G/3G, downlink under 1.5 Mbps, devices reporting at most 4 GB memory or 4 logical cores, or unavailable/hardware-caveat WebGL2. Browser hints are optional. `Лёгкая` always shows static WebP cutouts; `3D` requests animated garments if a suitable GPU is available. Selection survives reload; `?quality=lite` is a direct light-mode URL.

The entry screen awaits only initially visible posters and the ball. Other posters and GPU garments follow horizontal intersection. Background-image removal happens before deployment. There is no continuously animated software rasterizer fallback. The 3D rack runs at at most 30 fps, caps resolution at 1.15x, uses 512 px shadows, and pauses behind dialogs and in hidden tabs. Sustained slow rendering in automatic mode switches to posters.

All 11 posters total 293,658 bytes versus 1,133,150 bytes for their source JPEGs (74% reduction). Light mode does not import Three.js, GLB models, texture atlases, or the software renderer. The original 3D assets are retained for supported devices.

Checks: node --experimental-vm-modules --test performance.test.mjs
Poster preparation: install `sharp`, then node prepare-posters.mjs (committed posters need no build).

Browser QA: light-mode entry, horizontal lazy loading, product details, size selection, adding/removing cart items, automatic fallback without WebGL. Real GPU speed and constrained network speed were not simulated in the cloud browser; policy selection is covered by tests. This is not a promise of a specific loading time on every connection.

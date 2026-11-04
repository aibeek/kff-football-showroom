import { artwork } from "./art.js";
const $ = (id) => document.getElementById(id),
  money = (n) => new Intl.NumberFormat("ru-KZ").format(n) + " ₸";
const shirts = await fetch("products.json").then((r) => r.json());
const fabric = {
  kazakhstan: "#eacb20",
  "kazakhstan-away": "#1642a2",
  kairat: "#e4c50c",
  ordabasy: "#f1f1e8",
  aktobe: "#b61e29",
  astana: "#ecdc14",
  tobol: "#202626",
  elimai: "#287846",
  kaysar: "#8d263d",
  irtysh: "#21468d",
};
for (const p of shirts) {
  p.fabric = fabric[p.id];
  p.ink = ["kazakhstan", "kairat", "ordabasy", "astana"].includes(p.id)
    ? "#142629"
    : "#f0eee1";
}
const balls = [
  {
    id: "ball-conext",
    name: "adidas Conext 26",
    price: 39900,
    kind: "ball",
    panel: "#ec176c",
    color: "Белый / чёрный / розовый",
    variant: "Официальный мяч КПЛ-2026",
    material: "Термосклейка",
    team: "Премьер-лига Казахстана",
    brand: "adidas",
    city: "Размер 5",
    fabric: "#eeeeea",
    ink: "#151819",
    url: "https://kazfootball.kz/news/93337",
  },
];
const products = [...shirts, ...balls],
  cartKey = "kff-showroom-cart-v1";
let cart = [];
try {
  const saved = JSON.parse(localStorage.getItem(cartKey) || "[]");
  if (Array.isArray(saved))
    cart = saved.filter(
      (row) =>
        products.some((p) => p.id === row.id) &&
        Number.isInteger(row.qty) &&
        row.qty > 0 &&
        row.qty <= 99 &&
        ["S", "M", "L", "XL", "XXL", "5"].includes(row.size),
    );
} catch {}
let selected = null,
  size = "M",
  angle = 0,
  drag = null,
  viewer = null,
  viewerPromise,
  ready = false,
  request = 0,
  turnFrame = 0,
  returnFocus = null,
  toastTimer;
const artSources = new Map();
const assetJobs = [];
let completedAssets = 0;
function trackAsset(job) {
  assetJobs.push(
    job.then(() => {
      completedAssets++;
      dispatchEvent(
        new CustomEvent("showroom-progress", {
          detail: (completedAssets / products.length) * 65,
        }),
      );
    }),
  );
}

function showToast(text) {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2100);
}
for (const [i, p] of shirts.entries()) {
  const button = document.createElement("button");
  button.className = "shirt";
  button.dataset.id = p.id;
  button.style.setProperty("--delay", -i * 1.7 + "s");
  button.setAttribute("aria-label", p.name + " — " + p.variant + " форма");
  const hook = document.createElement("span");
  hook.className = "hook";
  const number = document.createElement("span");
  number.className = "shirt-number";
  number.textContent = String(i + 1).padStart(2, "0");
  const image = document.createElement("img");
  image.className = "shirt-image";
  image.alt = "Форма " + p.team;
  image.draggable = false;
  const label = document.createElement("span");
  label.className = "shirt-label";
  const crest = document.createElement("img");
  crest.src = "assets/" + p.id + "-crest.png";
  crest.alt = "";
  label.append(
    crest,
    document.createTextNode(p.name + (p.id.endsWith("away") ? " / AWAY" : "")),
  );
  button.append(hook, number, image, label);
  button.onclick = () => openProduct(p, button);
  $("rack").append(button);
  trackAsset(
    artwork(p)
      .then(async (art) => {
        image.src = art.src;
        artSources.set(p.id, art.src);
        await image.decode();
      })
      .catch(async () => {
        image.src = "assets/" + p.id + ".jpg";
        await image.decode();
      }),
  );
}
for (const p of balls) {
  const button = document.createElement("button");
  button.className = "ball-product";
  button.setAttribute("aria-label", p.name + " — " + money(p.price));
  button.innerHTML = '<img draggable="false" alt=""><span></span>';
  trackAsset(
    artwork(p).then(async (art) => {
      button.querySelector("img").src = art.src;
      artSources.set(p.id, art.src);
      await button.querySelector("img").decode();
    }),
  );
  button.querySelector("img").alt = "Футбольный мяч " + p.name;
  button.querySelector("span").textContent = p.name.toUpperCase();
  button.onclick = () => openProduct(p, button);
  const bounce = () => {
    if (!document.body.classList.contains("ball-arrival"))
      button.classList.add("bounce");
  };
  button.onpointerenter = bounce;
  button.onfocus = bounce;
  button.addEventListener("animationend", (e) => {
    if (e.animationName === "bounce") button.classList.remove("bounce");
  });
  $("ballRack").append(button);
}
const filterButtons = [...$("filters").querySelectorAll("button")];
filterButtons[0].querySelector("span").textContent = products.length;
for (const b of filterButtons)
  b.onclick = () => {
    const filter = b.dataset.filter;
    filterButtons.forEach((x) => {
      x.classList.toggle("active", x === b);
      x.setAttribute("aria-pressed", String(x === b));
    });
    let count = 0;
    $("rack")
      .querySelectorAll(".shirt")
      .forEach((el) => {
        const national = el.dataset.id.startsWith("kazakhstan");
        el.hidden =
          filter === "balls" ||
          (filter === "national" && !national) ||
          (filter === "clubs" && national);
        if (!el.hidden) count++;
      });
    $("room").classList.toggle("balls-only", filter === "balls");
    $("balls").hidden = ["national", "clubs"].includes(filter);
    $("sectionLabel").textContent =
      filter === "balls"
        ? "МЯЧИ / КОНЦЕПТ-КОЛЛЕКЦИЯ"
        : filter === "national"
          ? "СБОРНАЯ / ФОРМА 2026"
          : filter === "clubs"
            ? "КЛУБЫ / СЕЗОН 2026"
            : "ФОРМА / СЕЗОН 2026";
    $("range").textContent =
      filter === "balls"
        ? "01 — " + String(balls.length).padStart(2, "0")
        : "01 — " + String(count).padStart(2, "0");
    $("rack").scrollLeft = 0;
  };
function scroll(direction) {
  $("rack").scrollBy({
    left: direction * $("rack").clientWidth * 0.65,
    behavior: "smooth",
  });
}
$("left").onclick = () => scroll(-1);
$("right").onclick = () => scroll(1);
const rack = $("rack");
const rail = document.querySelector(".rail");
$("room").addEventListener(
  "wheel",
  (event) => {
    if (event.ctrlKey || $("room").classList.contains("balls-only")) return;
    if (rack.scrollWidth <= rack.clientWidth) return;
    const dominant =
      Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;
    const unit =
      event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? rack.clientWidth : 1;
    rack.scrollLeft += dominant * unit;
    event.preventDefault();
  },
  { passive: false },
);
let railDrag = null;
let suppressClickUntil = 0;
rail.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse" || event.button !== 0) return;
  railDrag = {
    id: event.pointerId,
    startX: event.clientX,
    startScroll: rack.scrollLeft,
    moved: false,
  };
});
rail.addEventListener("pointermove", (event) => {
  if (!railDrag || event.pointerId !== railDrag.id) return;
  const delta = event.clientX - railDrag.startX;
  if (!railDrag.moved && Math.abs(delta) < 6) return;
  if (!railDrag.moved) {
    railDrag.moved = true;
    rail.setPointerCapture(event.pointerId);
    rail.classList.add("dragging");
  }
  rack.scrollLeft = railDrag.startScroll - delta;
  event.preventDefault();
});
function finishRailDrag(event) {
  if (!railDrag || event.pointerId !== railDrag.id) return;
  if (railDrag.moved) suppressClickUntil = performance.now() + 350;
  railDrag = null;
  rail.classList.remove("dragging");
  if (rail.hasPointerCapture(event.pointerId))
    rail.releasePointerCapture(event.pointerId);
}
rail.addEventListener("pointerup", finishRailDrag);
rail.addEventListener("pointercancel", finishRailDrag);
rail.addEventListener("lostpointercapture", finishRailDrag);
rail.addEventListener("pointerleave", (event) => {
  if (railDrag && !railDrag.moved) finishRailDrag(event);
});
rail.addEventListener(
  "click",
  (event) => {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  },
  true,
);
rail.addEventListener("dragstart", (event) => event.preventDefault());

function loadViewer() {
  return (viewerPromise ??= import("./model.js")
    .then((m) => m.createViewer($("canvas")))
    .catch(() =>
      import("./software-3d.js").then((m) =>
        m.createSoftwareViewer($("canvas")),
      ),
    ));
}
async function openProduct(p, opener) {
  if (opener) returnFocus = opener;
  cancelAnimationFrame(turnFrame);
  selected = p;
  const token = ++request;
  angle = 0;
  ready = false;
  $("productName").textContent = p.name;
  $("club").textContent = p.team;
  $("kind").textContent =
    p.kind === "ball"
      ? p.variant + " мяч / коллекция"
      : p.variant + " форма / сезон 2026";
  $("price").textContent = money(p.price);
  $("color").textContent = p.color;
  $("brand").textContent = p.brand;
  $("city").textContent = p.kind === "ball" ? p.material : p.city;
  $("cityLabel").textContent = p.kind === "ball" ? "Материал" : "Город";
  $("edition").textContent = p.kind === "ball" ? "SIZE 5" : "2026";
  $("crest").src =
    p.kind === "ball" ? "assets/kff.png" : "assets/" + p.id + "-crest.png";
  $("crest").alt = "Эмблема " + p.team;
  $("source").hidden = !p.url;
  $("source").textContent =
    p.kind === "ball" ? "Об официальном мяче ↗" : "Посмотреть форму ↗";
  if (p.url) $("source").href = p.url;
  $("sizes").replaceChildren();
  size = p.kind === "ball" ? "5" : "M";
  for (const value of p.kind === "ball"
    ? ["5"]
    : ["S", "M", "L", "XL", "XXL"]) {
    const b = document.createElement("button");
    b.textContent = value;
    b.className = value === size ? "active" : "";
    b.setAttribute("aria-pressed", String(value === size));
    b.onclick = () => {
      size = value;
      for (const x of $("sizes").children) {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-pressed", String(x === b));
      }
    };
    $("sizes").append(b);
  }
  $("flat").src = artSources.get(p.id) || "";
  $("flat").alt = p.kind === "ball" ? "Мяч " + p.name : "Футболка " + p.team;
  $("flat").style.transform = "none";
  $("flat").hidden = false;
  $("canvas").style.visibility = "hidden";
  if (!$("product").open) $("product").showModal();
  try {
    const art = await artwork(p);
    if (token !== request) return;
    $("flat").src = art.src;
    viewer = await loadViewer();
    if (!viewer || token !== request) return;
    await viewer.show(p, () => token === request);
    if (token !== request) return;
    ready = true;
    $("flat").hidden = true;
    $("canvas").style.visibility = "visible";
  } catch {}
}
function endProduct() {
  request++;
  viewer?.pause();
  cancelAnimationFrame(turnFrame);
  drag = null;
  returnFocus?.focus({ preventScroll: true });
}
$("product").addEventListener("close", endProduct);
$("closeProduct").onclick = () => $("product").close();
function rotate(value) {
  angle = value;
  if (ready) viewer.angle(value);
  else
    $("flat").style.transform =
      "scaleX(" + Math.max(0.12, Math.abs(Math.cos(value))) + ")";
}
$("rotate").onclick = () => {
  cancelAnimationFrame(turnFrame);
  const start = angle,
    time = performance.now();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    rotate(start + Math.PI);
    return;
  }
  function step(now) {
    const t = Math.min(1, (now - time) / 850);
    rotate(start + Math.PI * t * t * (3 - 2 * t));
    if (t < 1) turnFrame = requestAnimationFrame(step);
  }
  turnFrame = requestAnimationFrame(step);
};
$("viewer").onpointerdown = (e) => {
  cancelAnimationFrame(turnFrame);
  drag = { x: e.clientX, angle };
  $("viewer").setPointerCapture(e.pointerId);
};
$("viewer").onpointermove = (e) => {
  if (drag) rotate(drag.angle + (e.clientX - drag.x) * 0.013);
};
$("viewer").onpointerup = $("viewer").onpointercancel = () => (drag = null);
$("viewer").onkeydown = (e) => {
  if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
    e.stopPropagation();
    rotate(angle + (e.key === "ArrowLeft" ? -0.25 : 0.25));
  }
};
function next(sign) {
  const i = products.indexOf(selected);
  openProduct(products[(i + sign + products.length) % products.length]);
}
$("prev").onclick = () => next(-1);
$("next").onclick = () => next(1);
function saveCart() {
  try {
    localStorage.setItem(cartKey, JSON.stringify(cart));
  } catch {}
  $("basketCount").textContent = cart.reduce((n, r) => n + r.qty, 0);
}
$("add").onclick = () => {
  let row = cart.find((r) => r.id === selected.id && r.size === size);
  if (row) {
    if (row.qty >= 99) {
      showToast("В корзине уже 99 штук");
      return;
    }
    row.qty++;
  } else cart.push({ id: selected.id, size, qty: 1 });
  saveCart();
  showToast(selected.name + " · добавлено в корзину");
};
function renderCart() {
  saveCart();
  $("cartItems").replaceChildren();
  let sum = 0;
  if (!cart.length) {
    const p = document.createElement("p");
    p.className = "fine";
    p.textContent = "Пока пусто. Выберите форму своей команды или мяч.";
    $("cartItems").append(p);
  }
  for (const row of cart) {
    const p = products.find((p) => p.id === row.id);
    sum += p.price * row.qty;
    const el = document.createElement("div");
    el.className = "cart-row";
    const img = document.createElement("img");
    img.src = artSources.get(p.id) || "";
    img.alt = p.name;
    const detail = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = p.name;
    const meta = document.createElement("small");
    meta.textContent = "Размер " + row.size + " · " + money(p.price);
    detail.append(name, meta);
    const quantity = document.createElement("div");
    quantity.className = "quantity";
    for (const [label, n] of [
      ["−", -1],
      ["+", 1],
    ]) {
      const b = document.createElement("button");
      b.textContent = label;
      b.setAttribute(
        "aria-label",
        (n < 0 ? "Убрать" : "Добавить") + " " + p.name,
      );
      b.onclick = () => {
        row.qty += n;
        if (row.qty <= 0) cart = cart.filter((x) => x !== row);
        row.qty = Math.min(99, row.qty);
        renderCart();
      };
      if (n > 0) b.disabled = row.qty >= 99;
      if (n > 0) quantity.append(document.createTextNode(String(row.qty)));
      quantity.append(b);
    }
    el.append(img, detail, quantity);
    $("cartItems").append(el);
  }
  $("total").textContent = money(sum);
}
$("basket").onclick = () => {
  renderCart();
  $("cart").showModal();
};
$("closeCart").onclick = $("continue").onclick = () => $("cart").close();
saveCart();

await Promise.all(assetJobs);
await document.fonts.ready;
await Promise.all(
  [...document.images]
    .filter((image) => image.getAttribute("src"))
    .map((image) => image.decode()),
);
dispatchEvent(new CustomEvent("showroom-progress", { detail: 80 }));
const rackModule = await import("./rack.js");
await rackModule.mountRack(shirts);
dispatchEvent(new CustomEvent("showroom-progress", { detail: 100 }));

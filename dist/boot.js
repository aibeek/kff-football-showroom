const loader = document.getElementById("intro");
const status = document.getElementById("introStatus");
const progress = document.getElementById("introProgress");
const percent = document.getElementById("introPercent");
const retry = document.getElementById("introRetry");
addEventListener("showroom-progress", (event) => {
  const value = Math.max(progress.value, Math.min(100, event.detail));
  progress.value = value;
  percent.textContent = Math.floor(value) + "%";
  status.textContent =
    value < 70
      ? "Подготавливаем форму и эмблемы"
      : value < 100
        ? "Создаём 3D-раздевалку"
        : "Добро пожаловать";
});
try {
  await import("./app.js?v=fast-2");
  progress.value = 100;
  percent.textContent = "100%";
  status.textContent = "Добро пожаловать";
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
  document.getElementById("room").inert = false;
  document.body.classList.remove("loading");
  loader.classList.add("complete");
  dispatchEvent(new Event("showroom-ready"));
  if (document.documentElement.dataset.quality !== "lite" && !matchMedia("(prefers-reduced-motion: reduce)").matches) dropBall();
  loader.addEventListener("transitionend", () => loader.remove(), {
    once: true,
  });
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) loader.remove();
} catch (error) {
  console.error("Showroom preparation failed", error);
  status.textContent =
    "Не удалось загрузить все материалы. Проверьте соединение и повторите.";
  percent.hidden = true;
  retry.hidden = false;
  retry.onclick = () => location.reload();
}

function dropBall() {
  const button = document.querySelector(".ball-product");
  const image = button.querySelector("img");
  const shadow = document.createElement("span");
  shadow.className = "arrival-shadow";
  shadow.setAttribute("aria-hidden", "true");
  button.append(shadow);
  document.body.classList.add("ball-arrival");
  const height = image.getBoundingClientRect().top + image.clientHeight + 80;
  const gravity = 2800,
    restitution = 0.43,
    dt = 1 / 120;
  let y = -height,
    velocity = 0,
    angle = -95,
    spin = 210,
    impactTime = -1,
    compression = 0,
    settled = false;
  const samples = [];
  for (let tick = 0; tick <= 720; tick++) {
    const time = tick * dt;
    if (!settled) {
      velocity += gravity * dt;
      y += velocity * dt;
      if (y >= 0) {
        y = 0;
        impactTime = time;
        compression = Math.min(0.045, Math.abs(velocity) / 50000);
        if (velocity < 150) {
          velocity = 0;
          settled = true;
        } else velocity = -velocity * restitution;
        spin *= 0.64;
      }
      angle += spin * dt;
    }
    const contact = Math.max(0, time - impactTime);
    const squash =
      impactTime < 0 || contact > 0.075
        ? 0
        : compression * Math.sin((contact / 0.075) * Math.PI);
    samples.push({ time, y, angle, squash });
    if (settled && contact > 0.12) break;
  }
  const duration = samples.at(-1).time;
  const frames=samples.map(s=>({
    offset:s.time/duration,
    transform:'translateY('+(s.y+s.squash*image.clientHeight*.5)+'px) scale('+(1+s.squash*.7)+','+(1-s.squash)+') rotate('+s.angle+'deg)'
  }));
  const shadows = samples.map((s) => ({
    offset: s.time / duration,
    opacity: 0.08 + 0.82 * Math.exp(s.y / 150),
    transform: "scale(" + (0.25 + 0.75 * Math.exp(s.y / 180)) + ")",
    filter: "blur(" + (5 + Math.min(12, -s.y * 0.025)) + "px)",
  }));
  const options = {
    duration: duration * 1000,
    delay: 400,
    fill: "both",
    easing: "linear",
  };
  const flight = image.animate(frames, options),
    contact = shadow.animate(shadows, options);
  Promise.all([flight.finished, contact.finished])
    .catch(() => {})
    .finally(() => {
      flight.cancel();
      contact.cancel();
      image.style.rotate = samples.at(-1).angle + "deg";
      shadow.remove();
      document.body.classList.remove("ball-arrival");
    });
}

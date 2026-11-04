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
  await import("./app.js?v=preload-1");
  progress.value = 100;
  percent.textContent = "100%";
  status.textContent = "Добро пожаловать";
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
  document.getElementById("room").inert = false;
  document.body.classList.remove("loading");
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
    document.body.classList.add("ball-arrival");
  loader.classList.add("complete");
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


(function () {
  const key = "kunikTheme";
  const root = document.documentElement;
  const button = document.getElementById("legal-theme-toggle");

  function apply(theme, save) {
    const next = theme === "light" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    if (button) {
      button.textContent = next === "dark" ? "Светлая тема" : "Тёмная тема";
      button.setAttribute("aria-pressed", String(next === "dark"));
    }
    if (save) {
      try { localStorage.setItem(key, next); } catch (error) {}
    }
  }

  let saved = "dark";
  try { saved = localStorage.getItem(key) || localStorage.getItem("pontTheme") || "dark"; } catch (error) {}
  apply(saved, false);

  button?.addEventListener("click", function () {
    apply(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
  });
})();

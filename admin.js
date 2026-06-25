const loginPanel = document.getElementById("login-panel");
const inventoryPanel = document.getElementById("inventory-panel");
const headerActions = document.getElementById("header-actions");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const passwordInput = document.getElementById("password");
const productGroups = document.getElementById("product-groups");
const summary = document.getElementById("availability-summary");
const storageNote = document.getElementById("storage-note");
const toast = document.getElementById("toast");
const logoutButton = document.getElementById("logout-button");
const enableAllButton = document.getElementById("enable-all");
const disableAllButton = document.getElementById("disable-all");

let products = [];
let toastTimer = null;

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || "Ошибка запроса");
  return data;
}

function setAuthenticated(isAuthenticated) {
  loginPanel.classList.toggle("hidden", isAuthenticated);
  inventoryPanel.classList.toggle("hidden", !isAuthenticated);
  headerActions.classList.toggle("hidden", !isAuthenticated);
}

function updateSummary() {
  const available = products.filter((product) => product.available).length;
  summary.textContent = `В наличии: ${available} из ${products.length}`;
}

function renderProducts() {
  const categories = [...new Set(products.map((product) => product.category))];
  productGroups.innerHTML = categories.map((category) => {
    const categoryProducts = products.filter((product) => product.category === category);
    return `
      <section class="product-group">
        <h2>${category}</h2>
        <div class="product-list panel">
          ${categoryProducts.map((product) => `
            <div class="product-row" data-product-id="${product.id}">
              <div>
                <div class="product-name">${product.name}</div>
                <div class="product-status ${product.available ? "available" : "unavailable"}">
                  ${product.available ? "В наличии" : "Нет в наличии"}
                </div>
              </div>
              <label class="switch" aria-label="Изменить наличие товара ${product.name}">
                <input type="checkbox" ${product.available ? "checked" : ""}>
                <span class="switch-track"></span>
              </label>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }).join("");
  updateSummary();
}

async function loadProducts() {
  const data = await api("/admin/products", { method: "GET", headers: {} });
  products = data.products;
  storageNote.textContent = data.persistentStorage
    ? "Изменения сохраняются в PostgreSQL."
    : "Временное хранилище: после перезапуска Render настройки могут сброситься.";
  renderProducts();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";
  const submit = loginForm.querySelector("button");
  submit.disabled = true;
  try {
    await api("/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: passwordInput.value })
    });
    passwordInput.value = "";
    setAuthenticated(true);
    await loadProducts();
  } catch (error) {
    loginMessage.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});

productGroups.addEventListener("change", async (event) => {
  const checkbox = event.target.closest('input[type="checkbox"]');
  if (!checkbox) return;
  const row = checkbox.closest("[data-product-id]");
  const productId = row.dataset.productId;
  const product = products.find((item) => item.id === productId);
  const nextValue = checkbox.checked;
  checkbox.disabled = true;
  try {
    const data = await api(`/admin/products/${encodeURIComponent(productId)}`, {
      method: "PUT",
      body: JSON.stringify({ available: nextValue })
    });
    product.available = data.product.available;
    renderProducts();
    showToast(`${product.name}: ${product.available ? "в наличии" : "нет в наличии"}`);
  } catch (error) {
    checkbox.checked = !nextValue;
    showToast(error.message, true);
  } finally {
    checkbox.disabled = false;
  }
});

async function updateAll(available) {
  const buttons = [enableAllButton, disableAllButton];
  buttons.forEach((button) => { button.disabled = true; });
  try {
    await api("/admin/products", {
      method: "PUT",
      body: JSON.stringify({ available })
    });
    products.forEach((product) => { product.available = available; });
    renderProducts();
    showToast(available ? "Все товары включены" : "Все товары отключены");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

enableAllButton.addEventListener("click", () => updateAll(true));
disableAllButton.addEventListener("click", () => {
  if (window.confirm("Отключить все товары на сайте?")) updateAll(false);
});
logoutButton.addEventListener("click", async () => {
  await api("/admin/logout", { method: "POST", body: "{}" }).catch(() => null);
  setAuthenticated(false);
});

(async function init() {
  try {
    const status = await api("/admin/status", { method: "GET", headers: {} });
    if (!status.configured) {
      loginMessage.textContent = "Сначала добавьте ADMIN_PASSWORD в Environment на Render.";
      loginForm.querySelector("button").disabled = true;
      return;
    }
    if (status.authenticated) {
      setAuthenticated(true);
      await loadProducts();
    }
  } catch (error) {
    loginMessage.textContent = error.message;
  }
})();

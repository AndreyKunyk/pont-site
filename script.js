const STORAGE_KEYS = {
  cart: "kunikCart",
  oldCart: "pontCart",
  promo: "kunikPromo",
  oldPromo: "pontPromo",
  theme: "kunikTheme",
  oldTheme: "pontTheme",
  pendingPayment: "kunikPendingPayment"
};

const PROMO_CODE = "OVCHINNIKOV";
const PROMO_DISCOUNT = 0.2;
const API_BASE_URL = (document.querySelector('meta[name="api-base-url"]')?.content || "").replace(/\/$/, "");

const REMOVED_PRODUCT_IMAGES = new Set([
  "kom1.jpg", "kom2.jpg", "kom3.jpg",
  "obl.jpg", "lim.jpg", "klub.jpg"
]);

const SER_PRODUCT = {
  name: "Сэр-Жермен",
  price: 590,
  image: "ser.jpg"
};

const UPDATED_PRODUCT_PRICES = {
  "Мон-Моди": 510,
  "Фантанини": 500
};

function loadSavedCart() {
  try {
    const savedCart = localStorage.getItem(STORAGE_KEYS.cart) || localStorage.getItem(STORAGE_KEYS.oldCart) || "[]";
    const parsedCart = JSON.parse(savedCart);
    if (!Array.isArray(parsedCart)) return [];
    return parsedCart
      .filter((item) => !REMOVED_PRODUCT_IMAGES.has(item.image))
      .map((item) => ({
        ...item,
        price: UPDATED_PRODUCT_PRICES[item.name] ?? item.price
      }));
  } catch (error) {
    localStorage.removeItem(STORAGE_KEYS.cart);
    localStorage.removeItem(STORAGE_KEYS.oldCart);
    return [];
  }
}

const cart = loadSavedCart();
let appliedPromo = localStorage.getItem(STORAGE_KEYS.promo) || localStorage.getItem(STORAGE_KEYS.oldPromo) || "";
let onlinePaymentAvailable = false;
let availabilityLoaded = false;
const productAvailability = {};

const elements = {
  logo: document.querySelector(".logo"),
  cartItems: document.getElementById("cart-items"),
  cartTotal: document.getElementById("cart-total"),
  cartBadge: document.getElementById("cart-badge"),
  cartCount: document.getElementById("cart-count"),
  cartSubtotal: document.getElementById("cart-subtotal"),
  cartActionTotal: document.getElementById("cart-action-total"),
  cartDiscount: document.getElementById("cart-discount"),
  discountRow: document.getElementById("discount-row"),

  promoBlock: document.getElementById("promo-block"),
  promoToggle: document.getElementById("promo-toggle"),
  promoToggleLabel: document.getElementById("promo-toggle-label"),
  promoToggleAction: document.getElementById("promo-toggle-action"),
  promoInput: document.getElementById("promo-input"),
  applyPromoBtn: document.getElementById("apply-promo-btn"),
  promoMessage: document.getElementById("promo-message"),
  customerName: document.getElementById("customer-name"),
  customerPhone: document.getElementById("customer-phone"),
  customerComment: document.getElementById("customer-comment"),
  paymentMethods: document.getElementById("payment-methods"),
  paymentMethodNote: document.getElementById("payment-method-note"),
  legalConsent: document.getElementById("legal-consent"),

  clearCartBtn: document.getElementById("clear-cart-btn"),
  sendOrderBtn: document.getElementById("send-order-btn"),
  orderSuccess: document.getElementById("order-success"),
  orderSuccessId: document.getElementById("order-success-id"),
  orderSuccessTitle: document.getElementById("order-success-title"),
  orderSuccessMessage: document.getElementById("order-success-message"),
  backToMenuBtn: document.getElementById("back-to-menu-btn"),

  cartToggle: document.getElementById("cart-toggle"),
  themeToggle: document.getElementById("theme-toggle"),
  themeColorMeta: document.getElementById("theme-color-meta"),
  cartDrawer: document.getElementById("cart-drawer"),
  cartOverlay: document.getElementById("cart-overlay"),
  cartClose: document.getElementById("cart-close"),
  cartBack: document.getElementById("cart-back"),
  cartTitle: document.getElementById("cart-title"),
  cartStepLabel: document.getElementById("cart-step-label"),

  serTriggerCard: document.getElementById("ser-product-trigger"),
  serOpenBtn: document.querySelector(".open-ser-modal"),
  serModal: document.getElementById("ser-modal"),
  serModalOverlay: document.getElementById("product-modal-overlay"),
  serModalClose: document.getElementById("ser-modal-close"),
  serModalAddBtn: document.getElementById("ser-modal-add-btn"),

  notification: document.getElementById("notification"),

  mobileMiniCart: document.getElementById("mobile-mini-cart"),
  mobileMiniCartText: document.getElementById("mobile-mini-cart-text"),
  mobileMiniCartTotal: document.getElementById("mobile-mini-cart-total")
};

const serOptionCards = document.querySelectorAll(".option-card");
const serOptionInputs = document.querySelectorAll('input[name="ser-addon"]');

let logoTapCount = 0;
let logoTapTimer = null;

function showNotification(text, isError = false) {
  if (!elements.notification) return;

  elements.notification.textContent = text;
  elements.notification.classList.toggle("error", isError);
  elements.notification.classList.remove("show");

  setTimeout(() => elements.notification.classList.add("show"), 10);
  setTimeout(() => elements.notification.classList.remove("show"), 3000);
}

function getSavedTheme() {
  try {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || localStorage.getItem(STORAGE_KEYS.oldTheme);
    return savedTheme === "light" ? "light" : "dark";
  } catch (error) {
    return "dark";
  }
}

function applyTheme(theme, shouldSave = true) {
  const normalizedTheme = theme === "light" ? "light" : "dark";
  const isDark = normalizedTheme === "dark";

  document.documentElement.setAttribute("data-theme", normalizedTheme);

  if (elements.themeColorMeta) {
    elements.themeColorMeta.setAttribute("content", isDark ? "#08090d" : "#f9f9f9");
  }

  if (elements.themeToggle) {
    elements.themeToggle.setAttribute("aria-pressed", String(isDark));
    elements.themeToggle.innerHTML = `
      <i class="fas ${isDark ? "fa-moon" : "fa-sun"}"></i>
      <span>${isDark ? "Тёмная" : "Светлая"}</span>
    `;
  }

  if (shouldSave) {
    try {
      localStorage.setItem(STORAGE_KEYS.theme, normalizedTheme);
      localStorage.removeItem(STORAGE_KEYS.oldTheme);
    } catch (error) {
      console.warn("Не удалось сохранить тему", error);
    }
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  showNotification(nextTheme === "dark" ? "Включена тёмная тема" : "Включена светлая тема");
}

function initTheme() {
  applyTheme(getSavedTheme(), false);
}

function saveCart() {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
  localStorage.setItem(STORAGE_KEYS.promo, appliedPromo);

  localStorage.removeItem(STORAGE_KEYS.oldCart);
  localStorage.removeItem(STORAGE_KEYS.oldPromo);
}

function openCart() {
  if (!elements.cartDrawer || !elements.cartOverlay) return;
  elements.cartDrawer.classList.add("active");
  elements.cartOverlay.classList.add("active");
  document.body.style.overflow = "hidden";
  updateCartStepUI();
  updateMobileMiniCart();
}

function closeCart() {
  if (!elements.cartDrawer || !elements.cartOverlay) return;
  elements.cartDrawer.classList.remove("active");
  elements.cartDrawer.classList.remove("checkout-mode");
  elements.cartDrawer.classList.remove("success-mode");
  elements.cartOverlay.classList.remove("active");
  document.body.style.overflow = "";
  updateCartStepUI();
  updateMobileMiniCart();
}

function generateOrderId() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(100 + Math.random() * 900);

  return `K${year}${month}${day}-${random}`;
}

function showOrderSuccess(orderId) {
  if (!elements.cartDrawer) return;

  if (elements.orderSuccessId) {
    elements.orderSuccessId.textContent = `#${orderId}`;
  }

  if (elements.orderSuccessTitle) {
    elements.orderSuccessTitle.textContent = "Оплата прошла";
  }
  if (elements.orderSuccessMessage) {
    elements.orderSuccessMessage.textContent = "Заказ оплачен и передан сотруднику.";
  }

  elements.cartDrawer.classList.remove("checkout-mode");
  elements.cartDrawer.classList.add("success-mode");
  openCart();
}

function hideOrderSuccess() {
  if (!elements.cartDrawer) return;
  elements.cartDrawer.classList.remove("success-mode");
}


function formatPhoneNumber(value) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("8")) {
    digits = "7" + digits.slice(1);
  }

  if (digits && !digits.startsWith("7")) {
    digits = "7" + digits;
  }

  digits = digits.slice(0, 11);

  const body = digits.startsWith("7") ? digits.slice(1) : digits;
  let result = "+7";

  if (body.length > 0) {
    result += " (" + body.slice(0, 3);
  }

  if (body.length >= 3) {
    result += ")";
  }

  if (body.length > 3) {
    result += " " + body.slice(3, 6);
  }

  if (body.length > 6) {
    result += "-" + body.slice(6, 8);
  }

  if (body.length > 8) {
    result += "-" + body.slice(8, 10);
  }

  return result;
}

function getPhoneDigits(value) {
  return value.replace(/\D/g, "");
}

function setOnlinePaymentAvailability(isAvailable) {
  onlinePaymentAvailable = isAvailable;
  const paymentCard = document.getElementById("online-payment-card");
  paymentCard?.classList.toggle("disabled", !isAvailable);

  if (elements.paymentMethodNote) {
    elements.paymentMethodNote.textContent = isAvailable
      ? "Заказ поступит сотруднику только после успешной оплаты."
      : "Онлайн-оплата временно недоступна. Попробуйте оформить заказ немного позже.";
  }

  if (elements.sendOrderBtn && elements.cartDrawer?.classList.contains("checkout-mode")) {
    elements.sendOrderBtn.disabled = !isAvailable;
    elements.sendOrderBtn.innerHTML = isAvailable
      ? '<i class="fas fa-credit-card"></i> Перейти к оплате'
      : '<i class="fas fa-clock"></i> Оплата временно недоступна';
  }
}

async function initPaymentAvailability() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: { "Accept": "application/json" }
    });
    const data = await response.json();
    setOnlinePaymentAvailability(Boolean(response.ok && data.yookassaConfigured));
  } catch (error) {
    console.warn("Не удалось проверить доступность онлайн-оплаты", error);
    setOnlinePaymentAvailability(false);
  }
}

function updatePaymentMethodUI() {
  if (!elements.sendOrderBtn || !elements.cartDrawer?.classList.contains("checkout-mode")) return;

  elements.sendOrderBtn.disabled = !onlinePaymentAvailable;
  elements.sendOrderBtn.innerHTML = onlinePaymentAvailable
    ? '<i class="fas fa-credit-card"></i> Перейти к оплате'
    : '<i class="fas fa-clock"></i> Оплата временно недоступна';
}

function buildOrderPayload(orderId = generateOrderId()) {
  const totals = calculateTotals();
  return {
    items: cart,
    itemsCount: totals.itemsCount,
    discount: totals.discount,
    total: totals.finalTotal,
    promo: appliedPromo,
    orderId,
    customer: {
      name: elements.customerName?.value.trim() || "Не указано",
      phone: elements.customerPhone?.value.trim() || "",
      comment: elements.customerComment?.value.trim() || ""
    }
  };
}

function savePendingPayment(payment) {
  try {
    localStorage.setItem(STORAGE_KEYS.pendingPayment, JSON.stringify(payment));
  } catch (error) {
    console.warn("Не удалось сохранить данные платежа", error);
  }
}

function getPendingPayment() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.pendingPayment) || "null");
  } catch (error) {
    return null;
  }
}

function clearPendingPayment() {
  try {
    localStorage.removeItem(STORAGE_KEYS.pendingPayment);
  } catch (error) {
    console.warn("Не удалось очистить данные платежа", error);
  }
}

function cleanPaymentQuery() {
  const url = new URL(window.location.href);
  url.searchParams.delete("payment");
  url.searchParams.delete("order_id");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

async function requestPaymentStatus(paymentId, orderId) {
  const endpoint = paymentId
    ? `${API_BASE_URL}/payment-status/${encodeURIComponent(paymentId)}`
    : `${API_BASE_URL}/payment-status-by-order/${encodeURIComponent(orderId)}`;

  const response = await fetch(endpoint, { headers: { "Accept": "application/json" } });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Не удалось проверить оплату");
  }
  return data;
}

async function checkReturnedPayment() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("payment") !== "return") return;

  const pending = getPendingPayment();
  const orderId = pending?.orderId || params.get("order_id") || "";
  const paymentId = pending?.paymentId || "";

  showNotification("Проверяем статус оплаты...");

  try {
    let result = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      result = await requestPaymentStatus(paymentId, orderId);

      if (result.status === "succeeded" && result.paid) {
        resetCartAfterOrder();
        clearPendingPayment();
        cleanPaymentQuery();
        showNotification("Оплата прошла. Заказ передан сотруднику.");
        showOrderSuccess(result.orderId || orderId);
        return;
      }

      if (result.status === "canceled") {
        clearPendingPayment();
        cleanPaymentQuery();
        showNotification("Оплата не завершена. Корзина сохранена.", true);
        openCart();
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1800));
    }

    cleanPaymentQuery();
    showNotification("Платёж обрабатывается. Обновите страницу через минуту.");
  } catch (error) {
    console.error(error);
    cleanPaymentQuery();
    showNotification("Не удалось проверить оплату. Корзина сохранена.", true);
  }
}

function pulseCartIndicator() {
  if (!elements.cartToggle) return;
  elements.cartToggle.classList.remove("cart-pulse");
  void elements.cartToggle.offsetWidth;
  elements.cartToggle.classList.add("cart-pulse");

  setTimeout(() => {
    elements.cartToggle.classList.remove("cart-pulse");
  }, 700);
}

function animateProductAdded(triggerButton) {
  const card = triggerButton ? triggerButton.closest(".item") : null;
  if (!card) return;

  card.classList.remove("product-added");
  void card.offsetWidth;
  card.classList.add("product-added");

  setTimeout(() => {
    card.classList.remove("product-added");
  }, 650);
}


function getAvailabilityName(name) {
  return name === SER_PRODUCT.name || name.startsWith(`${SER_PRODUCT.name} + `)
    ? SER_PRODUCT.name
    : name;
}

function isProductAvailable(name) {
  const availabilityName = getAvailabilityName(name);
  return productAvailability[availabilityName] !== false;
}

function setSoldOutState(card, unavailable) {
  if (!card) return;
  card.classList.toggle("product-unavailable", unavailable);
  let badge = card.querySelector(".sold-out-badge");
  if (unavailable && !badge) {
    badge = document.createElement("span");
    badge.className = "sold-out-badge";
    badge.textContent = "Нет в наличии";
    card.appendChild(badge);
  }
  if (!unavailable && badge) badge.remove();
}

function applyAvailabilityToMenu() {
  document.querySelectorAll(".add-to-cart").forEach((button) => {
    const unavailable = !isProductAvailable(button.dataset.name || "");
    setSoldOutState(button.closest(".item"), unavailable);
  });

  const serUnavailable = !isProductAvailable(SER_PRODUCT.name);
  setSoldOutState(elements.serTriggerCard, serUnavailable);
  if (elements.serOpenBtn) {
    elements.serOpenBtn.disabled = serUnavailable;
    elements.serOpenBtn.classList.toggle("unavailable-button", serUnavailable);
    elements.serOpenBtn.textContent = serUnavailable
      ? "Нет в наличии"
      : (elements.serOpenBtn.dataset.defaultLabel || "Добавить в заказ");
  }
  if (elements.serModalAddBtn) {
    elements.serModalAddBtn.disabled = serUnavailable;
  }
}

function removeUnavailableItemsFromCart() {
  let removed = false;
  for (let index = cart.length - 1; index >= 0; index -= 1) {
    if (!isProductAvailable(cart[index].name)) {
      cart.splice(index, 1);
      removed = true;
    }
  }
  return removed;
}

async function loadProductAvailability(showRemovalNotice = true) {
  try {
    const response = await fetch(`${API_BASE_URL}/products-availability`, {
      headers: { "Accept": "application/json" },
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok || !data.ok || !Array.isArray(data.products)) {
      throw new Error(data.error || "Не удалось загрузить наличие");
    }

    Object.keys(productAvailability).forEach((key) => delete productAvailability[key]);
    data.products.forEach((product) => {
      productAvailability[product.name] = Boolean(product.available);
    });
    availabilityLoaded = true;

    const removed = removeUnavailableItemsFromCart();
    applyAvailabilityToMenu();
    renderCart();
    if (removed && showRemovalNotice) {
      showNotification("Недоступные товары удалены из корзины", true);
    }
  } catch (error) {
    console.warn("Не удалось обновить наличие товаров", error);
  }
}

function getButtonProductImage(button) {
  const card = button.closest(".item, .product-card, .menu-card, .product-item, .card");
  const cardImage = card ? card.querySelector("img") : null;
  return button.dataset.image || (cardImage ? cardImage.getAttribute("src") : "") || "5215357575149325867.jpg";
}

function getSelectedSerOptions() {
  const selected = Array.from(document.querySelectorAll('input[name="ser-addon"]:checked')).map((input) => ({
    title: input.dataset.title,
    price: Number(input.value)
  }));

  const extra = selected.reduce((sum, option) => sum + option.price, 0);
  const suffix = selected.length ? " + " + selected.map((option) => option.title).join(" + ") : "";

  return { selected, extra, suffix };
}

function updateSerModalPrice() {
  if (!elements.serModalAddBtn) return;
  const { extra } = getSelectedSerOptions();
  elements.serModalAddBtn.textContent = `В корзину за ${SER_PRODUCT.price + extra} ₽`;
}

function updateOptionCards() {
  serOptionCards.forEach((card) => {
    const input = card.querySelector("input");
    if (!input) return;
    card.classList.toggle("active", input.checked);
  });

  updateSerModalPrice();
}

function openSerModal() {
  if (!isProductAvailable(SER_PRODUCT.name)) {
    showNotification("Сэр-Жермен временно нет в наличии", true);
    return;
  }
  if (!elements.serModal || !elements.serModalOverlay) return;
  elements.serModal.classList.add("active");
  elements.serModalOverlay.classList.add("active");
  document.body.style.overflow = "hidden";
  document.body.classList.add("modal-open");
  updateOptionCards();
}

function closeSerModal() {
  if (!elements.serModal || !elements.serModalOverlay) return;
  elements.serModal.classList.remove("active");
  elements.serModalOverlay.classList.remove("active");
  document.body.style.overflow = "";
  document.body.classList.remove("modal-open");
}

function calculateTotals() {
  const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = appliedPromo === PROMO_CODE ? Math.round(subtotal * PROMO_DISCOUNT) : 0;

  return {
    itemsCount,
    subtotal,
    discount,
    finalTotal: subtotal - discount
  };
}

function updateBadge() {
  if (!elements.cartBadge) return;
  elements.cartBadge.textContent = calculateTotals().itemsCount;
}

function updateMobileMiniCart() {
  if (!elements.mobileMiniCart) return;

  const totals = calculateTotals();
  const cartIsOpen = elements.cartDrawer?.classList.contains("active");
  const shouldShow = totals.itemsCount > 0 && !cartIsOpen;

  elements.mobileMiniCart.classList.toggle("show", shouldShow);

  if (elements.mobileMiniCartText) {
    elements.mobileMiniCartText.textContent = `${totals.itemsCount} ${getProductWord(totals.itemsCount)}`;
  }

  if (elements.mobileMiniCartTotal) {
    elements.mobileMiniCartTotal.textContent = `${totals.finalTotal} ₽`;
  }
}

function getProductWord(count) {
  const lastDigit = count % 10;
  const lastTwo = count % 100;

  if (lastDigit === 1 && lastTwo !== 11) return "товар";
  if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwo)) return "товара";
  return "товаров";
}

function updateProductButtons() {
  document.querySelectorAll(".add-to-cart").forEach((button) => {
    const name = button.dataset.name;
    const item = cart.find((cartItem) => cartItem.name === name);
    const available = isProductAvailable(name || "");

    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = button.textContent.trim() || "Добавить в заказ";
    }

    button.disabled = !available;
    button.classList.toggle("unavailable-button", !available);

    if (!available) {
      button.classList.remove("product-counter-btn");
      button.textContent = "Нет в наличии";
      return;
    }

    if (item) {
      button.classList.add("product-counter-btn");
      button.innerHTML = `
        <span class="card-counter-action" data-counter-action="minus">−</span>
        <span class="card-counter-value">${item.quantity}</span>
        <span class="card-counter-action" data-counter-action="plus">+</span>
      `;
    } else {
      button.classList.remove("product-counter-btn");
      button.textContent = button.dataset.defaultLabel;
    }
  });
  applyAvailabilityToMenu();
}

function updateCartStepUI() {
  if (!elements.cartDrawer) return;

  const isCheckout = elements.cartDrawer.classList.contains("checkout-mode");

  if (elements.cartTitle) {
    elements.cartTitle.textContent = isCheckout ? "Оформление" : "Ваш заказ";
  }

  if (elements.cartStepLabel) {
    elements.cartStepLabel.textContent = isCheckout
      ? "Укажите контактные данные"
      : "Проверьте состав заказа";
  }

  if (elements.cartBack) {
    elements.cartBack.classList.toggle("show", isCheckout);
  }

  if (!isCheckout && elements.sendOrderBtn) {
    elements.sendOrderBtn.innerHTML = 'К оформлению <i class="fas fa-arrow-right"></i>';
  } else {
    updatePaymentMethodUI();
  }
}

function openPromoFields(forceOpen = null) {
  if (!elements.promoBlock || !elements.promoToggle) return;
  const shouldOpen = forceOpen ?? !elements.promoBlock.classList.contains("expanded");
  elements.promoBlock.classList.toggle("expanded", shouldOpen);
  elements.promoToggle.setAttribute("aria-expanded", String(shouldOpen));

  if (shouldOpen) {
    setTimeout(() => elements.promoInput?.focus(), 80);
  }
}

function updatePromoUI() {
  if (!elements.applyPromoBtn || !elements.promoInput || !elements.promoMessage) return;

  const isApplied = appliedPromo === PROMO_CODE;
  elements.promoBlock?.classList.toggle("applied", isApplied);

  if (isApplied) {
    elements.applyPromoBtn.textContent = "Применён";
    elements.applyPromoBtn.classList.add("applied");
    elements.promoInput.value = PROMO_CODE;
    elements.promoMessage.textContent = "Скидка 20% применена";
    elements.promoMessage.classList.remove("error");
    if (elements.promoToggleLabel) elements.promoToggleLabel.textContent = PROMO_CODE;
    if (elements.promoToggleAction) elements.promoToggleAction.textContent = "−20%";
    openPromoFields(false);
  } else {
    elements.applyPromoBtn.textContent = "Применить";
    elements.applyPromoBtn.classList.remove("applied");
    if (elements.promoToggleLabel) elements.promoToggleLabel.textContent = "Есть промокод?";
    if (elements.promoToggleAction) elements.promoToggleAction.textContent = "Добавить";
  }
}


function isCartShawarmaItem(item) {
  const shawarmaImages = [
    "5215357575149325867.jpg",
    "ser.jpg",
    "mon.jpg",
    "fantanuni.jpg",
    "krytini.jpg",
    "minikyr.jpg"
  ];

  return shawarmaImages.includes(item.image) || [
    "Сен-Мишель",
    "Сэр-Жермен",
    "Мон-Моди",
    "Фантанини",
    "Крутини",
    "Миникюр"
  ].includes(item.name);
}

function renderCartItem(item) {
  const lineTotal = item.price * item.quantity;
  const row = document.createElement("div");
  row.className = "cart-row";

  row.innerHTML = `
    <div class="cart-item-left">
      <img src="${item.image || "5215357575149325867.jpg"}" alt="${item.name}" class="cart-item-thumb ${isCartShawarmaItem(item) ? 'shawarma-cart-thumb' : ''}">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${item.price} ₽ за шт.</div>
      </div>
    </div>

    <div class="cart-right">
      <div class="cart-controls">
        <button class="qty-btn minus-btn" data-name="${item.name}" type="button">−</button>
        <span class="qty-value">${item.quantity}</span>
        <button class="qty-btn plus-btn" data-name="${item.name}" type="button">+</button>
      </div>
      <div class="cart-line-total">${lineTotal} ₽</div>
    </div>
  `;

  return row;
}

function renderCart() {
  if (!elements.cartItems || !elements.cartTotal) return;

  elements.cartItems.innerHTML = "";

  if (elements.promoInput && appliedPromo !== PROMO_CODE) {
    elements.promoInput.value = "";
  }

  if (cart.length === 0) {
    elements.cartItems.innerHTML = `
      <div class="empty-cart empty-cart-state">
        <div class="empty-cart-icon"><i class="fas fa-shopping-bag"></i></div>
        <h3>Корзина пока пуста</h3>
        <p>Добавьте блюда из меню, и они появятся здесь.</p>
        <button class="btn empty-cart-menu-btn" type="button">Перейти в меню</button>
      </div>
    `;
    elements.cartTotal.textContent = "0 ₽";
    if (elements.cartSubtotal) elements.cartSubtotal.textContent = "0 ₽";
    if (elements.cartActionTotal) elements.cartActionTotal.textContent = "0 ₽";
    if (elements.cartCount) elements.cartCount.textContent = "0";
    if (elements.cartDiscount) elements.cartDiscount.textContent = "0 ₽";
    if (elements.discountRow) elements.discountRow.style.display = "none";
    if (elements.cartDrawer) elements.cartDrawer.classList.add("cart-empty");

    updateBadge();
    updatePromoUI();
    updateProductButtons();
    updateMobileMiniCart();
    saveCart();
    return;
  }

  if (elements.cartDrawer) elements.cartDrawer.classList.remove("cart-empty");

  cart.forEach((item) => elements.cartItems.appendChild(renderCartItem(item)));

  const totals = calculateTotals();
  elements.cartTotal.textContent = `${totals.finalTotal} ₽`;
  if (elements.cartSubtotal) elements.cartSubtotal.textContent = `${totals.subtotal} ₽`;
  if (elements.cartActionTotal) elements.cartActionTotal.textContent = `${totals.finalTotal} ₽`;
  if (elements.cartCount) elements.cartCount.textContent = totals.itemsCount;

  if (totals.discount > 0) {
    if (elements.cartDiscount) elements.cartDiscount.textContent = `−${totals.discount} ₽`;
    if (elements.discountRow) elements.discountRow.style.display = "flex";
  } else {
    if (elements.cartDiscount) elements.cartDiscount.textContent = "0 ₽";
    if (elements.discountRow) elements.discountRow.style.display = "none";
  }

  updateBadge();
  updatePromoUI();
  updateProductButtons();
  updateMobileMiniCart();
  saveCart();
}

function addProduct(name, price, image, triggerButton = null) {
  if (!isProductAvailable(name)) {
    showNotification(`«${getAvailabilityName(name)}» временно нет в наличии`, true);
    return;
  }
  hideOrderSuccess();

  const existingItem = cart.find((item) => item.name === name);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ name, price, image, quantity: 1 });
  }

  renderCart();
  animateProductAdded(triggerButton);
  pulseCartIndicator();
  showNotification("Добавлено в корзину");
}

function addSerProductWithOption() {
  if (!isProductAvailable(SER_PRODUCT.name)) {
    showNotification("Сэр-Жермен временно нет в наличии", true);
    closeSerModal();
    return;
  }
  const { extra, suffix } = getSelectedSerOptions();
  addProduct(`${SER_PRODUCT.name}${suffix}`, SER_PRODUCT.price + extra, SER_PRODUCT.image, elements.serModalAddBtn);
  closeSerModal();
}

function changeItemQuantity(name, step) {
  const index = cart.findIndex((item) => item.name === name);
  if (index === -1) return;

  cart[index].quantity += step;

  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }

  renderCart();
}

function activateSecretPromo() {
  appliedPromo = PROMO_CODE;

  if (elements.promoInput) {
    elements.promoInput.value = PROMO_CODE;
  }

  if (elements.promoMessage) {
    elements.promoMessage.textContent = "Секретный промокод найден: скидка 20%";
    elements.promoMessage.classList.remove("error");
  }

  if (elements.logo) {
    elements.logo.classList.add("logo-secret");
    setTimeout(() => elements.logo.classList.remove("logo-secret"), 800);
  }

  renderCart();
  showNotification("Секрет KUNIK открыт: скидка 20% применена");
}

function handleLogoSecretClick() {
  logoTapCount += 1;

  clearTimeout(logoTapTimer);
  logoTapTimer = setTimeout(() => {
    logoTapCount = 0;
  }, 1200);

  if (logoTapCount >= 3) {
    logoTapCount = 0;
    clearTimeout(logoTapTimer);
    activateSecretPromo();
  }
}

function applyPromoCode() {
  if (!elements.promoInput || !elements.promoMessage) return;

  const entered = elements.promoInput.value.trim().toUpperCase();

  if (entered === PROMO_CODE) {
    appliedPromo = PROMO_CODE;
    elements.promoMessage.textContent = "Промокод применён: скидка 20%";
    elements.promoMessage.classList.remove("error");
    openPromoFields(false);
    showNotification("Промокод применён");
  } else {
    appliedPromo = "";
    elements.promoMessage.textContent = "Неверный промокод";
    elements.promoMessage.classList.add("error");
    showNotification("Неверный промокод", true);
  }

  renderCart();
}

function clearCart() {
  if (cart.length === 0) return;
  if (!window.confirm("Очистить всю корзину?")) return;

  cart.length = 0;
  appliedPromo = "";
  openPromoFields(false);

  if (elements.cartDrawer) {
    elements.cartDrawer.classList.remove("checkout-mode");
    elements.cartDrawer.classList.remove("success-mode");
  }

  if (elements.promoMessage) {
    elements.promoMessage.textContent = "";
    elements.promoMessage.classList.remove("error");
  }

  renderCart();
  showNotification("Корзина очищена");
}

function resetCartAfterOrder() {
  cart.length = 0;
  appliedPromo = "";
  openPromoFields(false);

  if (elements.promoMessage) {
    elements.promoMessage.textContent = "";
    elements.promoMessage.classList.remove("error");
  }

  if (elements.promoInput) {
    elements.promoInput.value = "";
  }

  if (elements.customerName) {
    elements.customerName.value = "";
  }

  if (elements.customerPhone) {
    elements.customerPhone.value = "";
  }

  if (elements.customerComment) {
    elements.customerComment.value = "";
  }

  if (elements.legalConsent) {
    elements.legalConsent.checked = false;
  }

  if (elements.cartDrawer) {
    elements.cartDrawer.classList.remove("checkout-mode");
  }

  renderCart();
}

async function sendOrder() {
  if (!elements.sendOrderBtn) return;

  if (cart.length === 0) {
    showNotification("Корзина пуста", true);
    return;
  }

  if (elements.cartDrawer && !elements.cartDrawer.classList.contains("checkout-mode")) {
    elements.cartDrawer.classList.add("checkout-mode");
    updateCartStepUI();
    showNotification("Введите данные для заказа");
    setTimeout(() => elements.customerPhone?.focus(), 100);
    return;
  }

  const customerPhone = elements.customerPhone?.value.trim() || "";
  const customerPhoneDigits = getPhoneDigits(customerPhone);
  if (!customerPhone || customerPhoneDigits.length < 11) {
    showNotification("Введите телефон полностью", true);
    elements.customerPhone?.focus();
    return;
  }

  if (elements.legalConsent && !elements.legalConsent.checked) {
    showNotification("Подтвердите согласие с условиями заказа", true);
    elements.legalConsent.focus();
    return;
  }

  if (!onlinePaymentAvailable) {
    showNotification("Онлайн-оплата временно недоступна. Попробуйте позже.", true);
    return;
  }

  const payload = buildOrderPayload();

  try {
    elements.sendOrderBtn.disabled = true;
    elements.sendOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создаём платёж...';

    const response = await fetch(`${API_BASE_URL}/create-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Не удалось создать платёж");
    }

    savePendingPayment({
      paymentId: data.paymentId,
      orderId: data.orderId,
      createdAt: Date.now()
    });

    window.location.href = data.confirmationUrl;
  } catch (error) {
    console.error(error);
    showNotification(error.message || "Ошибка соединения с сервером", true);
    elements.sendOrderBtn.disabled = false;
    updatePaymentMethodUI();
  }
}

function setupActiveCategoryNav() {
  const tabs = Array.from(document.querySelectorAll(".menu-tab[href^='#'], .mobile-category-bar a[href^='#']"));
  const sections = tabs
    .map((tab) => document.querySelector(tab.getAttribute("href")))
    .filter(Boolean);

  if (!tabs.length || !sections.length) return;

  function setActiveTab(id) {
    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.getAttribute("href") === `#${id}`);
    });
  }

  function updateActiveTab() {
    let currentId = sections[0].id;
    const triggerLine = window.innerHeight * 0.32;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= triggerLine) {
        currentId = section.id;
      }
    });

    setActiveTab(currentId);
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const id = tab.getAttribute("href").slice(1);
      setActiveTab(id);
    });
  });

  window.addEventListener("scroll", updateActiveTab, { passive: true });
  window.addEventListener("resize", updateActiveTab);
  updateActiveTab();
}

function bindEvents() {
  elements.logo?.addEventListener("click", handleLogoSecretClick);

  document.querySelectorAll(".add-to-cart").forEach((button) => {
    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = button.textContent.trim() || "Добавить в заказ";
    }

    button.addEventListener("click", (event) => {
      const name = button.dataset.name;
      const price = Number(button.dataset.price);
      const image = getButtonProductImage(button);
      const counterAction = event.target.closest("[data-counter-action]")?.dataset.counterAction;

      if (!isProductAvailable(name || "")) {
        showNotification(`«${getAvailabilityName(name || "Товар") }» временно нет в наличии`, true);
        return;
      }

      if (!name || !price) {
        console.error("У кнопки товара не заполнены data-name или data-price", button);
        showNotification("Ошибка в карточке товара", true);
        return;
      }

      if (counterAction === "plus") {
        changeItemQuantity(name, 1);
        pulseCartIndicator();
        return;
      }

      if (counterAction === "minus") {
        changeItemQuantity(name, -1);
        pulseCartIndicator();
        return;
      }

      addProduct(name, price, image, button);
    });
  });

  elements.cartItems?.addEventListener("click", (event) => {
    const emptyMenuBtn = event.target.closest(".empty-cart-menu-btn");
    if (emptyMenuBtn) {
      closeCart();
      document.getElementById("shawarma")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const button = event.target.closest(".qty-btn");
    if (!button) return;

    const step = button.classList.contains("plus-btn") ? 1 : -1;
    changeItemQuantity(button.dataset.name, step);
  });

  elements.promoToggle?.addEventListener("click", () => openPromoFields());
  elements.applyPromoBtn?.addEventListener("click", applyPromoCode);
  elements.clearCartBtn?.addEventListener("click", clearCart);
  elements.sendOrderBtn?.addEventListener("click", sendOrder);
  elements.backToMenuBtn?.addEventListener("click", () => {
    hideOrderSuccess();
    closeCart();
    document.getElementById("shawarma")?.scrollIntoView({ behavior: "smooth" });
  });

  elements.cartToggle?.addEventListener("click", openCart);
  elements.themeToggle?.addEventListener("click", toggleTheme);
  elements.cartClose?.addEventListener("click", closeCart);
  elements.cartBack?.addEventListener("click", () => {
    elements.cartDrawer?.classList.remove("checkout-mode");
    updateCartStepUI();
  });
  elements.cartOverlay?.addEventListener("click", closeCart);

  elements.mobileMiniCart?.addEventListener("click", openCart);

  elements.serTriggerCard?.addEventListener("click", (event) => {
    if (event.target.closest(".open-ser-modal")) return;
    openSerModal();
  });

  elements.serOpenBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    openSerModal();
  });

  elements.serModalClose?.addEventListener("click", closeSerModal);
  elements.serModalOverlay?.addEventListener("click", closeSerModal);
  elements.serModalAddBtn?.addEventListener("click", addSerProductWithOption);

  elements.customerPhone?.addEventListener("focus", () => {
    if (!elements.customerPhone.value.trim()) {
      elements.customerPhone.value = "+7";
    }
  });

  elements.customerPhone?.addEventListener("input", () => {
    elements.customerPhone.value = formatPhoneNumber(elements.customerPhone.value);
  });

  serOptionInputs.forEach((input) => input.addEventListener("change", updateOptionCards));
}

initTheme();
bindEvents();
setupActiveCategoryNav();
updateOptionCards();
updatePaymentMethodUI();
updateCartStepUI();
renderCart();
initPaymentAvailability();
loadProductAvailability(false);
setInterval(() => loadProductAvailability(false), 60000);
checkReturnedPayment();

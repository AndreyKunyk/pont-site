const STORAGE_KEYS = {
  cart: "pontCart",
  oldCart: "kunikCart",
  promo: "pontPromo",
  oldPromo: "kunikPromo"
};

const PROMO_CODE = "OVCHINNIKOV";
const PROMO_DISCOUNT = 0.2;

const SER_PRODUCT = {
  name: "Сэр-Жермен",
  price: 590,
  image: "ser.jpg"
};

const PONT_RECOMMENDATIONS = [
  {
    title: "Мясной PONT",
    subtitle: "Сэр-Жермен, картофель фри и фирменный соус.",
    items: [
      { name: "Сэр-Жермен", price: 590, image: "ser.jpg" },
      { name: "Картофель фри", price: 150, image: "kartoshka.jpg" },
      { name: "Фирменный соус", price: 60, image: "sfirm.jpg" }
    ]
  },
  {
    title: "Хрустящий PONT",
    subtitle: "Мон-Моди, сырные палочки и фирменный соус.",
    items: [
      { name: "Мон-Моди", price: 690, image: "mon.jpg" },
      { name: "Сырные палочки", price: 200, image: "sirpal.jpg" },
      { name: "Фирменный соус", price: 60, image: "sfirm.jpg" }
    ]
  }
];

let selectedPontRecommendation = null;

function loadSavedCart() {
  try {
    const savedCart = localStorage.getItem(STORAGE_KEYS.cart) || localStorage.getItem(STORAGE_KEYS.oldCart) || "[]";
    return JSON.parse(savedCart);
  } catch (error) {
    localStorage.removeItem(STORAGE_KEYS.cart);
    localStorage.removeItem(STORAGE_KEYS.oldCart);
    return [];
  }
}

const cart = loadSavedCart();
let appliedPromo = localStorage.getItem(STORAGE_KEYS.promo) || localStorage.getItem(STORAGE_KEYS.oldPromo) || "";

const elements = {
  logo: document.querySelector(".logo"),
  cartItems: document.getElementById("cart-items"),
  cartTotal: document.getElementById("cart-total"),
  cartBadge: document.getElementById("cart-badge"),
  cartCount: document.getElementById("cart-count"),
  cartBonus: document.getElementById("cart-bonus"),
  cartDiscount: document.getElementById("cart-discount"),
  discountRow: document.getElementById("discount-row"),

  promoInput: document.getElementById("promo-input"),
  applyPromoBtn: document.getElementById("apply-promo-btn"),
  promoMessage: document.getElementById("promo-message"),
  customerName: document.getElementById("customer-name"),
  customerPhone: document.getElementById("customer-phone"),
  customerComment: document.getElementById("customer-comment"),

  clearCartBtn: document.getElementById("clear-cart-btn"),
  sendOrderBtn: document.getElementById("send-order-btn"),
  orderSuccess: document.getElementById("order-success"),
  orderSuccessId: document.getElementById("order-success-id"),
  backToMenuBtn: document.getElementById("back-to-menu-btn"),

  cartToggle: document.getElementById("cart-toggle"),
  cartDrawer: document.getElementById("cart-drawer"),
  cartOverlay: document.getElementById("cart-overlay"),
  cartClose: document.getElementById("cart-close"),

  serTriggerCard: document.getElementById("ser-product-trigger"),
  serOpenBtn: document.querySelector(".open-ser-modal"),
  serModal: document.getElementById("ser-modal"),
  serModalOverlay: document.getElementById("product-modal-overlay"),
  serModalClose: document.getElementById("ser-modal-close"),
  serModalAddBtn: document.getElementById("ser-modal-add-btn"),

  notification: document.getElementById("notification"),

  mobileMiniCart: document.getElementById("mobile-mini-cart"),
  mobileMiniCartText: document.getElementById("mobile-mini-cart-text"),
  mobileMiniCartTotal: document.getElementById("mobile-mini-cart-total"),

  pontShakeBtn: document.getElementById("pont-shake-btn"),
  pontShakeStatus: document.getElementById("pont-shake-status"),
  pontPickBtn: document.getElementById("pont-pick-btn"),
  pontChoice: document.getElementById("pont-choice"),
  pontChoiceTitle: document.getElementById("pont-choice-title"),
  pontChoiceSubtitle: document.getElementById("pont-choice-subtitle"),
  pontChoiceList: document.getElementById("pont-choice-list"),
  pontChoiceTotal: document.getElementById("pont-choice-total"),
  pontChoiceAddBtn: document.getElementById("pont-choice-add-btn")
};

const serOptionCards = document.querySelectorAll(".option-card");
const serOptionInputs = document.querySelectorAll('input[name="ser-addon"]');

let logoTapCount = 0;
let logoTapTimer = null;
let shakePontEnabled = false;
let lastShakeTime = 0;
let lastMotion = null;

function showNotification(text, isError = false) {
  if (!elements.notification) return;

  elements.notification.textContent = text;
  elements.notification.classList.toggle("error", isError);
  elements.notification.classList.remove("show");

  setTimeout(() => elements.notification.classList.add("show"), 10);
  setTimeout(() => elements.notification.classList.remove("show"), 3000);
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
  updateMobileMiniCart();
}

function closeCart() {
  if (!elements.cartDrawer || !elements.cartOverlay) return;
  elements.cartDrawer.classList.remove("active");
  elements.cartDrawer.classList.remove("checkout-mode");
  elements.cartDrawer.classList.remove("success-mode");
  elements.cartOverlay.classList.remove("active");
  document.body.style.overflow = "";
  updateMobileMiniCart();
}

function generateOrderId() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(100 + Math.random() * 900);

  return `P${year}${month}${day}-${random}`;
}

function showOrderSuccess(orderId) {
  if (!elements.cartDrawer) return;

  if (elements.orderSuccessId) {
    elements.orderSuccessId.textContent = `#${orderId}`;
  }

  elements.cartDrawer.classList.remove("checkout-mode");
  elements.cartDrawer.classList.add("success-mode");
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
  const bonus = Math.floor(subtotal * 0.05);
  const discount = appliedPromo === PROMO_CODE ? Math.round(subtotal * PROMO_DISCOUNT) : 0;

  return {
    itemsCount,
    subtotal,
    bonus,
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

    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = button.textContent.trim() || "Добавить в заказ";
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
}

function updatePromoUI() {
  if (!elements.applyPromoBtn || !elements.promoInput || !elements.promoMessage) return;

  if (appliedPromo === PROMO_CODE) {
    elements.applyPromoBtn.textContent = "Применён";
    elements.applyPromoBtn.classList.add("applied");
    elements.promoInput.value = PROMO_CODE;
    elements.promoMessage.textContent = "Промокод применён: скидка 20%";
    elements.promoMessage.classList.remove("error");
  } else {
    elements.applyPromoBtn.textContent = "Применить";
    elements.applyPromoBtn.classList.remove("applied");
  }
}

function renderCartItem(item) {
  const lineTotal = item.price * item.quantity;
  const row = document.createElement("div");
  row.className = "cart-row";

  row.innerHTML = `
    <div class="cart-item-left">
      <img src="${item.image || "5215357575149325867.jpg"}" alt="${item.name}" class="cart-item-thumb">
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
    if (elements.cartCount) elements.cartCount.textContent = "0";
    if (elements.cartBonus) elements.cartBonus.textContent = "0 ₽";
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
  if (elements.cartCount) elements.cartCount.textContent = totals.itemsCount;
  if (elements.cartBonus) elements.cartBonus.textContent = `+${totals.bonus} ₽`;

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

function getRecommendationTotal(recommendation) {
  return recommendation.items.reduce((sum, item) => sum + item.price, 0);
}

function showPontRecommendation(recommendation) {
  if (!recommendation || !elements.pontChoice) return;

  selectedPontRecommendation = recommendation;

  if (elements.pontChoiceTitle) {
    elements.pontChoiceTitle.textContent = recommendation.title;
  }

  if (elements.pontChoiceSubtitle) {
    elements.pontChoiceSubtitle.textContent = recommendation.subtitle;
  }

  if (elements.pontChoiceList) {
    elements.pontChoiceList.innerHTML = recommendation.items
      .map((item) => `<li><span>${item.name}</span><strong>${item.price} ₽</strong></li>`)
      .join("");
  }

  if (elements.pontChoiceTotal) {
    elements.pontChoiceTotal.textContent = `${getRecommendationTotal(recommendation)} ₽`;
  }

  elements.pontChoice.hidden = false;
  elements.pontChoice.classList.remove("show");
  setTimeout(() => elements.pontChoice.classList.add("show"), 10);
}

function getRandomPontRecommendation() {
  const randomIndex = Math.floor(Math.random() * PONT_RECOMMENDATIONS.length);
  return PONT_RECOMMENDATIONS[randomIndex];
}

function pickPontRecommendation(source = "button") {
  const recommendation = getRandomPontRecommendation();

  showPontRecommendation(recommendation);

  if (source === "shake") {
    showNotification("Shake PONT сработал: заказ собран");
    updateShakeStatus("Набор выбран ниже.");
  } else {
    showNotification("PONT собрал заказ за тебя");
  }
}

function updateShakeStatus(text) {
  if (elements.pontShakeStatus) {
    elements.pontShakeStatus.textContent = text;
  }
}

function handleShakeMotion(event) {
  if (!shakePontEnabled) return;

  const motion = event.accelerationIncludingGravity || event.acceleration;
  if (!motion) return;

  const current = {
    x: motion.x || 0,
    y: motion.y || 0,
    z: motion.z || 0
  };

  if (!lastMotion) {
    lastMotion = current;
    return;
  }

  const delta = Math.abs(current.x - lastMotion.x) + Math.abs(current.y - lastMotion.y) + Math.abs(current.z - lastMotion.z);
  lastMotion = current;

  const now = Date.now();
  if (delta > 24 && now - lastShakeTime > 1400) {
    lastShakeTime = now;
    pickPontRecommendation("shake");
  }
}

function enableShakePont() {
  if (!elements.pontShakeBtn) return;

  if (!("DeviceMotionEvent" in window)) {
    updateShakeStatus("Shake не поддерживается. Нажми “Без тряски”.");
    showNotification("Shake не поддерживается на этом устройстве", true);
    return;
  }

  const startListening = () => {
    if (!shakePontEnabled) {
      window.addEventListener("devicemotion", handleShakeMotion, true);
    }

    shakePontEnabled = true;
    lastMotion = null;
    elements.pontShakeBtn.textContent = "Трясти телефон";
    elements.pontShakeBtn.classList.add("shake-active");
    updateShakeStatus("Shake включён. Встряхни телефон — PONT выберет набор.");
    showNotification("Shake PONT включён");
  };

  if (typeof DeviceMotionEvent.requestPermission === "function") {
    DeviceMotionEvent.requestPermission()
      .then((permission) => {
        if (permission === "granted") {
          startListening();
        } else {
          updateShakeStatus("Доступ не разрешён. Выбери набор кнопкой рядом.");
          showNotification("Разрешение на shake не получено", true);
        }
      })
      .catch(() => {
        updateShakeStatus("Не получилось включить shake. Нажми “Без тряски”.");
        showNotification("Shake не включился", true);
      });
    return;
  }

  startListening();
}

function addPontRecommendationToCart() {
  if (!selectedPontRecommendation) {
    pickPontRecommendation();
    return;
  }

  selectedPontRecommendation.items.forEach((product) => {
    const existingItem = cart.find((item) => item.name === product.name);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
  });

  renderCart();
  pulseCartIndicator();
  showNotification(`${selectedPontRecommendation.title} добавлен в заказ`);
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
  showNotification("Секрет PONT открыт: скидка 20% применена");
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
  cart.length = 0;
  appliedPromo = "";

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
    elements.sendOrderBtn.innerHTML = `<i class="fab fa-telegram-plane"></i> Отправить заказ`;
    showNotification("Введите данные для заказа");
    setTimeout(() => elements.customerPhone?.focus(), 100);
    return;
  }
  const customerName = elements.customerName ? elements.customerName.value.trim() : "";
  const customerPhone = elements.customerPhone ? elements.customerPhone.value.trim() : "";
  const customerComment = elements.customerComment ? elements.customerComment.value.trim() : "";

  const customerPhoneDigits = getPhoneDigits(customerPhone);

  if (!customerPhone || customerPhoneDigits.length < 11) {
    showNotification("Введите телефон полностью", true);
    elements.customerPhone?.focus();
    return;
  }

  const orderId = generateOrderId();
  const totals = calculateTotals();

  try {
    elements.sendOrderBtn.disabled = true;
    elements.sendOrderBtn.innerHTML = '<i class="fab fa-telegram-plane"></i> Отправляем...';

    const response = await fetch("https://pont-site.onrender.com/send-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart,
        itemsCount: totals.itemsCount,
        bonus: totals.bonus,
        discount: totals.discount,
        total: totals.finalTotal,
        promo: appliedPromo,
        orderId,
        customer: {
          name: customerName || "Не указано",
          phone: customerPhone,
          comment: customerComment || ""
        }
      })
    });

    const data = await response.json();

    if (data.ok) {
      showNotification("Заказ принят. Мы получили ваш заказ.");
      resetCartAfterOrder();
      showOrderSuccess(orderId);
    } else {
      showNotification("Ошибка: " + (data.error || "неизвестная ошибка"), true);
    }
  } catch (error) {
    console.error(error);
    showNotification("Ошибка соединения с сервером", true);
  } finally {
    setTimeout(() => {
      elements.sendOrderBtn.disabled = false;
      elements.sendOrderBtn.innerHTML = `<i class="fab fa-telegram-plane"></i> К оформлению заказа`;
    }, 2000);
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

  elements.applyPromoBtn?.addEventListener("click", applyPromoCode);
  elements.clearCartBtn?.addEventListener("click", clearCart);
  elements.sendOrderBtn?.addEventListener("click", sendOrder);
  elements.backToMenuBtn?.addEventListener("click", () => {
    hideOrderSuccess();
    closeCart();
    document.getElementById("shawarma")?.scrollIntoView({ behavior: "smooth" });
  });

  elements.cartToggle?.addEventListener("click", openCart);
  elements.cartClose?.addEventListener("click", closeCart);
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

  elements.pontShakeBtn?.addEventListener("click", enableShakePont);
  elements.pontPickBtn?.addEventListener("click", () => pickPontRecommendation("button"));
  elements.pontChoiceAddBtn?.addEventListener("click", addPontRecommendationToCart);

  serOptionInputs.forEach((input) => input.addEventListener("change", updateOptionCards));
}

bindEvents();
setupActiveCategoryNav();
updateOptionCards();
renderCart();

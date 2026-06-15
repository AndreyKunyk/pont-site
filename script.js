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

  notification: document.getElementById("notification")
};

const serOptionCards = document.querySelectorAll(".option-card");
const serOptionInputs = document.querySelectorAll('input[name="ser-addon"]');

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
}

function closeCart() {
  if (!elements.cartDrawer || !elements.cartOverlay) return;
  elements.cartDrawer.classList.remove("active");
  elements.cartOverlay.classList.remove("active");
  document.body.style.overflow = "";
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
  updateOptionCards();
}

function closeSerModal() {
  if (!elements.serModal || !elements.serModalOverlay) return;
  elements.serModal.classList.remove("active");
  elements.serModalOverlay.classList.remove("active");
  document.body.style.overflow = "";
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
    elements.cartItems.innerHTML = '<div class="empty-cart">Корзина пока пуста</div>';
    elements.cartTotal.textContent = "0 ₽";
    if (elements.cartCount) elements.cartCount.textContent = "0";
    if (elements.cartBonus) elements.cartBonus.textContent = "0 ₽";
    if (elements.cartDiscount) elements.cartDiscount.textContent = "0 ₽";
    if (elements.discountRow) elements.discountRow.style.display = "none";

    updateBadge();
    updatePromoUI();
    saveCart();
    return;
  }

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
  saveCart();
}

function addProduct(name, price, image) {
  const existingItem = cart.find((item) => item.name === name);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ name, price, image, quantity: 1 });
  }

  renderCart();
  openCart();
  showNotification("Добавлено в корзину");
}

function addSerProductWithOption() {
  const { extra, suffix } = getSelectedSerOptions();
  addProduct(`${SER_PRODUCT.name}${suffix}`, SER_PRODUCT.price + extra, SER_PRODUCT.image);
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

  renderCart();
}

async function sendOrder() {
  if (!elements.sendOrderBtn) return;

  if (cart.length === 0) {
    showNotification("Корзина пуста", true);
    return;
  }
const customerName = elements.customerName ? elements.customerName.value.trim() : "";
const customerPhone = elements.customerPhone ? elements.customerPhone.value.trim() : "";
const customerComment = elements.customerComment ? elements.customerComment.value.trim() : "";

if (!customerPhone) {
  showNotification("Введите телефон для связи", true);
  elements.customerPhone?.focus();
  return;
}

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

  elements.sendOrderBtn.innerHTML = `Заказ принят`;

  resetCartAfterOrder();

  setTimeout(() => {
    closeCart();
  }, 1500);
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

function bindEvents() {
  document.querySelectorAll(".add-to-cart").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.name;
      const price = Number(button.dataset.price);
      const image = getButtonProductImage(button);

      if (!name || !price) {
        console.error("У кнопки товара не заполнены data-name или data-price", button);
        showNotification("Ошибка в карточке товара", true);
        return;
      }

      addProduct(name, price, image);
    });
  });

  elements.cartItems?.addEventListener("click", (event) => {
    const button = event.target.closest(".qty-btn");
    if (!button) return;

    const step = button.classList.contains("plus-btn") ? 1 : -1;
    changeItemQuantity(button.dataset.name, step);
  });

  elements.applyPromoBtn?.addEventListener("click", applyPromoCode);
  elements.clearCartBtn?.addEventListener("click", clearCart);
  elements.sendOrderBtn?.addEventListener("click", sendOrder);

  elements.cartToggle?.addEventListener("click", openCart);
  elements.cartClose?.addEventListener("click", closeCart);
  elements.cartOverlay?.addEventListener("click", closeCart);

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

  serOptionInputs.forEach((input) => input.addEventListener("change", updateOptionCards));
}

bindEvents();
updateOptionCards();
renderCart();

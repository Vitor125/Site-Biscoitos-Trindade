const STORE = {
  name: "Biscoitos Trindade",
  whatsappNumber: "5521988146262",
  phoneDisplay: "(21) 98814-6262",
  instagramHandle: "biscoitostrindade",
  instagramUrl: "https://www.instagram.com/biscoitostrindade/",
  genericMessage: "Ola! Vim pelo site da Biscoitos Trindade e quero fazer um pedido."
};

const ASSET_VERSION = "20260422-1";
const CART_STORAGE_KEY = "biscoitos-trindade-cart";

const SIZE_OPTIONS = [
  { id: "grande", label: "Grande", weight: "500 gramas" },
  { id: "medio", label: "Medio", weight: "250 gramas" },
  { id: "pequeno", label: "Pequeno", weight: "125 gramas" }
];

function buildAssetPath(fileName) {
  return `${fileName}?v=${ASSET_VERSION}`;
}

const PRODUCTS = [
  {
    id: "chocolate-belga",
    name: "Chocolate Belga",
    badge: "Chocolate",
    flavor: "Sabor: chocolate belga",
    description:
      "Biscoito de chocolate com recheio cremoso, ideal para quem gosta de um sabor mais intenso e marcante.",
    image: buildAssetPath("chocolate-belga.jpg")
  },
  {
    id: "goiabinha-tradicional",
    name: "Goiabinha Tradicional",
    badge: "Tradicional",
    flavor: "Sabor: goiabinha tradicional",
    description:
      "Biscoito amanteigado com recheio de goiabada, feito na versao tradicional para quem ama o classico.",
    image: buildAssetPath("goiabinha-tradicional.jpg")
  },
  {
    id: "rosquinha-leite-condensado",
    name: "Rosquinha de Leite Condensado",
    badge: "Rosquinha",
    flavor: "Sabor: rosquinha de leite condensado",
    description:
      "Rosquinha delicada e macia, com um sabor suave de leite condensado que combina com cafe e cha.",
    image: buildAssetPath("rosquinha-leite-condensado.jpg")
  },
  {
    id: "goiabinha-massa-de-nata",
    name: "Goiabinha com Massa de Nata",
    badge: "Massa de nata",
    flavor: "Sabor: goiabinha com massa de nata",
    description:
      "Goiabinha com massa mais delicada e sabor de nata, trazendo um toque especial e bem caseiro.",
    image: buildAssetPath("goiabinha-massa-de-nata.jpg")
  },
  {
    id: "goiabinha-massa-leite-condensado",
    name: "Goiabinha com Massa de Leite Condensado",
    badge: "Massa de leite condensado",
    flavor: "Sabor: goiabinha com massa de leite condensado",
    description:
      "Versao recheada com goiabada e massa de leite condensado, com textura macia e sabor mais adocicado.",
    image: buildAssetPath("goiabinha-massa-leite-condensado.jpg")
  }
];

const MODAL_STATE = {
  productId: null,
  sizeId: SIZE_OPTIONS[0].id,
  quantity: 1
};

let cart = readCart();

function buildWhatsAppLink(message) {
  return `https://wa.me/${STORE.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function getProductById(productId) {
  return PRODUCTS.find((product) => product.id === productId) || null;
}

function getSizeById(sizeId) {
  return SIZE_OPTIONS.find((size) => size.id === sizeId) || null;
}

function clampQuantity(value) {
  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue)) {
    return 1;
  }

  return Math.min(99, Math.max(1, parsedValue));
}

function normalizeCartItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const product = getProductById(item.productId);
  const size = getSizeById(item.sizeId);

  if (!product || !size) {
    return null;
  }

  return {
    productId: product.id,
    sizeId: size.id,
    quantity: clampQuantity(item.quantity)
  };
}

function readCart() {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (!savedCart) {
      return [];
    }

    const parsedCart = JSON.parse(savedCart);
    if (!Array.isArray(parsedCart)) {
      return [];
    }

    return parsedCart.map(normalizeCartItem).filter(Boolean);
  } catch (error) {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    return;
  }
}

function getCartItemCount() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

function buildCartOverviewData() {
  const groupedItems = new Map();

  cart.forEach((item) => {
    const product = getProductById(item.productId);
    const size = getSizeById(item.sizeId);

    if (!product || !size) {
      return;
    }

    if (!groupedItems.has(product.id)) {
      groupedItems.set(product.id, {
        productId: product.id,
        name: product.name,
        quantity: 0,
        sizes: []
      });
    }

    const currentGroup = groupedItems.get(product.id);
    currentGroup.quantity += item.quantity;
    currentGroup.sizes.push(`${size.label}: ${item.quantity}`);
  });

  return Array.from(groupedItems.values());
}

function getCartLinesCount() {
  return buildCartOverviewData().length;
}

function buildCartMessage() {
  if (!cart.length) {
    return STORE.genericMessage;
  }

  const overviewLines = buildCartOverviewData().map((entry, index) => {
    return `${index + 1}. ${entry.name} - ${entry.quantity} item(ns)`;
  });

  const orderLines = cart.map((item, index) => {
    const product = getProductById(item.productId);
    const size = getSizeById(item.sizeId);

    return `${index + 1}. ${product.name} - ${size.label} (${size.weight}) - quantidade: ${item.quantity}`;
  });

  return [
    "Ola! Vim pelo site da Biscoitos Trindade e quero fazer este pedido:",
    "",
    "Resumo por sabor:",
    overviewLines.join("\n"),
    "",
    "Detalhes do carrinho:",
    orderLines.join("\n"),
    "",
    `Sabores escolhidos: ${getCartLinesCount()}`,
    `Total de itens: ${getCartItemCount()}`
  ].join("\n");
}

function createProductCard(product) {
  return `
    <button class="product-card" type="button" data-product-id="${product.id}">
      <div class="product-media">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
      </div>
      <div class="product-copy">
        <div class="product-topline">
          <span class="product-badge">${product.badge}</span>
          <span class="product-click">Ver tamanhos</span>
        </div>
        <h3 class="product-title">${product.name}</h3>
        <p>${product.flavor}</p>
      </div>
    </button>
  `;
}

function createSizeOption(size) {
  const selectedClass = MODAL_STATE.sizeId === size.id ? " is-selected" : "";

  return `
    <button class="size-option${selectedClass}" type="button" data-size-option="${size.id}">
      <strong>${size.label}</strong>
      <span>${size.weight}</span>
    </button>
  `;
}

function createCartOverviewItem(entry) {
  return `
    <article class="cart-overview-item">
      <div class="cart-overview-head">
        <div class="cart-overview-meta">
          <strong>${entry.name}</strong>
          <span>${entry.quantity} item(ns)</span>
        </div>
        <button class="cart-remove-summary" type="button" data-remove-cart-flavor="${entry.productId}">
          Excluir sabor
        </button>
      </div>
      <small>${entry.sizes.join(" • ")}</small>
    </article>
  `;
}

function createCartItem(item, index) {
  const product = getProductById(item.productId);
  const size = getSizeById(item.sizeId);

  return `
    <article class="cart-item">
      <div class="cart-item-media">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
      </div>

      <div class="cart-item-copy">
        <h3>${product.name}</h3>
        <p>${size.label} - ${size.weight}</p>
        <p>Quantidade: ${item.quantity}</p>
      </div>

      <button class="cart-remove" type="button" data-remove-cart-item="${index}">
        Excluir item
      </button>
    </article>
  `;
}

function renderProducts() {
  const featuredGrid = document.querySelector("[data-featured-products]");
  if (featuredGrid) {
    featuredGrid.innerHTML = PRODUCTS.slice(0, 3).map(createProductCard).join("");
  }

  const allProductsGrid = document.querySelector("[data-all-products]");
  if (allProductsGrid) {
    allProductsGrid.innerHTML = PRODUCTS.map(createProductCard).join("");
  }
}

function updateSizeOptions() {
  const sizeOptions = document.querySelector("[data-size-options]");
  if (!sizeOptions) {
    return;
  }

  sizeOptions.innerHTML = SIZE_OPTIONS.map(createSizeOption).join("");
}

function updateQuantityDisplay() {
  document.querySelectorAll("[data-quantity-value]").forEach((element) => {
    element.textContent = String(MODAL_STATE.quantity);
  });
}

function setModalFeedback(message = "") {
  document.querySelectorAll("[data-modal-feedback]").forEach((element) => {
    element.textContent = message;
  });
}

function applyStoreLinks() {
  const genericWhatsAppLink = buildWhatsAppLink(STORE.genericMessage);

  document.querySelectorAll("[data-store-whatsapp]").forEach((link) => {
    link.href = genericWhatsAppLink;
  });

  document.querySelectorAll("[data-instagram-link]").forEach((link) => {
    link.href = STORE.instagramUrl;
  });

  document.querySelectorAll("[data-phone-display]").forEach((element) => {
    element.textContent = STORE.phoneDisplay;
  });

  document.querySelectorAll("[data-instagram-handle]").forEach((element) => {
    element.textContent = `@${STORE.instagramHandle}`;
  });

  document.querySelectorAll("[data-instagram-handle-inline]").forEach((element) => {
    element.textContent = `@${STORE.instagramHandle}`;
  });
}

function getProductModal() {
  return document.querySelector("[data-product-modal]");
}

function getCartDrawer() {
  return document.querySelector("[data-cart-drawer]");
}

function syncBodyScrollLock() {
  const modal = getProductModal();
  const cartDrawer = getCartDrawer();
  const isModalOpen = modal && !modal.hidden;
  const isCartOpen = cartDrawer && !cartDrawer.hidden;

  document.body.style.overflow = isModalOpen || isCartOpen ? "hidden" : "";
}

function openModal(product) {
  const modal = getProductModal();
  if (!modal) {
    return;
  }

  MODAL_STATE.productId = product.id;
  MODAL_STATE.sizeId = SIZE_OPTIONS[0].id;
  MODAL_STATE.quantity = 1;

  const modalTitle = modal.querySelector("[data-modal-title]");
  const modalBadge = modal.querySelector("[data-modal-badge]");
  const modalFlavor = modal.querySelector("[data-modal-flavor]");
  const modalDescription = modal.querySelector("[data-modal-description]");
  const modalImage = modal.querySelector("[data-modal-image]");

  modalTitle.textContent = product.name;
  modalBadge.textContent = product.badge;
  modalFlavor.textContent = product.flavor;
  modalDescription.textContent = product.description;
  modalImage.src = product.image;
  modalImage.alt = product.name;

  updateSizeOptions();
  updateQuantityDisplay();
  setModalFeedback("");

  modal.hidden = false;
  modal.scrollTop = 0;
  syncBodyScrollLock();
}

function closeModal() {
  const modal = getProductModal();
  if (!modal) {
    return;
  }

  modal.hidden = true;
  setModalFeedback("");
  syncBodyScrollLock();
}

function openCart() {
  const cartDrawer = getCartDrawer();
  if (!cartDrawer) {
    return;
  }

  closeModal();
  cartDrawer.hidden = false;
  cartDrawer.scrollTop = 0;
  syncBodyScrollLock();
}

function closeCart() {
  const cartDrawer = getCartDrawer();
  if (!cartDrawer) {
    return;
  }

  cartDrawer.hidden = true;
  syncBodyScrollLock();
}

function updateCartUI() {
  const totalItems = getCartItemCount();
  const totalFlavors = getCartLinesCount();
  const isEmpty = cart.length === 0;
  const overviewItems = buildCartOverviewData();

  document.querySelectorAll("[data-cart-count]").forEach((element) => {
    element.textContent = String(totalItems);
  });

  document.querySelectorAll("[data-cart-total-items]").forEach((element) => {
    element.textContent = String(totalItems);
  });

  document.querySelectorAll("[data-cart-total-lines]").forEach((element) => {
    element.textContent = String(totalFlavors);
  });

  document.querySelectorAll("[data-cart-empty]").forEach((element) => {
    element.hidden = !isEmpty;
  });

  document.querySelectorAll("[data-cart-overview-wrapper]").forEach((element) => {
    element.hidden = isEmpty;
  });

  document.querySelectorAll("[data-cart-overview]").forEach((element) => {
    element.innerHTML = isEmpty ? "" : overviewItems.map(createCartOverviewItem).join("");
  });

  document.querySelectorAll("[data-cart-items]").forEach((element) => {
    element.innerHTML = isEmpty ? "" : cart.map(createCartItem).join("");
  });

  document.querySelectorAll("[data-cart-checkout]").forEach((element) => {
    element.href = buildWhatsAppLink(buildCartMessage());
    element.classList.toggle("is-disabled", isEmpty);
    element.setAttribute("aria-disabled", String(isEmpty));
  });

  document.querySelectorAll("[data-clear-cart]").forEach((button) => {
    button.disabled = isEmpty;
  });
}

function addCurrentProductToCart() {
  const product = getProductById(MODAL_STATE.productId);
  const size = getSizeById(MODAL_STATE.sizeId);

  if (!product || !size) {
    return;
  }

  const existingItem = cart.find((item) => {
    return item.productId === product.id && item.sizeId === size.id;
  });

  if (existingItem) {
    existingItem.quantity += MODAL_STATE.quantity;
  } else {
    cart.push({
      productId: product.id,
      sizeId: size.id,
      quantity: MODAL_STATE.quantity
    });
  }

  cart = cart.map(normalizeCartItem).filter(Boolean);
  saveCart();
  updateCartUI();

  setModalFeedback(`${product.name} (${size.label}) foi adicionado ao carrinho.`);
  MODAL_STATE.quantity = 1;
  updateQuantityDisplay();
}

function removeCartItem(index) {
  if (index < 0 || index >= cart.length) {
    return;
  }

  cart.splice(index, 1);
  saveCart();
  updateCartUI();
}

function removeCartFlavor(productId) {
  if (!productId) {
    return;
  }

  cart = cart.filter((item) => item.productId !== productId);
  saveCart();
  updateCartUI();
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartUI();
}

function checkoutCart(event) {
  if (event) {
    event.preventDefault();
  }

  if (!cart.length) {
    return;
  }

  const checkoutUrl = buildWhatsAppLink(buildCartMessage());
  const openedWindow = window.open(checkoutUrl, "_blank", "noopener,noreferrer");

  if (!openedWindow) {
    window.location.href = checkoutUrl;
  }
}

function initEvents() {
  document.addEventListener("click", (event) => {
    const productButton = event.target.closest("[data-product-id]");
    if (productButton) {
      const selectedProduct = getProductById(productButton.dataset.productId);
      if (selectedProduct) {
        openModal(selectedProduct);
      }
      return;
    }

    const sizeButton = event.target.closest("[data-size-option]");
    if (sizeButton) {
      MODAL_STATE.sizeId = sizeButton.dataset.sizeOption;
      updateSizeOptions();
      return;
    }

    const quantityButton = event.target.closest("[data-quantity-change]");
    if (quantityButton) {
      MODAL_STATE.quantity = clampQuantity(
        MODAL_STATE.quantity + Number.parseInt(quantityButton.dataset.quantityChange, 10)
      );
      updateQuantityDisplay();
      return;
    }

    if (event.target.closest("[data-add-to-cart]")) {
      addCurrentProductToCart();
      return;
    }

    if (event.target.closest("[data-open-cart]")) {
      openCart();
      return;
    }

    if (event.target.closest("[data-close-cart]")) {
      closeCart();
      return;
    }

    if (event.target.closest("[data-close-modal]")) {
      closeModal();
      return;
    }

    const removeButton = event.target.closest("[data-remove-cart-item]");
    if (removeButton) {
      removeCartItem(Number.parseInt(removeButton.dataset.removeCartItem, 10));
      return;
    }

    const removeFlavorButton = event.target.closest("[data-remove-cart-flavor]");
    if (removeFlavorButton) {
      removeCartFlavor(removeFlavorButton.dataset.removeCartFlavor);
      return;
    }

    if (event.target.closest("[data-clear-cart]")) {
      clearCart();
      return;
    }

    const checkoutButton = event.target.closest("[data-cart-checkout]");
    if (checkoutButton) {
      checkoutCart(event);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
      closeCart();
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== CART_STORAGE_KEY) {
      return;
    }

    cart = readCart();
    updateCartUI();
  });
}

function initSite() {
  renderProducts();
  applyStoreLinks();
  updateCartUI();
  initEvents();
}

initSite();

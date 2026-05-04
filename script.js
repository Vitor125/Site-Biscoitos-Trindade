const STORE = {
  name: "Biscoitos Trindade",
  whatsappNumber: "5521988146262",
  phoneDisplay: "(21) 98814-6262",
  instagramHandle: "biscoitostrindade",
  instagramUrl: "https://www.instagram.com/biscoitostrindade/",
  genericMessage: "Ola! Vim pelo site da Biscoitos Trindade e quero fazer um pedido."
};

const ASSET_VERSION = "20260504-1";
const CART_STORAGE_KEY = "biscoitos-trindade-cart";

const SIZE_OPTIONS = [
  { id: "grande", label: "Grande", weight: "500 gramas" },
  { id: "medio", label: "Medio", weight: "250 gramas" },
  { id: "pequeno", label: "Pequeno", weight: "125 gramas" }
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

function buildAssetPath(fileName) {
  if (!fileName) {
    return "";
  }

  if (/^(data:|https?:|blob:)/i.test(fileName)) {
    return fileName;
  }

  const sanitizedFileName = String(fileName).replace(/\?v=.*$/, "");
  return `${sanitizedFileName}?v=${ASSET_VERSION}`;
}

function getCatalogProducts() {
  if (!window.TrindadeStore) {
    return [];
  }

  return window.TrindadeStore.getVisibleProducts().map((product) => {
    return {
      ...product,
      image: buildAssetPath(product.image),
      badge: product.badge || "Artesanal",
      flavor: product.flavor || `Sabor: ${product.name.toLowerCase()}`,
      description:
        product.description || "Biscoito artesanal feito com carinho para a sua encomenda."
    };
  });
}

function getProductById(productId) {
  return getCatalogProducts().find((product) => product.id === productId) || null;
}

function getSizeById(sizeId) {
  return SIZE_OPTIONS.find((size) => size.id === sizeId) || null;
}

function getSizeInventoryValue(product, sizeId) {
  const rawValue = product && product.inventoryBySize ? product.inventoryBySize[sizeId] : null;
  return Number.isInteger(rawValue) ? rawValue : rawValue === 0 ? 0 : null;
}

function getCartQuantityForSize(productId, sizeId) {
  return cart.reduce((total, item) => {
    if (item.productId !== productId || item.sizeId !== sizeId) {
      return total;
    }

    return total + item.quantity;
  }, 0);
}

function getSizeInventoryPresentation(product, sizeId, subtractCartItems = false) {
  const configuredInventory = getSizeInventoryValue(product, sizeId);
  const cartOffset = subtractCartItems && product ? getCartQuantityForSize(product.id, sizeId) : 0;
  const availableInventory =
    configuredInventory === null ? null : Math.max(0, configuredInventory - cartOffset);

  if (availableInventory === null) {
    return {
      text: "",
      className: "",
      isAvailable: true,
      availableInventory: null
    };
  }

  if (availableInventory <= 0) {
    return {
      text: "Indisponivel",
      className: " is-empty",
      isAvailable: false,
      availableInventory: 0
    };
  }

  const inventoryLabel =
    availableInventory === 1 ? "1 disponivel" : `${availableInventory} disponiveis`;

  return {
    text: inventoryLabel,
    className: " is-available",
    isAvailable: true,
    availableInventory
  };
}

function hasAnyAvailableSize(product) {
  return SIZE_OPTIONS.some((size) => getSizeInventoryPresentation(product, size.id, true).isAvailable);
}

function getFirstAvailableSizeId(product) {
  const availableSize = SIZE_OPTIONS.find((size) => {
    return getSizeInventoryPresentation(product, size.id, true).isAvailable;
  });

  return availableSize ? availableSize.id : SIZE_OPTIONS[0].id;
}

function getSizeWeightTag(size) {
  return String(size.weight).replace(" gramas", "g");
}

function createSizeAvailabilityMarkup(product, subtractCartItems = false) {
  return SIZE_OPTIONS.map((size) => {
    const inventory = getSizeInventoryPresentation(product, size.id, subtractCartItems);
    if (inventory.availableInventory === null) {
      return "";
    }

    return `
      <span class="stock-chip${inventory.className}">
        <strong>${getSizeWeightTag(size)}</strong>
        <small>${inventory.text}</small>
      </span>
    `;
  }).join("");
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
  const sizeAvailabilityMarkup = createSizeAvailabilityMarkup(product);
  const stockGroupMarkup = sizeAvailabilityMarkup
    ? `
        <div class="product-stock-group">
          <span class="product-stock-heading">Disponibilidade por tamanho</span>
          <div class="product-stock-list">
            ${sizeAvailabilityMarkup}
          </div>
        </div>
      `
    : "";

  return `
    <button class="product-card" type="button" data-product-id="${product.id}">
      <div class="product-media">
        <img src="${product.image}" alt="${product.name}" loading="lazy" decoding="async">
      </div>
      <div class="product-copy">
        <div class="product-topline">
          <span class="product-badge">${product.badge}</span>
          <span class="product-click">Ver tamanhos</span>
        </div>
        <h3 class="product-title">${product.name}</h3>
        <p>${product.flavor}</p>
        ${stockGroupMarkup}
      </div>
    </button>
  `;
}

function createSizeOption(product, size) {
  const inventory = getSizeInventoryPresentation(product, size.id, true);
  const selectedClass = MODAL_STATE.sizeId === size.id && inventory.isAvailable ? " is-selected" : "";
  const unavailableClass = inventory.isAvailable ? "" : " is-unavailable";
  const disabledAttribute = inventory.isAvailable ? "" : " disabled";

  return `
    <button class="size-option${selectedClass}${unavailableClass}" type="button" data-size-option="${size.id}"${disabledAttribute}>
      <strong>${size.label}</strong>
      <span>${size.weight}</span>
      ${inventory.text ? `<small class="size-option-stock${inventory.className}">${inventory.text}</small>` : ""}
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
        <div class="cart-overview-actions">
          <button class="cart-stepper cart-stepper-summary" type="button" data-remove-cart-flavor-unit="${entry.productId}">
            Remover 1
          </button>
          <button class="cart-remove-summary" type="button" data-remove-cart-flavor="${entry.productId}">
            Excluir sabor inteiro
          </button>
        </div>
      </div>
      <small>${entry.sizes.join(" | ")}</small>
    </article>
  `;
}

function createCartItem(item, index) {
  const product = getProductById(item.productId);
  const size = getSizeById(item.sizeId);
  const configuredInventory = getSizeInventoryValue(product, size.id);
  const canIncrease = configuredInventory === null || item.quantity < configuredInventory;
  const addButtonDisabled = canIncrease ? "" : " disabled";

  return `
    <article class="cart-item">
      <div class="cart-item-media">
        <img src="${product.image}" alt="${product.name}" loading="lazy" decoding="async">
      </div>

      <div class="cart-item-copy">
        <h3>${product.name}</h3>
        <p>${size.label} - ${size.weight}</p>
        <p>Quantidade: ${item.quantity}</p>
        <div class="cart-item-controls">
          <button
            class="cart-stepper"
            type="button"
            data-change-cart-item="${index}"
            data-change-cart-amount="-1"
          >
            Remover 1
          </button>
          <span class="cart-item-quantity">${item.quantity} unidade(s)</span>
          <button
            class="cart-stepper cart-stepper-add"
            type="button"
            data-change-cart-item="${index}"
            data-change-cart-amount="1"
            ${addButtonDisabled}
          >
            Adicionar 1
          </button>
        </div>
      </div>

      <div class="cart-item-actions">
        <button class="cart-remove" type="button" data-remove-cart-item="${index}">
          Excluir item inteiro
        </button>
      </div>
    </article>
  `;
}

function renderDynamicPreview(products) {
  const previewImage = document.querySelector("[data-dynamic-preview-image]");
  if (!previewImage) {
    return;
  }

  const previewProduct = products[0] || null;
  if (!previewProduct) {
    previewImage.removeAttribute("src");
    previewImage.alt = "";
    return;
  }

  previewImage.src = previewProduct.image;
  previewImage.alt = previewProduct.name;
}

function createEmptyCatalogState() {
  return `
    <article class="catalog-empty-state">
      <h3>Estamos atualizando os sabores</h3>
      <p>Volte em instantes ou fale conosco no WhatsApp para saber o que esta disponivel hoje.</p>
    </article>
  `;
}

function renderProducts() {
  const products = getCatalogProducts();
  renderDynamicPreview(products);

  const featuredGrid = document.querySelector("[data-featured-products]");
  if (featuredGrid) {
    featuredGrid.innerHTML = products.length
      ? products.slice(0, 3).map(createProductCard).join("")
      : createEmptyCatalogState();
  }

  const allProductsGrid = document.querySelector("[data-all-products]");
  if (allProductsGrid) {
    allProductsGrid.innerHTML = products.length
      ? products.map(createProductCard).join("")
      : createEmptyCatalogState();
  }
}

function updateAddToCartState(product) {
  const addToCartButtons = document.querySelectorAll("[data-add-to-cart]");
  const selectedSize = getSizeById(MODAL_STATE.sizeId);
  const anyAvailableSize = product ? hasAnyAvailableSize(product) : false;
  const sizeInventory = product && selectedSize
    ? getSizeInventoryPresentation(product, selectedSize.id, true)
    : null;
  const quantityFitsStock =
    !sizeInventory || sizeInventory.availableInventory === null || MODAL_STATE.quantity <= sizeInventory.availableInventory;

  let buttonLabel = "Adicionar ao carrinho";
  let buttonDisabled = !product || !selectedSize || !sizeInventory || !sizeInventory.isAvailable || !quantityFitsStock;

  if (!anyAvailableSize) {
    buttonLabel = "Sem estoque neste sabor";
  } else if (sizeInventory && !sizeInventory.isAvailable) {
    buttonLabel = "Tamanho indisponivel";
  } else if (sizeInventory && sizeInventory.availableInventory !== null && !quantityFitsStock) {
    buttonLabel =
      sizeInventory.availableInventory === 1
        ? "Resta 1 unidade"
        : `Restam ${sizeInventory.availableInventory} unidades`;
  }

  addToCartButtons.forEach((button) => {
    button.disabled = buttonDisabled;
    button.textContent = buttonLabel;
  });
}

function updateModalStockList(product) {
  const modalStockList = document.querySelector("[data-modal-stock-list]");
  if (!modalStockList || !product) {
    return;
  }

  const sizeAvailabilityMarkup = createSizeAvailabilityMarkup(product, true);
  modalStockList.innerHTML = sizeAvailabilityMarkup;
  modalStockList.hidden = !sizeAvailabilityMarkup;
}

function updateSizeOptions() {
  const sizeOptions = document.querySelector("[data-size-options]");
  const product = getProductById(MODAL_STATE.productId);

  if (!sizeOptions || !product) {
    return;
  }

  if (!getSizeInventoryPresentation(product, MODAL_STATE.sizeId, true).isAvailable) {
    MODAL_STATE.sizeId = getFirstAvailableSizeId(product);
  }

  sizeOptions.innerHTML = SIZE_OPTIONS.map((size) => createSizeOption(product, size)).join("");
  updateAddToCartState(product);
}

function updateQuantityDisplay() {
  document.querySelectorAll("[data-quantity-value]").forEach((element) => {
    element.textContent = String(MODAL_STATE.quantity);
  });

  const currentProduct = getProductById(MODAL_STATE.productId);
  if (currentProduct) {
    updateAddToCartState(currentProduct);
  }
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
  MODAL_STATE.sizeId = getFirstAvailableSizeId(product);
  MODAL_STATE.quantity = 1;

  const modalTitle = modal.querySelector("[data-modal-title]");
  const modalBadge = modal.querySelector("[data-modal-badge]");
  const modalFlavor = modal.querySelector("[data-modal-flavor]");
  const modalStockList = modal.querySelector("[data-modal-stock-list]");
  const modalDescription = modal.querySelector("[data-modal-description]");
  const modalImage = modal.querySelector("[data-modal-image]");
  const sizeAvailabilityMarkup = createSizeAvailabilityMarkup(product, true);

  modalTitle.textContent = product.name;
  modalBadge.textContent = product.badge;
  modalFlavor.textContent = product.flavor;
  if (modalStockList) {
    modalStockList.innerHTML = sizeAvailabilityMarkup;
    modalStockList.hidden = !sizeAvailabilityMarkup;
  }
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

  const modal = getProductModal();
  if (modal && !modal.hidden && MODAL_STATE.productId) {
    const modalProduct = getProductById(MODAL_STATE.productId);

    if (!modalProduct) {
      closeModal();
      return;
    }

    updateModalStockList(modalProduct);
    updateSizeOptions();
  }
}

function addCurrentProductToCart() {
  const product = getProductById(MODAL_STATE.productId);
  const size = getSizeById(MODAL_STATE.sizeId);

  if (!product || !size) {
    return;
  }

  const sizeInventory = getSizeInventoryPresentation(product, size.id, true);
  if (!sizeInventory.isAvailable) {
    setModalFeedback(`${product.name} nao esta disponivel em ${size.weight} no momento.`);
    updateSizeOptions();
    return;
  }

  if (sizeInventory.availableInventory !== null && MODAL_STATE.quantity > sizeInventory.availableInventory) {
    const unitsLabel =
      sizeInventory.availableInventory === 1 ? "1 unidade" : `${sizeInventory.availableInventory} unidades`;
    setModalFeedback(`No momento restam ${unitsLabel} de ${product.name} em ${size.weight}.`);
    updateAddToCartState(product);
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

function changeCartItemQuantity(index, amount) {
  if (index < 0 || index >= cart.length) {
    return;
  }

  if (amount > 0) {
    const product = getProductById(cart[index].productId);
    const configuredInventory = product ? getSizeInventoryValue(product, cart[index].sizeId) : null;

    if (configuredInventory !== null && cart[index].quantity >= configuredInventory) {
      return;
    }
  }

  const nextQuantity = cart[index].quantity + amount;

  if (nextQuantity <= 0) {
    removeCartItem(index);
    return;
  }

  cart[index].quantity = clampQuantity(nextQuantity);
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

function removeSingleFlavorUnit(productId) {
  if (!productId) {
    return;
  }

  const targetIndex = cart.findIndex((item) => item.productId === productId);
  if (targetIndex === -1) {
    return;
  }

  changeCartItemQuantity(targetIndex, -1);
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

  if (window.TrindadeStore && typeof window.TrindadeStore.registerOrder === "function") {
    window.TrindadeStore.registerOrder(cart);
  }

  const checkoutUrl = buildWhatsAppLink(buildCartMessage());
  const openedWindow = window.open(checkoutUrl, "_blank", "noopener,noreferrer");

  if (!openedWindow) {
    window.location.href = checkoutUrl;
  }
}

function refreshCatalogFromStore() {
  cart = readCart();
  renderProducts();
  updateCartUI();
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
      setModalFeedback("");
      return;
    }

    const quantityButton = event.target.closest("[data-quantity-change]");
    if (quantityButton) {
      MODAL_STATE.quantity = clampQuantity(
        MODAL_STATE.quantity + Number.parseInt(quantityButton.dataset.quantityChange, 10)
      );
      updateQuantityDisplay();
      setModalFeedback("");
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

    const changeItemButton = event.target.closest("[data-change-cart-item]");
    if (changeItemButton) {
      changeCartItemQuantity(
        Number.parseInt(changeItemButton.dataset.changeCartItem, 10),
        Number.parseInt(changeItemButton.dataset.changeCartAmount, 10)
      );
      return;
    }

    const removeFlavorButton = event.target.closest("[data-remove-cart-flavor]");
    if (removeFlavorButton) {
      removeCartFlavor(removeFlavorButton.dataset.removeCartFlavor);
      return;
    }

    const removeFlavorUnitButton = event.target.closest("[data-remove-cart-flavor-unit]");
    if (removeFlavorUnitButton) {
      removeSingleFlavorUnit(removeFlavorUnitButton.dataset.removeCartFlavorUnit);
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
    if (event.key === CART_STORAGE_KEY) {
      cart = readCart();
      updateCartUI();
    }
  });

  window.addEventListener("trindade:products-updated", refreshCatalogFromStore);
  window.addEventListener("trindade:dashboard-updated", updateCartUI);
  window.addEventListener("focus", refreshCatalogFromStore);
  window.addEventListener("pageshow", refreshCatalogFromStore);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      refreshCatalogFromStore();
    }
  });
}

function initSite() {
  renderProducts();
  applyStoreLinks();
  updateCartUI();
  initEvents();
}

initSite();

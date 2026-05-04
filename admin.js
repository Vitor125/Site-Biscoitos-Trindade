const ADMIN_ASSET_VERSION = "20260503-2";
const ADMIN_SIZE_OPTIONS = [
  { id: "grande", label: "500g" },
  { id: "medio", label: "250g" },
  { id: "pequeno", label: "125g" }
];

const loginScreen = document.querySelector("[data-admin-login-screen]");
const loginForm = document.querySelector("[data-admin-login-form]");
const loginFeedback = document.querySelector("[data-admin-login-feedback]");
const panel = document.querySelector("[data-admin-panel]");
const logoutButton = document.querySelector("[data-admin-logout]");
const modeChip = document.querySelector("[data-admin-mode-chip]");

const productForm = document.querySelector("[data-admin-product-form]");
const formFeedback = document.querySelector("[data-admin-form-feedback]");
const clearFormButton = document.querySelector("[data-admin-clear-form]");
const productList = document.querySelector("[data-admin-product-list]");
const orderList = document.querySelector("[data-admin-order-list]");
const imagePreview = document.querySelector("[data-admin-image-preview]");

function buildAdminAssetPath(fileName, updatedAt) {
  if (!fileName) {
    return "";
  }

  if (/^(data:|https?:|blob:)/i.test(fileName)) {
    return fileName;
  }

  const cacheVersion = encodeURIComponent(updatedAt || ADMIN_ASSET_VERSION);
  return `${String(fileName).replace(/\?v=.*$/, "")}?v=${cacheVersion}`;
}

function formatDateTime(value) {
  if (!value) {
    return "Ainda sem registros";
  }

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function getModeLabel() {
  const firebaseEnabled = Boolean(
    window.TrindadeStore &&
      window.TrindadeStore.config &&
      window.TrindadeStore.config.firebase &&
      window.TrindadeStore.config.firebase.enabled
  );

  return firebaseEnabled ? "Firebase habilitado" : "Modo local pronto para Firebase";
}

function showPanel() {
  loginScreen.hidden = true;
  panel.hidden = false;
  modeChip.textContent = getModeLabel();
  renderDashboard();
}

function showLogin() {
  loginScreen.hidden = false;
  panel.hidden = true;
}

function setLoginFeedback(message) {
  loginFeedback.textContent = message || "";
}

function setFormFeedback(message) {
  formFeedback.textContent = message || "";
}

function getProducts() {
  return window.TrindadeStore.getProducts();
}

function getSizeInventoryValue(product, sizeId) {
  const rawValue = product && product.inventoryBySize ? product.inventoryBySize[sizeId] : null;
  return Number.isInteger(rawValue) ? rawValue : rawValue === 0 ? 0 : null;
}

function buildInventoryBadges(product) {
  return ADMIN_SIZE_OPTIONS.map((size) => {
    const value = getSizeInventoryValue(product, size.id);
    const badgeLabel =
      value === null
        ? `${size.label}: sob consulta`
        : value === 0
          ? `${size.label}: indisponivel`
          : `${size.label}: ${value} disponivel(is)`;
    const modifierClass = value === 0 ? " is-empty" : value === null ? " is-neutral" : "";

    return `<span class="admin-status-badge${modifierClass}">${badgeLabel}</span>`;
  }).join("");
}

function updateMetrics() {
  const metrics = window.TrindadeStore.getDashboardMetrics();
  const hiddenOrNoStock = metrics.hiddenProducts + metrics.productsWithoutStock;

  document.querySelector("[data-metric-total-products]").textContent = String(metrics.totalProducts);
  document.querySelector("[data-metric-visible-products]").textContent = String(metrics.visibleProducts);
  document.querySelector("[data-metric-hidden-products]").textContent = String(hiddenOrNoStock);
  document.querySelector("[data-metric-total-orders]").textContent = String(metrics.totalOrders);
}

function buildProductCard(product) {
  const visibilityLabel = product.hidden ? "Oculto no catalogo" : "Visivel no catalogo";
  const toggleLabel = product.hidden ? "Desocultar" : "Ocultar";

  return `
    <article class="admin-product-item">
      <div class="admin-product-thumb">
        <img src="${buildAdminAssetPath(product.image, product.updatedAt)}" alt="${product.name}" loading="lazy" decoding="async">
      </div>

      <div class="admin-product-meta">
        <h3>${product.name}</h3>
        <small>${product.flavor}</small>
        <div class="admin-status-row">
          <span class="admin-status-badge${product.hidden ? " is-hidden" : ""}">${visibilityLabel}</span>
          ${buildInventoryBadges(product)}
        </div>
      </div>

      <div class="admin-product-actions">
        <button class="admin-action" type="button" data-admin-edit-product="${product.id}">Editar</button>
        <button class="admin-action" type="button" data-admin-toggle-product="${product.id}">${toggleLabel}</button>
        <button class="admin-action is-danger" type="button" data-admin-delete-product="${product.id}">Excluir</button>
      </div>
    </article>
  `;
}

function renderProducts() {
  const products = getProducts();

  if (!products.length) {
    productList.innerHTML = `<div class="admin-empty">Nenhum sabor cadastrado ainda.</div>`;
    return;
  }

  productList.innerHTML = products.map(buildProductCard).join("");
}

function renderOrders() {
  const dashboard = window.TrindadeStore.getDashboard();

  if (!dashboard.orderHistory.length) {
    orderList.innerHTML = `<div class="admin-empty">Os pedidos enviados pelo site vao aparecer aqui.</div>`;
    return;
  }

  orderList.innerHTML = dashboard.orderHistory
    .map((order) => {
      const itemsMarkup = order.items
        .map((item) => `<li>${item.name} - ${item.quantity} unidade(s)</li>`)
        .join("");

      return `
        <article class="admin-order-item">
          <div class="admin-order-meta">
            <h3>Pedido enviado</h3>
            <small>${formatDateTime(order.createdAt)}</small>
            <ul>${itemsMarkup}</ul>
          </div>
          <span class="admin-status-badge">${order.totalItems} item(ns)</span>
        </article>
      `;
    })
    .join("");
}

function updateImagePreview(imageSource) {
  if (!imageSource) {
    imagePreview.innerHTML = "<span>Preview da foto do sabor</span>";
    return;
  }

  imagePreview.innerHTML = `<img src="${imageSource}" alt="Preview do sabor">`;
}

function resetForm() {
  productForm.reset();
  productForm.elements.productId.value = "";
  productForm.elements.currentImage.value = "";
  productForm.elements.inventoryGrande.value = "";
  productForm.elements.inventoryMedio.value = "";
  productForm.elements.inventoryPequeno.value = "";
  updateImagePreview("");
  setFormFeedback("");
}

function fillForm(productId) {
  const product = getProducts().find((item) => item.id === productId);
  if (!product) {
    return;
  }

  productForm.elements.productId.value = product.id;
  productForm.elements.currentImage.value = product.image;
  productForm.elements.name.value = product.name;
  productForm.elements.badge.value = product.badge || "";
  productForm.elements.flavor.value = product.flavor || "";
  productForm.elements.description.value = product.description || "";
  productForm.elements.inventoryGrande.value =
    product.inventoryBySize && product.inventoryBySize.grande !== null ? String(product.inventoryBySize.grande) : "";
  productForm.elements.inventoryMedio.value =
    product.inventoryBySize && product.inventoryBySize.medio !== null ? String(product.inventoryBySize.medio) : "";
  productForm.elements.inventoryPequeno.value =
    product.inventoryBySize && product.inventoryBySize.pequeno !== null ? String(product.inventoryBySize.pequeno) : "";
  productForm.elements.imageUrl.value = /^(data:|https?:)/i.test(product.image) ? product.image : "";
  productForm.elements.hidden.checked = Boolean(product.hidden);
  updateImagePreview(buildAdminAssetPath(product.image, product.updatedAt));
  setFormFeedback("Produto carregado para edicao.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nao foi possivel ler a foto."));
    reader.readAsDataURL(file);
  });
}

function compressImage(file, maxSize) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const imageUrl = URL.createObjectURL(file);

    image.onload = () => {
      const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(imageUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Nao foi possivel preparar a foto."));
    };

    image.src = imageUrl;
  });
}

async function resolveProductImage() {
  const file = productForm.elements.imageFile.files[0];
  if (file) {
    return compressImage(file, 1400);
  }

  const typedUrl = productForm.elements.imageUrl.value.trim();
  if (typedUrl) {
    return typedUrl;
  }

  return productForm.elements.currentImage.value.trim();
}

function renderDashboard() {
  updateMetrics();
  renderProducts();
  renderOrders();
}

async function handleProductSubmit(event) {
  event.preventDefault();
  setFormFeedback("Salvando...");

  try {
    const image = await resolveProductImage();

    if (!image) {
      setFormFeedback("Adicione uma foto ou informe o link da imagem.");
      return;
    }

    window.TrindadeStore.upsertProduct({
      id: productForm.elements.productId.value.trim(),
      name: productForm.elements.name.value.trim(),
      badge: productForm.elements.badge.value.trim(),
      flavor: productForm.elements.flavor.value.trim(),
      description: productForm.elements.description.value.trim(),
      image,
      inventoryBySize: {
        grande: productForm.elements.inventoryGrande.value.trim(),
        medio: productForm.elements.inventoryMedio.value.trim(),
        pequeno: productForm.elements.inventoryPequeno.value.trim()
      },
      hidden: productForm.elements.hidden.checked
    });

    renderDashboard();
    resetForm();
    setFormFeedback("Sabor salvo com sucesso.");
  } catch (error) {
    setFormFeedback(error.message || "Nao foi possivel salvar o sabor.");
  }
}

function handleProductListClick(event) {
  const editButton = event.target.closest("[data-admin-edit-product]");
  if (editButton) {
    fillForm(editButton.dataset.adminEditProduct);
    return;
  }

  const toggleButton = event.target.closest("[data-admin-toggle-product]");
  if (toggleButton) {
    window.TrindadeStore.toggleProductVisibility(toggleButton.dataset.adminToggleProduct);
    renderDashboard();
    return;
  }

  const deleteButton = event.target.closest("[data-admin-delete-product]");
  if (deleteButton) {
    const confirmed = window.confirm("Deseja excluir esse sabor do catalogo?");
    if (!confirmed) {
      return;
    }

    window.TrindadeStore.deleteProduct(deleteButton.dataset.adminDeleteProduct);
    renderDashboard();
    resetForm();
  }
}

function handleLogin(event) {
  event.preventDefault();
  const passcode = loginForm.elements.passcode.value.trim();

  if (!window.TrindadeStore.login(passcode)) {
    setLoginFeedback("Senha incorreta. Tente novamente.");
    return;
  }

  loginForm.reset();
  setLoginFeedback("");
  showPanel();
}

function initImagePreviewHandlers() {
  productForm.elements.imageUrl.addEventListener("input", () => {
    const typedUrl = productForm.elements.imageUrl.value.trim();
    updateImagePreview(typedUrl || productForm.elements.currentImage.value.trim());
  });

  productForm.elements.imageFile.addEventListener("change", async () => {
    const file = productForm.elements.imageFile.files[0];
    if (!file) {
      updateImagePreview(productForm.elements.currentImage.value.trim());
      return;
    }

    try {
      const previewDataUrl = await readFileAsDataUrl(file);
      updateImagePreview(previewDataUrl);
    } catch (error) {
      setFormFeedback("Nao foi possivel mostrar a foto escolhida.");
    }
  });
}

function initDashboard() {
  if (!window.TrindadeStore) {
    return;
  }

  loginForm.addEventListener("submit", handleLogin);
  logoutButton.addEventListener("click", () => {
    window.TrindadeStore.logout();
    showLogin();
  });

  productForm.addEventListener("submit", handleProductSubmit);
  productList.addEventListener("click", handleProductListClick);
  clearFormButton.addEventListener("click", resetForm);

  window.addEventListener("trindade:products-updated", renderDashboard);
  window.addEventListener("trindade:dashboard-updated", renderDashboard);

  initImagePreviewHandlers();

  if (window.TrindadeStore.hasAdminSession()) {
    showPanel();
  } else {
    showLogin();
  }
}

initDashboard();

(function initializeTrindadeStore() {
  const CONFIG = window.TRINDADE_APP_CONFIG || {};

  const STORAGE_KEYS = {
    products: "biscoitos-trindade-products",
    dashboard: "biscoitos-trindade-dashboard",
    adminSession: "biscoitos-trindade-admin-session"
  };

  const DEFAULT_PRODUCTS = [
    {
      id: "chocolate-belga",
      name: "Chocolate Belga",
      badge: "Chocolate",
      flavor: "Sabor: chocolate belga",
      description:
        "Biscoito de chocolate com recheio cremoso, ideal para quem gosta de um sabor mais intenso e marcante.",
      image: "chocolate-belga.jpg",
      hidden: false,
      inventory: null
    },
    {
      id: "goiabinha-tradicional",
      name: "Goiabinha Tradicional",
      badge: "Tradicional",
      flavor: "Sabor: goiabinha tradicional",
      description:
        "Biscoito amanteigado com recheio de goiabada, feito na versao tradicional para quem ama o classico.",
      image: "goiabinha-tradicional.jpg",
      hidden: false,
      inventory: null
    },
    {
      id: "rosquinha-leite-condensado",
      name: "Rosquinha de Leite Condensado",
      badge: "Rosquinha",
      flavor: "Sabor: rosquinha de leite condensado",
      description:
        "Rosquinha delicada e macia, com um sabor suave de leite condensado que combina com cafe e cha.",
      image: "rosquinha-leite-condensado.jpg",
      hidden: false,
      inventory: null
    },
    {
      id: "goiabinha-massa-de-nata",
      name: "Goiabinha com Massa de Nata",
      badge: "Massa de nata",
      flavor: "Sabor: goiabinha com massa de nata",
      description:
        "Goiabinha com massa mais delicada e sabor de nata, trazendo um toque especial e bem caseiro.",
      image: "goiabinha-massa-de-nata.jpg",
      hidden: false,
      inventory: null
    },
    {
      id: "goiabinha-massa-leite-condensado",
      name: "Goiabinha com Massa de Leite Condensado",
      badge: "Massa de leite condensado",
      flavor: "Sabor: goiabinha com massa de leite condensado",
      description:
        "Versao recheada com goiabada e massa de leite condensado, com textura macia e sabor mais adocicado.",
      image: "goiabinha-massa-leite-condensado.jpg",
      hidden: false,
      inventory: null
    }
  ];

  const DEFAULT_DASHBOARD = {
    totalOrders: 0,
    totalItemsOrdered: 0,
    lastOrderAt: "",
    salesByProductId: {},
    orderHistory: []
  };

  function dispatchStoreEvent(name) {
    window.dispatchEvent(new CustomEvent(name));
  }

  function readJSON(key, fallback) {
    try {
      const rawValue = localStorage.getItem(key);
      return rawValue ? JSON.parse(rawValue) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeInventory(value) {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    const parsedValue = Number.parseInt(value, 10);
    return Number.isNaN(parsedValue) ? null : Math.max(0, parsedValue);
  }

  function normalizeProduct(product, fallbackId) {
    if (!product || typeof product !== "object") {
      return null;
    }

    const name = String(product.name || "").trim();
    if (!name) {
      return null;
    }

    const badge = String(product.badge || name.split(" ")[0] || "Artesanal").trim();
    const flavor = String(product.flavor || `Sabor: ${name.toLowerCase()}`).trim();
    const description = String(product.description || "Biscoito artesanal feito com carinho para a sua encomenda.").trim();
    const image = String(product.image || "").trim();
    const productId = String(product.id || fallbackId || slugify(name) || `produto-${Date.now()}`).trim();

    return {
      id: productId,
      name,
      badge,
      flavor,
      description,
      image,
      hidden: Boolean(product.hidden),
      inventory: normalizeInventory(product.inventory),
      createdAt: product.createdAt || nowIso(),
      updatedAt: nowIso()
    };
  }

  function getDefaultProducts() {
    return DEFAULT_PRODUCTS.map((product) => normalizeProduct(product, product.id)).filter(Boolean);
  }

  function ensureProductsSeeded() {
    const savedProducts = readJSON(STORAGE_KEYS.products, null);
    if (Array.isArray(savedProducts) && savedProducts.length) {
      return;
    }

    writeJSON(STORAGE_KEYS.products, getDefaultProducts());
  }

  function ensureDashboardSeeded() {
    const savedDashboard = readJSON(STORAGE_KEYS.dashboard, null);
    if (savedDashboard && typeof savedDashboard === "object") {
      return;
    }

    writeJSON(STORAGE_KEYS.dashboard, deepClone(DEFAULT_DASHBOARD));
  }

  function getProducts(includeHidden) {
    ensureProductsSeeded();

    const normalizedProducts = readJSON(STORAGE_KEYS.products, [])
      .map((product) => normalizeProduct(product, product.id))
      .filter(Boolean);

    if (includeHidden) {
      return normalizedProducts;
    }

    return normalizedProducts.filter((product) => !product.hidden);
  }

  function saveProducts(products) {
    const normalizedProducts = products
      .map((product) => normalizeProduct(product, product.id))
      .filter(Boolean);

    writeJSON(STORAGE_KEYS.products, normalizedProducts);
    dispatchStoreEvent("trindade:products-updated");
    return normalizedProducts;
  }

  function upsertProduct(productInput) {
    const allProducts = getProducts(true);
    const nextProduct = normalizeProduct(productInput, productInput.id || slugify(productInput.name));

    if (!nextProduct) {
      return null;
    }

    const existingIndex = allProducts.findIndex((product) => product.id === nextProduct.id);

    if (existingIndex >= 0) {
      nextProduct.createdAt = allProducts[existingIndex].createdAt || nextProduct.createdAt;
      allProducts[existingIndex] = nextProduct;
    } else {
      allProducts.unshift(nextProduct);
    }

    saveProducts(allProducts);
    return nextProduct;
  }

  function deleteProduct(productId) {
    const nextProducts = getProducts(true).filter((product) => product.id !== productId);
    saveProducts(nextProducts);
  }

  function toggleProductVisibility(productId) {
    const nextProducts = getProducts(true).map((product) => {
      if (product.id !== productId) {
        return product;
      }

      return {
        ...product,
        hidden: !product.hidden,
        updatedAt: nowIso()
      };
    });

    saveProducts(nextProducts);
  }

  function getDashboard() {
    ensureDashboardSeeded();
    const dashboard = readJSON(STORAGE_KEYS.dashboard, deepClone(DEFAULT_DASHBOARD));

    return {
      totalOrders: Number.parseInt(dashboard.totalOrders, 10) || 0,
      totalItemsOrdered: Number.parseInt(dashboard.totalItemsOrdered, 10) || 0,
      lastOrderAt: String(dashboard.lastOrderAt || ""),
      salesByProductId: dashboard.salesByProductId && typeof dashboard.salesByProductId === "object"
        ? dashboard.salesByProductId
        : {},
      orderHistory: Array.isArray(dashboard.orderHistory) ? dashboard.orderHistory : []
    };
  }

  function saveDashboard(dashboard) {
    writeJSON(STORAGE_KEYS.dashboard, dashboard);
    dispatchStoreEvent("trindade:dashboard-updated");
    return dashboard;
  }

  function registerOrder(cartItems) {
    if (!Array.isArray(cartItems) || !cartItems.length) {
      return null;
    }

    const dashboard = getDashboard();
    const productsById = new Map(getProducts(true).map((product) => [product.id, product]));
    const orderedItems = cartItems.map((item) => {
      const product = productsById.get(item.productId);

      return {
        productId: item.productId,
        name: product ? product.name : item.productId,
        sizeId: item.sizeId,
        quantity: Number.parseInt(item.quantity, 10) || 0
      };
    });

    const totalItems = orderedItems.reduce((total, item) => total + item.quantity, 0);
    const record = {
      id: `pedido-${Date.now()}`,
      createdAt: nowIso(),
      totalItems,
      items: orderedItems
    };

    dashboard.totalOrders += 1;
    dashboard.totalItemsOrdered += totalItems;
    dashboard.lastOrderAt = record.createdAt;
    dashboard.orderHistory.unshift(record);
    dashboard.orderHistory = dashboard.orderHistory.slice(0, 30);

    orderedItems.forEach((item) => {
      dashboard.salesByProductId[item.productId] = (dashboard.salesByProductId[item.productId] || 0) + item.quantity;
    });

    saveDashboard(dashboard);
    return record;
  }

  function getDashboardMetrics() {
    const products = getProducts(true);
    const dashboard = getDashboard();

    return {
      totalProducts: products.length,
      visibleProducts: products.filter((product) => !product.hidden).length,
      hiddenProducts: products.filter((product) => product.hidden).length,
      productsWithoutStock: products.filter((product) => product.inventory === 0).length,
      totalOrders: dashboard.totalOrders,
      totalItemsOrdered: dashboard.totalItemsOrdered,
      lastOrderAt: dashboard.lastOrderAt
    };
  }

  function verifyAdminPasscode(passcode) {
    return String(passcode || "") === String(CONFIG.adminPasscode || "");
  }

  function login(passcode) {
    if (!verifyAdminPasscode(passcode)) {
      return false;
    }

    sessionStorage.setItem(STORAGE_KEYS.adminSession, "active");
    return true;
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEYS.adminSession);
  }

  function hasAdminSession() {
    return sessionStorage.getItem(STORAGE_KEYS.adminSession) === "active";
  }

  ensureProductsSeeded();
  ensureDashboardSeeded();

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEYS.products) {
      dispatchStoreEvent("trindade:products-updated");
    }

    if (event.key === STORAGE_KEYS.dashboard) {
      dispatchStoreEvent("trindade:dashboard-updated");
    }
  });

  window.TrindadeStore = {
    keys: STORAGE_KEYS,
    config: CONFIG,
    getProducts: () => getProducts(true),
    getVisibleProducts: () => getProducts(false),
    upsertProduct,
    deleteProduct,
    toggleProductVisibility,
    registerOrder,
    getDashboard,
    getDashboardMetrics,
    login,
    logout,
    hasAdminSession
  };
})();

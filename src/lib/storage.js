const KEYS = {
  products: 'maurizio_outlet_products_v2',
  sales: 'maurizio_outlet_sales_v2',
};

export function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(KEYS[key]);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(KEYS[key], JSON.stringify(value));
  } catch {
    // L'app continua a funzionare anche se il browser blocca localStorage.
  }
}

export function clearStorage() {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}

import { seedListings } from "./listings";

async function jsonFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export const listingStore = {
  async list() {
    try {
      const rows = await jsonFetch("/api/listings");
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [...seedListings];
    }
  },
  async create(data) {
    return jsonFetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  }
};

// Wrapper so we can easily disable/replace GA
const getGtag = () => (typeof window !== "undefined" && typeof window.gtag === "function" ? window.gtag : null);

export function trackPageView(path, title) {
  const gtag = getGtag();
  if (gtag) {
    gtag("event", "page_view", {
      page_path: path,
      page_title: title,
    });
  }
}

export function trackEvent(eventName, params = {}) {
  const gtag = getGtag();
  if (gtag) {
    gtag("event", eventName, params);
  }
}

// Key business events
export const events = {
  adViewed: (adId, category) =>
    trackEvent("ad_viewed", { ad_id: adId, category }),

  adPosted: (category) =>
    trackEvent("ad_posted", { category }),

  messageStarted: () =>
    trackEvent("message_started"),

  offerMade: (amount) =>
    trackEvent("offer_made", { value: amount, currency: "MXN" }),

  favoriteAdded: () =>
    trackEvent("favorite_added"),

  phoneVerified: () =>
    trackEvent("phone_verified"),

  searchPerformed: (query, category) =>
    trackEvent("search", { search_term: query, category }),

  promotionViewed: (plan) =>
    trackEvent("view_item", { item_name: plan }),

  purchasePromotion: (plan, amount) =>
    trackEvent("purchase", {
      transaction_id: Date.now().toString(),
      value: amount,
      currency: "MXN",
      items: [{ item_name: plan }],
    }),
};

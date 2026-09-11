/**
 * Quick-filter vocabulary for the automotive rail on the homepage.
 *
 * Both the legacy home screen and Home V2 build the same row from these
 * values, so the year window and the price buckets cannot drift apart while
 * the two screens coexist.
 */
export const AUTOMOTIVE_QUICK_BRANDS = ['Nissan', 'VW', 'Toyota', 'Honda'];
export const AUTOMOTIVE_PRICE_OPTIONS = [100000, 200000, 300000, 500000, 1000000];
export const AUTOMOTIVE_YEAR_SPAN = 12;

export function getAutomotiveQuickYears(currentYear = new Date().getFullYear()) {
  return Array.from({ length: AUTOMOTIVE_YEAR_SPAN }, (_, index) => String(currentYear - index));
}

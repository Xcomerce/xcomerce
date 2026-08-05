/** Desconto máximo permitido na auto-proposta (sobre preço de mercado de referência). */
export const AUTO_OFFER_MAX_DISCOUNT_PERCENT = 100

/** @deprecated Use AUTO_OFFER_MAX_DISCOUNT_PERCENT */
export const OFFER_MARKET_DOWNWARD_MARGIN_PERCENT = AUTO_OFFER_MAX_DISCOUNT_PERCENT

export function getOfferUnitPrice(totalValue: number, quantity: number): number {
  if (quantity <= 0) return 0
  return roundCurrency(totalValue / quantity)
}

export function clampAutoOfferDiscount(discountPercent: number): number {
  return Math.min(100, Math.max(0, discountPercent))
}

export function calculateAutoOfferUnitPrice(marketUnitPrice: number, discountPercent: number): number {
  const discount = clampAutoOfferDiscount(discountPercent)
  return roundCurrency(marketUnitPrice * (1 - discount / 100))
}

export function calculateAutoOfferTotal(
  marketUnitPrice: number,
  discountPercent: number,
  quantity: number,
): number {
  return roundCurrency(calculateAutoOfferUnitPrice(marketUnitPrice, discountPercent) * quantity)
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

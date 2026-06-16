export const OFFER_MARKET_DOWNWARD_MARGIN_PERCENT = 20

const MARKET_FLOOR_RATIO = 1 - OFFER_MARKET_DOWNWARD_MARGIN_PERCENT / 100

export function getMinUnitPrice(marketPrice: number): number {
  return roundCurrency(marketPrice * MARKET_FLOOR_RATIO)
}

export function getMinTotalPrice(marketUnitPrice: number, quantity: number): number {
  return roundCurrency(getMinUnitPrice(marketUnitPrice) * quantity)
}

export function getOfferUnitPrice(totalValue: number, quantity: number): number {
  if (quantity <= 0) return 0
  return roundCurrency(totalValue / quantity)
}

export function isOfferUnitPriceViable(unitPrice: number, marketPrice: number): boolean {
  if (marketPrice <= 0) return true
  return unitPrice >= getMinUnitPrice(marketPrice)
}

export function isOfferTotalViable(totalValue: number, quantity: number, marketUnitPrice: number): boolean {
  if (marketUnitPrice <= 0) return true
  return isOfferUnitPriceViable(getOfferUnitPrice(totalValue, quantity), marketUnitPrice)
}

export function clampAutoOfferDiscount(discountPercent: number): number {
  return Math.min(OFFER_MARKET_DOWNWARD_MARGIN_PERCENT, Math.max(0, discountPercent))
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

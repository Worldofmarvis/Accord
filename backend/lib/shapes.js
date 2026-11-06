// What each side is allowed to see. Database names -> contract names.
// priceFloor only ever leaves through sellerListing, which only the seller's own routes use.

export const publicListing = (l, locked) => ({
  id: l.id, title: l.title, sellerName: l.seller.name, description: l.description ?? '',
  categories: [l.category], tags: l.tags, listPrice: l.listPrice, deliveryDays: l.deliveryDays,
  locked: locked.has(l.sellerId),
})

export const sellerListing = ({ id, title, category, deliverables, listPrice, floorPrice, deliveryDays }) =>
  ({ id, title, category, deliverables, listPrice, priceFloor: floorPrice, deliveryDays })

export const buyerRequest = ({ id, title, category, deliverables, deadline, targetPrice, maxPrice }) =>
  ({ id, title, category, deliverables, deadline, target: targetPrice, max: maxPrice })

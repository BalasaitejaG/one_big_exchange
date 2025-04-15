/**
 * OrderBook class represents a single exchange's order book for a symbol
 */
class OrderBook {
  constructor(exchange, symbol) {
    this.exchange = exchange;
    this.symbol = symbol;
    this.bids = new Map(); // price -> size map for bids
    this.offers = new Map(); // price -> size map for offers
    this.orders = new Map(); // orderId -> order details map
  }

  /**
   * Process a top-of-book message
   */
  processTopOfBook(message) {
    // Clear existing bids and offers as we're replacing with top of book
    this.bids.clear();
    this.offers.clear();

    const { BEST_BID_PRICE, BEST_BID_SIZE, BEST_OFFER_PRICE, BEST_OFFER_SIZE } =
      message;

    if (BEST_BID_PRICE && BEST_BID_SIZE) {
      this.bids.set(BEST_BID_PRICE, BEST_BID_SIZE);
    }

    if (BEST_OFFER_PRICE && BEST_OFFER_SIZE) {
      this.offers.set(BEST_OFFER_PRICE, BEST_OFFER_SIZE);
    }
  }

  /**
   * Process a new order message
   */
  processNewOrder(message) {
    const { ORDER_ID, LIMIT_PRICE, SIDE, QUANTITY } = message;

    // Store the order
    this.orders.set(ORDER_ID, {
      orderId: ORDER_ID,
      price: LIMIT_PRICE,
      side: SIDE,
      quantity: QUANTITY,
    });

    // Update the appropriate side of the book
    if (SIDE === "BUY") {
      const currentSize = this.bids.get(LIMIT_PRICE) || 0;
      this.bids.set(LIMIT_PRICE, currentSize + QUANTITY);
    } else if (SIDE === "SELL") {
      const currentSize = this.offers.get(LIMIT_PRICE) || 0;
      this.offers.set(LIMIT_PRICE, currentSize + QUANTITY);
    }
  }

  /**
   * Process a cancel order message
   */
  processCancelOrder(message) {
    const { ORDER_ID } = message;
    const order = this.orders.get(ORDER_ID);

    if (!order) return; // Order not found

    // Update the appropriate side of the book
    if (order.side === "BUY") {
      const currentSize = this.bids.get(order.price) || 0;
      const newSize = Math.max(0, currentSize - order.quantity);

      if (newSize === 0) {
        this.bids.delete(order.price);
      } else {
        this.bids.set(order.price, newSize);
      }
    } else if (order.side === "SELL") {
      const currentSize = this.offers.get(order.price) || 0;
      const newSize = Math.max(0, currentSize - order.quantity);

      if (newSize === 0) {
        this.offers.delete(order.price);
      } else {
        this.offers.set(order.price, newSize);
      }
    }

    // Remove the order from our records
    this.orders.delete(ORDER_ID);
  }

  /**
   * Process a modify order message
   */
  processModifyOrder(message) {
    const { ORDER_ID, NEW_QUANTITY } = message;
    const order = this.orders.get(ORDER_ID);

    if (!order) return; // Order not found

    const quantityDelta = NEW_QUANTITY - order.quantity;

    // Update the appropriate side of the book
    if (order.side === "BUY") {
      const currentSize = this.bids.get(order.price) || 0;
      this.bids.set(order.price, currentSize + quantityDelta);
    } else if (order.side === "SELL") {
      const currentSize = this.offers.get(order.price) || 0;
      this.offers.set(order.price, currentSize + quantityDelta);
    }

    // Update the order quantity
    order.quantity = NEW_QUANTITY;
  }

  /**
   * Get the best bid price and size
   */
  getBestBid() {
    if (this.bids.size === 0) return null;

    const bidPrices = Array.from(this.bids.keys()).sort((a, b) => b - a); // Sort descending
    const bestBidPrice = bidPrices[0];

    return {
      price: bestBidPrice,
      size: this.bids.get(bestBidPrice),
    };
  }

  /**
   * Get the best offer price and size
   */
  getBestOffer() {
    if (this.offers.size === 0) return null;

    const offerPrices = Array.from(this.offers.keys()).sort((a, b) => a - b); // Sort ascending
    const bestOfferPrice = offerPrices[0];

    return {
      price: bestOfferPrice,
      size: this.offers.get(bestOfferPrice),
    };
  }

  /**
   * Get all bids sorted by price (descending)
   */
  getSortedBids() {
    return Array.from(this.bids.entries())
      .map(([price, size]) => ({ price: parseFloat(price), size }))
      .sort((a, b) => b.price - a.price);
  }

  /**
   * Get all offers sorted by price (ascending)
   */
  getSortedOffers() {
    return Array.from(this.offers.entries())
      .map(([price, size]) => ({ price: parseFloat(price), size }))
      .sort((a, b) => a.price - b.price);
  }
}

module.exports = OrderBook;

/**
 * it aggregates order books from multiple exchanges
 * and creates a single consolidated view
 */
class ConsolidatedBook {
  constructor(symbol) {
    this.symbol = symbol;
    this.exchangeBooks = new Map(); // exchange -> OrderBook
  }

  /**
   * Register an order book for an exchange
   */
  registerExchangeBook(exchange, orderBook) {
    this.exchangeBooks.set(exchange, orderBook);
  }

  /**
   * Unregister an exchange's order book
   */
  unregisterExchangeBook(exchange) {
    this.exchangeBooks.delete(exchange);
  }

  /**
   * Get the top N levels of the consolidated book
   * @param {number} levels - Number of price levels to return
   * @returns {Object} Consolidated book levels
   */
  getTopLevels(levels = 5) {
    const consolidatedBids = this._consolidateBids();
    const consolidatedOffers = this._consolidateOffers();

    const topBids = consolidatedBids.slice(0, levels);
    const topOffers = consolidatedOffers.slice(0, levels);

    return {
      bids: topBids,
      offers: topOffers,
    };
  }

  /**
   * Combine all bids from different exchanges
   * @private
   */
  _consolidateBids() {
    // Collect all bid levels from all exchanges
    const allBids = [];

    for (const orderBook of this.exchangeBooks.values()) {
      const bids = orderBook.getSortedBids();
      allBids.push(...bids);
    }

    // Aggregate sizes at the same price level
    const aggregatedBids = new Map();

    for (const bid of allBids) {
      const { price, size } = bid;
      const currentSize = aggregatedBids.get(price) || 0;
      aggregatedBids.set(price, currentSize + size);
    }

    // Convert to sorted array
    return Array.from(aggregatedBids.entries())
      .map(([price, size]) => ({ price: parseFloat(price), size }))
      .sort((a, b) => b.price - a.price); // Sort by price descending
  }

  /**
   * Combine all offers from different exchanges
   * @private
   */
  _consolidateOffers() {
    // Collect all offer levels from all exchanges
    const allOffers = [];

    for (const orderBook of this.exchangeBooks.values()) {
      const offers = orderBook.getSortedOffers();
      allOffers.push(...offers);
    }

    // Aggregate sizes at the same price level
    const aggregatedOffers = new Map();

    for (const offer of allOffers) {
      const { price, size } = offer;
      const currentSize = aggregatedOffers.get(price) || 0;
      aggregatedOffers.set(price, currentSize + size);
    }

    // Convert to sorted array
    return Array.from(aggregatedOffers.entries())
      .map(([price, size]) => ({ price: parseFloat(price), size }))
      .sort((a, b) => a.price - b.price); // Sort by price ascending
  }

  /**
   * Format the top N levels as a readable book
   * @param {number} levels - Number of levels to include
   * @returns {Array} Formatted book levels
   */
  formatBook(levels = 5) {
    const { bids, offers } = this.getTopLevels(levels);

    return Array.from({ length: levels }, (_, i) => {
      const bid = bids[i] || { price: null, size: null };
      const offer = offers[i] || { price: null, size: null };

      return {
        level: i,
        bidSize: bid.size,
        bidPrice: bid.price,
        offerPrice: offer.price,
        offerSize: offer.size,
      };
    });
  }
}

module.exports = ConsolidatedBook;

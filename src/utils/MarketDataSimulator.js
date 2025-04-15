/**
 * Utility to simulate market data feeds for testing
 */
class MarketDataSimulator {
  constructor(marketDataManager) {
    this.marketDataManager = marketDataManager;
    this.symbols = ["AAPL", "MSFT", "AMZN", "GOOGL", "FB"];
    this.exchanges = ["NYSE", "NASDAQ", "IEX", "ARCA", "BATS"];
    this.orderIdCounter = 1;
    this.activeOrders = new Map(); // orderId -> order details
  }

  /**
   * Start simulating market data
   */
  start(intervalMs = 500) {
    // Generate initial data
    this._generateInitialData();

    // Set up intervals for different types of updates
    this.topOfBookInterval = setInterval(
      () => this._generateTopOfBookUpdates(),
      intervalMs
    );
    this.newOrderInterval = setInterval(
      () => this._generateNewOrders(),
      intervalMs * 2
    );
    this.modifyCancelInterval = setInterval(
      () => this._generateModifyCancelOrders(),
      intervalMs * 3
    );

    console.log("Market data simulation started");
    return this;
  }

  /**
   * Stop simulating market data
   */
  stop() {
    clearInterval(this.topOfBookInterval);
    clearInterval(this.newOrderInterval);
    clearInterval(this.modifyCancelInterval);
    console.log("Market data simulation stopped");
    return this;
  }

  /**
   * Generate initial market data for all exchanges and symbols
   * @private
   */
  _generateInitialData() {
    for (const exchange of this.exchanges) {
      for (const symbol of this.symbols) {
        // Generate top-of-book data
        const topOfBook = this._generateTopOfBook(symbol);
        this.marketDataManager.processTopOfBookMessage(exchange, topOfBook);

        // Generate some initial orders
        for (let i = 0; i < 5; i++) {
          const side = Math.random() > 0.5 ? "BUY" : "SELL";
          const newOrder = this._generateNewOrder(symbol, side, exchange);
          this.marketDataManager.processOrderMessage(
            exchange,
            "NEW_ORDER",
            newOrder
          );
        }
      }
    }
  }

  /**
   * Generate random top-of-book updates
   * @private
   */
  _generateTopOfBookUpdates() {
    // Pick a random exchange and symbol
    const exchange = this._getRandomElement(this.exchanges);
    const symbol = this._getRandomElement(this.symbols);

    // Generate a top-of-book update
    const topOfBook = this._generateTopOfBook(symbol);
    this.marketDataManager.processTopOfBookMessage(exchange, topOfBook);
  }

  /**
   * Generate new orders
   * @private
   */
  _generateNewOrders() {
    // Pick a random exchange and symbol
    const exchange = this._getRandomElement(this.exchanges);
    const symbol = this._getRandomElement(this.symbols);
    const side = Math.random() > 0.5 ? "BUY" : "SELL";

    // Generate a new order
    const newOrder = this._generateNewOrder(symbol, side, exchange);
    this.marketDataManager.processOrderMessage(exchange, "NEW_ORDER", newOrder);
  }

  /**
   * Generate modify/cancel orders
   * @private
   */
  _generateModifyCancelOrders() {
    if (this.activeOrders.size === 0) return;

    // Pick a random order to modify or cancel
    const orderIds = Array.from(this.activeOrders.keys());
    const orderId = this._getRandomElement(orderIds);
    const order = this.activeOrders.get(orderId);

    if (!order) return; // Safety check

    // Add SYMBOL to both modify and cancel messages to avoid lookup issues
    // Decide whether to modify or cancel
    if (Math.random() > 0.3) {
      // Modify
      const message = {
        ORDER_ID: orderId,
        NEW_QUANTITY: Math.max(
          1,
          Math.floor(order.quantity * (0.5 + Math.random()))
        ),
        SYMBOL: order.symbol, // Add symbol to the message
      };

      this.marketDataManager.processOrderMessage(
        order.exchange,
        "MODIFY_ORDER",
        message
      );

      // Update stored order
      order.quantity = message.NEW_QUANTITY;
    } else {
      // Cancel
      const message = {
        ORDER_ID: orderId,
        SYMBOL: order.symbol, // Add symbol to the message
      };

      this.marketDataManager.processOrderMessage(
        order.exchange,
        "CANCEL_ORDER",
        message
      );

      // Remove from active orders
      this.activeOrders.delete(orderId);
    }
  }

  /**
   * Generate a top-of-book message
   * @private
   */
  _generateTopOfBook(symbol) {
    // Generate price based on symbol (to keep it somewhat realistic)
    const basePrice = this._getBasePrice(symbol);
    const bidPrice = basePrice * (0.99 + Math.random() * 0.005);
    const offerPrice = basePrice * (1.005 + Math.random() * 0.005);

    return {
      SYMBOL: symbol,
      BEST_BID_PRICE: bidPrice.toFixed(2),
      BEST_BID_SIZE: Math.floor(Math.random() * 1000) + 100,
      BEST_OFFER_PRICE: offerPrice.toFixed(2),
      BEST_OFFER_SIZE: Math.floor(Math.random() * 1000) + 100,
    };
  }

  /**
   * Generate a new order message
   * @private
   */
  _generateNewOrder(symbol, side, exchange = null) {
    // Generate price based on symbol and side
    const basePrice = this._getBasePrice(symbol);
    let price;

    if (side === "BUY") {
      price = basePrice * (0.98 + Math.random() * 0.015);
    } else {
      price = basePrice * (1.005 + Math.random() * 0.015);
    }

    const orderId = `ORD${this.orderIdCounter++}`;
    const quantity = Math.floor(Math.random() * 1000) + 100;
    // If exchange is not provided, pick a random one
    const orderExchange = exchange || this._getRandomElement(this.exchanges);

    // Store the order
    this.activeOrders.set(orderId, {
      orderId,
      symbol,
      side,
      price,
      quantity,
      exchange: orderExchange,
    });

    return {
      SYMBOL: symbol,
      LIMIT_PRICE: price.toFixed(2),
      SIDE: side,
      QUANTITY: quantity,
      ORDER_ID: orderId,
    };
  }

  /**
   * Get a base price for a symbol
   * @private
   */
  _getBasePrice(symbol) {
    switch (symbol) {
      case "AAPL":
        return 150 + Math.random() * 10;
      case "MSFT":
        return 300 + Math.random() * 15;
      case "AMZN":
        return 3000 + Math.random() * 150;
      case "GOOGL":
        return 2500 + Math.random() * 125;
      case "FB":
        return 250 + Math.random() * 12.5;
      default:
        return 100 + Math.random() * 10;
    }
  }

  /**
   * Get a random element from an array
   * @private
   */
  _getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
}

module.exports = MarketDataSimulator;

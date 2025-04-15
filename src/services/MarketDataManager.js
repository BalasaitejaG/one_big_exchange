const OrderBook = require("../models/OrderBook");
const ConsolidatedBook = require("../models/ConsolidatedBook");

/**
 * MarketDataManager handles processing of market data feeds
 * and maintains consolidated books for all symbols
 */
class MarketDataManager {
  constructor() {
    this.exchangeBooks = new Map(); // exchange:symbol -> OrderBook
    this.consolidatedBooks = new Map(); // symbol -> ConsolidatedBook
    this.subscribers = new Map(); // symbol -> Set of subscribers
  }

  /**
   * Process a top-of-book market data message
   */
  processTopOfBookMessage(exchange, message) {
    const { SYMBOL } = message;
    const key = `${exchange}:${SYMBOL}`;

    // Get or create the exchange's order book
    let orderBook = this.exchangeBooks.get(key);
    if (!orderBook) {
      orderBook = new OrderBook(exchange, SYMBOL);
      this.exchangeBooks.set(key, orderBook);
      this._registerWithConsolidatedBook(exchange, SYMBOL, orderBook);
    }

    // Update the order book
    orderBook.processTopOfBook(message);

    // Notify subscribers of the update
    this._notifySymbolSubscribers(SYMBOL);
  }

  /**
   * Process an order-based market data message
   */
  processOrderMessage(exchange, messageType, message) {
    // For NEW_ORDER, we should have SYMBOL in the message
    // For MODIFY_ORDER and CANCEL_ORDER, we'll try to get it from message or lookup
    const SYMBOL =
      message.SYMBOL || this._getSymbolFromOrderId(exchange, message.ORDER_ID);

    if (!SYMBOL) {
      if (messageType === "NEW_ORDER") {
        console.error(
          `Missing SYMBOL in NEW_ORDER message: ${JSON.stringify(message)}`
        );
        return;
      } else {
        console.warn(
          `Unable to determine symbol for order message: ${JSON.stringify(
            message
          )} - skipping`
        );
        return;
      }
    }

    const key = `${exchange}:${SYMBOL}`;

    // Get or create the exchange's order book
    let orderBook = this.exchangeBooks.get(key);
    if (!orderBook && messageType === "NEW_ORDER") {
      orderBook = new OrderBook(exchange, SYMBOL);
      this.exchangeBooks.set(key, orderBook);
      this._registerWithConsolidatedBook(exchange, SYMBOL, orderBook);
    } else if (!orderBook) {
      console.warn(
        `Order book not found for ${key}, cannot process ${messageType}`
      );
      return;
    }

    // Update the order book based on message type
    switch (messageType) {
      case "NEW_ORDER":
        orderBook.processNewOrder(message);
        break;
      case "CANCEL_ORDER":
        orderBook.processCancelOrder(message);
        break;
      case "MODIFY_ORDER":
        orderBook.processModifyOrder(message);
        break;
      default:
        console.warn(`Unknown message type: ${messageType}`);
        return;
    }

    // Notify subscribers of the update
    this._notifySymbolSubscribers(SYMBOL);
  }

  /**
   * Helper to determine symbol from order ID
   * @private
   */
  _getSymbolFromOrderId(exchange, orderId) {
    // Iterate through order books to find the order
    for (const [key, orderBook] of this.exchangeBooks.entries()) {
      if (key.startsWith(`${exchange}:`)) {
        const order = orderBook.orders.get(orderId);
        if (order) {
          return orderBook.symbol;
        }
      }
    }
    return null;
  }

  /**
   * Register an order book with its consolidated book
   * @private
   */
  _registerWithConsolidatedBook(exchange, symbol, orderBook) {
    // Get or create the consolidated book for this symbol
    let consolidatedBook = this.consolidatedBooks.get(symbol);
    if (!consolidatedBook) {
      consolidatedBook = new ConsolidatedBook(symbol);
      this.consolidatedBooks.set(symbol, consolidatedBook);
    }

    // Register this exchange's book with the consolidated book
    consolidatedBook.registerExchangeBook(exchange, orderBook);
  }

  /**
   * Subscribe to updates for a symbol
   */
  subscribeToSymbol(symbol, callback) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }

    this.subscribers.get(symbol).add(callback);

    // Immediately send the current state
    this._notifySubscriber(symbol, callback);

    return () => {
      // Return unsubscribe function
      const subscribers = this.subscribers.get(symbol);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(symbol);
        }
      }
    };
  }

  /**
   * Notify all subscribers for a symbol
   * @private
   */
  _notifySymbolSubscribers(symbol) {
    const subscribers = this.subscribers.get(symbol);
    if (!subscribers) return;

    for (const callback of subscribers) {
      this._notifySubscriber(symbol, callback);
    }
  }

  /**
   * Notify a single subscriber with the latest data
   * @private
   */
  _notifySubscriber(symbol, callback) {
    const consolidatedBook = this.consolidatedBooks.get(symbol);
    if (!consolidatedBook) return;

    const formattedBook = consolidatedBook.formatBook(5);
    callback(formattedBook);
  }

  /**
   * Get the formatted top 5 levels for a symbol
   */
  getTopLevelsForSymbol(symbol) {
    const consolidatedBook = this.consolidatedBooks.get(symbol);
    if (!consolidatedBook) return [];

    return consolidatedBook.formatBook(5);
  }

  /**
   * Get a list of all available symbols
   */
  getAvailableSymbols() {
    return Array.from(this.consolidatedBooks.keys());
  }
}

module.exports = MarketDataManager;

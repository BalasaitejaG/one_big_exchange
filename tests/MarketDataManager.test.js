const MarketDataManager = require("../backend/services/MarketDataManager");

describe("MarketDataManager", () => {
  let marketDataManager;

  beforeEach(() => {
    marketDataManager = new MarketDataManager();
  });

  describe("constructor", () => {
    it("should initialize with empty maps", () => {
      expect(marketDataManager.exchangeBooks.size).toBe(0);
      expect(marketDataManager.consolidatedBooks.size).toBe(0);
      expect(marketDataManager.subscribers.size).toBe(0);
    });
  });

  describe("processTopOfBookMessage", () => {
    it("should create and update an order book for top-of-book messages", () => {
      const message = {
        SYMBOL: "AAPL",
        BEST_BID_PRICE: 150.5,
        BEST_BID_SIZE: 100,
        BEST_OFFER_PRICE: 150.75,
        BEST_OFFER_SIZE: 200,
      };

      marketDataManager.processTopOfBookMessage("NYSE", message);

      // Check that exchange book was created
      expect(marketDataManager.exchangeBooks.size).toBe(1);
      expect(marketDataManager.exchangeBooks.has("NYSE:AAPL")).toBe(true);

      // Check that consolidated book was created
      expect(marketDataManager.consolidatedBooks.size).toBe(1);
      expect(marketDataManager.consolidatedBooks.has("AAPL")).toBe(true);

      // Process another message for the same exchange and symbol
      const updatedMessage = {
        SYMBOL: "AAPL",
        BEST_BID_PRICE: 151.0,
        BEST_BID_SIZE: 150,
        BEST_OFFER_PRICE: 151.25,
        BEST_OFFER_SIZE: 250,
      };

      marketDataManager.processTopOfBookMessage("NYSE", updatedMessage);

      // Check that no new books were created
      expect(marketDataManager.exchangeBooks.size).toBe(1);
      expect(marketDataManager.consolidatedBooks.size).toBe(1);
    });

    it("should handle multiple exchanges for the same symbol", () => {
      // Add NYSE data
      marketDataManager.processTopOfBookMessage("NYSE", {
        SYMBOL: "AAPL",
        BEST_BID_PRICE: 150.5,
        BEST_BID_SIZE: 100,
        BEST_OFFER_PRICE: 150.75,
        BEST_OFFER_SIZE: 200,
      });

      // Add NASDAQ data
      marketDataManager.processTopOfBookMessage("NASDAQ", {
        SYMBOL: "AAPL",
        BEST_BID_PRICE: 150.6,
        BEST_BID_SIZE: 150,
        BEST_OFFER_PRICE: 150.7,
        BEST_OFFER_SIZE: 250,
      });

      // We should have two exchange books
      expect(marketDataManager.exchangeBooks.size).toBe(2);
      expect(marketDataManager.exchangeBooks.has("NYSE:AAPL")).toBe(true);
      expect(marketDataManager.exchangeBooks.has("NASDAQ:AAPL")).toBe(true);

      // But only one consolidated book
      expect(marketDataManager.consolidatedBooks.size).toBe(1);
      expect(marketDataManager.consolidatedBooks.has("AAPL")).toBe(true);

      // The consolidated book should have the NASDAQ bid (better price)
      const levels = marketDataManager.getTopLevelsForSymbol("AAPL");
      expect(levels[0].bidPrice).toBe(150.6);
      // The consolidated book should have the NASDAQ offer (better price)
      expect(levels[0].offerPrice).toBe(150.7);
    });
  });

  describe("processOrderMessage", () => {
    it("should handle NEW_ORDER messages", () => {
      const message = {
        SYMBOL: "AAPL",
        ORDER_ID: "order1",
        LIMIT_PRICE: 150.0,
        SIDE: "BUY",
        QUANTITY: 100,
      };

      marketDataManager.processOrderMessage("NYSE", "NEW_ORDER", message);

      // Check that exchange book was created
      expect(marketDataManager.exchangeBooks.size).toBe(1);
      expect(marketDataManager.exchangeBooks.has("NYSE:AAPL")).toBe(true);

      // Check that consolidated book was created
      expect(marketDataManager.consolidatedBooks.size).toBe(1);
      expect(marketDataManager.consolidatedBooks.has("AAPL")).toBe(true);

      // The consolidated book should have the order
      const levels = marketDataManager.getTopLevelsForSymbol("AAPL");
      expect(levels[0].bidPrice).toBe(150.0);
      expect(levels[0].bidSize).toBe(100);
    });

    it("should handle MODIFY_ORDER messages", () => {
      // First add a new order
      marketDataManager.processOrderMessage("NYSE", "NEW_ORDER", {
        SYMBOL: "AAPL",
        ORDER_ID: "order1",
        LIMIT_PRICE: 150.0,
        SIDE: "BUY",
        QUANTITY: 100,
      });

      // Then modify the order
      marketDataManager.processOrderMessage("NYSE", "MODIFY_ORDER", {
        ORDER_ID: "order1",
        NEW_QUANTITY: 200,
        SYMBOL: "AAPL",
      });

      // The consolidated book should reflect the updated quantity
      const levels = marketDataManager.getTopLevelsForSymbol("AAPL");
      expect(levels[0].bidPrice).toBe(150.0);
      expect(levels[0].bidSize).toBe(200);
    });

    it("should handle CANCEL_ORDER messages", () => {
      // First add a new order
      marketDataManager.processOrderMessage("NYSE", "NEW_ORDER", {
        SYMBOL: "AAPL",
        ORDER_ID: "order1",
        LIMIT_PRICE: 150.0,
        SIDE: "BUY",
        QUANTITY: 100,
      });

      // Then cancel the order
      marketDataManager.processOrderMessage("NYSE", "CANCEL_ORDER", {
        ORDER_ID: "order1",
        SYMBOL: "AAPL",
      });

      // The consolidated book should reflect the cancellation
      const levels = marketDataManager.getTopLevelsForSymbol("AAPL");
      expect(levels[0].bidPrice).toBeNull();
      expect(levels[0].bidSize).toBeNull();
    });

    it("should handle missing SYMBOL in MODIFY_ORDER and CANCEL_ORDER", () => {
      // Add an order
      marketDataManager.processOrderMessage("NYSE", "NEW_ORDER", {
        SYMBOL: "AAPL",
        ORDER_ID: "order1",
        LIMIT_PRICE: 150.0,
        SIDE: "BUY",
        QUANTITY: 100,
      });

      // Modify without symbol (should use _getSymbolFromOrderId)
      marketDataManager.processOrderMessage("NYSE", "MODIFY_ORDER", {
        ORDER_ID: "order1",
        NEW_QUANTITY: 200,
      });

      // The consolidated book should reflect the updated quantity
      let levels = marketDataManager.getTopLevelsForSymbol("AAPL");
      expect(levels[0].bidSize).toBe(200);

      // Cancel without symbol (should use _getSymbolFromOrderId)
      marketDataManager.processOrderMessage("NYSE", "CANCEL_ORDER", {
        ORDER_ID: "order1",
      });

      // The consolidated book should reflect the cancellation
      levels = marketDataManager.getTopLevelsForSymbol("AAPL");
      expect(levels[0].bidPrice).toBeNull();
    });

    it("should ignore operations on non-existent order books", () => {
      // Try to modify a non-existent order
      marketDataManager.processOrderMessage("NYSE", "MODIFY_ORDER", {
        ORDER_ID: "nonexistent",
        NEW_QUANTITY: 200,
      });

      // Try to cancel a non-existent order
      marketDataManager.processOrderMessage("NYSE", "CANCEL_ORDER", {
        ORDER_ID: "nonexistent",
      });

      // Nothing should have been created
      expect(marketDataManager.exchangeBooks.size).toBe(0);
      expect(marketDataManager.consolidatedBooks.size).toBe(0);
    });
  });

  describe("subscribeToSymbol", () => {
    it("should register subscribers for symbols", () => {
      // Create a spy callback
      const callback = jest.fn();

      // Subscribe to a symbol that doesn't exist yet
      const unsubscribe = marketDataManager.subscribeToSymbol("AAPL", callback);

      // Check that the subscriber was registered
      expect(marketDataManager.subscribers.size).toBe(1);
      expect(marketDataManager.subscribers.has("AAPL")).toBe(true);
      expect(marketDataManager.subscribers.get("AAPL").size).toBe(1);

      // The callback won't be called immediately since there's no data yet
      expect(callback).toHaveBeenCalledTimes(0);

      // Add some data
      marketDataManager.processTopOfBookMessage("NYSE", {
        SYMBOL: "AAPL",
        BEST_BID_PRICE: 150.5,
        BEST_BID_SIZE: 100,
        BEST_OFFER_PRICE: 150.75,
        BEST_OFFER_SIZE: 200,
      });

      // Verify callback was called
      expect(callback).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      // Check that the subscriber was removed
      expect(marketDataManager.subscribers.size).toBe(0);
    });

    it("should handle multiple subscribers for the same symbol", () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      // Subscribe two callbacks
      marketDataManager.subscribeToSymbol("AAPL", callback1);
      marketDataManager.subscribeToSymbol("AAPL", callback2);

      // Check that both subscribers were registered
      expect(marketDataManager.subscribers.size).toBe(1);
      expect(marketDataManager.subscribers.get("AAPL").size).toBe(2);

      // The callbacks won't be called immediately since there's no data
      expect(callback1).toHaveBeenCalledTimes(0);
      expect(callback2).toHaveBeenCalledTimes(0);

      // Add some data
      marketDataManager.processTopOfBookMessage("NYSE", {
        SYMBOL: "AAPL",
        BEST_BID_PRICE: 150.5,
        BEST_BID_SIZE: 100,
        BEST_OFFER_PRICE: 150.75,
        BEST_OFFER_SIZE: 200,
      });

      // Verify both callbacks were called
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe("getTopLevelsForSymbol", () => {
    beforeEach(() => {
      // Set up some data
      marketDataManager.processTopOfBookMessage("NYSE", {
        SYMBOL: "AAPL",
        BEST_BID_PRICE: 150.5,
        BEST_BID_SIZE: 100,
        BEST_OFFER_PRICE: 150.75,
        BEST_OFFER_SIZE: 200,
      });

      marketDataManager.processTopOfBookMessage("NASDAQ", {
        SYMBOL: "AAPL",
        BEST_BID_PRICE: 150.6,
        BEST_BID_SIZE: 150,
        BEST_OFFER_PRICE: 150.8,
        BEST_OFFER_SIZE: 250,
      });

      marketDataManager.processOrderMessage("CBOE", "NEW_ORDER", {
        SYMBOL: "AAPL",
        ORDER_ID: "order1",
        LIMIT_PRICE: 150.55,
        SIDE: "BUY",
        QUANTITY: 300,
      });

      marketDataManager.processOrderMessage("CBOE", "NEW_ORDER", {
        SYMBOL: "AAPL",
        ORDER_ID: "order2",
        LIMIT_PRICE: 150.7,
        SIDE: "SELL",
        QUANTITY: 400,
      });
    });

    it("should return the top levels for a symbol", () => {
      // Get top levels for AAPL
      const levels = marketDataManager.getTopLevelsForSymbol("AAPL");

      // Should have 5 levels by default
      expect(levels.length).toBe(5);

      // First level should be best bid and best offer
      expect(levels[0]).toEqual({
        level: 0,
        bidSize: 150, // NASDAQ
        bidPrice: 150.6, // NASDAQ (highest bid)
        offerPrice: 150.7, // CBOE (lowest offer)
        offerSize: 400, // CBOE
      });

      // Second level should be next best
      expect(levels[1]).toEqual({
        level: 1,
        bidSize: 300, // CBOE
        bidPrice: 150.55, // CBOE
        offerPrice: 150.75, // NYSE
        offerSize: 200, // NYSE
      });

      // Third level
      expect(levels[2]).toEqual({
        level: 2,
        bidSize: 100, // NYSE
        bidPrice: 150.5, // NYSE
        offerPrice: 150.8, // NASDAQ
        offerSize: 250, // NASDAQ
      });
    });

    it("should return an empty array for a non-existent symbol", () => {
      const levels = marketDataManager.getTopLevelsForSymbol("MSFT");
      expect(levels).toEqual([]);
    });
  });

  describe("getAvailableSymbols", () => {
    it("should return a list of all available symbols", () => {
      // Add data for multiple symbols
      marketDataManager.processTopOfBookMessage("NYSE", {
        SYMBOL: "AAPL",
        BEST_BID_PRICE: 150.5,
        BEST_BID_SIZE: 100,
        BEST_OFFER_PRICE: 150.75,
        BEST_OFFER_SIZE: 200,
      });

      marketDataManager.processTopOfBookMessage("NYSE", {
        SYMBOL: "MSFT",
        BEST_BID_PRICE: 250.5,
        BEST_BID_SIZE: 120,
        BEST_OFFER_PRICE: 250.75,
        BEST_OFFER_SIZE: 220,
      });

      marketDataManager.processOrderMessage("NASDAQ", "NEW_ORDER", {
        SYMBOL: "GOOGL",
        ORDER_ID: "order1",
        LIMIT_PRICE: 2500.0,
        SIDE: "BUY",
        QUANTITY: 10,
      });

      // Get available symbols
      const symbols = marketDataManager.getAvailableSymbols();

      // Should have 3 symbols
      expect(symbols.length).toBe(3);
      expect(symbols).toContain("AAPL");
      expect(symbols).toContain("MSFT");
      expect(symbols).toContain("GOOGL");
    });

    it("should return an empty array when no symbols are available", () => {
      const symbols = marketDataManager.getAvailableSymbols();
      expect(symbols).toEqual([]);
    });
  });

  describe("Integration tests", () => {
    it("should maintain a consistent consolidated book as orders change", () => {
      // 1. Add initial orders
      marketDataManager.processOrderMessage("NYSE", "NEW_ORDER", {
        SYMBOL: "AAPL",
        ORDER_ID: "nyse_order1",
        LIMIT_PRICE: 150.0,
        SIDE: "BUY",
        QUANTITY: 100,
      });

      marketDataManager.processOrderMessage("NASDAQ", "NEW_ORDER", {
        SYMBOL: "AAPL",
        ORDER_ID: "nasdaq_order1",
        LIMIT_PRICE: 150.25,
        SIDE: "BUY",
        QUANTITY: 200,
      });

      marketDataManager.processOrderMessage("CBOE", "NEW_ORDER", {
        SYMBOL: "AAPL",
        ORDER_ID: "cboe_order1",
        LIMIT_PRICE: 150.5,
        SIDE: "SELL",
        QUANTITY: 300,
      });

      // Check initial state
      let book = marketDataManager.getTopLevelsForSymbol("AAPL");
      expect(book[0].bidPrice).toBe(150.25); // NASDAQ best bid
      expect(book[0].bidSize).toBe(200);
      expect(book[0].offerPrice).toBe(150.5); // CBOE best offer
      expect(book[0].offerSize).toBe(300);

      // 2. Modify an order
      marketDataManager.processOrderMessage("NASDAQ", "MODIFY_ORDER", {
        ORDER_ID: "nasdaq_order1",
        NEW_QUANTITY: 250,
        SYMBOL: "AAPL",
      });

      // Check updated state
      book = marketDataManager.getTopLevelsForSymbol("AAPL");
      expect(book[0].bidPrice).toBe(150.25);
      expect(book[0].bidSize).toBe(250); // Updated quantity

      // 3. Add a better bid
      marketDataManager.processOrderMessage("NYSE", "NEW_ORDER", {
        SYMBOL: "AAPL",
        ORDER_ID: "nyse_order2",
        LIMIT_PRICE: 150.35,
        SIDE: "BUY",
        QUANTITY: 150,
      });

      // Check updated state
      book = marketDataManager.getTopLevelsForSymbol("AAPL");
      expect(book[0].bidPrice).toBe(150.35); // New best bid
      expect(book[0].bidSize).toBe(150);
      expect(book[1].bidPrice).toBe(150.25); // Previous best now second
      expect(book[1].bidSize).toBe(250);

      // 4. Cancel the best offer
      marketDataManager.processOrderMessage("CBOE", "CANCEL_ORDER", {
        ORDER_ID: "cboe_order1",
        SYMBOL: "AAPL",
      });

      // Add a new offer
      marketDataManager.processOrderMessage("NYSE", "NEW_ORDER", {
        SYMBOL: "AAPL",
        ORDER_ID: "nyse_order3",
        LIMIT_PRICE: 150.6,
        SIDE: "SELL",
        QUANTITY: 400,
      });

      // Check updated state
      book = marketDataManager.getTopLevelsForSymbol("AAPL");
      expect(book[0].offerPrice).toBe(150.6); // New best offer
      expect(book[0].offerSize).toBe(400);

      // 5. Add top-of-book data that's better than all orders
      marketDataManager.processTopOfBookMessage("CBOE", {
        SYMBOL: "AAPL",
        BEST_BID_PRICE: 150.4,
        BEST_BID_SIZE: 500,
        BEST_OFFER_PRICE: 150.55,
        BEST_OFFER_SIZE: 600,
      });

      // Check updated state
      book = marketDataManager.getTopLevelsForSymbol("AAPL");
      expect(book[0].bidPrice).toBe(150.4); // New best bid from top-of-book
      expect(book[0].bidSize).toBe(500);
      expect(book[0].offerPrice).toBe(150.55); // New best offer from top-of-book
      expect(book[0].offerSize).toBe(600);
    });

    it("should notify subscribers of changes", () => {
      // Create a spy callback
      const callback = jest.fn();

      // Add an order first to have data in the book
      marketDataManager.processOrderMessage("NYSE", "NEW_ORDER", {
        SYMBOL: "AAPL",
        ORDER_ID: "order1",
        LIMIT_PRICE: 150.0,
        SIDE: "BUY",
        QUANTITY: 100,
      });

      // Subscribe to updates - this may or may not trigger an immediate callback
      // with the current state
      marketDataManager.subscribeToSymbol("AAPL", callback);

      // Reset the mock to focus only on subsequent calls
      const callCount = callback.mock.calls.length;
      callback.mockClear();

      // Add another order
      marketDataManager.processOrderMessage("NYSE", "NEW_ORDER", {
        SYMBOL: "AAPL",
        ORDER_ID: "order2",
        LIMIT_PRICE: 150.5,
        SIDE: "BUY",
        QUANTITY: 200,
      });

      // Should have been called after the book update
      expect(callback).toHaveBeenCalledTimes(1);

      // The data passed to the callback should be the current book state
      const lastCallData = callback.mock.calls[0][0];
      expect(lastCallData[0].bidPrice).toBe(150.5); // Best bid is now 150.50
      expect(lastCallData[0].bidSize).toBe(200);
      expect(lastCallData[1].bidPrice).toBe(150.0); // Second best bid is 150.00
      expect(lastCallData[1].bidSize).toBe(100);
    });
  });
});

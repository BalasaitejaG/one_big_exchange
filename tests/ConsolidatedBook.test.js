const ConsolidatedBook = require("../backend/models/ConsolidatedBook");
const OrderBook = require("../backend/models/OrderBook");

describe("ConsolidatedBook", () => {
  let consolidatedBook;
  let nyseBook;
  let nasdaqBook;
  const symbol = "AAPL";

  beforeEach(() => {
    // Create a consolidated book
    consolidatedBook = new ConsolidatedBook(symbol);

    // Create individual exchange books
    nyseBook = new OrderBook("NYSE", symbol);
    nasdaqBook = new OrderBook("NASDAQ", symbol);

    // Register the exchange books with the consolidated book
    consolidatedBook.registerExchangeBook("NYSE", nyseBook);
    consolidatedBook.registerExchangeBook("NASDAQ", nasdaqBook);

    // Add some orders to NYSE book
    nyseBook.processNewOrder({
      ORDER_ID: "nyse_order1",
      SYMBOL: symbol,
      LIMIT_PRICE: 150.0,
      SIDE: "BUY",
      QUANTITY: 100,
    });

    nyseBook.processNewOrder({
      ORDER_ID: "nyse_order2",
      SYMBOL: symbol,
      LIMIT_PRICE: 149.5,
      SIDE: "BUY",
      QUANTITY: 200,
    });

    nyseBook.processNewOrder({
      ORDER_ID: "nyse_order3",
      SYMBOL: symbol,
      LIMIT_PRICE: 150.75,
      SIDE: "SELL",
      QUANTITY: 300,
    });

    // Add some orders to NASDAQ book
    nasdaqBook.processNewOrder({
      ORDER_ID: "nasdaq_order1",
      SYMBOL: symbol,
      LIMIT_PRICE: 150.0,
      SIDE: "BUY",
      QUANTITY: 150,
    });

    nasdaqBook.processNewOrder({
      ORDER_ID: "nasdaq_order2",
      SYMBOL: symbol,
      LIMIT_PRICE: 150.25,
      SIDE: "BUY",
      QUANTITY: 250,
    });

    nasdaqBook.processNewOrder({
      ORDER_ID: "nasdaq_order3",
      SYMBOL: symbol,
      LIMIT_PRICE: 150.75,
      SIDE: "SELL",
      QUANTITY: 350,
    });

    nasdaqBook.processNewOrder({
      ORDER_ID: "nasdaq_order4",
      SYMBOL: symbol,
      LIMIT_PRICE: 151.0,
      SIDE: "SELL",
      QUANTITY: 400,
    });
  });

  describe("constructor", () => {
    it("should initialize with the correct symbol", () => {
      expect(consolidatedBook.symbol).toBe(symbol);
      expect(consolidatedBook.exchangeBooks.size).toBe(2);
      expect(consolidatedBook.exchangeBooks.has("NYSE")).toBe(true);
      expect(consolidatedBook.exchangeBooks.has("NASDAQ")).toBe(true);
    });
  });

  describe("registerExchangeBook and unregisterExchangeBook", () => {
    it("should register and unregister exchange books correctly", () => {
      const cboeBook = new OrderBook("CBOE", symbol);

      // Register a new exchange
      consolidatedBook.registerExchangeBook("CBOE", cboeBook);
      expect(consolidatedBook.exchangeBooks.size).toBe(3);
      expect(consolidatedBook.exchangeBooks.get("CBOE")).toBe(cboeBook);

      // Unregister an exchange
      consolidatedBook.unregisterExchangeBook("NASDAQ");
      expect(consolidatedBook.exchangeBooks.size).toBe(2);
      expect(consolidatedBook.exchangeBooks.has("NASDAQ")).toBe(false);

      // Unregister all exchanges
      consolidatedBook.unregisterExchangeBook("NYSE");
      consolidatedBook.unregisterExchangeBook("CBOE");
      expect(consolidatedBook.exchangeBooks.size).toBe(0);
    });
  });

  describe("_consolidateBids", () => {
    it("should aggregate bids from multiple exchanges", () => {
      const consolidatedBids = consolidatedBook._consolidateBids();

      // Should have 3 unique price levels
      expect(consolidatedBids.length).toBe(3);

      // Price levels should be sorted in descending order
      expect(consolidatedBids[0].price).toBe(150.25);
      expect(consolidatedBids[1].price).toBe(150.0);
      expect(consolidatedBids[2].price).toBe(149.5);

      // Quantities should be aggregated
      expect(consolidatedBids[1].size).toBe(250); // 100 from NYSE + 150 from NASDAQ
    });

    it("should handle empty books", () => {
      const emptyBook = new ConsolidatedBook("EMPTY");
      expect(emptyBook._consolidateBids()).toEqual([]);

      // Register an empty exchange book
      const emptyExchangeBook = new OrderBook("EMPTY", "EMPTY");
      emptyBook.registerExchangeBook("EMPTY", emptyExchangeBook);
      expect(emptyBook._consolidateBids()).toEqual([]);
    });
  });

  describe("_consolidateOffers", () => {
    it("should aggregate offers from multiple exchanges", () => {
      const consolidatedOffers = consolidatedBook._consolidateOffers();

      // Should have 2 unique price levels
      expect(consolidatedOffers.length).toBe(2);

      // Price levels should be sorted in ascending order
      expect(consolidatedOffers[0].price).toBe(150.75);
      expect(consolidatedOffers[1].price).toBe(151.0);

      // Quantities should be aggregated
      expect(consolidatedOffers[0].size).toBe(650); // 300 from NYSE + 350 from NASDAQ
    });

    it("should handle empty books", () => {
      const emptyBook = new ConsolidatedBook("EMPTY");
      expect(emptyBook._consolidateOffers()).toEqual([]);

      // Register an empty exchange book
      const emptyExchangeBook = new OrderBook("EMPTY", "EMPTY");
      emptyBook.registerExchangeBook("EMPTY", emptyExchangeBook);
      expect(emptyBook._consolidateOffers()).toEqual([]);
    });
  });

  describe("getTopLevels", () => {
    it("should return the top N levels of the consolidated book", () => {
      // Get top 2 levels
      const topLevels = consolidatedBook.getTopLevels(2);

      // Should have 2 bid levels and 2 offer levels
      expect(topLevels.bids.length).toBe(2);
      expect(topLevels.offers.length).toBe(2);

      // Check first bid level
      expect(topLevels.bids[0].price).toBe(150.25);
      expect(topLevels.bids[0].size).toBe(250);

      // Check second bid level
      expect(topLevels.bids[1].price).toBe(150.0);
      expect(topLevels.bids[1].size).toBe(250);

      // Check first offer level
      expect(topLevels.offers[0].price).toBe(150.75);
      expect(topLevels.offers[0].size).toBe(650);

      // Check second offer level
      expect(topLevels.offers[1].price).toBe(151.0);
      expect(topLevels.offers[1].size).toBe(400);
    });

    it("should return fewer levels if not enough are available", () => {
      // Request more levels than exist
      const topLevels = consolidatedBook.getTopLevels(10);

      // Should have only 3 bid levels and 2 offer levels (all available)
      expect(topLevels.bids.length).toBe(3);
      expect(topLevels.offers.length).toBe(2);
    });

    it("should default to 5 levels when no parameter is provided", () => {
      // No parameter provided
      const topLevels = consolidatedBook.getTopLevels();

      // Should have all available levels (3 bids, 2 offers) as they're less than 5
      expect(topLevels.bids.length).toBe(3);
      expect(topLevels.offers.length).toBe(2);
    });
  });

  describe("formatBook", () => {
    it("should format the book with the specified number of levels", () => {
      // Format the top 3 levels
      const formattedBook = consolidatedBook.formatBook(3);

      // Should have 3 levels
      expect(formattedBook.length).toBe(3);

      // First level should have best bid and best offer
      expect(formattedBook[0]).toEqual({
        level: 0,
        bidSize: 250,
        bidPrice: 150.25,
        offerPrice: 150.75,
        offerSize: 650,
      });

      // Second level
      expect(formattedBook[1]).toEqual({
        level: 1,
        bidSize: 250,
        bidPrice: 150.0,
        offerPrice: 151.0,
        offerSize: 400,
      });

      // Third level (no offer at this level)
      expect(formattedBook[2]).toEqual({
        level: 2,
        bidSize: 200,
        bidPrice: 149.5,
        offerPrice: null,
        offerSize: null,
      });
    });

    it("should handle empty levels with null values", () => {
      // Create a book with empty offers
      const bookWithEmptyOffers = new ConsolidatedBook(symbol);
      const exchangeBook = new OrderBook("NYSE", symbol);

      // Add only bids, no offers
      exchangeBook.processNewOrder({
        ORDER_ID: "order1",
        SYMBOL: symbol,
        LIMIT_PRICE: 150.0,
        SIDE: "BUY",
        QUANTITY: 100,
      });

      bookWithEmptyOffers.registerExchangeBook("NYSE", exchangeBook);

      // Format with 2 levels
      const formattedBook = bookWithEmptyOffers.formatBook(2);

      expect(formattedBook.length).toBe(2);

      // First level should have bid but no offer
      expect(formattedBook[0]).toEqual({
        level: 0,
        bidSize: 100,
        bidPrice: 150.0,
        offerPrice: null,
        offerSize: null,
      });

      // Second level should have null for all price/size fields
      expect(formattedBook[1]).toEqual({
        level: 1,
        bidSize: null,
        bidPrice: null,
        offerPrice: null,
        offerSize: null,
      });
    });
  });

  describe("Integration tests", () => {
    it("should update the consolidated book when exchange books change", () => {
      // Initial state
      let topLevels = consolidatedBook.getTopLevels(1);

      expect(topLevels.bids[0].price).toBe(150.25);
      expect(topLevels.bids[0].size).toBe(250);
      expect(topLevels.offers[0].price).toBe(150.75);
      expect(topLevels.offers[0].size).toBe(650);

      // Add a new better bid
      nyseBook.processNewOrder({
        ORDER_ID: "nyse_order4",
        SYMBOL: symbol,
        LIMIT_PRICE: 150.5,
        SIDE: "BUY",
        QUANTITY: 500,
      });

      // Check updated top level
      topLevels = consolidatedBook.getTopLevels(1);
      expect(topLevels.bids[0].price).toBe(150.5);
      expect(topLevels.bids[0].size).toBe(500);

      // Cancel an order to change the offer size
      nasdaqBook.processCancelOrder({
        ORDER_ID: "nasdaq_order3",
      });

      // Check updated top level
      topLevels = consolidatedBook.getTopLevels(1);
      expect(topLevels.offers[0].price).toBe(150.75);
      expect(topLevels.offers[0].size).toBe(300); // 650 - 350 = 300

      // Modify an order
      nyseBook.processModifyOrder({
        ORDER_ID: "nyse_order3",
        NEW_QUANTITY: 400,
      });

      // Check updated top level
      topLevels = consolidatedBook.getTopLevels(1);
      expect(topLevels.offers[0].price).toBe(150.75);
      expect(topLevels.offers[0].size).toBe(400); // 300 + 100 = 400
    });

    it("should handle removing an exchange", () => {
      // Initial state
      let topLevels = consolidatedBook.getTopLevels(1);
      expect(topLevels.bids[0].size).toBe(250); // NASDAQ only

      // Remove NASDAQ
      consolidatedBook.unregisterExchangeBook("NASDAQ");

      // Check updated top level
      topLevels = consolidatedBook.getTopLevels(1);
      expect(topLevels.bids[0].price).toBe(150.0); // NYSE best bid
      expect(topLevels.bids[0].size).toBe(100);
    });
  });
});

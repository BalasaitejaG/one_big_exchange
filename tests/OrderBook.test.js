const OrderBook = require("../backend/models/OrderBook");

describe("OrderBook", () => {
  let orderBook;
  const exchange = "NYSE";
  const symbol = "AAPL";

  beforeEach(() => {
    orderBook = new OrderBook(exchange, symbol);
  });

  describe("constructor", () => {
    it("should initialize with empty bids, offers and orders", () => {
      expect(orderBook.exchange).toBe(exchange);
      expect(orderBook.symbol).toBe(symbol);
      expect(orderBook.bids.size).toBe(0);
      expect(orderBook.offers.size).toBe(0);
      expect(orderBook.orders.size).toBe(0);
    });
  });

  describe("processTopOfBook", () => {
    it("should process top of book messages correctly", () => {
      const message = {
        SYMBOL: symbol,
        BEST_BID_PRICE: 150.5,
        BEST_BID_SIZE: 100,
        BEST_OFFER_PRICE: 150.75,
        BEST_OFFER_SIZE: 200,
      };

      orderBook.processTopOfBook(message);

      expect(orderBook.bids.size).toBe(1);
      expect(orderBook.offers.size).toBe(1);
      expect(orderBook.bids.get(150.5)).toBe(100);
      expect(orderBook.offers.get(150.75)).toBe(200);

      // Process a new top of book that should replace the previous one
      const newMessage = {
        SYMBOL: symbol,
        BEST_BID_PRICE: 151.0,
        BEST_BID_SIZE: 150,
        BEST_OFFER_PRICE: 151.25,
        BEST_OFFER_SIZE: 250,
      };

      orderBook.processTopOfBook(newMessage);

      expect(orderBook.bids.size).toBe(1);
      expect(orderBook.offers.size).toBe(1);
      expect(orderBook.bids.get(151.0)).toBe(150);
      expect(orderBook.offers.get(151.25)).toBe(250);
    });

    it("should handle partial top of book messages", () => {
      // Message with only bid
      orderBook.processTopOfBook({
        SYMBOL: symbol,
        BEST_BID_PRICE: 152.0,
        BEST_BID_SIZE: 300,
      });

      expect(orderBook.bids.size).toBe(1);
      expect(orderBook.offers.size).toBe(0);
      expect(orderBook.bids.get(152.0)).toBe(300);

      // Message with only offer
      orderBook.processTopOfBook({
        SYMBOL: symbol,
        BEST_OFFER_PRICE: 152.5,
        BEST_OFFER_SIZE: 400,
      });

      expect(orderBook.bids.size).toBe(0); // Previous bids cleared
      expect(orderBook.offers.size).toBe(1);
      expect(orderBook.offers.get(152.5)).toBe(400);
    });
  });

  describe("processNewOrder", () => {
    it("should process new buy orders correctly", () => {
      const order = {
        ORDER_ID: "order1",
        LIMIT_PRICE: 150.0,
        SIDE: "BUY",
        QUANTITY: 100,
      };

      orderBook.processNewOrder(order);

      expect(orderBook.orders.size).toBe(1);
      expect(orderBook.bids.size).toBe(1);
      expect(orderBook.bids.get(150.0)).toBe(100);
      expect(orderBook.orders.get("order1")).toEqual({
        orderId: "order1",
        price: 150.0,
        side: "BUY",
        quantity: 100,
      });

      // Add another buy order at same price
      const order2 = {
        ORDER_ID: "order2",
        LIMIT_PRICE: 150.0,
        SIDE: "BUY",
        QUANTITY: 200,
      };

      orderBook.processNewOrder(order2);

      expect(orderBook.orders.size).toBe(2);
      expect(orderBook.bids.size).toBe(1);
      expect(orderBook.bids.get(150.0)).toBe(300); // 100 + 200
    });

    it("should process new sell orders correctly", () => {
      const order = {
        ORDER_ID: "order3",
        LIMIT_PRICE: 151.0,
        SIDE: "SELL",
        QUANTITY: 150,
      };

      orderBook.processNewOrder(order);

      expect(orderBook.orders.size).toBe(1);
      expect(orderBook.offers.size).toBe(1);
      expect(orderBook.offers.get(151.0)).toBe(150);
      expect(orderBook.orders.get("order3")).toEqual({
        orderId: "order3",
        price: 151.0,
        side: "SELL",
        quantity: 150,
      });

      // Add another sell order at same price
      const order2 = {
        ORDER_ID: "order4",
        LIMIT_PRICE: 151.0,
        SIDE: "SELL",
        QUANTITY: 250,
      };

      orderBook.processNewOrder(order2);

      expect(orderBook.orders.size).toBe(2);
      expect(orderBook.offers.size).toBe(1);
      expect(orderBook.offers.get(151.0)).toBe(400); // 150 + 250
    });

    it("should handle orders at multiple price levels", () => {
      // Add buy orders at different prices
      orderBook.processNewOrder({
        ORDER_ID: "order5",
        LIMIT_PRICE: 150.0,
        SIDE: "BUY",
        QUANTITY: 100,
      });

      orderBook.processNewOrder({
        ORDER_ID: "order6",
        LIMIT_PRICE: 149.5,
        SIDE: "BUY",
        QUANTITY: 200,
      });

      // Add sell orders at different prices
      orderBook.processNewOrder({
        ORDER_ID: "order7",
        LIMIT_PRICE: 151.0,
        SIDE: "SELL",
        QUANTITY: 300,
      });

      orderBook.processNewOrder({
        ORDER_ID: "order8",
        LIMIT_PRICE: 151.5,
        SIDE: "SELL",
        QUANTITY: 400,
      });

      expect(orderBook.bids.size).toBe(2);
      expect(orderBook.offers.size).toBe(2);
      expect(orderBook.bids.get(150.0)).toBe(100);
      expect(orderBook.bids.get(149.5)).toBe(200);
      expect(orderBook.offers.get(151.0)).toBe(300);
      expect(orderBook.offers.get(151.5)).toBe(400);
    });
  });

  describe("processCancelOrder", () => {
    beforeEach(() => {
      // Setup some orders
      orderBook.processNewOrder({
        ORDER_ID: "order1",
        LIMIT_PRICE: 150.0,
        SIDE: "BUY",
        QUANTITY: 100,
      });

      orderBook.processNewOrder({
        ORDER_ID: "order2",
        LIMIT_PRICE: 150.0,
        SIDE: "BUY",
        QUANTITY: 200,
      });

      orderBook.processNewOrder({
        ORDER_ID: "order3",
        LIMIT_PRICE: 151.0,
        SIDE: "SELL",
        QUANTITY: 300,
      });
    });

    it("should cancel buy orders correctly", () => {
      orderBook.processCancelOrder({ ORDER_ID: "order1" });

      expect(orderBook.orders.size).toBe(2);
      expect(orderBook.orders.has("order1")).toBe(false);
      expect(orderBook.bids.get(150.0)).toBe(200); // Only order2 remains
    });

    it("should cancel sell orders correctly", () => {
      orderBook.processCancelOrder({ ORDER_ID: "order3" });

      expect(orderBook.orders.size).toBe(2);
      expect(orderBook.orders.has("order3")).toBe(false);
      expect(orderBook.offers.size).toBe(0); // No more offers
    });

    it("should handle canceling non-existent orders", () => {
      orderBook.processCancelOrder({ ORDER_ID: "nonexistent" });

      expect(orderBook.orders.size).toBe(3); // No change
      expect(orderBook.bids.get(150.0)).toBe(300);
      expect(orderBook.offers.get(151.0)).toBe(300);
    });

    it("should remove price level when last order is canceled", () => {
      // Cancel both buy orders
      orderBook.processCancelOrder({ ORDER_ID: "order1" });
      orderBook.processCancelOrder({ ORDER_ID: "order2" });

      expect(orderBook.bids.size).toBe(0);
      expect(orderBook.bids.has(150.0)).toBe(false);
    });
  });

  describe("processModifyOrder", () => {
    beforeEach(() => {
      // Setup some orders
      orderBook.processNewOrder({
        ORDER_ID: "order1",
        LIMIT_PRICE: 150.0,
        SIDE: "BUY",
        QUANTITY: 100,
      });

      orderBook.processNewOrder({
        ORDER_ID: "order3",
        LIMIT_PRICE: 151.0,
        SIDE: "SELL",
        QUANTITY: 300,
      });
    });

    it("should increase quantity correctly", () => {
      orderBook.processModifyOrder({
        ORDER_ID: "order1",
        NEW_QUANTITY: 150,
      });

      expect(orderBook.orders.get("order1").quantity).toBe(150);
      expect(orderBook.bids.get(150.0)).toBe(150);
    });

    it("should decrease quantity correctly", () => {
      orderBook.processModifyOrder({
        ORDER_ID: "order3",
        NEW_QUANTITY: 200,
      });

      expect(orderBook.orders.get("order3").quantity).toBe(200);
      expect(orderBook.offers.get(151.0)).toBe(200);
    });

    it("should handle modifying non-existent orders", () => {
      orderBook.processModifyOrder({
        ORDER_ID: "nonexistent",
        NEW_QUANTITY: 500,
      });

      expect(orderBook.orders.size).toBe(2); // No change
      expect(orderBook.bids.get(150.0)).toBe(100);
      expect(orderBook.offers.get(151.0)).toBe(300);
    });
  });

  describe("Book view methods", () => {
    beforeEach(() => {
      // Setup some orders at multiple levels
      orderBook.processNewOrder({
        ORDER_ID: "order1",
        LIMIT_PRICE: 150.0,
        SIDE: "BUY",
        QUANTITY: 100,
      });

      orderBook.processNewOrder({
        ORDER_ID: "order2",
        LIMIT_PRICE: 149.5,
        SIDE: "BUY",
        QUANTITY: 200,
      });

      orderBook.processNewOrder({
        ORDER_ID: "order3",
        LIMIT_PRICE: 150.5,
        SIDE: "BUY",
        QUANTITY: 300,
      });

      orderBook.processNewOrder({
        ORDER_ID: "order4",
        LIMIT_PRICE: 151.0,
        SIDE: "SELL",
        QUANTITY: 400,
      });

      orderBook.processNewOrder({
        ORDER_ID: "order5",
        LIMIT_PRICE: 151.5,
        SIDE: "SELL",
        QUANTITY: 500,
      });

      orderBook.processNewOrder({
        ORDER_ID: "order6",
        LIMIT_PRICE: 150.75,
        SIDE: "SELL",
        QUANTITY: 600,
      });
    });

    it("should get best bid correctly", () => {
      const bestBid = orderBook.getBestBid();
      expect(bestBid).toEqual({
        price: 150.5,
        size: 300,
      });
    });

    it("should get best offer correctly", () => {
      const bestOffer = orderBook.getBestOffer();
      expect(bestOffer).toEqual({
        price: 150.75,
        size: 600,
      });
    });

    it("should get sorted bids correctly", () => {
      const sortedBids = orderBook.getSortedBids();
      expect(sortedBids).toEqual([
        { price: 150.5, size: 300 },
        { price: 150.0, size: 100 },
        { price: 149.5, size: 200 },
      ]);
    });

    it("should get sorted offers correctly", () => {
      const sortedOffers = orderBook.getSortedOffers();
      expect(sortedOffers).toEqual([
        { price: 150.75, size: 600 },
        { price: 151.0, size: 400 },
        { price: 151.5, size: 500 },
      ]);
    });

    it("should handle empty best bid/offer", () => {
      const emptyBook = new OrderBook("NASDAQ", "MSFT");
      expect(emptyBook.getBestBid()).toBeNull();
      expect(emptyBook.getBestOffer()).toBeNull();
      expect(emptyBook.getSortedBids()).toEqual([]);
      expect(emptyBook.getSortedOffers()).toEqual([]);
    });
  });
});

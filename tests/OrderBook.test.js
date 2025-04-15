const OrderBook = require("../src/models/OrderBook");

describe("OrderBook", () => {
  let orderBook;

  beforeEach(() => {
    orderBook = new OrderBook("NYSE", "AAPL");
  });

  test("should initialize correctly", () => {
    expect(orderBook.exchange).toBe("NYSE");
    expect(orderBook.symbol).toBe("AAPL");
    expect(orderBook.bids.size).toBe(0);
    expect(orderBook.offers.size).toBe(0);
    expect(orderBook.orders.size).toBe(0);
  });

  test("should process top-of-book message", () => {
    const message = {
      SYMBOL: "AAPL",
      BEST_BID_PRICE: "150.00",
      BEST_BID_SIZE: 500,
      BEST_OFFER_PRICE: "150.10",
      BEST_OFFER_SIZE: 300,
    };

    orderBook.processTopOfBook(message);

    expect(orderBook.bids.size).toBe(1);
    expect(orderBook.offers.size).toBe(1);
    expect(orderBook.bids.get("150.00")).toBe(500);
    expect(orderBook.offers.get("150.10")).toBe(300);
  });

  test("should process new order message", () => {
    const message = {
      SYMBOL: "AAPL",
      ORDER_ID: "ORD1",
      LIMIT_PRICE: "149.50",
      SIDE: "BUY",
      QUANTITY: 200,
    };

    orderBook.processNewOrder(message);

    expect(orderBook.orders.size).toBe(1);
    expect(orderBook.bids.size).toBe(1);
    expect(orderBook.bids.get("149.50")).toBe(200);
    expect(orderBook.orders.get("ORD1")).toEqual({
      orderId: "ORD1",
      price: "149.50",
      side: "BUY",
      quantity: 200,
    });
  });

  test("should process cancel order message", () => {
    // Add an order first
    orderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD1",
      LIMIT_PRICE: "149.50",
      SIDE: "BUY",
      QUANTITY: 200,
    });

    // Then cancel it
    orderBook.processCancelOrder({
      ORDER_ID: "ORD1",
    });

    expect(orderBook.orders.size).toBe(0);
    expect(orderBook.bids.size).toBe(0);
  });

  test("should process modify order message", () => {
    // Add an order first
    orderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD1",
      LIMIT_PRICE: "149.50",
      SIDE: "BUY",
      QUANTITY: 200,
    });

    // Then modify it
    orderBook.processModifyOrder({
      ORDER_ID: "ORD1",
      NEW_QUANTITY: 300,
    });

    expect(orderBook.orders.size).toBe(1);
    expect(orderBook.bids.get("149.50")).toBe(300);
    expect(orderBook.orders.get("ORD1").quantity).toBe(300);
  });

  test("should get best bid correctly", () => {
    // Add multiple bids at different prices
    orderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD1",
      LIMIT_PRICE: "149.50",
      SIDE: "BUY",
      QUANTITY: 200,
    });

    orderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD2",
      LIMIT_PRICE: "150.00",
      SIDE: "BUY",
      QUANTITY: 300,
    });

    const bestBid = orderBook.getBestBid();
    expect(bestBid.price).toBe("150.00");
    expect(bestBid.size).toBe(300);
  });

  test("should get best offer correctly", () => {
    // Add multiple offers at different prices
    orderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD1",
      LIMIT_PRICE: "150.50",
      SIDE: "SELL",
      QUANTITY: 200,
    });

    orderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD2",
      LIMIT_PRICE: "150.20",
      SIDE: "SELL",
      QUANTITY: 300,
    });

    const bestOffer = orderBook.getBestOffer();
    expect(bestOffer.price).toBe("150.20");
    expect(bestOffer.size).toBe(300);
  });

  test("should get sorted bids correctly", () => {
    // Add multiple bids at different prices
    orderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD1",
      LIMIT_PRICE: "149.50",
      SIDE: "BUY",
      QUANTITY: 200,
    });

    orderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD2",
      LIMIT_PRICE: "150.00",
      SIDE: "BUY",
      QUANTITY: 300,
    });

    orderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD3",
      LIMIT_PRICE: "149.80",
      SIDE: "BUY",
      QUANTITY: 150,
    });

    const sortedBids = orderBook.getSortedBids();

    expect(sortedBids.length).toBe(3);
    expect(sortedBids[0].price).toBe(150);
    expect(sortedBids[1].price).toBe(149.8);
    expect(sortedBids[2].price).toBe(149.5);
  });

  test("should get sorted offers correctly", () => {
    // Add multiple offers at different prices
    orderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD1",
      LIMIT_PRICE: "150.50",
      SIDE: "SELL",
      QUANTITY: 200,
    });

    orderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD2",
      LIMIT_PRICE: "150.20",
      SIDE: "SELL",
      QUANTITY: 300,
    });

    orderBook.processNewOrder({
      SYMBOL: "AAPL",
      ORDER_ID: "ORD3",
      LIMIT_PRICE: "150.80",
      SIDE: "SELL",
      QUANTITY: 150,
    });

    const sortedOffers = orderBook.getSortedOffers();

    expect(sortedOffers.length).toBe(3);
    expect(sortedOffers[0].price).toBe(150.2);
    expect(sortedOffers[1].price).toBe(150.5);
    expect(sortedOffers[2].price).toBe(150.8);
  });
});
